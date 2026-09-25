import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentStatus,
  SuperAdminTenantDTO,
  UpdateTenantPlanDTO,
  SaaSPaymentReportDTO,
  UserRole,
  MySubscriptionDTO,
} from '@nutrideli/shared-types';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SaaSPaymentReport)
    private readonly paymentReportRepo: Repository<SaaSPaymentReport>,
    @InjectRepository(UserTenantAccess)
    private readonly userAccessRepo: Repository<UserTenantAccess>,
    @InjectRepository(PlatformConfig)
    private readonly platformConfigRepo: Repository<PlatformConfig>,
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

    // Count how many active tenants were referred by this tenant
    const activeReferrals = await this.tenantRepo.count({
      where: {
        referred_by_tenant_id: tenantId,
        status: TenantStatus.ACTIVE,
      },
    });

    let discountPercentage = 0;
    let finalFee = basePrice;

    if (planType === TenantPlanType.PIONEER) {
      if (activeReferrals >= 2) {
        discountPercentage = 100;
        finalFee = 0;
      } else {
        discountPercentage = 0;
        finalFee = basePrice;
      }
    } else {
      // REGULAR plan
      discountPercentage = Math.min(activeReferrals * 10, 50);
      const discounted = basePrice * (1 - discountPercentage / 100);
      finalFee = Math.max(10, Math.round(discounted * 100) / 100);
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

    const totalReferrals = await this.tenantRepo.count({
      where: { referred_by_tenant_id: tenantId },
    });

    const now = Date.now();
    let trialDaysLeft = 0;
    if (tenant.status === TenantStatus.TRIAL) {
      const trialEnd = tenant.trial_ends_at
        ? new Date(tenant.trial_ends_at).getTime()
        : new Date(tenant.createdAt).getTime() + 15 * 86400000;
      const diff = Math.ceil((trialEnd - now) / 86400000);
      trialDaysLeft = Math.max(0, diff);
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: tenant.status || TenantStatus.TRIAL,
      planType: tenant.plan_type || TenantPlanType.REGULAR,
      referralCode: tenant.referral_code,
      basePrice: feeCalc.basePrice,
      activeReferrals: feeCalc.activeReferrals,
      totalReferrals,
      discountPercentage: feeCalc.discountPercentage,
      finalFee: feeCalc.finalFee,
      trialDaysLeft,
      trialEndsAt: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toISOString() : undefined,
      currentPeriodEndsAt: tenant.current_period_ends_at
        ? new Date(tenant.current_period_ends_at).toISOString()
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

    // Name map for referrers
    const tenantNameMap = new Map<string, string>();
    tenants.forEach((t) => tenantNameMap.set(t.id, t.name));

    const now = Date.now();
    const result: SuperAdminTenantDTO[] = [];

    for (const t of tenants) {
      const feeCalc = await this.calculateMonthlyFee(t.id);

      let trialDaysLeft = 0;
      if (t.status === TenantStatus.TRIAL) {
        const trialEnd = t.trial_ends_at
          ? new Date(t.trial_ends_at).getTime()
          : new Date(t.createdAt).getTime() + 15 * 86400000;
        const diff = Math.ceil((trialEnd - now) / 86400000);
        trialDaysLeft = Math.max(0, diff);
      }

      result.push({
        id: t.id,
        name: t.name,
        status: t.status || TenantStatus.TRIAL,
        planType: t.plan_type || TenantPlanType.REGULAR,
        basePrice: Number(t.base_price) || 20.00,
        trialEndsAt: t.trial_ends_at ? new Date(t.trial_ends_at).toISOString() : undefined,
        currentPeriodEndsAt: t.current_period_ends_at
          ? new Date(t.current_period_ends_at).toISOString()
          : undefined,
        referredByTenantId: t.referred_by_tenant_id || undefined,
        referrerName: t.referred_by_tenant_id ? tenantNameMap.get(t.referred_by_tenant_id) : undefined,
        referralCode: t.referral_code || undefined,
        createdAt: new Date(t.createdAt).toISOString(),
        owner: ownerMap.get(t.id),
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

    return await this.tenantRepo.save(tenant);
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
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Approve payment report:
   * - Marks report as APPROVED
   * - Extends tenant.current_period_ends_at by +30 days (from now or previous future expiration)
   * - Sets tenant.status to ACTIVE
   */
  async approvePayment(reportId: string): Promise<{ success: boolean; message: string; tenant: Tenant }> {
    const report = await this.paymentReportRepo.findOne({
      where: { id: reportId },
      relations: { tenant: true },
    });

    if (!report) {
      throw new NotFoundException(`Reporte de pago con id ${reportId} no encontrado`);
    }

    if (report.status === SaaSPaymentStatus.APPROVED) {
      throw new BadRequestException('Este pago ya fue aprobado previamente');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: report.tenant_id } });
    if (!tenant) {
      throw new NotFoundException(`Negocio asociado no encontrado`);
    }

    // Extend current_period_ends_at by 30 days
    const now = new Date();
    const baseDate = tenant.current_period_ends_at && new Date(tenant.current_period_ends_at) > now
      ? new Date(tenant.current_period_ends_at)
      : now;

    tenant.current_period_ends_at = new Date(baseDate.getTime() + 30 * 86400000);
    tenant.status = TenantStatus.ACTIVE;
    tenant.isActive = true;

    report.status = SaaSPaymentStatus.APPROVED;
    report.reject_reason = null;

    await this.tenantRepo.save(tenant);
    await this.paymentReportRepo.save(report);

    return {
      success: true,
      message: `Pago de $${report.amount} aprobado con éxito. Periodo de ${tenant.name} extendido 30 días hasta el ${tenant.current_period_ends_at.toLocaleDateString('es-VE')}.`,
      tenant,
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
  }): Promise<SaaSPaymentReport> {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!data.reference || !data.reference.trim()) {
      throw new BadRequestException('La referencia de pago es obligatoria');
    }

    const report = this.paymentReportRepo.create({
      tenant_id: tenantId,
      amount: data.amount,
      amount_bs: data.amount_bs || null,
      exchange_rate: data.exchange_rate || null,
      payment_method: data.payment_method,
      reference: data.reference.trim(),
      status: SaaSPaymentStatus.PENDING,
    });

    return await this.paymentReportRepo.save(report);
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
        companyAccountHolder: 'Flujo Fino SaaS',
        binancePayId: '123456789',
        binanceEmail: 'pagos@flujofino.com',
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
}

