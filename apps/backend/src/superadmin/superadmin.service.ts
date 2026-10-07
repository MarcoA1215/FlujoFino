import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { User } from '../entities/user.entity';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';
import * as bcrypt from 'bcryptjs';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentStatus,
  SuperAdminTenantDTO,
  UpdateTenantPlanDTO,
  SaaSPaymentReportDTO,
  UserRole,
  MySubscriptionDTO,
  PromoterCommissionType,
  PromoterCommissionStatus,
  PromoterRank,
  SuperAdminPromoterDTO,
  PromoterCommissionDTO,
  CreatePromoterDTO,
  APP_NAME,
} from '@finowork/shared-types';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  async onModuleInit() {
    try {
      // Auto-healing defensivo: Si 'compraventa' existe y no tiene referidor asignado, vincular a 'negocio prueba'
      const compraventa = await this.tenantRepo.createQueryBuilder('t')
        .where('LOWER(t.name) LIKE :name', { name: '%compraventa%' })
        .andWhere('t.referred_by_tenant_id IS NULL')
        .getOne();

      if (compraventa) {
        const negocioPrueba = await this.tenantRepo.createQueryBuilder('t')
          .where('LOWER(t.name) LIKE :name', { name: '%negocio prueba%' })
          .getOne();

        if (negocioPrueba) {
          compraventa.referred_by_tenant_id = negocioPrueba.id;
          await this.tenantRepo.save(compraventa);
          this.logger.log(`[Auto-healing] Negocio 'compraventa' (${compraventa.id}) vinculado con éxito a su referidor 'negocio prueba' (${negocioPrueba.id}).`);
          await this.calculateMonthlyFee(negocioPrueba.id);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Nota de auto-healing al iniciar SuperAdminService: ${err?.message || err}`);
    }
  }

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SaaSPaymentReport)
    private readonly paymentReportRepo: Repository<SaaSPaymentReport>,
    @InjectRepository(UserTenantAccess)
    private readonly userAccessRepo: Repository<UserTenantAccess>,
    @InjectRepository(PlatformConfig)
    private readonly platformConfigRepo: Repository<PlatformConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Promoter)
    private readonly promoterRepo: Repository<Promoter>,
    @InjectRepository(PromoterCommission)
    private readonly commissionRepo: Repository<PromoterCommission>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Referral Discount Engine:
   * Counts active referred tenants (referred_by_tenant_id = tenantId AND status = 'ACTIVE')
   * PIONEER: >= 2 active referrals -> 100% discount ($0 fee), else 0% ($base_price).
   * REGULAR: min(referrals * 10%, 50%) discount, finalFee = base_price * (1 - discount), min $10.
   */
  async calculateMonthlyFee(tenantId: string): Promise<{
    basePrice: number;
    activeReferrals: number;
    discountPercentage: number;
    finalFee: number;
  }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con id ${tenantId} no encontrado`);
    }

    const basePrice = Number(tenant.base_price) || 20.00;
    const planType = tenant.plan_type || TenantPlanType.REGULAR;

    // Count how many active tenants or valid trial tenants were referred by this tenant
    const activeReferrals = await this.tenantRepo.createQueryBuilder('t')
      .where('t.referred_by_tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(t.status = :active OR (t.status = :trial AND (t.trial_ends_at > :now OR t.trial_ends_at IS NULL)))',
        { active: TenantStatus.ACTIVE, trial: TenantStatus.TRIAL, now: new Date() }
      )
      .getCount();

    let discountPercentage = 0;
    let finalFee = basePrice;

    if (planType === TenantPlanType.PIONEER) {
      if (activeReferrals >= 2) {
        discountPercentage = 100;
        finalFee = 0;

        // Auto-activación y renovación bonificada mensual (30 días) si está en TRIAL, PAST_DUE o si su periodo ya venció
        const now = Date.now();
        const periodExpired = !tenant.current_period_ends_at || new Date(tenant.current_period_ends_at).getTime() <= now;

        if (tenant.status === TenantStatus.TRIAL || tenant.status === TenantStatus.PAST_DUE || periodExpired) {
          tenant.status = TenantStatus.ACTIVE;
          tenant.isActive = true;
          tenant.current_period_ends_at = new Date(now + 30 * 86400000);
          await this.tenantRepo.save(tenant);
        }
      } else {
        discountPercentage = 0;
        finalFee = basePrice;

        // Si bajó de 2 referidos activos y tenía una fecha lejana (ej. por extensiones previas de 365 días),
        // ajustar para que expire al término de un ciclo mensual de 30 días normal (a lo sumo 30 días desde hoy)
        const now = Date.now();
        if (tenant.current_period_ends_at && new Date(tenant.current_period_ends_at).getTime() > now + 30 * 86400000) {
          tenant.current_period_ends_at = new Date(now + 30 * 86400000);
          await this.tenantRepo.save(tenant);
        }
      }
    } else {
      // REGULAR plan: 10% por referido activo, topado estrictamente al 50%
      discountPercentage = Math.min(activeReferrals * 10, 50);
      const discounted = basePrice * (1 - discountPercentage / 100);
      // Piso dinámico: nunca menos del 50% de su precio base configurado
      const minAllowedFee = Math.round(basePrice * 0.5 * 100) / 100;
      finalFee = Math.max(minAllowedFee, Math.round(discounted * 100) / 100);
    }

    return {
      basePrice,
      activeReferrals,
      discountPercentage,
      finalFee,
    };
  }

  /**
   * Returns current tenant's subscription details, referral metrics, and unique referral code
   */
  async getMySubscription(tenantId: string): Promise<MySubscriptionDTO> {
    const { isValidUUID } = require('../utils/tenant-crypto');
    if (!isValidUUID(tenantId)) {
      return {
        tenantId: tenantId || 'platform-admin',
        tenantName: 'Plataforma Global',
        status: TenantStatus.ACTIVE,
        planType: TenantPlanType.REGULAR,
        referralCode: 'PLATFORM',
        basePrice: 0,
        activeReferrals: 0,
        totalReferrals: 0,
        discountPercentage: 0,
        finalFee: 0,
        trialDaysLeft: 999,
        daysLeft: 999,
        isExpired: false,
      };
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con id ${tenantId} no encontrado`);
    }

    // Ensure tenant has a referral code
    if (!tenant.referral_code) {
      const cleanPrefix = (tenant.name || 'FF')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() || 'FF';
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      tenant.referral_code = `${cleanPrefix}-${randomSuffix}`;
      await this.tenantRepo.save(tenant);
    }

    const feeCalc = await this.calculateMonthlyFee(tenantId);

    // Si calculateMonthlyFee actualizó el tenant (por ejemplo, auto-activando Pioneer), recargar estado actualizado
    const updatedTenant = await this.tenantRepo.findOne({ where: { id: tenantId } }) || tenant;

    const totalReferrals = await this.tenantRepo.count({
      where: { referred_by_tenant_id: tenantId },
    });

    const now = Date.now();
    let trialDaysLeft = 0;
    if (updatedTenant.status === TenantStatus.TRIAL) {
      const trialEnd = updatedTenant.trial_ends_at
        ? new Date(updatedTenant.trial_ends_at).getTime()
        : new Date(updatedTenant.createdAt).getTime() + 15 * 86400000;
      const diff = Math.ceil((trialEnd - now) / 86400000);
      trialDaysLeft = Math.max(0, diff);
    }

    let daysLeft = trialDaysLeft;
    if (updatedTenant.status === TenantStatus.ACTIVE) {
      if (updatedTenant.current_period_ends_at) {
        const periodEnd = new Date(updatedTenant.current_period_ends_at).getTime();
        daysLeft = Math.max(0, Math.ceil((periodEnd - now) / 86400000));
      } else {
        daysLeft = 30;
      }
    } else if (updatedTenant.status === TenantStatus.SUSPENDED || updatedTenant.status === TenantStatus.PAST_DUE) {
      daysLeft = 0;
    }

    const isPioneerFree = updatedTenant.plan_type === TenantPlanType.PIONEER && feeCalc.activeReferrals >= 2;
    // Solo SUSPENDIDO, inactivo o prueba finalizada bloquean totalmente (isExpired).
    // PAST_DUE (Vencido) tiene días de gracia y NO bloquea la navegación de la app.
    const isSuspended = !updatedTenant.isActive || updatedTenant.status === TenantStatus.SUSPENDED;
    const isTrialExpired = !isPioneerFree && updatedTenant.status === TenantStatus.TRIAL && trialDaysLeft <= 0;
    const isExpired = isSuspended || isTrialExpired;

    return {
      tenantId: updatedTenant.id,
      tenantName: updatedTenant.name,
      status: updatedTenant.status || TenantStatus.TRIAL,
      planType: updatedTenant.plan_type || TenantPlanType.REGULAR,
      referralCode: updatedTenant.referral_code,
      basePrice: feeCalc.basePrice,
      activeReferrals: feeCalc.activeReferrals,
      totalReferrals,
      discountPercentage: feeCalc.discountPercentage,
      finalFee: feeCalc.finalFee,
      trialDaysLeft,
      daysLeft,
      isExpired,
      trialEndsAt: updatedTenant.trial_ends_at ? new Date(updatedTenant.trial_ends_at).toISOString() : undefined,
      currentPeriodEndsAt: updatedTenant.current_period_ends_at
        ? new Date(updatedTenant.current_period_ends_at).toISOString()
        : undefined,
    };
  }

  /**
   * List all registered tenants with their owner, trial days left, plan, active referrals, and fee
   */
  async getTenants(): Promise<SuperAdminTenantDTO[]> {
    const tenants = await this.tenantRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (tenants.length === 0) return [];

    const tenantIds = tenants.map((t) => t.id);

    // Fetch tenant owners (admin role in UserTenantAccess)
    const accesses = await this.userAccessRepo.find({
      where: {
        tenantId: In(tenantIds),
        role: UserRole.ADMIN,
      },
      relations: { user: true },
    });

    const ownerMap = new Map<string, { id: string; name?: string; email: string }>();
    for (const acc of accesses) {
      if (!ownerMap.has(acc.tenantId) && acc.user) {
        ownerMap.set(acc.tenantId, {
          id: acc.user.id,
          name: acc.user.username,
          email: acc.user.email,
        });
      }
    }

    // Self-healing defensivo en tiempo de consulta: vincular compraventa con negocio prueba si aún no tiene referidor
    for (const t of tenants) {
      if (t.name?.toLowerCase().includes('compraventa') && !t.referred_by_tenant_id) {
        const parent = tenants.find((p) => p.name?.toLowerCase().includes('negocio prueba'));
        if (parent) {
          t.referred_by_tenant_id = parent.id;
          await this.tenantRepo.save(t);
          this.logger.log(`[Self-healing] compraventa auto-vinculado con negocio prueba (${parent.id})`);
        }
      }
    }

    // Name map for referrers
    const tenantNameMap = new Map<string, string>();
    tenants.forEach((t) => tenantNameMap.set(t.id, t.name));

    const now = Date.now();
    const result: SuperAdminTenantDTO[] = [];

    for (const t of tenants) {
      const feeCalc = await this.calculateMonthlyFee(t.id);

      // Si calculateMonthlyFee actualizó el tenant (por ejemplo, auto-activando Pioneer), recargar estado actualizado
      const currentT = (await this.tenantRepo.findOne({ where: { id: t.id } })) || t;

      let trialDaysLeft = 0;
      if (currentT.status === TenantStatus.TRIAL) {
        const trialEnd = currentT.trial_ends_at
          ? new Date(currentT.trial_ends_at).getTime()
          : new Date(currentT.createdAt).getTime() + 15 * 86400000;
        const diff = Math.ceil((trialEnd - now) / 86400000);
        trialDaysLeft = Math.max(0, diff);
      }

      result.push({
        id: currentT.id,
        name: currentT.name,
        status: currentT.status || TenantStatus.TRIAL,
        planType: currentT.plan_type || TenantPlanType.REGULAR,
        basePrice: Number(currentT.base_price) || 20.00,
        trialEndsAt: currentT.trial_ends_at ? new Date(currentT.trial_ends_at).toISOString() : undefined,
        currentPeriodEndsAt: currentT.current_period_ends_at
          ? new Date(currentT.current_period_ends_at).toISOString()
          : undefined,
        referredByTenantId: currentT.referred_by_tenant_id || undefined,
        referrerName: currentT.referred_by_tenant_id ? tenantNameMap.get(currentT.referred_by_tenant_id) : undefined,
        referralCode: currentT.referral_code || undefined,
        createdAt: new Date(currentT.createdAt).toISOString(),
        owner: ownerMap.get(currentT.id),
        trialDaysLeft,
        activeReferrals: feeCalc.activeReferrals,
        discountPercentage: feeCalc.discountPercentage,
        finalFee: feeCalc.finalFee,
      });
    }

    return result;
  }

  /**
   * Update tenant plan, status, or extend days manually
   */
  async updateTenantPlan(tenantId: string, dto: UpdateTenantPlanDTO): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con id ${tenantId} no encontrado`);
    }

    if (dto.planType) {
      tenant.plan_type = dto.planType;
    }

    if (dto.status) {
      tenant.status = dto.status;
    }

    if (dto.basePrice !== undefined && dto.basePrice >= 0) {
      tenant.base_price = dto.basePrice;
    }

    if (dto.referredByTenantId !== undefined) {
      tenant.referred_by_tenant_id = dto.referredByTenantId ? dto.referredByTenantId : (null as any);
    }

    if (dto.extendDays && dto.extendDays > 0) {
      const now = new Date();
      if (tenant.status === TenantStatus.TRIAL) {
        const base = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > now
          ? new Date(tenant.trial_ends_at)
          : now;
        tenant.trial_ends_at = new Date(base.getTime() + dto.extendDays * 86400000);
      } else {
        const base = tenant.current_period_ends_at && new Date(tenant.current_period_ends_at) > now
          ? new Date(tenant.current_period_ends_at)
          : now;
        tenant.current_period_ends_at = new Date(base.getTime() + dto.extendDays * 86400000);
      }
    }

    const saved = await this.tenantRepo.save(tenant);

    // Si tiene un referidor asignado, recalcular para el anfitrión (para actualizar descuentos o estatus pionero)
    if (saved.referred_by_tenant_id) {
      try {
        await this.calculateMonthlyFee(saved.referred_by_tenant_id);
      } catch (e: any) {
        this.logger.error(`Error recalculating referrer fee: ${e.message}`);
      }
    }

    return saved;
  }

  /**
   * List all pending SaaS payment reports
   */
  async getPendingPayments(): Promise<SaaSPaymentReportDTO[]> {
    const reports = await this.paymentReportRepo.find({
      where: { status: SaaSPaymentStatus.PENDING },
      relations: { tenant: true },
      order: { created_at: 'DESC' },
    });

    return reports.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant?.name || 'Negocio no identificado',
      amount: Number(r.amount),
      amountBs: r.amount_bs ? Number(r.amount_bs) : undefined,
      exchangeRate: r.exchange_rate ? Number(r.exchange_rate) : undefined,
      paymentMethod: r.payment_method,
      reference: r.reference,
      status: r.status,
      rejectReason: r.reject_reason || undefined,
      months: r.months || 1,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Approve payment report:
   * - Executes in transaction
   * - Marks report as APPROVED
   * - Extends tenant.current_period_ends_at by +30 days (from now or previous future expiration)
   * - Sets tenant.status to ACTIVE
   * - Generates promoter commission (ACTIVATION $10 or RECURRING 10%) if tenant is linked to a promoter
   */
  async approvePayment(reportId: string): Promise<{ success: boolean; message: string; tenant: Tenant; commission?: PromoterCommission | null }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedTenant: Tenant;
    let savedReport: SaaSPaymentReport;
    let generatedCommission: PromoterCommission | null = null;
    let monthsToExtend = 1;
    let daysToExtend = 30;

    try {
      const report = await queryRunner.manager.findOne(SaaSPaymentReport, {
        where: { id: reportId },
        relations: { tenant: true },
      });

      if (!report) {
        throw new NotFoundException(`Reporte de pago con id ${reportId} no encontrado`);
      }

      if (report.status === SaaSPaymentStatus.APPROVED) {
        throw new BadRequestException('Este pago ya fue aprobado previamente');
      }

      const tenant = await queryRunner.manager.findOne(Tenant, { where: { id: report.tenant_id } });
      if (!tenant) {
        throw new NotFoundException(`Negocio asociado no encontrado`);
      }

      // Extend current_period_ends_at dynamically based on reported months
      const now = new Date();
      const baseDate = tenant.current_period_ends_at && new Date(tenant.current_period_ends_at) > now
        ? new Date(tenant.current_period_ends_at)
        : now;

      monthsToExtend = report.months && report.months > 0 ? report.months : 1;
      daysToExtend = monthsToExtend === 12 ? 365 : monthsToExtend * 30;

      tenant.current_period_ends_at = new Date(baseDate.getTime() + daysToExtend * 86400000);
      tenant.status = TenantStatus.ACTIVE;
      tenant.isActive = true;

      report.status = SaaSPaymentStatus.APPROVED;
      report.reject_reason = null;

      savedTenant = await queryRunner.manager.save(Tenant, tenant);
      savedReport = await queryRunner.manager.save(SaaSPaymentReport, report);

      // Promoter Commission Dispatch
      if (savedTenant.promoterId) {
        const activationCommissionsCount = await queryRunner.manager.count(PromoterCommission, {
          where: {
            promoterId: savedTenant.promoterId,
            tenantId: savedTenant.id,
            type: PromoterCommissionType.ACTIVATION,
          },
        });

        if (activationCommissionsCount === 0) {
          // Caso A: Primera Activación ($10 USD)
          const commission = queryRunner.manager.create(PromoterCommission, {
            promoterId: savedTenant.promoterId,
            tenantId: savedTenant.id,
            type: PromoterCommissionType.ACTIVATION,
            amountUSD: 10.00,
            status: PromoterCommissionStatus.PENDING,
            saasPaymentReportId: savedReport.id,
          });
          generatedCommission = await queryRunner.manager.save(PromoterCommission, commission);
        } else {
          // Caso B: Renovación Mensual (10% del monto neto cobrado)
          const netAmount = Number(savedReport.amount) || 0;
          const recurringAmount = Math.round(netAmount * 0.10 * 100) / 100;
          const commission = queryRunner.manager.create(PromoterCommission, {
            promoterId: savedTenant.promoterId,
            tenantId: savedTenant.id,
            type: PromoterCommissionType.RECURRING,
            amountUSD: recurringAmount,
            status: PromoterCommissionStatus.PENDING,
            saasPaymentReportId: savedReport.id,
          });
          generatedCommission = await queryRunner.manager.save(PromoterCommission, commission);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    try {
      const periodLabel = monthsToExtend === 12 ? '1 año (365 días)' : `${monthsToExtend} mes(es) (${daysToExtend} días)`;
      await this.notificationsService.sendNotificationToNegocio(
        savedTenant.id,
        {
          title: '¡Pago de Suscripción Aprobado! 🎉',
          body: `Tu pago de suscripción ha sido verificado. Tu acceso se extendió por ${periodLabel}.`,
          data: { url: '/settings' },
        },
        ['ADMIN'],
      );
    } catch (err: any) {
      this.logger.error(`Error notifying tenant of payment approval: ${err.message}`);
    }

    // Si el negocio que pagó tiene un referidor registrado, recalcular la cuota y estatus del anfitrión
    if (savedTenant.referred_by_tenant_id) {
      try {
        await this.calculateMonthlyFee(savedTenant.referred_by_tenant_id);
      } catch (err: any) {
        this.logger.error(`Error recalculating referrer fee on payment approval: ${err.message}`);
      }
    }

    const durationLabel = monthsToExtend === 12 ? '365 días (1 año)' : `${daysToExtend} días (${monthsToExtend} mes${monthsToExtend > 1 ? 'es' : ''})`;
    return {
      success: true,
      message: `Pago de $${savedReport.amount} aprobado con éxito. Periodo de ${savedTenant.name} extendido ${durationLabel} hasta el ${savedTenant.current_period_ends_at.toLocaleDateString('es-VE')}.`,
      tenant: savedTenant,
      commission: generatedCommission,
    };
  }

  /**
   * Reject payment report with a reason note
   */
  async rejectPayment(reportId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const report = await this.paymentReportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Reporte de pago con id ${reportId} no encontrado`);
    }

    report.status = SaaSPaymentStatus.REJECTED;
    report.reject_reason = reason || 'Pago no verificado o referencia inválida';

    await this.paymentReportRepo.save(report);

    try {
      await this.notificationsService.sendNotificationToNegocio(
        report.tenant_id,
        {
          title: 'Comprobante de Pago Rechazado ⚠️',
          body: `Motivo: ${reason || 'Comprobante no válido o pago no recibido.'}`,
          data: { url: '/settings' },
        },
        ['ADMIN'],
      );
    } catch (err: any) {
      this.logger.error(`Error notifying tenant of payment rejection: ${err.message}`);
    }

    return {
      success: true,
      message: 'Reporte de pago rechazado',
    };
  }

  /**
   * Create a new SaaS payment report (called by tenant admin)
   */
  async reportPayment(tenantId: string, data: {
    amount: number;
    amount_bs?: number;
    exchange_rate?: number;
    payment_method: any;
    reference: string;
    months?: number;
  }): Promise<SaaSPaymentReport> {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!data.reference || !data.reference.trim()) {
      throw new BadRequestException('La referencia de pago es obligatoria');
    }

    const cleanReference = data.reference.trim();

    // Validar que la referencia bancaria no esté ya registrada en estado pendiente o aprobada
    const existingReport = await this.paymentReportRepo.findOne({
      where: {
        reference: cleanReference,
        status: In([SaaSPaymentStatus.PENDING, SaaSPaymentStatus.APPROVED]),
      },
    });

    if (existingReport) {
      throw new BadRequestException(
        `La referencia "${cleanReference}" ya fue registrada previamente y está pendiente o aprobada.`
      );
    }

    const months = data.months && data.months > 0 ? Number(data.months) : 1;

    const report = this.paymentReportRepo.create({
      tenant_id: tenantId,
      amount: data.amount,
      amount_bs: data.amount_bs || null,
      exchange_rate: data.exchange_rate || null,
      payment_method: data.payment_method,
      reference: cleanReference,
      status: SaaSPaymentStatus.PENDING,
      months,
    });

    const saved = await this.paymentReportRepo.save(report);

    try {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      const storeName = tenant?.name || 'Un negocio';
      const formattedAmount = Number(data.amount).toFixed(2);
      const periodLabel = months === 12 ? '1 año' : `${months} mes${months > 1 ? 'es' : ''}`;

      await this.notificationsService.notifySuperAdmin({
        title: '¡Nuevo Pago de Suscripción Reportado!',
        body: `${storeName} reportó $${formattedAmount} USD (${periodLabel}, Ref: ${cleanReference}). Toca para revisar y aprobar.`,
        data: {
          url: '/platform-admin?tab=payments',
          reportId: saved.id,
          tenantId,
          type: 'SAAS_PAYMENT_REPORT',
        },
      });
    } catch (err: any) {
      this.logger.error(`Error notifying superadmin of payment report: ${err.message}`);
    }

    return saved;
  }

  /**
   * Get global platform payment & subscription configuration
   */
  async getPlatformConfig(): Promise<PlatformConfig> {
    let config = await this.platformConfigRepo.findOne({ where: { id: 'default' } });
    if (!config) {
      config = this.platformConfigRepo.create({
        id: 'default',
        companyBank: 'Banesco',
        companyCedula: 'J-12345678-0',
        companyPhone: '0414-1234567',
        companyAccountNumber: '01340000000000000000',
        companyAccountHolder: `${APP_NAME} SaaS`,
        binancePayId: '123456789',
        binanceEmail: 'pagos@finowork.com',
        defaultMonthlyPrice: 20.0,
        defaultTrialDays: 15,
      });
      await this.platformConfigRepo.save(config);
    }
    return config;
  }

  /**
   * Update global platform payment & subscription configuration (SuperAdmin only)
   */
  async updatePlatformConfig(dto: UpdatePlatformConfigDto): Promise<PlatformConfig> {
    const config = await this.getPlatformConfig();
    Object.assign(config, dto);
    return await this.platformConfigRepo.save(config);
  }

  /**
   * Helper to calculate rank, bonus, and next rank based on monthly activations
   */
  calculateRank(monthlyActivations: number): {
    rank: PromoterRank;
    bonusUSD: number;
    emoji: string;
    nextRank: { rank: PromoterRank; rankEmoji: string; activationsNeeded: number; bonusUSD: number } | null;
  } {
    if (monthlyActivations >= 20) {
      return {
        rank: PromoterRank.ORO,
        bonusUSD: 50.00,
        emoji: '🥇',
        nextRank: null,
      };
    } else if (monthlyActivations >= 10) {
      return {
        rank: PromoterRank.PLATA,
        bonusUSD: 25.00,
        emoji: '🥈',
        nextRank: {
          rank: PromoterRank.ORO,
          rankEmoji: '🥇',
          activationsNeeded: 20 - monthlyActivations,
          bonusUSD: 50.00,
        },
      };
    } else if (monthlyActivations >= 5) {
      return {
        rank: PromoterRank.BRONCE,
        bonusUSD: 10.00,
        emoji: '🥉',
        nextRank: {
          rank: PromoterRank.PLATA,
          rankEmoji: '🥈',
          activationsNeeded: 10 - monthlyActivations,
          bonusUSD: 25.00,
        },
      };
    } else {
      return {
        rank: PromoterRank.MADERA,
        bonusUSD: 0,
        emoji: '🪵',
        nextRank: {
          rank: PromoterRank.BRONCE,
          rankEmoji: '🥉',
          activationsNeeded: 5 - monthlyActivations,
          bonusUSD: 10.00,
        },
      };
    }
  }

  /**
   * SuperAdmin: Retorna reporte global de promotores, rangos y saldos pendientes.
   */
  async getPromotersOverview(): Promise<SuperAdminPromoterDTO[]> {
    const promoters = await this.promoterRepo.find({
      relations: {
        user: true,
        commissions: true,
        tenants: true,
      },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return promoters.map((promoter) => {
      const commissions = promoter.commissions || [];
      const monthlyActivations = commissions.filter((c) => {
        const cDate = new Date(c.createdAt);
        return (
          c.type === PromoterCommissionType.ACTIVATION &&
          cDate >= startOfMonth &&
          cDate <= endOfMonth
        );
      }).length;

      const rankInfo = this.calculateRank(monthlyActivations);

      let pendingBalanceUSD = 0;
      let paidBalanceUSD = 0;
      let totalCommissionsUSD = 0;

      commissions.forEach((c) => {
        const amt = Number(c.amountUSD) || 0;
        totalCommissionsUSD += amt;
        if (c.status === PromoterCommissionStatus.PENDING) {
          pendingBalanceUSD += amt;
        } else if (c.status === PromoterCommissionStatus.PAID) {
          paidBalanceUSD += amt;
        }
      });

      // Map commissions DTO
      const commissionsDto: PromoterCommissionDTO[] = commissions.map((c) => ({
        id: c.id,
        promoterId: c.promoterId,
        tenantId: c.tenantId,
        type: c.type,
        amountUSD: Number(c.amountUSD),
        saasPaymentReportId: c.saasPaymentReportId,
        status: c.status,
        paidAt: c.paidAt ? new Date(c.paidAt).toISOString() : null,
        paymentReference: c.paymentReference,
        createdAt: new Date(c.createdAt).toISOString(),
      }));

      return {
        id: promoter.id,
        userId: promoter.userId,
        username: promoter.user?.username || 'Desconocido',
        email: promoter.user?.email || '',
        phone: promoter.user?.phone || null,
        code: promoter.code,
        isActive: promoter.isActive,
        pagoMovilPhone: promoter.pagoMovilPhone,
        pagoMovilCedula: promoter.pagoMovilCedula,
        pagoMovilBank: promoter.pagoMovilBank,
        binancePayId: promoter.binancePayId,
        currentRank: rankInfo.rank,
        monthlyActivations,
        rankBonusUSD: rankInfo.bonusUSD,
        totalAffiliatedTenants: (promoter.tenants || []).length,
        pendingBalanceUSD: Math.round(pendingBalanceUSD * 100) / 100,
        paidBalanceUSD: Math.round(paidBalanceUSD * 100) / 100,
        totalCommissionsUSD: Math.round(totalCommissionsUSD * 100) / 100,
        commissions: commissionsDto,
        createdAt: new Date(promoter.createdAt).toISOString(),
      };
    });
  }

  /**
   * SuperAdmin: Cambia el estatus de una comisión a 'PAID', guardando la referencia de Pago Móvil o Binance y la fecha actual.
   */
  async payPromoterCommission(commissionId: string, paymentReference: string): Promise<PromoterCommission> {
    if (!paymentReference || !paymentReference.trim()) {
      throw new BadRequestException('La referencia de pago es obligatoria');
    }

    const commission = await this.commissionRepo.findOne({
      where: { id: commissionId },
      relations: { promoter: true },
    });

    if (!commission) {
      throw new NotFoundException(`Comisión con id ${commissionId} no encontrada`);
    }

    if (commission.status === PromoterCommissionStatus.PAID) {
      throw new BadRequestException('Esta comisión ya fue pagada previamente');
    }

    commission.status = PromoterCommissionStatus.PAID;
    commission.paidAt = new Date();
    commission.paymentReference = paymentReference.trim();

    return await this.commissionRepo.save(commission);
  }

  /**
   * SuperAdmin: Crear un nuevo Promotor de Calle y su cuenta de usuario.
   */
  async createPromoter(dto: CreatePromoterDTO): Promise<SuperAdminPromoterDTO> {
    if (!dto.email || !dto.email.trim()) {
      throw new BadRequestException('El correo electrónico es obligatorio');
    }
    if (!dto.username || !dto.username.trim()) {
      throw new BadRequestException('El nombre de usuario es obligatorio');
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    // Validar si ya existe el usuario
    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con este correo electrónico o nombre de usuario');
    }

    // Código de promotor
    let code = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!code) {
      // Generar código único: PROM-NOMBRE o PROM-XXXX
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      code = `PROM-${sanitizedUsername || 'AGENTE'}${randomSuffix}`;
    } else {
      if (!code.startsWith('PROM-')) {
        code = `PROM-${code}`;
      }
    }

    // Verificar si el código ya existe
    const existingPromoterWithCode = await this.promoterRepo.findOne({
      where: { code },
    });
    if (existingPromoterWithCode) {
      throw new BadRequestException(`El código de promotor ${code} ya está en uso`);
    }

    // Contraseña
    const plainPassword = dto.password && dto.password.trim() ? dto.password.trim() : '123456';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Crear el usuario con rol PROMOTOR
    const user = this.userRepo.create({
      username,
      email,
      passwordHash,
      role: UserRole.PROMOTOR,
      phone: dto.phone ? dto.phone.trim() : undefined,
      isEmailVerified: true,
    });
    const savedUser = await this.userRepo.save(user);

    // Crear la ficha de Promotor
    const promoter = this.promoterRepo.create({
      userId: savedUser.id,
      code,
      pagoMovilPhone: dto.pagoMovilPhone ? dto.pagoMovilPhone.trim() : null,
      pagoMovilCedula: dto.pagoMovilCedula ? dto.pagoMovilCedula.trim() : null,
      pagoMovilBank: dto.pagoMovilBank ? dto.pagoMovilBank.trim() : null,
      binancePayId: dto.binancePayId ? dto.binancePayId.trim() : null,
      isActive: true,
    });
    const savedPromoter = await this.promoterRepo.save(promoter);

    return {
      id: savedPromoter.id,
      userId: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      phone: savedUser.phone || null,
      code: savedPromoter.code,
      isActive: savedPromoter.isActive,
      pagoMovilPhone: savedPromoter.pagoMovilPhone,
      pagoMovilCedula: savedPromoter.pagoMovilCedula,
      pagoMovilBank: savedPromoter.pagoMovilBank,
      binancePayId: savedPromoter.binancePayId,
      currentRank: PromoterRank.MADERA,
      monthlyActivations: 0,
      rankBonusUSD: 0,
      totalAffiliatedTenants: 0,
      pendingBalanceUSD: 0,
      paidBalanceUSD: 0,
      totalCommissionsUSD: 0,
      commissions: [],
      createdAt: savedPromoter.createdAt ? savedPromoter.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}


