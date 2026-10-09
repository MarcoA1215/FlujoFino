import { TenantStatusGuard } from './tenant-status.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { TenantStatus } from '@finowork/shared-types';

describe('TenantStatusGuard', () => {
  let guard: TenantStatusGuard;
  let reflector: Reflector;
  let mockDataSource: any;
  let mockTenantRepo: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockTenantRepo = {
      findOne: jest.fn(),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockTenantRepo),
    };
    guard = new TenantStatusGuard(reflector, mockDataSource);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if user is not present (public route)', async () => {
    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access for superadmin', async () => {
    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'SUPERADMIN' } }),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access immediately if tenantId is not a valid UUID (literal space)', async () => {
    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'PROMOTER', tenantId: 'promoter-space' },
          url: '/orders',
        }),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockTenantRepo.findOne).not.toHaveBeenCalled();
  });

  it('should allow access for exempt payment routes even if tenant is suspended', async () => {
    const validUuid = '11111111-1111-1111-1111-111111111111';
    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'ADMIN', tenantId: validUuid },
          url: '/superadmin/payments/report',
        }),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if tenant is suspended', async () => {
    const validUuid = '11111111-1111-1111-1111-111111111111';
    mockTenantRepo.findOne.mockResolvedValue({
      id: validUuid,
      isActive: true,
      status: TenantStatus.SUSPENDED,
    });

    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'ADMIN', tenantId: validUuid },
          url: '/orders',
        }),
      }),
    };

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if tenant is active', async () => {
    const validUuid = '11111111-1111-1111-1111-111111111111';
    mockTenantRepo.findOne.mockResolvedValue({
      id: validUuid,
      isActive: true,
      status: TenantStatus.ACTIVE,
      current_period_ends_at: new Date(Date.now() + 864000000).toISOString(),
    });

    const context: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'ADMIN', tenantId: validUuid },
          url: '/orders',
        }),
      }),
    };

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
