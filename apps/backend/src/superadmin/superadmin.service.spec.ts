import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentMethod,
  SaaSPaymentStatus,
} from '@nutrideli/shared-types';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let tenantRepo: any;
  let paymentReportRepo: any;
  let userAccessRepo: any;
  let platformConfigRepo: any;

  beforeEach(async () => {
    tenantRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => dto),
    };

    paymentReportRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => ({ id: 'rep-1', ...dto })),
    };

    userAccessRepo = {
      find: jest.fn(),
    };

    platformConfigRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => dto),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(SaaSPaymentReport), useValue: paymentReportRepo },
        { provide: getRepositoryToken(UserTenantAccess), useValue: userAccessRepo },
        { provide: getRepositoryToken(PlatformConfig), useValue: platformConfigRepo },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  describe('calculateMonthlyFee (Referral Engine)', () => {
    it('should throw NotFoundException if tenant does not exist', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.calculateMonthlyFee('unknown')).rejects.toThrow(NotFoundException);
    });

    it('PIONEER plan with 0 or 1 active referral pays full price ($20, 0% discount)', async () => {
      tenantRepo.findOne.mockResolvedValue({
        id: 't-pioneer',
        base_price: 20.0,
        plan_type: TenantPlanType.PIONEER,
      });
      tenantRepo.count.mockResolvedValue(1); // 1 active referral

      const result = await service.calculateMonthlyFee('t-pioneer');
      expect(result.basePrice).toBe(20);
      expect(result.activeReferrals).toBe(1);
      expect(result.discountPercentage).toBe(0);
      expect(result.finalFee).toBe(20);
    });

    it('PIONEER plan with 2 or more active referrals pays $0 (100% discount)', async () => {
      tenantRepo.findOne.mockResolvedValue({
        id: 't-pioneer-2',
        base_price: 20.0,
        plan_type: TenantPlanType.PIONEER,
      });
      tenantRepo.count.mockResolvedValue(2); // 2 active referrals

      const result = await service.calculateMonthlyFee('t-pioneer-2');
      expect(result.activeReferrals).toBe(2);
      expect(result.discountPercentage).toBe(100);
      expect(result.finalFee).toBe(0);
    });

    it('REGULAR plan with 2 active referrals gets 20% discount ($16 fee)', async () => {
      tenantRepo.findOne.mockResolvedValue({
        id: 't-reg-2',
        base_price: 20.0,
        plan_type: TenantPlanType.REGULAR,
      });
      tenantRepo.count.mockResolvedValue(2);

      const result = await service.calculateMonthlyFee('t-reg-2');
      expect(result.discountPercentage).toBe(20);
      expect(result.finalFee).toBe(16);
    });

    it('REGULAR plan discount caps at 50% and minimum fee of $10', async () => {
      tenantRepo.findOne.mockResolvedValue({
        id: 't-reg-max',
        base_price: 20.0,
        plan_type: TenantPlanType.REGULAR,
      });
      tenantRepo.count.mockResolvedValue(8); // 8 * 10% = 80%, but capped at 50%

      const result = await service.calculateMonthlyFee('t-reg-max');
      expect(result.discountPercentage).toBe(50);
      expect(result.finalFee).toBe(10);
    });
  });

  describe('getMySubscription', () => {
    it('generates friendly referral code if tenant does not have one', async () => {
      const mockTenant = {
        id: 't-1',
        name: 'Burger Queen',
        base_price: 20.0,
        plan_type: TenantPlanType.REGULAR,
        status: TenantStatus.TRIAL,
        referral_code: null,
        createdAt: new Date(),
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);
      tenantRepo.count.mockResolvedValue(0);

      const sub = await service.getMySubscription('t-1');
      expect(sub.referralCode).toBeDefined();
      expect(sub.referralCode).toMatch(/^BURG-[A-Z0-9]{4}$/);
      expect(tenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateTenantPlan', () => {
    it('updates planType, status, basePrice and extends trial days manually', async () => {
      const futureTrial = new Date(Date.now() + 5 * 86400000);
      const mockTenant = {
        id: 't-trial',
        name: 'Cafe Roma',
        status: TenantStatus.TRIAL,
        plan_type: TenantPlanType.REGULAR,
        base_price: 20.0,
        trial_ends_at: futureTrial,
      };
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      const updated = await service.updateTenantPlan('t-trial', {
        planType: TenantPlanType.PIONEER,
        status: TenantStatus.ACTIVE,
        basePrice: 25.0,
        extendDays: 30,
      });

      expect(updated.plan_type).toBe(TenantPlanType.PIONEER);
      expect(updated.status).toBe(TenantStatus.ACTIVE);
      expect(updated.base_price).toBe(25.0);
      expect(tenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('reportPayment', () => {
    it('throws BadRequestException if amount is 0 or negative', async () => {
      await expect(
        service.reportPayment('t-1', {
          amount: 0,
          payment_method: SaaSPaymentMethod.PAGO_MOVIL,
          reference: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if reference is missing or empty', async () => {
      await expect(
        service.reportPayment('t-1', {
          amount: 20,
          payment_method: SaaSPaymentMethod.PAGO_MOVIL,
          reference: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully creates payment report with pending status and bolivares calculation', async () => {
      const report = await service.reportPayment('t-1', {
        amount: 20,
        amount_bs: 800,
        exchange_rate: 40,
        payment_method: SaaSPaymentMethod.PAGO_MOVIL,
        reference: 'REF-987654',
      });

      expect(report.amount).toBe(20);
      expect(report.amount_bs).toBe(800);
      expect(report.exchange_rate).toBe(40);
      expect(report.reference).toBe('REF-987654');
      expect(report.status).toBe(SaaSPaymentStatus.PENDING);
    });
  });

  describe('approvePayment', () => {
    it('throws NotFoundException if report not found', async () => {
      paymentReportRepo.findOne.mockResolvedValue(null);
      await expect(service.approvePayment('rep-unknown')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if already approved', async () => {
      paymentReportRepo.findOne.mockResolvedValue({
        id: 'rep-done',
        status: SaaSPaymentStatus.APPROVED,
      });
      await expect(service.approvePayment('rep-done')).rejects.toThrow(BadRequestException);
    });

    it('approves payment, marks ACTIVE, and extends expiration +30 days', async () => {
      const now = new Date();
      const mockTenant = {
        id: 't-active',
        name: 'Pizza Express',
        status: TenantStatus.TRIAL,
        isActive: false,
        current_period_ends_at: null,
      };

      const mockReport = {
        id: 'rep-valid',
        tenant_id: 't-active',
        amount: 20,
        status: SaaSPaymentStatus.PENDING,
        reject_reason: null,
      };

      paymentReportRepo.findOne.mockResolvedValue(mockReport);
      tenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.approvePayment('rep-valid');
      expect(result.success).toBe(true);
      expect(mockReport.status).toBe(SaaSPaymentStatus.APPROVED);
      expect(mockTenant.status).toBe(TenantStatus.ACTIVE);
      expect(mockTenant.isActive).toBe(true);
      expect(mockTenant.current_period_ends_at).toBeDefined();

      const diffDays = Math.round(
        (new Date(mockTenant.current_period_ends_at).getTime() - now.getTime()) / 86400000,
      );
      expect(diffDays).toBe(30);
    });
  });

  describe('rejectPayment', () => {
    it('marks report REJECTED with note', async () => {
      const mockReport = {
        id: 'rep-reject',
        status: SaaSPaymentStatus.PENDING,
        reject_reason: null,
      };
      paymentReportRepo.findOne.mockResolvedValue(mockReport);

      const result = await service.rejectPayment('rep-reject', 'Referencia inválida');
      expect(result.success).toBe(true);
      expect(mockReport.status).toBe(SaaSPaymentStatus.REJECTED);
      expect(mockReport.reject_reason).toBe('Referencia inválida');
      expect(paymentReportRepo.save).toHaveBeenCalled();
    });
  });

  describe('PlatformConfig', () => {
    it('initializes default config if not found', async () => {
      platformConfigRepo.findOne.mockResolvedValue(null);

      const config = await service.getPlatformConfig();
      expect(config.id).toBe('default');
      expect(config.companyBank).toBe('Banesco');
      expect(config.defaultMonthlyPrice).toBe(20.0);
      expect(platformConfigRepo.save).toHaveBeenCalled();
    });

    it('updates platform config', async () => {
      const existing = {
        id: 'default',
        companyBank: 'Banesco',
        companyPhone: '0414-1111111',
      };
      platformConfigRepo.findOne.mockResolvedValue(existing);

      const updated = await service.updatePlatformConfig({
        companyBank: 'Mercantil',
        companyPhone: '0424-9999999',
      });

      expect(updated.companyBank).toBe('Mercantil');
      expect(updated.companyPhone).toBe('0424-9999999');
      expect(platformConfigRepo.save).toHaveBeenCalled();
    });
  });
});
