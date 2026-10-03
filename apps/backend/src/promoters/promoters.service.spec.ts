import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PromotersService } from './promoters.service';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { Tenant } from '../entities/tenant.entity';
import {
  PromoterCommissionType,
  PromoterCommissionStatus,
  PromoterRank,
  TenantStatus,
  TenantPlanType,
} from '@nutrideli/shared-types';

describe('PromotersService', () => {
  let service: PromotersService;
  let promoterRepo: any;
  let commissionRepo: any;
  let tenantRepo: any;

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
      ],
    }).compile();

    service = module.get<PromotersService>(PromotersService);
  });

  describe('calculateRank', () => {
    it('returns MADERA for < 5 activations with bonus 0', () => {
      const rank = service.calculateRank(3);
      expect(rank.rank).toBe(PromoterRank.MADERA);
      expect(rank.bonusUSD).toBe(0);
      expect(rank.nextRank?.rank).toBe(PromoterRank.BRONCE);
      expect(rank.nextRank?.activationsNeeded).toBe(2);
    });

    it('returns BRONCE for 5 to 9 activations with bonus $10', () => {
      const rank = service.calculateRank(7);
      expect(rank.rank).toBe(PromoterRank.BRONCE);
      expect(rank.bonusUSD).toBe(10);
      expect(rank.nextRank?.rank).toBe(PromoterRank.PLATA);
      expect(rank.nextRank?.activationsNeeded).toBe(3);
    });

    it('returns PLATA for 10 to 19 activations with bonus $25', () => {
      const rank = service.calculateRank(12);
      expect(rank.rank).toBe(PromoterRank.PLATA);
      expect(rank.bonusUSD).toBe(25);
      expect(rank.nextRank?.rank).toBe(PromoterRank.ORO);
      expect(rank.nextRank?.activationsNeeded).toBe(8);
    });

    it('returns ORO for >= 20 activations with bonus $50 and no next rank', () => {
      const rank = service.calculateRank(22);
      expect(rank.rank).toBe(PromoterRank.ORO);
      expect(rank.bonusUSD).toBe(50);
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
            amountUSD: 10.00,
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
        ],
      };

      promoterRepo.findOne.mockResolvedValue(mockPromoter);

      const stats = await service.getMyStats('user-p1');
      expect(stats.promoterId).toBe('prom-1');
      expect(stats.code).toBe('PROM-JUAN');
      expect(stats.monthlyActivations).toBe(1);
      expect(stats.currentRank).toBe(PromoterRank.MADERA);
      expect(stats.totalActivationCommissionsUSD).toBe(10.00);
      expect(stats.totalRecurringCommissionsUSD).toBe(2.00);
      expect(stats.totalCommissionsEarnedUSD).toBe(12.00);
      expect(stats.totalPendingBalanceUSD).toBe(12.00);
      expect(stats.affiliatedTenants.length).toBe(1);
      expect(stats.affiliatedTenants[0].totalCommissionsUSD).toBe(12.00);
      expect(stats.affiliatedTenants[0].recurringCommissionsUSD).toBe(2.00);
    });
  });
});
