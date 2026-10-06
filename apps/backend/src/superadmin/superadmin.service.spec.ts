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
    it('validates that a PIONEER tenant with 0 or 1 active referrals pays full price ($20)', async () => {
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
      expect(fee0.finalFee).toBe(20.0);

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
      expect(fee1.finalFee).toBe(20.0);
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

    it('validates that a REGULAR tenant gets 10% per referral topado al 50% y con piso dinámico basePrice * 0.5 (probando 5, 8 y 10 referidos)', async () => {
      const mockTenant = {
        id: 'tenant-3',
        name: 'Regular Store',
        plan_type: TenantPlanType.REGULAR,
        base_price: 30.0, // Base price personalizada de $30
        status: TenantStatus.ACTIVE,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      // 1. Con 5 referidos: 50% descuento -> $15.00
      const qbMock5 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock5);

      const fee5 = await service.calculateMonthlyFee('tenant-3');
      expect(fee5.activeReferrals).toBe(5);
      expect(fee5.discountPercentage).toBe(50);
      expect(fee5.finalFee).toBe(15.0);

      // 2. Con 8 referidos: topado al 50% -> $15.00
      const qbMock8 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(8),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock8);

      const fee8 = await service.calculateMonthlyFee('tenant-3');
      expect(fee8.activeReferrals).toBe(8);
      expect(fee8.discountPercentage).toBe(50);
      expect(fee8.finalFee).toBe(15.0);

      // 3. Con 10 referidos: topado al 50% -> $15.00
      const qbMock10 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };
      tenantRepo.createQueryBuilder.mockReturnValue(qbMock10);

      const fee10 = await service.calculateMonthlyFee('tenant-3');
      expect(fee10.activeReferrals).toBe(10);
      expect(fee10.discountPercentage).toBe(50);
      expect(fee10.finalFee).toBe(15.0);
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
          amountUSD: 10.00,
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

      queryRunner.manager.count.mockResolvedValue(1); // Already has 1 activation commission

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
});
