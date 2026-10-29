import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SuperAdminService } from './superadmin.service';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { PlatformExpense } from '../entities/platform-expense.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentStatus,
  PromoterCommissionType,
  PromoterCommissionStatus,
} from '@finowork/shared-types';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let tenantRepo: any;
  let paymentReportRepo: any;
  let userAccessRepo: any;
  let platformConfigRepo: any;
  let userRepo: any;
  let promoterRepo: any;
  let commissionRepo: any;
  let platformExpenseRepo: any;
  let dataSource: any;
  let queryRunner: any;
  let notificationsService: any;

  beforeEach(async () => {
    tenantRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    paymentReportRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((entity) => entity),
      find: jest.fn(),
    };

    userAccessRepo = {
      find: jest.fn(),
    };

    platformConfigRepo = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    userRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: 'mock-user-id' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    promoterRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: 'mock-promoter-id' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    commissionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    platformExpenseRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve(entity)),
      delete: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        count: jest.fn(),
        create: jest.fn((entityClass, data) => data),
        save: jest.fn((entityClass, data) => Promise.resolve(data)),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    notificationsService = {
      notifySuperAdmin: jest.fn().mockResolvedValue(1),
      sendNotificationToNegocio: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepo,
        },
        {
          provide: getRepositoryToken(SaaSPaymentReport),
          useValue: paymentReportRepo,
        },
        {
          provide: getRepositoryToken(UserTenantAccess),
          useValue: userAccessRepo,
        },
        {
          provide: getRepositoryToken(PlatformConfig),
          useValue: platformConfigRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Promoter),
          useValue: promoterRepo,
        },
        {
          provide: getRepositoryToken(PromoterCommission),
          useValue: commissionRepo,
        },
        {
          provide: getRepositoryToken(PlatformExpense),
          useValue: platformExpenseRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  describe('calculateMonthlyFee', () => {
    it('validates that a PIONEER tenant with 0 or 1 active referrals pays full price ($20 + 16% IVA = $23.20)', async () => {
      const mockTenant0 = {
        id: 'tenant-p0',
        name: 'Pioneer Zero',
        plan_type: TenantPlanType.PIONEER,
        base_price: 20.0,
        status: TenantStatus.ACTIVE,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant0);

      const qbMock0 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock0);

      const fee0 = await service.calculateMonthlyFee('tenant-p0');
      expect(fee0.basePrice).toBe(20.0);
      expect(fee0.activeReferrals).toBe(0);
      expect(fee0.discountPercentage).toBe(0);
      expect(fee0.subtotalFee).toBe(20.0);
      expect(fee0.ivaPercentage).toBe(16);
      expect(fee0.ivaAmount).toBe(3.20);
      expect(fee0.finalFee).toBe(23.20);

      const mockTenant1 = {
        id: 'tenant-p1',
        name: 'Pioneer One',
        plan_type: TenantPlanType.PIONEER,
        base_price: 20.0,
        status: TenantStatus.ACTIVE,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant1);

      const qbMock1 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock1);

      const fee1 = await service.calculateMonthlyFee('tenant-p1');
      expect(fee1.basePrice).toBe(20.0);
      expect(fee1.activeReferrals).toBe(1);
      expect(fee1.discountPercentage).toBe(0);
      expect(fee1.subtotalFee).toBe(20.0);
      expect(fee1.ivaPercentage).toBe(16);
      expect(fee1.ivaAmount).toBe(3.20);
      expect(fee1.finalFee).toBe(23.20);
    });

    it('validates that a PIONEER tenant with >= 2 active referrals gets 100% discount ($0) and auto-activates', async () => {
      const mockTenant = {
        id: 'tenant-2',
        name: 'Pioneer Master',
        plan_type: TenantPlanType.PIONEER,
        base_price: 20.0,
        status: TenantStatus.TRIAL,
        isActive: true,
        current_period_ends_at: null,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock);

      const fee = await service.calculateMonthlyFee('tenant-2');
      expect(fee.basePrice).toBe(20.0);
      expect(fee.activeReferrals).toBe(2);
      expect(fee.discountPercentage).toBe(100);
      expect(fee.subtotalFee).toBe(0);
      expect(fee.ivaAmount).toBe(0);
      expect(fee.finalFee).toBe(0);

      // Validates auto-activation in DB with 30 days monthly extension
      expect(tenantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tenant-2',
          status: TenantStatus.ACTIVE,
          isActive: true,
          current_period_ends_at: expect.any(Date),
        }),
      );
      const savedTenant = tenantRepo.save.mock.calls[0][0];
      const diffDays = Math.round((savedTenant.current_period_ends_at.getTime() - Date.now()) / 86400000);
      expect(diffDays).toBe(30);
    });

    it('validates that a REGULAR tenant gets 10% per referral topado al 50% y con piso dinámico basePrice * 0.5 + 16% IVA (probando 5, 8 y 10 referidos)', async () => {
      const mockTenant = {
        id: 'tenant-3',
        name: 'Regular Store',
        plan_type: TenantPlanType.REGULAR,
        base_price: 30.0, // Base price personalizada de $30
        status: TenantStatus.ACTIVE,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      // 1. Con 5 referidos: 50% descuento -> subtotal $15.00 + IVA $2.40 = $17.40
      const qbMock5 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock5);

      const fee5 = await service.calculateMonthlyFee('tenant-3');
      expect(fee5.activeReferrals).toBe(5);
      expect(fee5.discountPercentage).toBe(50);
      expect(fee5.subtotalFee).toBe(15.0);
      expect(fee5.ivaAmount).toBe(2.40);
      expect(fee5.finalFee).toBe(17.40);

      // 2. Con 8 referidos: topado al 50% -> subtotal $15.00 + IVA $2.40 = $17.40
      const qbMock8 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(8),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock8);

      const fee8 = await service.calculateMonthlyFee('tenant-3');
      expect(fee8.activeReferrals).toBe(8);
      expect(fee8.discountPercentage).toBe(50);
      expect(fee8.subtotalFee).toBe(15.0);
      expect(fee8.ivaAmount).toBe(2.40);
      expect(fee8.finalFee).toBe(17.40);

      // 3. Con 10 referidos: topado al 50% -> subtotal $15.00 + IVA $2.40 = $17.40
      const qbMock10 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock10);

      const fee10 = await service.calculateMonthlyFee('tenant-3');
      expect(fee10.activeReferrals).toBe(10);
      expect(fee10.discountPercentage).toBe(50);
      expect(fee10.subtotalFee).toBe(15.0);
      expect(fee10.ivaAmount).toBe(2.40);
      expect(fee10.finalFee).toBe(17.40);
    });

    it('validates that query builder correctly queries referrals in ACTIVE status or unexpired TRIAL', async () => {
      const mockTenant = {
        id: 'tenant-ref-check',
        name: 'Check Referrals',
        plan_type: TenantPlanType.REGULAR,
        base_price: 20.0,
        status: TenantStatus.ACTIVE,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(4),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock);

      await service.calculateMonthlyFee('tenant-ref-check');

      expect(tenantRepo.createQueryBuilder).toHaveBeenCalledWith('t');
      expect(qbMock.where).toHaveBeenCalledWith('t.referred_by_tenant_id = :tenantId', { tenantId: 'tenant-ref-check' });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(t.status = :active OR (t.status = :trial AND (t.trial_ends_at > :now OR t.trial_ends_at IS NULL)))',
        expect.objectContaining({
          active: TenantStatus.ACTIVE,
          trial: TenantStatus.TRIAL,
          now: expect.any(Date),
        }),
      );
    });
  });

  describe('approvePayment', () => {
    it('validates that approvePayment extends current_period_ends_at by 30 days and sets status to ACTIVE', async () => {
      const mockReport = {
        id: 'report-1',
        tenant_id: 'tenant-10',
        amount: 20.0,
        status: SaaSPaymentStatus.PENDING,
        reject_reason: null,
      };
      const mockTenant = {
        id: 'tenant-10',
        name: 'My Store',
        status: TenantStatus.PAST_DUE,
        isActive: false,
        current_period_ends_at: null,
        promoterId: null,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any, options: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      const result = await service.approvePayment('report-1');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({
          id: 'tenant-10',
          status: TenantStatus.ACTIVE,
          isActive: true,
          current_period_ends_at: expect.any(Date),
        }),
      );
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        SaaSPaymentReport,
        expect.objectContaining({
          id: 'report-1',
          status: SaaSPaymentStatus.APPROVED,
          reject_reason: null,
        }),
      );
      expect(notificationsService.sendNotificationToNegocio).toHaveBeenCalledWith(
        'tenant-10',
        expect.objectContaining({
          title: expect.stringContaining('¡Pago de Suscripción Aprobado!'),
        }),
        ['ADMIN'],
      );
    });

    it('generates an ACTIVATION commission ($10 USD) on first payment of a promoter-affiliated tenant', async () => {
      const mockReport = {
        id: 'report-act',
        tenant_id: 'tenant-prom-1',
        amount: 20.0,
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-1',
        name: 'Promo Store 1',
        promoterId: 'promoter-123',
        status: TenantStatus.TRIAL,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      queryRunner.manager.count.mockResolvedValue(0); // 0 prior activation commissions

      const result = await service.approvePayment('report-act');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-1',
          type: PromoterCommissionType.ACTIVATION,
          amountUSD: 10.00, // 50% of $20.00 first activation payment
          status: PromoterCommissionStatus.PENDING,
        }),
      );
    });

    it('generates an ACTIVATION commission of 50% ($100 USD) on first annual payment ($200 USD)', async () => {
      const mockReport = {
        id: 'report-act-annual',
        tenant_id: 'tenant-prom-1',
        amount: 200.0,
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-1',
        name: 'Promo Store 1',
        promoterId: 'promoter-123',
        status: TenantStatus.TRIAL,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      queryRunner.manager.count.mockResolvedValue(0); // 0 prior activation commissions

      const result = await service.approvePayment('report-act-annual');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-1',
          type: PromoterCommissionType.ACTIVATION,
          amountUSD: 100.00, // 50% of $200.00 first activation payment
          status: PromoterCommissionStatus.PENDING,
        }),
      );
    });

    it('generates a RECURRING commission (10% of charged amount) on subsequent payments', async () => {
      const mockReport = {
        id: 'report-rec',
        tenant_id: 'tenant-prom-1',
        amount: 10.0, // Discounted fee
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-1',
        name: 'Promo Store 1',
        promoterId: 'promoter-123',
        status: TenantStatus.ACTIVE,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      // First call is count(Tenant) -> say 10 active clients. Second call is count(PromoterCommission) -> 1
      queryRunner.manager.count.mockImplementation((entity: any) => {
        if (entity === Tenant) return Promise.resolve(10);
        return Promise.resolve(1);
      });

      const result = await service.approvePayment('report-rec');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-1',
          type: PromoterCommissionType.RECURRING,
          amountUSD: 1.00, // 10% of $10
          status: PromoterCommissionStatus.PENDING,
        }),
      );
    });

    it('generates a 15% commission when promoter has 50 to 99 active clients (e.g. quarterly payment)', async () => {
      const mockReport = {
        id: 'report-trimestral',
        tenant_id: 'tenant-prom-1',
        amount: 60.0, // Trimestre $60
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-1',
        name: 'Promo Store 1',
        promoterId: 'promoter-123',
        status: TenantStatus.ACTIVE,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      // 60 active clients (Tier 2: 15%), 1 prior commission
      queryRunner.manager.count.mockImplementation((entity: any) => {
        if (entity === Tenant) return Promise.resolve(60);
        return Promise.resolve(1);
      });

      const result = await service.approvePayment('report-trimestral');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-1',
          type: PromoterCommissionType.RECURRING,
          amountUSD: 9.00, // 15% of $60 = $9.00
          status: PromoterCommissionStatus.PENDING,
        }),
      );
    });

    it('generates a 20% commission when promoter has 100+ active clients (e.g. annual payment)', async () => {
      const mockReport = {
        id: 'report-anual',
        tenant_id: 'tenant-prom-1',
        amount: 200.0, // Anual $200
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-1',
        name: 'Promo Store 1',
        promoterId: 'promoter-123',
        status: TenantStatus.ACTIVE,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        return Promise.resolve(null);
      });

      // 105 active clients (Tier 3: 20%), 1 prior commission
      queryRunner.manager.count.mockImplementation((entity: any) => {
        if (entity === Tenant) return Promise.resolve(105);
        return Promise.resolve(1);
      });

      const result = await service.approvePayment('report-anual');
      expect(result.success).toBe(true);
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-1',
          type: PromoterCommissionType.RECURRING,
          amountUSD: 40.00, // 20% of $200 = $40.00
          status: PromoterCommissionStatus.PENDING,
        }),
      );
    });

    it('generates a BONUS commission ($10 USD) upon reaching 5th historical activation', async () => {
      const mockReport = {
        id: 'report-milestone-5',
        tenant_id: 'tenant-prom-5',
        amount: 20.0,
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-5',
        name: 'Promo Store 5',
        promoterId: 'promoter-123',
        status: TenantStatus.TRIAL,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any, criteria: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        if (entityClass === PromoterCommission) {
          // No prior bonus found for milestone
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      // 1st count call: activeClientsCount for this promoter (Tenant) -> 5
      // 2nd count call: activationCommissionsCount for this tenant (PromoterCommission) -> 0 (isFirstActivation = true)
      // 3rd count call: totalHistoricalActivations for this promoter (PromoterCommission) -> 5 (triggers MILESTONE_5)
      queryRunner.manager.count
        .mockResolvedValueOnce(5) // activeClientsCount
        .mockResolvedValueOnce(0) // isFirstActivation for this tenant
        .mockResolvedValueOnce(5); // totalHistoricalActivations for promoter

      const result = await service.approvePayment('report-milestone-5');
      expect(result.success).toBe(true);

      // Verify that the regular ACTIVATION commission (50% = $10) was created
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-5',
          type: PromoterCommissionType.ACTIVATION,
          amountUSD: 10.00,
        }),
      );

      // Verify that the BONUS commission ($10 for Meta 5) was created and saved
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          promoterId: 'promoter-123',
          tenantId: 'tenant-prom-5',
          type: PromoterCommissionType.BONUS,
          amountUSD: 10.00,
          notes: expect.stringContaining('MILESTONE_5'),
        }),
      );
    });

    it('does NOT re-issue a milestone bonus if already awarded (anti-bounce protection)', async () => {
      const mockReport = {
        id: 'report-milestone-rebound',
        tenant_id: 'tenant-prom-6',
        amount: 20.0,
        status: SaaSPaymentStatus.PENDING,
      };
      const mockTenant = {
        id: 'tenant-prom-6',
        name: 'Promo Store 6',
        promoterId: 'promoter-123',
        status: TenantStatus.TRIAL,
      };

      queryRunner.manager.findOne.mockImplementation((entityClass: any, criteria: any) => {
        if (entityClass === SaaSPaymentReport) return Promise.resolve(mockReport);
        if (entityClass === Tenant) return Promise.resolve(mockTenant);
        if (entityClass === PromoterCommission) {
          // An existing bonus for MILESTONE_5 is found
          return Promise.resolve({
            id: 'comm-bonus-prior',
            promoterId: 'promoter-123',
            type: PromoterCommissionType.BONUS,
            notes: 'Bono por meta histórica alcanzada: Meta 5 activaciones (MILESTONE_5)',
          });
        }
        return Promise.resolve(null);
      });

      queryRunner.manager.count
        .mockResolvedValueOnce(5) // activeClientsCount
        .mockResolvedValueOnce(0) // isFirstActivation for this tenant
        .mockResolvedValueOnce(6); // totalHistoricalActivations = 6

      queryRunner.manager.create.mockClear();

      const result = await service.approvePayment('report-milestone-rebound');
      expect(result.success).toBe(true);

      // Verify activation commission was created
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          type: PromoterCommissionType.ACTIVATION,
        }),
      );

      // Verify BONUS was NOT created again because it already exists
      expect(queryRunner.manager.create).not.toHaveBeenCalledWith(
        PromoterCommission,
        expect.objectContaining({
          type: PromoterCommissionType.BONUS,
        }),
      );
    });
  });

  describe('rejectPayment', () => {
    it('validates that rejectPayment stores the reject_reason, status REJECTED, and notifies business', async () => {
      const mockReport = {
        id: 'report-2',
        tenant_id: 'tenant-20',
        amount: 20.0,
        status: SaaSPaymentStatus.PENDING,
        reject_reason: null,
      };
      paymentReportRepo.findOne.mockResolvedValue(mockReport);

      const result = await service.rejectPayment('report-2', 'Referencia bancaria inexistente');
      expect(result.success).toBe(true);
      expect(paymentReportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-2',
          status: SaaSPaymentStatus.REJECTED,
          reject_reason: 'Referencia bancaria inexistente',
        }),
      );
      expect(notificationsService.sendNotificationToNegocio).toHaveBeenCalledWith(
        'tenant-20',
        expect.objectContaining({
          title: expect.stringContaining('Comprobante de Pago Rechazado'),
          body: expect.stringContaining('Referencia bancaria inexistente'),
        }),
        ['ADMIN'],
      );
    });
  });

  describe('createPromoter', () => {
    it('creates a new promoter with default code generation and password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      promoterRepo.findOne.mockResolvedValue(null);

      const result = await service.createPromoter({
        username: 'carlos',
        email: 'carlos@promotor.com',
        phone: '04141234567',
        pagoMovilPhone: '04141234567',
        pagoMovilCedula: 'V-12345678',
        pagoMovilBank: '0134',
      });

      expect(result).toBeDefined();
      expect(result.username).toBe('carlos');
      expect(result.email).toBe('carlos@promotor.com');
      expect(result.code).toMatch(/^PROM-CARLOS/);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'carlos',
          email: 'carlos@promotor.com',
          role: 'PROMOTOR',
        }),
      );
      expect(promoterRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pagoMovilCedula: 'V-12345678',
          isActive: true,
        }),
      );
    });

    it('throws error if user already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-id' });
      await expect(
        service.createPromoter({
          username: 'existing',
          email: 'existing@promotor.com',
        }),
      ).rejects.toThrow('Ya existe un usuario con este correo electrónico o nombre de usuario');
    });
  });

  describe('payPromoterCommission', () => {
    it('throws BadRequestException if paymentReference is missing or empty', async () => {
      await expect(service.payPromoterCommission('comm-1', '   ')).rejects.toThrow(
        'La referencia de pago es obligatoria'
      );
    });

    it('throws NotFoundException if commission does not exist', async () => {
      commissionRepo.findOne.mockResolvedValue(null);
      await expect(service.payPromoterCommission('non-existent', 'REF-12345')).rejects.toThrow(
        /no encontrada/
      );
    });

    it('throws BadRequestException if commission is already in PAID status', async () => {
      commissionRepo.findOne.mockResolvedValue({
        id: 'comm-paid-1',
        status: PromoterCommissionStatus.PAID,
      });
      await expect(service.payPromoterCommission('comm-paid-1', 'REF-12345')).rejects.toThrow(
        'Esta comisión ya fue pagada previamente'
      );
    });

    it('successfully transitions commission to PAID and records paidAt and paymentReference', async () => {
      const mockCommission = {
        id: 'comm-pending-1',
        amountUSD: 10.00,
        status: PromoterCommissionStatus.PENDING,
        paidAt: null,
        paymentReference: null,
      };
      commissionRepo.findOne.mockResolvedValue(mockCommission);
      commissionRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.payPromoterCommission('comm-pending-1', 'PAGO-MOVIL-REF-9988');

      expect(result.status).toBe(PromoterCommissionStatus.PAID);
      expect(result.paymentReference).toBe('PAGO-MOVIL-REF-9988');
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(commissionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PromoterCommissionStatus.PAID,
          paymentReference: 'PAGO-MOVIL-REF-9988',
        })
      );
    });
  });

  describe('getTenants', () => {
    it('automatically transitions an expired TRIAL tenant to PAST_DUE and persists to database', async () => {
      const pastDate = new Date(Date.now() - 5 * 86400000); // 5 days ago
      const expiredTenant = {
        id: 'tenant-expired-trial',
        name: 'Techno',
        status: TenantStatus.TRIAL,
        plan_type: TenantPlanType.REGULAR,
        base_price: 20,
        trial_ends_at: pastDate,
        current_period_ends_at: null,
        createdAt: new Date(Date.now() - 20 * 86400000),
      };

      tenantRepo.find.mockResolvedValue([expiredTenant]);
      tenantRepo.findOne.mockResolvedValue(expiredTenant);
      tenantRepo.save.mockImplementation((t: any) => Promise.resolve(t));
      userAccessRepo.find.mockResolvedValue([]);

      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(mockQb);

      const tenants = await service.getTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0].status).toBe(TenantStatus.PAST_DUE);
      expect(tenants[0].trialDaysLeft).toBe(0);
      expect(tenantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tenant-expired-trial',
          status: TenantStatus.PAST_DUE,
        })
      );
    });

    it('preserves TRIAL status if trial period is still active', async () => {
      const futureDate = new Date(Date.now() + 4 * 86400000); // 4 days remaining
      const activeTrialTenant = {
        id: 'tenant-active-trial',
        name: 'Inversiones Lineira',
        status: TenantStatus.TRIAL,
        plan_type: TenantPlanType.REGULAR,
        base_price: 20,
        trial_ends_at: futureDate,
        current_period_ends_at: null,
        createdAt: new Date(),
      };

      tenantRepo.find.mockResolvedValue([activeTrialTenant]);
      tenantRepo.findOne.mockResolvedValue(activeTrialTenant);
      userAccessRepo.find.mockResolvedValue([]);

      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(mockQb);

      const tenants = await service.getTenants();

      expect(tenants).toHaveLength(1);
      expect(tenants[0].status).toBe(TenantStatus.TRIAL);
      expect(tenants[0].trialDaysLeft).toBeGreaterThan(0);
    });
  });
});
