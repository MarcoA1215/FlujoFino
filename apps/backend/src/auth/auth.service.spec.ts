import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService (Auth & Tenant Registration Flow)', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let dataSource: any;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    dataSource = {
      createQueryRunner: jest.fn(),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns null if user is not found', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('unknown', '123456');
      expect(result).toBeNull();
    });

    it('returns null if password does not match', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      usersService.findByUsername.mockResolvedValue({
        id: 'u-1',
        username: 'carlos',
        passwordHash,
      });

      const result = await service.validateUser('carlos', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('returns user and workspace access when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      usersService.findByUsername.mockResolvedValue({
        id: 'u-1',
        username: 'carlos',
        passwordHash,
        tenantAccess: [
          {
            tenantId: 'tenant-1',
            role: 'ADMIN',
            isActive: true,
            status: 'ACCEPTED',
            tenant: { id: 'tenant-1', name: 'La Pizzeria', isActive: true, status: 'ACTIVE' },
          },
        ],
      });

      const result = await service.validateUser('carlos', 'secret123', 'tenant-1');
      expect(result).toBeDefined();
      expect(result?.user.username).toBe('carlos');
      expect(result?.tenantId).toBe('tenant-1');
      expect(result?.role).toBe('ADMIN');
      expect(result?.tenantName).toBe('La Pizzeria');
    });
  });

  describe('login', () => {
    it('generates access_token and returns user payload', async () => {
      const mockUser = { id: 'u-1', username: 'carlos', email: 'carlos@test.com' };
      const res = await service.login(mockUser, 'tenant-1', 'ADMIN', 'La Pizzeria');

      expect(res.access_token).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'carlos',
        email: 'carlos@test.com',
        sub: 'u-1',
        role: 'ADMIN',
        tenantId: 'tenant-1',
        tenantName: 'La Pizzeria',
      });
      expect(res.user.role).toBe('ADMIN');
    });
  });

  describe('registerTenant', () => {
    it('creates tenant with 15-day trial, friendly referral code, and links referrer if code provided', async () => {
      let createdTenant: any = null;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'ref-tenant-999', name: 'Negocio Referidor' }),
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn((entityName: string, dto: any) => {
          const entity = { ...dto, id: `${entityName}-id` };
          if (entityName === 'Tenant') {
            createdTenant = entity;
          }
          return entity;
        }),
        save: jest.fn(async (entity: any) => {
          return entity;
        }),
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: mockManager,
      };

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const result = await service.registerTenant({
        tenantName: 'Arepas El Catire',
        username: 'elcatire',
        email: 'catire@arepas.com',
        password: 'Password2026*',
        referralCode: 'REFE-1234',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      expect(createdTenant).toBeDefined();
      expect(createdTenant.name).toBe('Arepas El Catire');
      expect(createdTenant.status).toBe('TRIAL');
      expect(createdTenant.plan_type).toBe('REGULAR');
      expect(createdTenant.referral_code).toMatch(/^AREP-[A-Z0-9]{4}$/);
      expect(createdTenant.referred_by_tenant_id).toBe('ref-tenant-999');

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
      expect(result.workspaces.length).toBe(1);
    });
  });
});
