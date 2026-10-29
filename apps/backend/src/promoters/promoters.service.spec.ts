import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PromotersService } from './promoters.service';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { Tenant } from '../entities/tenant.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import {
  PromoterCommissionType,
  PromoterCommissionStatus,
  PromoterRank,
  TenantStatus,
  TenantPlanType,
} from '@finowork/shared-types';

describe('PromotersService', () => {
  let service: PromotersService;
  let promoterRepo: any;
  let commissionRepo: any;
  let tenantRepo: any;
  let userAccessRepo: any;

  beforeEach(async () => {
    promoterRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    commissionRepo = {
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    tenantRepo = {
      find: jest.fn(),
    };
    userAccessRepo = {
      find: jest.fn().mockResolvedValue([
        {
          tenantId: 't-1',
          role: 'ADMIN',
          user: {
            id: 'u-admin-1',
            name: 'Carlos Dueño',
            username: 'carlosd',
            email: 'carlos@tienda.com',
            phone: '04141234567',
          },
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotersService,
        {
          provide: getRepositoryToken(Promoter),
          useValue: promoterRepo,
        },
        {
          provide: getRepositoryToken(PromoterCommission),
          useValue: commissionRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepo,
        },
        {
          provide: getRepositoryToken(UserTenantAccess),
          useValue: userAccessRepo,
        },
      ],
    }).compile();

    service = module.get<PromotersService>(PromotersService);
  });

  describe('calculateRank', () => {
    it('returns MADERA for 0 active clients with 10% base commission and 0 bonus', () => {
      const rank = service.calculateRank(0);
      expect(rank.rank).toBe(PromoterRank.MADERA);
      expect(rank.commissionPercentage).toBe(10);
      expect(rank.commissionRate).toBe(0.10);
      expect(rank.bonusUSD).toBe(0);
      expect(rank.nextRank?.rank).toBe(PromoterRank.BRONCE);
      expect(rank.nextRank?.clientsNeeded).toBe(1);
    });

    it('returns BRONCE for 1 to 49 active clients with 10% commission', () => {
      const rank = service.calculateRank(20);
      expect(rank.rank).toBe(PromoterRank.BRONCE);
      expect(rank.commissionPercentage).toBe(10);
      expect(rank.commissionRate).toBe(0.10);
      expect(rank.bonusUSD).toBe(0);
      expect(rank.nextRank?.rank).toBe(PromoterRank.PLATA);
      expect(rank.nextRank?.clientsNeeded).toBe(30);
      expect(rank.nextRank?.targetPercentage).toBe(15);
    });

    it('returns PLATA for 50 to 99 active clients with 15% commission', () => {
      const rank = service.calculateRank(65);
      expect(rank.rank).toBe(PromoterRank.PLATA);
      expect(rank.commissionPercentage).toBe(15);
      expect(rank.commissionRate).toBe(0.15);
      expect(rank.bonusUSD).toBe(0);
      expect(rank.nextRank?.rank).toBe(PromoterRank.ORO);
      expect(rank.nextRank?.clientsNeeded).toBe(35);
      expect(rank.nextRank?.targetPercentage).toBe(20);
    });

    it('returns ORO for >= 100 active clients with 20% commission and no next rank', () => {
      const rank = service.calculateRank(120);
      expect(rank.rank).toBe(PromoterRank.ORO);
      expect(rank.commissionPercentage).toBe(20);
      expect(rank.commissionRate).toBe(0.20);
      expect(rank.bonusUSD).toBe(0);
      expect(rank.nextRank).toBeNull();
    });
  });

  describe('getMyStats', () => {
    it('aggregates activations, recurring trickle, balances and tenant affiliations correctly', async () => {
      const now = new Date();
      const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 15);

      const mockPromoter = {
        id: 'prom-1',
        userId: 'user-p1',
        code: 'PROM-JUAN',
        termsAccepted: false,
        termsAcceptedAt: null,
        tenants: [
          {
            id: 't-1',
            name: 'Café Central',
            status: TenantStatus.ACTIVE,
            plan_type: TenantPlanType.REGULAR,
            createdAt: thisMonthDate,
            current_period_ends_at: new Date(now.getTime() + 15 * 86400000),
          },
        ],
        commissions: [
          {
            id: 'c-1',
            promoterId: 'prom-1',
            tenantId: 't-1',
            type: PromoterCommissionType.ACTIVATION,
            amountUSD: 2.00,
            status: PromoterCommissionStatus.PENDING,
            createdAt: thisMonthDate,
          },
          {
            id: 'c-2',
            promoterId: 'prom-1',
            tenantId: 't-1',
            type: PromoterCommissionType.RECURRING,
            amountUSD: 2.00,
            status: PromoterCommissionStatus.PENDING,
            createdAt: thisMonthDate,
          },
          {
            id: 'c-3',
            promoterId: 'prom-1',
            tenantId: 't-1',
            type: PromoterCommissionType.BONUS,
            amountUSD: 10.00,
            status: PromoterCommissionStatus.PENDING,
            notes: 'Bono por meta histórica alcanzada: Meta 5 activaciones (MILESTONE_5)',
            createdAt: thisMonthDate,
          },
        ],
      };

      promoterRepo.findOne.mockResolvedValue(mockPromoter);

      const stats = await service.getMyStats('user-p1');
      expect(stats.promoterId).toBe('prom-1');
      expect(stats.code).toBe('PROM-JUAN');
      expect(stats.monthlyActivations).toBe(1);
      expect(stats.activeClientsCount).toBe(1);
      expect(stats.pastDueClientsCount).toBe(0);
      expect(stats.trialClientsCount).toBe(0);
      expect(stats.inactiveClientsCount).toBe(0);
      expect(stats.commissionPercentage).toBe(10);
      expect(stats.termsAccepted).toBe(false);
      expect(stats.currentRank).toBe(PromoterRank.BRONCE);
      expect(stats.totalActivationCommissionsUSD).toBe(2.00);
      expect(stats.totalRecurringCommissionsUSD).toBe(2.00);
      expect(stats.totalBonusCommissionsUSD).toBe(10.00);
      expect(stats.totalCommissionsEarnedUSD).toBe(14.00);
      expect(stats.totalPendingBalanceUSD).toBe(14.00);
      expect(stats.nextMilestone).toBeDefined();
      expect(stats.nextMilestone?.targetActivations).toBe(5);
      expect(stats.nextMilestone?.bonusUSD).toBe(10);
      expect(stats.nextMilestone?.activationsNeeded).toBe(4);
      expect(stats.nextMilestone?.progressPercentage).toBe(20);
      expect(stats.affiliatedTenants.length).toBe(1);
      expect(stats.affiliatedTenants[0].subStatus).toBe('ACTIVE');
      expect(stats.affiliatedTenants[0].ownerName).toBe('Carlos Dueño');
      expect(stats.affiliatedTenants[0].ownerPhone).toBe('04141234567');
      expect(stats.affiliatedTenants[0].ownerEmail).toBe('carlos@tienda.com');
    });
  });

  describe('acceptTerms', () => {
    it('sets termsAccepted to true and updates termsAcceptedAt', async () => {
      const mockPromoter = {
        id: 'prom-1',
        userId: 'user-p1',
        termsAccepted: false,
        termsAcceptedAt: null,
      };

      promoterRepo.findOne.mockResolvedValue(mockPromoter);

      const res = await service.acceptTerms('user-p1');
      expect(res.success).toBe(true);
      expect(res.termsAccepted).toBe(true);
      expect(res.termsAcceptedAt).toBeDefined();
      expect(promoterRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          termsAccepted: true,
          termsAcceptedAt: expect.any(Date),
        }),
      );
    });
  });
});
