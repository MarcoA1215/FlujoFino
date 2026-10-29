import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Like } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { User } from '../entities/user.entity';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { PlatformExpense } from '../entities/platform-expense.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';
import { UpdateSuperAdminProfileDto } from './dto/update-superadmin-profile.dto';
import { CreatePlatformExpenseDto } from './dto/create-platform-expense.dto';
import { RecordSeniatPaymentDto } from './dto/record-seniat-payment.dto';
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
  PromoterAffiliatedTenantDTO,
  PromoterReferralSubStatus,
  CreatePromoterDTO,
  PlatformExpenseType,
  PlatformExpenseCategory,
  PlatformExpenseDTO,
  SuperAdminFinanceMetricsDTO,
  APP_NAME,
} from '@finowork/shared-types';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  async onModuleInit() {
    try {
      // Auto-healing defensivo de la tabla saas_payment_reports y platform_expenses
      await this.paymentReportRepo.query(`
        ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "months" integer DEFAULT 1;
        ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10, 2);
        ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "iva_amount" numeric(10, 2);

        CREATE TABLE IF NOT EXISTS "platform_expenses" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "type" character varying(50) NOT NULL,
          "category" character varying(100) NOT NULL,
          "description" text NOT NULL,
          "amount" numeric(12, 2) NOT NULL,
          "amount_bs" numeric(14, 2),
          "exchange_rate" numeric(10, 2),
          "payment_method" character varying(50) DEFAULT 'TRANSFERENCIA',
          "reference" character varying(255),
          "expense_date" TIMESTAMP NOT NULL DEFAULT now(),
          "tax_period" character varying(50),
          "promoter_id" uuid,
          "metadata" jsonb,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_platform_expenses_id" PRIMARY KEY ("id")
        );

        CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_type" ON "platform_expenses" ("type");
        CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_expense_date" ON "platform_expenses" ("expense_date");
        CREATE INDEX IF NOT EXISTS "IDX_platform_expenses_category" ON "platform_expenses" ("category");

        UPDATE "saas_payment_reports"
        SET
          "subtotal" = ROUND("amount" / 1.16, 2),
          "iva_amount" = ROUND("amount" - ROUND("amount" / 1.16, 2), 2)
        WHERE "subtotal" IS NULL;
      `);
    } catch (err: any) {
      this.logger.warn(`Nota de auto-healing para saas_payment_reports / platform_expenses: ${err?.message || err}`);
    }

    if (process.env.NODE_ENV !== 'production') {
      try {
        // Auto-healing para desarrollo local / demo: vincular 'compraventa' a 'negocio prueba' si aplica
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
            this.logger.log(`[Auto-healing Dev] Negocio 'compraventa' (${compraventa.id}) vinculado a 'negocio prueba' (${negocioPrueba.id}).`);
            await this.calculateMonthlyFee(negocioPrueba.id);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Nota de auto-healing dev al iniciar SuperAdminService: ${err?.message || err}`);
      }
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
    @InjectRepository(PlatformExpense)
    private readonly platformExpenseRepo: Repository<PlatformExpense>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Referral Discount Engine:
   * Counts active referred tenants (referred_by_tenant_id = tenantId AND status = 'ACTIVE')
   * PIONEER: >= 2 active referrals -> 100% discount ($0 fee), else 0% ($base_price + 16% IVA).
   * REGULAR: min(referrals * 10%, 50%) discount, subtotal = base_price * (1 - discount), min $10 + 16% IVA.
   * Mensualidad base: $20.00 + IVA (16% = $3.20) -> $23.20 final fee.
   */
  async calculateMonthlyFee(tenantId: string): Promise<{
    basePrice: number;
    activeReferrals: number;
    discountPercentage: number;
    subtotalFee: number;
    ivaPercentage: number;
    ivaAmount: number;
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
    let subtotalFee = basePrice;

    if (planType === TenantPlanType.PIONEER) {
      if (activeReferrals >= 2) {
        discountPercentage = 100;
        subtotalFee = 0;

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
        subtotalFee = basePrice;

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
      subtotalFee = Math.max(minAllowedFee, Math.round(discounted * 100) / 100);
    }

    const ivaPercentage = 16;
    const ivaAmount = subtotalFee > 0 ? Math.round(subtotalFee * 0.16 * 100) / 100 : 0;
    const finalFee = Math.round((subtotalFee + ivaAmount) * 100) / 100;

    return {
      basePrice,
      activeReferrals,
      discountPercentage,
      subtotalFee,
      ivaPercentage,
      ivaAmount,
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
        subtotalFee: 0,
        ivaPercentage: 16,
        ivaAmount: 0,
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
    const isPioneerFree = updatedTenant.plan_type === TenantPlanType.PIONEER && feeCalc.activeReferrals >= 2;

    if (updatedTenant.status === TenantStatus.TRIAL) {
      const trialEnd = updatedTenant.trial_ends_at
        ? new Date(updatedTenant.trial_ends_at).getTime()
        : new Date(updatedTenant.createdAt).getTime() + 15 * 86400000;
      const diff = Math.ceil((trialEnd - now) / 86400000);
      trialDaysLeft = Math.max(0, diff);

      // Auto-transición persistente si el período de prueba llegó a 0
      if (trialDaysLeft <= 0 && !isPioneerFree) {
        updatedTenant.status = TenantStatus.PAST_DUE;
        await this.tenantRepo.save(updatedTenant);
      }
    } else if (updatedTenant.status === TenantStatus.ACTIVE) {
      // Auto-transición persistente si el período mensual concluyó
      if (updatedTenant.current_period_ends_at && new Date(updatedTenant.current_period_ends_at).getTime() < now && !isPioneerFree) {
        updatedTenant.status = TenantStatus.PAST_DUE;
        await this.tenantRepo.save(updatedTenant);
      }
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

    // Solo SUSPENDIDO o inactivo bloquean totalmente (isExpired).
    // PAST_DUE (Vencido) mantiene acceso a la app con alerta y días de gracia.
    const isSuspended = !updatedTenant.isActive || updatedTenant.status === TenantStatus.SUSPENDED;
    const isExpired = isSuspended;

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
      subtotalFee: feeCalc.subtotalFee,
      ivaPercentage: feeCalc.ivaPercentage,
      ivaAmount: feeCalc.ivaAmount,
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
      const isPioneerFree = currentT.plan_type === TenantPlanType.PIONEER && feeCalc.activeReferrals >= 2;

      if (currentT.status === TenantStatus.TRIAL) {
        const trialEnd = currentT.trial_ends_at
          ? new Date(currentT.trial_ends_at).getTime()
          : new Date(currentT.createdAt).getTime() + 15 * 86400000;
        const diff = Math.ceil((trialEnd - now) / 86400000);
        trialDaysLeft = Math.max(0, diff);

        // Auto-transición persistente: Si la prueba llegó a 0 y no es Pionero bonificado, marcar como PAST_DUE (Vencido)
        if (trialDaysLeft <= 0 && !isPioneerFree) {
          currentT.status = TenantStatus.PAST_DUE;
          await this.tenantRepo.save(currentT);
        }
      } else if (currentT.status === TenantStatus.ACTIVE) {
        // Auto-transición persistente: Si el período mensual pagado venció y no es Pionero bonificado, marcar como PAST_DUE (Vencido)
        if (currentT.current_period_ends_at && new Date(currentT.current_period_ends_at).getTime() < now && !isPioneerFree) {
          currentT.status = TenantStatus.PAST_DUE;
          await this.tenantRepo.save(currentT);
        }
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
        subtotalFee: feeCalc.subtotalFee,
        ivaPercentage: feeCalc.ivaPercentage,
        ivaAmount: feeCalc.ivaAmount,
        finalFee: feeCalc.finalFee,
        isTest: Boolean(currentT.isTest),
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

    if (dto.isTest !== undefined) {
      tenant.isTest = Boolean(dto.isTest);
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
   * Delete a tenant and all its associated data (SuperAdmin direct action)
   */
  async deleteTenant(tenantId: string): Promise<{ success: boolean; message: string }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Negocio con ID ${tenantId} no encontrado`);
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Quitar referencia de referidos hacia este tenant
      await manager.query(
        `UPDATE "tenant" SET "referred_by_tenant_id" = NULL WHERE "referred_by_tenant_id" = $1`,
        [tenantId],
      );

      // 2. Comisiones de promotores (debe borrarse antes de saas_payment_reports debido a FK saasPaymentReportId)
      await manager.query(
        `DELETE FROM "promoter_commissions" 
         WHERE "tenantId" = $1 
            OR "saasPaymentReportId" IN (SELECT id FROM "saas_payment_reports" WHERE "tenant_id" = $1)`,
        [tenantId],
      );

      // 3. Reportes de pago SaaS del tenant
      await manager.query(`DELETE FROM "saas_payment_reports" WHERE "tenant_id" = $1`, [tenantId]);

      // 4. Facturación fiscal y comprobantes (debe borrarse antes de order debido a FK orderId)
      await manager.query(`DELETE FROM "fiscal_invoices" WHERE "tenantId" = $1`, [tenantId]);

      // 5. Medios de items de órdenes (debe borrarse antes de order_item debido a FK orderItemId)
      await manager.query(`DELETE FROM "order_item_media" WHERE "tenantId" = $1`, [tenantId]);

      // 6. Items de órdenes (debe borrarse antes de order y product)
      await manager.query(
        `DELETE FROM "order_item" WHERE "orderId" IN (SELECT id FROM "order" WHERE "tenantId" = $1)`,
        [tenantId],
      );

      // 7. Órdenes de venta
      await manager.query(`DELETE FROM "order" WHERE "tenantId" = $1`, [tenantId]);

      // 8. Recetas de productos (debe borrarse antes de product y raw_material)
      await manager.query(
        `DELETE FROM "recipe_item" 
         WHERE "productId" IN (SELECT id FROM "product" WHERE "tenantId" = $1)
            OR "rawMaterialId" IN (SELECT id FROM "raw_material" WHERE "tenantId" = $1)`,
        [tenantId],
      );

      // 9. Combos de productos (debe borrarse antes de product)
      await manager.query(
        `DELETE FROM "combo_item" 
         WHERE "comboId" IN (SELECT id FROM "product" WHERE "tenantId" = $1)
            OR "componentId" IN (SELECT id FROM "product" WHERE "tenantId" = $1)`,
        [tenantId],
      );

      // 10. Variantes de producto
      await manager.query(`DELETE FROM "product_variant" WHERE "tenantId" = $1`, [tenantId]);

      // 11. Batches de producción
      await manager.query(`DELETE FROM "production_batch" WHERE "tenantId" = $1`, [tenantId]);

      // 12. Movimientos de stock
      await manager.query(`DELETE FROM "stock_movement" WHERE "tenantId" = $1`, [tenantId]);

      // 13. Productos y Materia Prima
      await manager.query(`DELETE FROM "product" WHERE "tenantId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "raw_material" WHERE "tenantId" = $1`, [tenantId]);

      // 14. Reservas y Citas (debe borrarse antes de customers y users)
      await manager.query(`DELETE FROM "reservation" WHERE "tenantId" = $1`, [tenantId]);

      // 15. Clientes y Zonas de entrega (órdenes y reservas ya fueron borradas)
      await manager.query(`DELETE FROM "customers" WHERE "tenantId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "delivery_zone" WHERE "tenantId" = $1`, [tenantId]);

      // 16. Tesorería, Inversiones, Gastos y Adelantos de Sueldo
      await manager.query(`DELETE FROM "cash_exchanges" WHERE "tenantId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "operating_expenses" WHERE "tenantId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "investments" WHERE "negocioId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "salary_advances" WHERE "negocioId" = $1`, [tenantId]);

      // 17. Feedback y Solicitudes de Acceso
      await manager.query(`DELETE FROM "feedback" WHERE "tenantId" = $1`, [tenantId]);
      await manager.query(`DELETE FROM "access_request" WHERE "tenantId" = $1`, [tenantId]);

      // 18. Notificaciones push (la columna es negocioId)
      await manager.query(`DELETE FROM "push_subscriptions" WHERE "negocioId" = $1`, [tenantId]);

      // 19. Horarios de trabajo (FK hacia user_tenant_access)
      await manager.query(
        `DELETE FROM "work_schedule" 
         WHERE "userTenantAccessId" IN (SELECT id FROM "user_tenant_access" WHERE "tenantId" = $1)`,
        [tenantId],
      );

      // 20. Configuración de negocio (Settings)
      await manager.query(`DELETE FROM "settings" WHERE "tenantId" = $1`, [tenantId]);

      // 21. Identificar usuarios asociados antes de borrar accesos
      const userRows: { userId: string }[] = await manager.query(
        `SELECT DISTINCT "userId" FROM "user_tenant_access" WHERE "tenantId" = $1`,
        [tenantId],
      );

      // 22. Borrar accesos del tenant
      await manager.query(`DELETE FROM "user_tenant_access" WHERE "tenantId" = $1`, [tenantId]);

      // 23. Eliminar usuarios huérfanos que ya no pertenezcan a ningún negocio y no sean SUPERADMIN ni promotores
      for (const row of userRows) {
        if (!row.userId) continue;
        const otherAccess = await manager.query(
          `SELECT COUNT(*) as count FROM "user_tenant_access" WHERE "userId" = $1`,
          [row.userId],
        );
        const otherCount = Number(otherAccess[0]?.count || 0);

        if (otherCount === 0) {
          const promoterCount = await manager.query(
            `SELECT COUNT(*) as count FROM "promoters" WHERE "userId" = $1`,
            [row.userId],
          );
          if (Number(promoterCount[0]?.count || 0) === 0) {
            await manager.query(`DELETE FROM "users" WHERE id = $1 AND role != 'SUPERADMIN'`, [row.userId]);
          }
        }
      }

      // 24. Finalmente eliminar el negocio (Tenant)
      await manager.query(`DELETE FROM "tenant" WHERE id = $1`, [tenantId]);
    });

    this.logger.log(`[SuperAdmin] Negocio "${tenant.name}" (${tenantId}) y todos sus datos fueron eliminados.`);
    return {
      success: true,
      message: `El negocio "${tenant.name}" y todos sus datos fueron eliminados de forma definitiva.`,
    };
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
      subtotal: r.subtotal ? Number(r.subtotal) : Math.round((Number(r.amount) / 1.16) * 100) / 100,
      ivaAmount: r.iva_amount ? Number(r.iva_amount) : Math.round((Number(r.amount) - (Number(r.amount) / 1.16)) * 100) / 100,
      isTest: Boolean(r.tenant?.isTest),
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
        // Contar comercios referidos activos del promotor
        const activeClientsCount = await queryRunner.manager.count(Tenant, {
          where: {
            promoterId: savedTenant.promoterId,
            status: TenantStatus.ACTIVE,
          },
        });

        // Escala oficial de comisiones según clientes referidos activos en el mes:
        // 1 a 49 clientes activos: 10%
        // 50 a 99 clientes activos: 15%
        // 100 en adelante: 20%
        let commissionRate = 0.10;
        if (activeClientsCount >= 100) {
          commissionRate = 0.20;
        } else if (activeClientsCount >= 50) {
          commissionRate = 0.15;
        }

        const activationCommissionsCount = await queryRunner.manager.count(PromoterCommission, {
          where: {
            promoterId: savedTenant.promoterId,
            tenantId: savedTenant.id,
            type: PromoterCommissionType.ACTIVATION,
          },
        });

        const isFirstActivation = activationCommissionsCount === 0;
        const netAmount = Number(savedReport.amount) || 20.00;
        // Comisión de Activación oficial: 50% del monto total del primer pago realizado por el cliente.
        // Comisión Recurrente: según escala por comercios activos (10%, 15% o 20%) de cada pago subsiguiente.
        const effectiveRate = isFirstActivation ? 0.50 : commissionRate;
        const commissionAmount = Math.round(netAmount * effectiveRate * 100) / 100;

        const commission = queryRunner.manager.create(PromoterCommission, {
          promoterId: savedTenant.promoterId,
          tenantId: savedTenant.id,
          type: isFirstActivation ? PromoterCommissionType.ACTIVATION : PromoterCommissionType.RECURRING,
          amountUSD: commissionAmount,
          status: PromoterCommissionStatus.PENDING,
          saasPaymentReportId: savedReport.id,
          notes: isFirstActivation
            ? `Comisión de activación inicial (50%) tenant ${savedTenant.name}`
            : `Comisión recurrente renovación tenant ${savedTenant.name}`,
        });
        generatedCommission = await queryRunner.manager.save(PromoterCommission, commission);

        // Si fue una primera activación formal, evaluar metas de activación acumuladas históricas:
        // Meta 1: 5 activaciones -> $10 USD
        // Meta 2: 10 activaciones -> $25 USD
        // Meta 3: 20 activaciones -> $50 USD
        // Meta 4: 50 activaciones -> $100 USD
        if (isFirstActivation) {
          const MILESTONES: Array<{ count: number; bonusUSD: number; code: string; label: string }> = [
            { count: 5, bonusUSD: 10.00, code: 'MILESTONE_5', label: 'Meta 5 activaciones' },
            { count: 10, bonusUSD: 25.00, code: 'MILESTONE_10', label: 'Meta 10 activaciones' },
            { count: 20, bonusUSD: 50.00, code: 'MILESTONE_20', label: 'Meta 20 activaciones' },
            { count: 50, bonusUSD: 100.00, code: 'MILESTONE_50', label: 'Meta 50 activaciones' },
          ];

          const totalHistoricalActivations = await queryRunner.manager.count(PromoterCommission, {
            where: {
              promoterId: savedTenant.promoterId,
              type: PromoterCommissionType.ACTIVATION,
            },
          });

          for (const milestone of MILESTONES) {
            if (totalHistoricalActivations >= milestone.count) {
              // Blindaje anti-rebote: verificar si ya se le otorgó este bono en su historial
              const existingBonus = await queryRunner.manager.findOne(PromoterCommission, {
                where: {
                  promoterId: savedTenant.promoterId,
                  type: PromoterCommissionType.BONUS,
                  notes: Like(`%${milestone.code}%`),
                },
              });

              if (!existingBonus) {
                const bonusCommission = queryRunner.manager.create(PromoterCommission, {
                  promoterId: savedTenant.promoterId,
                  tenantId: savedTenant.id,
                  type: PromoterCommissionType.BONUS,
                  amountUSD: milestone.bonusUSD,
                  status: PromoterCommissionStatus.PENDING,
                  saasPaymentReportId: savedReport.id,
                  notes: `Bono por meta histórica alcanzada: ${milestone.label} (${milestone.code})`,
                });
                await queryRunner.manager.save(PromoterCommission, bonusCommission);
              }
            }
          }
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
    const subtotal = Math.round((Number(data.amount) / 1.16) * 100) / 100;
    const iva_amount = Math.round((Number(data.amount) - subtotal) * 100) / 100;

    const report = this.paymentReportRepo.create({
      tenant_id: tenantId,
      amount: data.amount,
      amount_bs: data.amount_bs || null,
      exchange_rate: data.exchange_rate || null,
      payment_method: data.payment_method,
      reference: cleanReference,
      status: SaaSPaymentStatus.PENDING,
      months,
      subtotal,
      iva_amount,
    });

    let saved: SaaSPaymentReport;
    try {
      saved = await this.paymentReportRepo.save(report);
    } catch (saveErr: any) {
      // Si la columna "months" no existe aún en la BD (ej. en despliegues sin reinicio previo), autocuramos la tabla en caliente
      if (saveErr?.message?.includes('months') || saveErr?.driverError?.message?.includes('months')) {
        this.logger.warn(`Columna 'months' no detectada al guardar reporte. Aplicando ALTER TABLE en caliente...`);
        try {
          await this.paymentReportRepo.query(`ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "months" integer DEFAULT 1;`);
          saved = await this.paymentReportRepo.save(report);
        } catch (retryErr: any) {
          this.logger.error(`Fallo al reintentar guardar con columna months: ${retryErr.message}`);
          throw retryErr;
        }
      } else {
        throw saveErr;
      }
    }

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
    const { id, updatedAt, ...cleanDto } = dto as any;
    Object.assign(config, cleanDto);
    return await this.platformConfigRepo.save(config);
  }

  /**
   * Helper to calculate rank, bonus, and next rank based on monthly activations
   */
  /**
   * Helper to determine rank and commission percentage based on active referred clients in the month:
   * - 1 a 49 clientes activos: 10% (Rango Bronce)
   * - 50 a 99 clientes activos: 15% (Rango Plata)
   * - 100 en adelante: 20% (Rango Oro)
   */
  calculateRank(activeClientsCount: number): {
    rank: PromoterRank;
    commissionPercentage: number;
    commissionRate: number;
    bonusUSD: number;
    emoji: string;
    nextRank: {
      rank: PromoterRank;
      rankEmoji: string;
      activationsNeeded: number;
      clientsNeeded: number;
      targetPercentage: number;
      bonusUSD: number;
    } | null;
  } {
    if (activeClientsCount >= 100) {
      return {
        rank: PromoterRank.ORO,
        commissionPercentage: 20,
        commissionRate: 0.20,
        bonusUSD: 0,
        emoji: '🥇',
        nextRank: null,
      };
    } else if (activeClientsCount >= 50) {
      return {
        rank: PromoterRank.PLATA,
        commissionPercentage: 15,
        commissionRate: 0.15,
        bonusUSD: 0,
        emoji: '🥈',
        nextRank: {
          rank: PromoterRank.ORO,
          rankEmoji: '🥇',
          activationsNeeded: 100 - activeClientsCount,
          clientsNeeded: 100 - activeClientsCount,
          targetPercentage: 20,
          bonusUSD: 0,
        },
      };
    } else if (activeClientsCount >= 1) {
      return {
        rank: PromoterRank.BRONCE,
        commissionPercentage: 10,
        commissionRate: 0.10,
        bonusUSD: 0,
        emoji: '🥉',
        nextRank: {
          rank: PromoterRank.PLATA,
          rankEmoji: '🥈',
          activationsNeeded: 50 - activeClientsCount,
          clientsNeeded: 50 - activeClientsCount,
          targetPercentage: 15,
          bonusUSD: 0,
        },
      };
    } else {
      return {
        rank: PromoterRank.MADERA,
        commissionPercentage: 10,
        commissionRate: 0.10,
        bonusUSD: 0,
        emoji: '🪵',
        nextRank: {
          rank: PromoterRank.BRONCE,
          rankEmoji: '🥉',
          activationsNeeded: 1,
          clientsNeeded: 1,
          targetPercentage: 10,
          bonusUSD: 0,
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
        commissions: {
          tenant: true,
        },
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

      const activeClientsCount = (promoter.tenants || []).filter(
        (t) => t.status === TenantStatus.ACTIVE && (!t.current_period_ends_at || new Date(t.current_period_ends_at) >= now),
      ).length;

      const rankInfo = this.calculateRank(activeClientsCount);

      let pendingBalanceUSD = 0;
      let paidBalanceUSD = 0;
      let totalCommissionsUSD = 0;
      let totalBonusCommissionsUSD = 0;

      commissions.forEach((c) => {
        const amt = Number(c.amountUSD) || 0;
        totalCommissionsUSD += amt;
        if (c.type === PromoterCommissionType.BONUS) {
          totalBonusCommissionsUSD += amt;
        }
        if (c.status === PromoterCommissionStatus.PENDING) {
          pendingBalanceUSD += amt;
        } else if (c.status === PromoterCommissionStatus.PAID) {
          paidBalanceUSD += amt;
        }
      });

      // Map commissions DTO sorted latest first, with tenantName
      const commissionsDto: PromoterCommissionDTO[] = commissions
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((c) => ({
          id: c.id,
          promoterId: c.promoterId,
          tenantId: c.tenantId,
          tenantName: c.tenant?.name || (promoter.tenants || []).find((t) => t.id === c.tenantId)?.name || 'Comercio',
          type: c.type,
          amountUSD: Number(c.amountUSD),
          saasPaymentReportId: c.saasPaymentReportId,
          status: c.status,
          paidAt: c.paidAt ? new Date(c.paidAt).toISOString() : null,
          paymentReference: c.paymentReference,
          notes: c.notes,
          createdAt: new Date(c.createdAt).toISOString(),
        }));

      // Map affiliated tenants with individual statistics
      const nowMs = Date.now();
      const affiliatedTenantsDto: PromoterAffiliatedTenantDTO[] = (promoter.tenants || []).map((t) => {
        const tenantComms = commissions.filter((c) => c.tenantId === t.id);
        const actComm = tenantComms.find((c) => c.type === PromoterCommissionType.ACTIVATION);
        const recComms = tenantComms.filter((c) => c.type === PromoterCommissionType.RECURRING);
        const recUSD = recComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
        const totalUSD = tenantComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);

        let subStatus: PromoterReferralSubStatus = 'INACTIVE';
        let subStatusLabel = 'Dado de baja / Inactivo';
        let daysRemaining: number | null = null;
        let daysOverdue: number | null = null;

        const isSuspended = t.isActive === false || t.status === TenantStatus.SUSPENDED;

        if (isSuspended) {
          subStatus = 'INACTIVE';
          subStatusLabel = 'Dado de baja / Inactivo';
        } else if (t.status === TenantStatus.PAST_DUE) {
          subStatus = 'PAST_DUE';
          subStatusLabel = 'Por Pagar / Vencido';
          if (t.current_period_ends_at) {
            const diff = Math.ceil((nowMs - new Date(t.current_period_ends_at).getTime()) / 86400000);
            daysOverdue = Math.max(1, diff);
          }
        } else if (t.status === TenantStatus.ACTIVE) {
          if (t.current_period_ends_at && new Date(t.current_period_ends_at).getTime() < nowMs) {
            subStatus = 'PAST_DUE';
            subStatusLabel = 'Por Pagar / Vencido';
            const diff = Math.ceil((nowMs - new Date(t.current_period_ends_at).getTime()) / 86400000);
            daysOverdue = Math.max(1, diff);
          } else {
            subStatus = 'ACTIVE';
            subStatusLabel = 'Activo';
            if (t.current_period_ends_at) {
              const diff = Math.ceil((new Date(t.current_period_ends_at).getTime() - nowMs) / 86400000);
              daysRemaining = Math.max(0, diff);
            }
          }
        } else if (t.status === TenantStatus.TRIAL) {
          if (t.trial_ends_at && new Date(t.trial_ends_at).getTime() < nowMs) {
            subStatus = 'PAST_DUE';
            subStatusLabel = 'Prueba Vencida / Por Pagar';
            const diff = Math.ceil((nowMs - new Date(t.trial_ends_at).getTime()) / 86400000);
            daysOverdue = Math.max(1, diff);
          } else {
            subStatus = 'TRIAL';
            subStatusLabel = 'En Prueba';
            if (t.trial_ends_at) {
              const diff = Math.ceil((new Date(t.trial_ends_at).getTime() - nowMs) / 86400000);
              daysRemaining = Math.max(0, diff);
            }
          }
        }

        return {
          tenantId: t.id,
          tenantName: t.name,
          status: t.status,
          subStatus,
          subStatusLabel,
          planType: t.plan_type,
          createdAt: new Date(t.createdAt).toISOString(),
          trialEndsAt: t.trial_ends_at ? new Date(t.trial_ends_at).toISOString() : null,
          currentPeriodEndsAt: t.current_period_ends_at ? new Date(t.current_period_ends_at).toISOString() : null,
          daysRemaining,
          daysOverdue,
          totalCommissionsUSD: Math.round(totalUSD * 100) / 100,
          activationCommission: actComm
            ? {
                id: actComm.id,
                promoterId: actComm.promoterId,
                tenantId: actComm.tenantId,
                tenantName: t.name,
                type: actComm.type,
                amountUSD: Number(actComm.amountUSD),
                saasPaymentReportId: actComm.saasPaymentReportId,
                status: actComm.status,
                paidAt: actComm.paidAt ? new Date(actComm.paidAt).toISOString() : null,
                paymentReference: actComm.paymentReference,
                createdAt: new Date(actComm.createdAt).toISOString(),
              }
            : null,
          recurringCommissionsCount: recComms.length,
          recurringCommissionsUSD: Math.round(recUSD * 100) / 100,
        };
      });

      return {
        id: promoter.id,
        userId: promoter.userId,
        username: promoter.user?.username || 'Desconocido',
        email: promoter.user?.email || '',
        phone: promoter.user?.phone || null,
        code: promoter.code,
        isActive: promoter.isActive,
        termsAccepted: !!promoter.termsAccepted,
        termsAcceptedAt: promoter.termsAcceptedAt ? new Date(promoter.termsAcceptedAt).toISOString() : null,
        activeClientsCount,
        commissionPercentage: rankInfo.commissionPercentage,
        pagoMovilPhone: promoter.pagoMovilPhone,
        pagoMovilCedula: promoter.pagoMovilCedula,
        pagoMovilBank: promoter.pagoMovilBank,
        binancePayId: promoter.binancePayId,
        currentRank: rankInfo.rank,
        monthlyActivations,
        rankBonusUSD: Math.round(totalBonusCommissionsUSD * 100) / 100,
        totalBonusCommissionsUSD: Math.round(totalBonusCommissionsUSD * 100) / 100,
        totalAffiliatedTenants: (promoter.tenants || []).length,
        pendingBalanceUSD: Math.round(pendingBalanceUSD * 100) / 100,
        paidBalanceUSD: Math.round(paidBalanceUSD * 100) / 100,
        totalCommissionsUSD: Math.round(totalCommissionsUSD * 100) / 100,
        commissions: commissionsDto,
        affiliatedTenants: affiliatedTenantsDto,
        createdAt: new Date(promoter.createdAt).toISOString(),
      };
    });
  }

  /**
   * SuperAdmin: Liquidación masiva de comisiones pendientes para un promotor.
   */
  async payBulkPromoterCommissions(
    promoterId: string,
    paymentReference: string,
    commissionIds?: string[],
  ): Promise<{ paidCount: number; totalPaidUSD: number; commissions: PromoterCommission[] }> {
    if (!paymentReference || !paymentReference.trim()) {
      throw new BadRequestException('La referencia de pago es obligatoria');
    }

    const promoter = await this.promoterRepo.findOne({
      where: { id: promoterId },
    });

    if (!promoter) {
      throw new NotFoundException(`Promotor con id ${promoterId} no encontrado`);
    }

    let query = this.commissionRepo
      .createQueryBuilder('c')
      .where('c.promoterId = :promoterId', { promoterId })
      .andWhere('c.status = :status', { status: PromoterCommissionStatus.PENDING });

    if (commissionIds && commissionIds.length > 0) {
      query = query.andWhere('c.id IN (:...ids)', { ids: commissionIds });
    }

    const pendingCommissions = await query.getMany();

    if (!pendingCommissions.length) {
      throw new BadRequestException('No hay comisiones pendientes seleccionadas para liquidar');
    }

    const now = new Date();
    const cleanRef = paymentReference.trim();
    let totalPaidUSD = 0;

    for (const comm of pendingCommissions) {
      comm.status = PromoterCommissionStatus.PAID;
      comm.paidAt = now;
      comm.paymentReference = cleanRef;
      totalPaidUSD += Number(comm.amountUSD) || 0;
    }

    const savedCommissions = await this.commissionRepo.save(pendingCommissions);

    try {
      const expense = this.platformExpenseRepo.create({
        type: PlatformExpenseType.PROMOTER_PAYOUT,
        category: PlatformExpenseCategory.COMISION_PROMOTOR,
        description: `Liquidación comisiones a promotor: ${promoter.user?.username || promoter.code} (${savedCommissions.length} comisión${savedCommissions.length > 1 ? 'es' : ''})`,
        amount: Math.round(totalPaidUSD * 100) / 100,
        payment_method: promoter.binancePayId ? 'BINANCE' : 'PAGO_MOVIL',
        reference: cleanRef,
        promoter_id: promoter.id,
        expense_date: now,
      });
      await this.platformExpenseRepo.save(expense);
    } catch (e: any) {
      this.logger.error(`Error al registrar PlatformExpense para liquidación de promotor: ${e.message}`);
    }

    return {
      paidCount: savedCommissions.length,
      totalPaidUSD: Math.round(totalPaidUSD * 100) / 100,
      commissions: savedCommissions,
    };
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

    const now = new Date();
    const cleanRef = paymentReference.trim();
    commission.status = PromoterCommissionStatus.PAID;
    commission.paidAt = now;
    commission.paymentReference = cleanRef;

    const saved = await this.commissionRepo.save(commission);

    try {
      const expense = this.platformExpenseRepo.create({
        type: PlatformExpenseType.PROMOTER_PAYOUT,
        category: PlatformExpenseCategory.COMISION_PROMOTOR,
        description: `Pago individual de comisión (${commission.type}) a promotor`,
        amount: Number(commission.amountUSD) || 0,
        payment_method: commission.promoter?.binancePayId ? 'BINANCE' : 'PAGO_MOVIL',
        reference: cleanRef,
        promoter_id: commission.promoterId,
        expense_date: now,
      });
      await this.platformExpenseRepo.save(expense);
    } catch (e: any) {
      this.logger.error(`Error al registrar PlatformExpense para comisión individual: ${e.message}`);
    }

    return saved;
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
      termsAccepted: false,
      termsAcceptedAt: null,
      activeClientsCount: 0,
      commissionPercentage: 10,
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

  async getSuperAdminProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async updateSuperAdminProfile(userId: string, dto: UpdateSuperAdminProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.username && dto.username.trim() !== user.username) {
      const cleanUsername = dto.username.trim().toLowerCase();
      const existing = await this.userRepo.findOne({ where: { username: cleanUsername } });
      if (existing && existing.id !== user.id) {
        throw new BadRequestException('El nombre de usuario ya está en uso por otra cuenta');
      }
      user.username = cleanUsername;
    }

    if (dto.email && dto.email.trim() !== user.email) {
      const cleanEmail = dto.email.trim().toLowerCase();
      const existing = await this.userRepo.findOne({ where: { email: cleanEmail } });
      if (existing && existing.id !== user.id) {
        throw new BadRequestException('El correo electrónico ya está en uso por otra cuenta');
      }
      user.email = cleanEmail;
    }

    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Debes ingresar tu contraseña actual para confirmar el cambio');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Credenciales de SuperAdmin actualizadas correctamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * SuperAdmin: Retorna métricas financieras completas de la plataforma SaaS (Flujo de caja, IVA, promotores, OPEX, CAPEX, utilidades).
   */
  async getFinanceMetrics(): Promise<SuperAdminFinanceMetricsDTO> {
    // 1. Ingresos e IVA por suscripciones aprobadas (excluyendo negocios de prueba)
    const approvedPayments = await this.paymentReportRepo
      .createQueryBuilder('p')
      .innerJoin('p.tenant', 't')
      .where('p.status = :status', { status: SaaSPaymentStatus.APPROVED })
      .andWhere('t.is_test = false')
      .getMany();

    let grossRevenueUSD = 0;
    let totalIVACollectedUSD = 0;

    for (const p of approvedPayments) {
      const amt = Number(p.amount) || 0;
      grossRevenueUSD += amt;

      if (p.iva_amount !== null && p.iva_amount !== undefined) {
        totalIVACollectedUSD += Number(p.iva_amount) || 0;
      } else {
        const sub = Math.round((amt / 1.16) * 100) / 100;
        totalIVACollectedUSD += Math.round((amt - sub) * 100) / 100;
      }
    }

    grossRevenueUSD = Math.round(grossRevenueUSD * 100) / 100;
    totalIVACollectedUSD = Math.round(totalIVACollectedUSD * 100) / 100;
    const netRevenueUSD = Math.round((grossRevenueUSD - totalIVACollectedUSD) * 100) / 100;

    // 2. Comisiones a promotores (deuda pendiente vs pagadas, excluyendo tenants de prueba)
    const commissions = await this.commissionRepo
      .createQueryBuilder('c')
      .leftJoin(Tenant, 't', 't.id = c.tenantId')
      .where('(t.is_test = false OR t.id IS NULL)')
      .getMany();
    let totalPromotersDebtUSD = 0;
    let totalPromotersPaidUSD = 0;

    for (const c of commissions) {
      const amt = Number(c.amountUSD) || 0;
      if (c.status === PromoterCommissionStatus.PENDING) {
        totalPromotersDebtUSD += amt;
      } else if (c.status === PromoterCommissionStatus.PAID) {
        totalPromotersPaidUSD += amt;
      }
    }

    totalPromotersDebtUSD = Math.round(totalPromotersDebtUSD * 100) / 100;
    totalPromotersPaidUSD = Math.round(totalPromotersPaidUSD * 100) / 100;

    // 3. Egresos registrados de la plataforma (OPEX, CAPEX, Retiros Dueño, SENIAT, Promotores)
    const expenses = await this.platformExpenseRepo.find();
    let totalOperatingExpensesUSD = 0;
    let totalInvestmentUSD = 0;
    let totalOwnerPayoutsUSD = 0;
    let totalPromoterPayoutsUSD = 0;
    let totalIVAPaidSeniatUSD = 0;

    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      switch (e.type) {
        case PlatformExpenseType.OPERATING:
          totalOperatingExpensesUSD += amt;
          break;
        case PlatformExpenseType.INVESTMENT:
          totalInvestmentUSD += amt;
          break;
        case PlatformExpenseType.OWNER_PAYOUT:
          totalOwnerPayoutsUSD += amt;
          break;
        case PlatformExpenseType.PROMOTER_PAYOUT:
          totalPromoterPayoutsUSD += amt;
          break;
        case PlatformExpenseType.TAX_SENIAT:
          totalIVAPaidSeniatUSD += amt;
          break;
      }
    }

    totalOperatingExpensesUSD = Math.round(totalOperatingExpensesUSD * 100) / 100;
    totalInvestmentUSD = Math.round(totalInvestmentUSD * 100) / 100;
    totalOwnerPayoutsUSD = Math.round(totalOwnerPayoutsUSD * 100) / 100;
    totalPromoterPayoutsUSD = Math.round(totalPromoterPayoutsUSD * 100) / 100;
    totalIVAPaidSeniatUSD = Math.round(totalIVAPaidSeniatUSD * 100) / 100;

    const effectivePromoterPayouts = Math.max(totalPromoterPayoutsUSD, totalPromotersPaidUSD);

    const pendingIVASeniatUSD = Math.max(0, Math.round((totalIVACollectedUSD - totalIVAPaidSeniatUSD) * 100) / 100);

    const totalExpensesUSD = Math.round(
      (totalOperatingExpensesUSD + totalInvestmentUSD + totalOwnerPayoutsUSD + effectivePromoterPayouts + totalIVAPaidSeniatUSD) * 100
    ) / 100;

    const netOperatingProfitUSD = Math.round(
      (netRevenueUSD - totalOperatingExpensesUSD - effectivePromoterPayouts) * 100
    ) / 100;

    const availableCashUSD = Math.round((grossRevenueUSD - totalExpensesUSD) * 100) / 100;

    return {
      grossRevenueUSD,
      totalIVACollectedUSD,
      netRevenueUSD,
      totalIVAPaidSeniatUSD,
      pendingIVASeniatUSD,
      totalPromotersDebtUSD,
      totalPromotersPaidUSD,
      totalOperatingExpensesUSD,
      totalInvestmentUSD,
      totalOwnerPayoutsUSD,
      totalPromoterPayoutsUSD: effectivePromoterPayouts,
      totalExpensesUSD,
      netOperatingProfitUSD,
      availableCashUSD,
    };
  }

  /**
   * SuperAdmin: Listado de gastos y salidas de la plataforma con filtros
   */
  async getExpenses(query?: { type?: string; month?: string; search?: string }): Promise<PlatformExpenseDTO[]> {
    let qb = this.platformExpenseRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.promoter', 'p')
      .leftJoinAndSelect('p.user', 'u')
      .orderBy('e.expense_date', 'DESC');

    if (query?.type && query.type !== 'ALL') {
      qb = qb.andWhere('e.type = :type', { type: query.type });
    }

    if (query?.search && query.search.trim()) {
      qb = qb.andWhere(
        '(LOWER(e.description) LIKE :s OR LOWER(e.category) LIKE :s OR LOWER(e.reference) LIKE :s OR LOWER(e.tax_period) LIKE :s)',
        { s: `%${query.search.trim().toLowerCase()}%` }
      );
    }

    if (query?.month) {
      qb = qb.andWhere("TO_CHAR(e.expense_date, 'YYYY-MM') = :month", { month: query.month });
    }

    const expenses = await qb.getMany();

    return expenses.map((e) => ({
      id: e.id,
      type: e.type,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      amountBs: e.amount_bs ? Number(e.amount_bs) : null,
      exchangeRate: e.exchange_rate ? Number(e.exchange_rate) : null,
      paymentMethod: e.payment_method || 'TRANSFERENCIA',
      reference: e.reference || null,
      expenseDate: new Date(e.expense_date).toISOString(),
      taxPeriod: e.tax_period || null,
      promoterId: e.promoter_id || null,
      promoterName: e.promoter?.user?.username || (e.promoter ? e.promoter.code : null),
      createdAt: new Date(e.createdAt).toISOString(),
    }));
  }

  /**
   * SuperAdmin: Registrar un nuevo gasto operativo, inversión o retiro personal
   */
  async createExpense(dto: CreatePlatformExpenseDto): Promise<PlatformExpenseDTO> {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new BadRequestException('La descripción o concepto es obligatoria');
    }

    const expense = this.platformExpenseRepo.create({
      type: dto.type,
      category: dto.category.trim(),
      description: dto.description.trim(),
      amount: dto.amount,
      amount_bs: dto.amountBs || null,
      exchange_rate: dto.exchangeRate || null,
      payment_method: dto.paymentMethod || 'TRANSFERENCIA',
      reference: dto.reference?.trim() || null,
      expense_date: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
      tax_period: dto.taxPeriod?.trim() || null,
      promoter_id: dto.promoterId || null,
    });

    const saved = await this.platformExpenseRepo.save(expense);

    return {
      id: saved.id,
      type: saved.type,
      category: saved.category,
      description: saved.description,
      amount: Number(saved.amount),
      amountBs: saved.amount_bs ? Number(saved.amount_bs) : null,
      exchangeRate: saved.exchange_rate ? Number(saved.exchange_rate) : null,
      paymentMethod: saved.payment_method,
      reference: saved.reference,
      expenseDate: new Date(saved.expense_date).toISOString(),
      taxPeriod: saved.tax_period,
      promoterId: saved.promoter_id,
      createdAt: new Date(saved.createdAt).toISOString(),
    };
  }

  /**
   * SuperAdmin: Registrar pago/declaración de IVA ante el SENIAT
   */
  async recordSeniatPayment(dto: RecordSeniatPaymentDto): Promise<PlatformExpenseDTO> {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('El monto a liquidar debe ser mayor a 0');
    }
    if (!dto.taxPeriod || !dto.taxPeriod.trim()) {
      throw new BadRequestException('El periodo fiscal es obligatorio (ej. "2026-10" o "Octubre 2026")');
    }
    if (!dto.reference || !dto.reference.trim()) {
      throw new BadRequestException('El número de comprobante o referencia bancaria es obligatorio');
    }

    const description = dto.notes && dto.notes.trim()
      ? `Pago IVA SENIAT (${dto.taxPeriod}): ${dto.notes.trim()}`
      : `Declaración y pago de IVA al SENIAT correspondiente a ${dto.taxPeriod}`;

    const expense = this.platformExpenseRepo.create({
      type: PlatformExpenseType.TAX_SENIAT,
      category: PlatformExpenseCategory.SENIAT_IVA,
      description,
      amount: dto.amount,
      amount_bs: dto.amountBs || null,
      exchange_rate: dto.exchangeRate || null,
      payment_method: dto.paymentMethod || 'TRANSFERENCIA',
      reference: dto.reference.trim(),
      tax_period: dto.taxPeriod.trim(),
      expense_date: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
    });

    const saved = await this.platformExpenseRepo.save(expense);

    return {
      id: saved.id,
      type: saved.type,
      category: saved.category,
      description: saved.description,
      amount: Number(saved.amount),
      amountBs: saved.amount_bs ? Number(saved.amount_bs) : null,
      exchangeRate: saved.exchange_rate ? Number(saved.exchange_rate) : null,
      paymentMethod: saved.payment_method,
      reference: saved.reference,
      expenseDate: new Date(saved.expense_date).toISOString(),
      taxPeriod: saved.tax_period,
      createdAt: new Date(saved.createdAt).toISOString(),
    };
  }

  /**
   * SuperAdmin: Anular/Eliminar un gasto o salida registrado
   */
  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const expense = await this.platformExpenseRepo.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException(`Gasto con id ${id} no encontrado`);
    }

    await this.platformExpenseRepo.remove(expense);
    return {
      success: true,
      message: 'Egreso eliminado correctamente del historial',
    };
  }
}


