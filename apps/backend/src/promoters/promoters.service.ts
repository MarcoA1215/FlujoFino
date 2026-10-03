import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { Tenant } from '../entities/tenant.entity';
import {
  PromoterCommissionType,
  PromoterCommissionStatus,
  PromoterRank,
  PromoterStatsDTO,
  PromoterAffiliatedTenantDTO,
  PromoterCommissionDTO,
} from '@nutrideli/shared-types';

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
  ) {}

  /**
   * Helper to determine rank based on monthly activations
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
   * Get promoter stats by user ID
   */
  async getMyStats(userId: string): Promise<PromoterStatsDTO> {
    const promoter = await this.promoterRepo.findOne({
      where: { userId },
      relations: {
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

    const rankInfo = this.calculateRank(monthlyActivations);

    let totalActivationCommissionsUSD = 0;
    let totalRecurringCommissionsUSD = 0;
    let totalPendingBalanceUSD = 0;
    let totalPaidBalanceUSD = 0;

    commissions.forEach((c) => {
      const amt = Number(c.amountUSD) || 0;
      if (c.type === PromoterCommissionType.ACTIVATION) {
        totalActivationCommissionsUSD += amt;
      } else if (c.type === PromoterCommissionType.RECURRING) {
        totalRecurringCommissionsUSD += amt;
      }

      if (c.status === PromoterCommissionStatus.PENDING) {
        totalPendingBalanceUSD += amt;
      } else if (c.status === PromoterCommissionStatus.PAID) {
        totalPaidBalanceUSD += amt;
      }
    });

    // Breakdown per affiliated tenant
    const tenants = promoter.tenants || [];
    const affiliatedTenants: PromoterAffiliatedTenantDTO[] = tenants.map((t) => {
      const tenantComms = commissions.filter((c) => c.tenantId === t.id);
      const actComm = tenantComms.find((c) => c.type === PromoterCommissionType.ACTIVATION);
      const recComms = tenantComms.filter((c) => c.type === PromoterCommissionType.RECURRING);
      const recUSD = recComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);
      const totalUSD = tenantComms.reduce((acc, curr) => acc + (Number(curr.amountUSD) || 0), 0);

      return {
        tenantId: t.id,
        tenantName: t.name,
        status: t.status,
        planType: t.plan_type,
        createdAt: new Date(t.createdAt).toISOString(),
        currentPeriodEndsAt: t.current_period_ends_at ? new Date(t.current_period_ends_at).toISOString() : null,
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

    const recentCommissions: PromoterCommissionDTO[] = commissions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => ({
        id: c.id,
        promoterId: c.promoterId,
        tenantId: c.tenantId,
        tenantName: c.tenant?.name,
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
      code: promoter.code,
      currentRank: rankInfo.rank,
      rankEmoji: rankInfo.emoji,
      monthlyActivations,
      rankBonusUSD: rankInfo.bonusUSD,
      nextRank: rankInfo.nextRank,
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

