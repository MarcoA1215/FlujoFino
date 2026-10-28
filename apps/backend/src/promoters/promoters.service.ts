import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { Tenant } from '../entities/tenant.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import {
  PromoterCommissionType,
  PromoterCommissionStatus,
  PromoterRank,
  PromoterStatsDTO,
  PromoterAffiliatedTenantDTO,
  PromoterReferralSubStatus,
  PromoterCommissionDTO,
  TenantStatus,
  UserRole,
} from '@finowork/shared-types';

@Injectable()
export class PromotersService {
  private readonly logger = new Logger(PromotersService.name);

  constructor(
    @InjectRepository(Promoter)
    private readonly promoterRepo: Repository<Promoter>,
    @InjectRepository(PromoterCommission)
    private readonly commissionRepo: Repository<PromoterCommission>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(UserTenantAccess)
    private readonly userAccessRepo: Repository<UserTenantAccess>,
  ) {}

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
        bonusUSD: 50.00,
        emoji: '🥇',
        nextRank: null,
      };
    } else if (activeClientsCount >= 50) {
      return {
        rank: PromoterRank.PLATA,
        commissionPercentage: 15,
        commissionRate: 0.15,
        bonusUSD: 25.00,
        emoji: '🥈',
        nextRank: {
          rank: PromoterRank.ORO,
          rankEmoji: '🥇',
          activationsNeeded: 100 - activeClientsCount,
          clientsNeeded: 100 - activeClientsCount,
          targetPercentage: 20,
          bonusUSD: 50.00,
        },
      };
    } else if (activeClientsCount >= 1) {
      return {
        rank: PromoterRank.BRONCE,
        commissionPercentage: 10,
        commissionRate: 0.10,
        bonusUSD: 10.00,
        emoji: '🥉',
        nextRank: {
          rank: PromoterRank.PLATA,
          rankEmoji: '🥈',
          activationsNeeded: 50 - activeClientsCount,
          clientsNeeded: 50 - activeClientsCount,
          targetPercentage: 15,
          bonusUSD: 25.00,
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
          bonusUSD: 10.00,
        },
      };
    }
  }

  /**
   * Get promoter stats by user ID
   */
  async getMyStats(userId: string): Promise<PromoterStatsDTO> {
    const promoter = await this.promoterRepo.findOne({
      where: { userId },
      relations: {
        user: true,
        tenants: true,
        commissions: {
          tenant: true,
        },
      },
    });

    if (!promoter) {
      throw new NotFoundException('Perfil de promotor no encontrado para este usuario');
    }

    const now = new Date();
    const nowMs = now.getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const commissions = promoter.commissions || [];

    // Monthly activations: ACTIVATION commissions created in current calendar month
    const monthlyActivations = commissions.filter((c) => {
      const cDate = new Date(c.createdAt);
      return (
        c.type === PromoterCommissionType.ACTIVATION &&
        cDate >= startOfMonth &&
        cDate <= endOfMonth
      );
    }).length;

    const tenants = promoter.tenants || [];
    const tenantIds = tenants.map((t) => t.id);

    // Fetch tenant owner details (admin role in UserTenantAccess prioritized)
    const ownerMap = new Map<string, { id: string; name?: string; email: string; phone?: string }>();
    if (tenantIds.length > 0) {
      const accesses = await this.userAccessRepo.find({
        where: {
          tenantId: In(tenantIds),
        },
        relations: { user: true },
      });

      for (const acc of accesses) {
        if (!acc.user) continue;
        const existing = ownerMap.get(acc.tenantId);
        // Prioritize ADMIN or use first found user
        if (!existing || acc.role === UserRole.ADMIN) {
          ownerMap.set(acc.tenantId, {
            id: acc.user.id,
            name: acc.user.name || acc.user.username,
            email: acc.user.email,
            phone: acc.user.phone || undefined,
          });
        }
      }
    }

    let totalActivationCommissionsUSD = 0;
    let totalRecurringCommissionsUSD = 0;
    let totalPendingBalanceUSD = 0;
    let totalPaidBalanceUSD = 0;
    let monthlyEarnedUSD = 0;
    let monthlyPaidUSD = 0;
    let monthlyPendingUSD = 0;

    commissions.forEach((c) => {
      if (c.status === PromoterCommissionStatus.CANCELLED) return;
      const amt = Number(c.amountUSD) || 0;
      const cDate = new Date(c.createdAt);
      const isThisMonth = cDate >= startOfMonth && cDate <= endOfMonth;

      if (c.type === PromoterCommissionType.ACTIVATION) {
        totalActivationCommissionsUSD += amt;
      } else if (c.type === PromoterCommissionType.RECURRING) {
        totalRecurringCommissionsUSD += amt;
      }

      if (isThisMonth) {
        monthlyEarnedUSD += amt;
      }

      if (c.status === PromoterCommissionStatus.PENDING) {
        totalPendingBalanceUSD += amt;
        if (isThisMonth) {
          monthlyPendingUSD += amt;
        }
      } else if (c.status === PromoterCommissionStatus.PAID) {
        totalPaidBalanceUSD += amt;
        const pDate = c.paidAt ? new Date(c.paidAt) : cDate;
        if (isThisMonth || (pDate >= startOfMonth && pDate <= endOfMonth)) {
          monthlyPaidUSD += amt;
        }
      }
    });

    const tenantNameMap = new Map<string, string>();
    tenants.forEach((t) => tenantNameMap.set(t.id, t.name));

    const affiliatedTenants: PromoterAffiliatedTenantDTO[] = tenants.map((t) => {
      const tenantComms = commissions.filter(
        (c) => c.tenantId === t.id && c.status !== PromoterCommissionStatus.CANCELLED,
      );
      const actComm = tenantComms.find((c) => c.type === PromoterCommissionType.ACTIVATION);
      const recComms = tenantComms.filter((c) => c.type === PromoterCommissionType.RECURRING);
      const recUSD = recComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
      const totalUSD = tenantComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
      const monthlyUSD = tenantComms
        .filter((c) => {
          const d = new Date(c.createdAt);
          return d >= startOfMonth && d <= endOfMonth;
        })
        .reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
      const paidUSD = tenantComms
        .filter((c) => c.status === PromoterCommissionStatus.PAID)
        .reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
      const pendingUSD = tenantComms
        .filter((c) => c.status === PromoterCommissionStatus.PENDING)
        .reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);

      // Status classification
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

      const owner = ownerMap.get(t.id);

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
        ownerName: owner?.name || null,
        ownerEmail: owner?.email || null,
        ownerPhone: owner?.phone || null,
        totalCommissionsUSD: Math.round(totalUSD * 100) / 100,
        monthlyCommissionsUSD: Math.round(monthlyUSD * 100) / 100,
        paidCommissionsUSD: Math.round(paidUSD * 100) / 100,
        pendingCommissionsUSD: Math.round(pendingUSD * 100) / 100,
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

    const activeClientsCount = affiliatedTenants.filter((t) => t.subStatus === 'ACTIVE').length;
    const pastDueClientsCount = affiliatedTenants.filter((t) => t.subStatus === 'PAST_DUE').length;
    const trialClientsCount = affiliatedTenants.filter((t) => t.subStatus === 'TRIAL').length;
    const inactiveClientsCount = affiliatedTenants.filter((t) => t.subStatus === 'INACTIVE').length;

    const rankInfo = this.calculateRank(activeClientsCount);

    const recentCommissions: PromoterCommissionDTO[] = commissions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => ({
        id: c.id,
        promoterId: c.promoterId,
        tenantId: c.tenantId,
        tenantName: c.tenant?.name || tenantNameMap.get(c.tenantId) || 'Comercio Referido',
        type: c.type,
        amountUSD: Number(c.amountUSD),
        saasPaymentReportId: c.saasPaymentReportId,
        status: c.status,
        paidAt: c.paidAt ? new Date(c.paidAt).toISOString() : null,
        paymentReference: c.paymentReference,
        createdAt: new Date(c.createdAt).toISOString(),
      }));

    return {
      promoterId: promoter.id,
      promoterName: promoter.user?.name || promoter.user?.username || undefined,
      code: promoter.code,
      currentRank: rankInfo.rank,
      rankEmoji: rankInfo.emoji,
      monthlyActivations,
      activeClientsCount,
      pastDueClientsCount,
      trialClientsCount,
      inactiveClientsCount,
      commissionPercentage: rankInfo.commissionPercentage,
      termsAccepted: !!promoter.termsAccepted,
      termsAcceptedAt: promoter.termsAcceptedAt ? new Date(promoter.termsAcceptedAt).toISOString() : null,
      rankBonusUSD: rankInfo.bonusUSD,
      nextRank: rankInfo.nextRank,
      monthlyEarnedUSD: Math.round(monthlyEarnedUSD * 100) / 100,
      monthlyPaidUSD: Math.round(monthlyPaidUSD * 100) / 100,
      monthlyPendingUSD: Math.round(monthlyPendingUSD * 100) / 100,
      totalActivationCommissionsUSD: Math.round(totalActivationCommissionsUSD * 100) / 100,
      totalRecurringCommissionsUSD: Math.round(totalRecurringCommissionsUSD * 100) / 100,
      totalCommissionsEarnedUSD: Math.round((totalActivationCommissionsUSD + totalRecurringCommissionsUSD) * 100) / 100,
      totalPendingBalanceUSD: Math.round(totalPendingBalanceUSD * 100) / 100,
      totalPaidBalanceUSD: Math.round(totalPaidBalanceUSD * 100) / 100,
      affiliatedTenants,
      recentCommissions,
    };
  }

  /**
   * Promotor: Aceptar Términos, Condiciones y Política de Privacidad
   */
  async acceptTerms(userId: string): Promise<{ success: boolean; termsAccepted: boolean; termsAcceptedAt: string }> {
    const promoter = await this.promoterRepo.findOne({ where: { userId } });
    if (!promoter) {
      throw new NotFoundException('Perfil de promotor no encontrado');
    }

    promoter.termsAccepted = true;
    promoter.termsAcceptedAt = new Date();
    await this.promoterRepo.save(promoter);

    return {
      success: true,
      termsAccepted: true,
      termsAcceptedAt: promoter.termsAcceptedAt.toISOString(),
    };
  }

  /**
   * Update promoter payout details
   */
  async updatePayoutDetails(userId: string, data: {
    pagoMovilPhone?: string;
    pagoMovilCedula?: string;
    pagoMovilBank?: string;
    binancePayId?: string;
  }): Promise<Promoter> {
    const promoter = await this.promoterRepo.findOne({ where: { userId } });
    if (!promoter) {
      throw new NotFoundException('Perfil de promotor no encontrado');
    }

    if (data.pagoMovilPhone !== undefined) promoter.pagoMovilPhone = data.pagoMovilPhone;
    if (data.pagoMovilCedula !== undefined) promoter.pagoMovilCedula = data.pagoMovilCedula;
    if (data.pagoMovilBank !== undefined) promoter.pagoMovilBank = data.pagoMovilBank;
    if (data.binancePayId !== undefined) promoter.binancePayId = data.binancePayId;

    return await this.promoterRepo.save(promoter);
  }
}

