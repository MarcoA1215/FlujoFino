import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService, resolveOnboardingFlags } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User } from '../entities/user.entity';
import { UserRole, DEFAULT_TENANT_NAME } from '@finowork/shared-types';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService - Seguridad, Multi-Tenant y Verificación', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockDataSource: any;
  let mockMailService: any;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
    };

    mockDataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === User || entity?.name === 'User') return mockUserRepo;
        return mockUserRepo;
      }),
    };

    mockMailService = {
      sendVerificationCode: jest.fn(),
      sendPasswordResetCode: jest.fn(),
    };

    mockUsersService = {
      findByUsername: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token-xyz'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser - Logins Fallidos y Políticas de Acceso', () => {
    it('debe retornar null cuando el nombre de usuario no existe', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('inexistente', 'clave123');

      expect(result).toBeNull();
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('inexistente');
    });

    it('debe arrojar UnauthorizedException si el usuario tiene rol OPERATIVO (sin acceso a plataforma)', async () => {
      const mockUser = {
        id: 'user-op',
        username: 'operario1',
        role: UserRole.OPERATIVO,
        passwordHash: 'hash123',
      };
      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      await expect(service.validateUser('operario1', 'clave123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe retornar null cuando la contraseña no coincide con el hash (bcrypt inválido)', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'admin',
        role: UserRole.ADMIN,
        passwordHash: '$2a$10$hashedPasswordHere',
        tenantAccess: [],
      };
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('admin', 'password_erronea');

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('password_erronea', '$2a$10$hashedPasswordHere');
    });

    it('debe arrojar UnauthorizedException cuando el usuario no tiene sucursales asignadas ni rol de administración', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'cajero_sin_sucursal',
        role: UserRole.POS,
        passwordHash: '$2a$10$validHash',
        tenantAccess: [],
      };
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('cajero_sin_sucursal', 'clave123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe validar con éxito a un usuario ADMIN con acceso a sistema central', async () => {
      const mockUser = {
        id: 'admin-id',
        username: 'admin',
        role: UserRole.ADMIN,
        passwordHash: '$2a$10$validHash',
        tenantAccess: [
          {
            tenantId: 'tenant-10',
            tenant: { name: 'Sede Principal' },
            role: UserRole.ADMIN,
            isActive: true,
            status: 'ACCEPTED',
          },
        ],
      };
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin', 'clave123', 'tenant-10');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('tenant-10');
      expect(result?.role).toBe(UserRole.ADMIN);
      expect(result?.user.username).toBe('admin');
      expect(result?.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login - Emisión de JWT y Claims Multi-Tenant', () => {
    it('debe firmar el token JWT con los claims multi-tenant esperados', async () => {
      const user = {
        id: 'usr-abc-123',
        username: 'gerente_demo',
        name: 'Gerente General',
        email: 'gerente@negocio.com',
        identification: 'V-12345678',
        phone: '+584141234567',
        isEmailVerified: true,
      };
      const tenantId = 'tenant-restaurante-5';
      const role = UserRole.ADMIN;
      const tenantName = 'Restaurante Gourmet';
      const roles = [UserRole.ADMIN, UserRole.POS];

      const response = await service.login(user, tenantId, role, tenantName, roles);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: 'usr-abc-123',
        username: 'gerente_demo',
        name: 'Gerente General',
        email: 'gerente@negocio.com',
        identification: 'V-12345678',
        phone: '+584141234567',
        isEmailVerified: true,
        isPromoter: false,
        sub: 'usr-abc-123',
        role: UserRole.ADMIN,
        roles: [UserRole.ADMIN, UserRole.POS],
        tenantId: 'tenant-restaurante-5',
        tenantName: 'Restaurante Gourmet',
        termsAcceptedVersion: null,
        privacyAcceptedVersion: null,
      });

      expect(response).toEqual({
        access_token: 'mocked-jwt-token-xyz',
        user: expect.objectContaining({
          tenantId: 'tenant-restaurante-5',
          tenantName: 'Restaurante Gourmet',
          role: UserRole.ADMIN,
          roles: [UserRole.ADMIN, UserRole.POS],
        }),
      });
    });

    it('debe asignar el nombre de tenant por defecto cuando no se provee tenantName', async () => {
      const user = { id: 'usr-99', username: 'cajero' };

      const response = await service.login(user, 'tenant-solo', UserRole.POS);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-solo',
          tenantName: DEFAULT_TENANT_NAME,
          role: UserRole.POS,
        }),
      );
      expect(response.access_token).toBe('mocked-jwt-token-xyz');
    });
  });

  describe('sendVerificationCode', () => {
    it('debe arrojar BadRequestException cuando mailService.sendVerificationCode retorne false', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        isEmailVerified: false,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendVerificationCode.mockResolvedValue(false);

      await expect(service.sendVerificationCode('test@example.com')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('debe generar y guardar código de 6 dígitos con expiración de 15 min y retornar success: true cuando el envío es exitoso', async () => {
      const user: any = {
        id: 'user-1',
        email: 'test@example.com',
        isEmailVerified: false,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendVerificationCode.mockResolvedValue(true);

      const before = Date.now();
      const result = await service.sendVerificationCode('test@example.com');
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(user.emailVerificationCode).toMatch(/^\d{6}$/);
      expect(user.emailVerificationExpiresAt).toBeDefined();

      const expiresTime = new Date(user.emailVerificationExpiresAt).getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
      expect(expiresTime).toBeLessThanOrEqual(after + 16 * 60 * 1000);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('forgotPassword', () => {
    it('debe arrojar BadRequestException si mailService.sendPasswordResetCode retorna false', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        resetPasswordCode: null,
        resetPasswordExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendPasswordResetCode.mockResolvedValue(false);

      await expect(service.forgotPassword('test@example.com')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('debe guardar resetPasswordCode y resetPasswordExpires si el envío es exitoso', async () => {
      const user: any = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        resetPasswordCode: null,
        resetPasswordExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockMailService.sendPasswordResetCode.mockResolvedValue(true);

      const before = Date.now();
      const result = await service.forgotPassword('test@example.com');
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(user.resetPasswordCode).toMatch(/^\d{6}$/);
      expect(user.resetPasswordExpires).toBeDefined();

      const expiresTime = new Date(user.resetPasswordExpires).getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
      expect(expiresTime).toBeLessThanOrEqual(after + 16 * 60 * 1000);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('resolveOnboardingFlags & registerTenant - Presets Inteligentes de Registro', () => {
    it('configura correctamente el arquetipo SERVICES (Spas, Salones, Barberías)', () => {
      const flags = resolveOnboardingFlags({ businessProfile: 'SERVICES' });
      expect(flags).toEqual({
        featureCustomerSchedules: true,
        featureBuySell: false,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: false,
        featureShowCatalog: true,
        featureFiscalSupport: false,
      });
    });

    it('configura correctamente el arquetipo RETAIL (Tiendas de Ropa, Calzado, Accesorios)', () => {
      const flags = resolveOnboardingFlags({ businessProfile: 'RETAIL' });
      expect(flags).toEqual({
        featureCustomerSchedules: false,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
        featureFiscalSupport: false,
      });
    });

    it('configura correctamente el arquetipo FOOD_PRODUCTION (Restaurantes, Panaderías, Repostería)', () => {
      const flags = resolveOnboardingFlags({ businessProfile: 'FOOD_PRODUCTION' });
      expect(flags).toEqual({
        featureCustomerSchedules: false,
        featureBuySell: false,
        featureRecipes: true,
        featureProduction: true,
        featureDelivery: true,
        featureShowCatalog: true,
        featureFiscalSupport: false,
      });
    });

    it('permite activar opcionalmente featureFiscalSupport (IVA / Libro de Ventas) en cualquier arquetipo', () => {
      const flags = resolveOnboardingFlags({
        businessProfile: 'RETAIL',
        featureFiscalSupport: true,
      });
      expect(flags).toEqual({
        featureCustomerSchedules: false,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
        featureFiscalSupport: true,
      });
    });

    it('permite personalización manual (CUSTOM) para negocios híbridos o mixtos', () => {
      const flags = resolveOnboardingFlags({
        businessProfile: 'CUSTOM',
        featureCustomerSchedules: true,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
      });
      expect(flags).toEqual({
        featureCustomerSchedules: true,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
        featureFiscalSupport: false,
      });
    });

    it('evita activar featureProduction por accidente en payloads legacy de solo citas', () => {
      const flags = resolveOnboardingFlags({
        featureCustomerSchedules: true,
        featureBuySell: false,
        featureRecipes: false,
      });
      expect(flags.featureCustomerSchedules).toBe(true);
      expect(flags.featureProduction).toBe(false);
      expect(flags.featureDelivery).toBe(false);
      expect(flags.featureShowCatalog).toBe(true);
    });

    it('persiste todas las flags del perfil en Settings durante registerTenant', async () => {
      const createdSettings: any[] = [];
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          })),
          findOne: jest.fn().mockResolvedValue({ defaultTrialDays: 15, defaultMonthlyPrice: 20 }),
          create: jest.fn((entity: any, data: any) => {
            if (entity === 'Settings') {
              createdSettings.push(data);
            }
            return { id: 'mock-id', ...data };
          }),
          save: jest.fn((entityOrData: any, maybeData?: any) => {
            const target = maybeData || entityOrData;
            return Promise.resolve({ id: 'saved-id', ...target });
          }),
        },
      };

      mockDataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');

      const res = await service.registerTenant({
        tenantName: 'Boutique Moda',
        username: 'boutique_admin',
        email: 'boutique@moda.com',
        password: 'password123',
        businessProfile: 'RETAIL',
        acceptedTerms: true,
        acceptedPrivacy: true,
      });

      expect(res.access_token).toBe('mocked-jwt-token-xyz');
      expect(createdSettings.length).toBe(1);
      expect(createdSettings[0]).toMatchObject({
        featureCustomerSchedules: false,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
      });
    });

    it('asigna defaultTrialDays (7 días) a un registro orgánico sin referido', async () => {
      let createdTenantData: any = null;
      const mockQueryRunner: any = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          })),
          findOne: jest.fn().mockResolvedValue({
            defaultTrialDays: 7,
            referredTrialDays: 15,
            defaultMonthlyPrice: 20,
          }),
          create: jest.fn((entity: any, data: any) => {
            if (entity.name === 'Tenant' || data.trial_ends_at !== undefined) {
              createdTenantData = data;
            }
            return { id: 'mock-tenant-id', ...data };
          }),
          save: jest.fn((entityOrData: any, maybeData?: any) => {
            const target = maybeData || entityOrData;
            return Promise.resolve({ id: 'saved-id', ...target });
          }),
        },
      };

      mockDataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');

      const beforeTime = new Date();
      await service.registerTenant({
        tenantName: 'Zapatería Orgánica',
        username: 'zapateria_admin',
        email: 'zapato@tienda.com',
        password: 'password123',
        businessProfile: 'RETAIL',
        acceptedTerms: true,
        acceptedPrivacy: true,
      });

      expect(createdTenantData).toBeDefined();
      const trialDaysDiff = Math.round(
        (createdTenantData.trial_ends_at.getTime() - beforeTime.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(trialDaysDiff).toBe(7);
      expect(createdTenantData.promoterId).toBeNull();
      expect(createdTenantData.referred_by_tenant_id).toBeNull();
    });

    it('asigna referredTrialDays (15 días) a un registro con código de referido válido de promotor', async () => {
      let createdTenantData: any = null;
      const mockQueryRunner: any = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          })),
          findOne: jest.fn((entity: any, opts: any) => {
            if (entity.name === 'Promoter' || opts?.where?.code === 'PROM-EXACTO') {
              return Promise.resolve({ id: 'promoter-uuid-1', code: 'PROM-EXACTO' });
            }
            return Promise.resolve({
              defaultTrialDays: 7,
              referredTrialDays: 15,
              defaultMonthlyPrice: 20,
            });
          }),
          create: jest.fn((entity: any, data: any) => {
            if (entity.name === 'Tenant' || data.trial_ends_at !== undefined) {
              createdTenantData = data;
            }
            return { id: 'mock-tenant-id', ...data };
          }),
          save: jest.fn((entityOrData: any, maybeData?: any) => {
            const target = maybeData || entityOrData;
            return Promise.resolve({ id: 'saved-id', ...target });
          }),
        },
      };

      mockDataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');

      const beforeTime = new Date();
      await service.registerTenant({
        tenantName: 'Spa Con Promotor',
        username: 'spa_admin',
        email: 'spa@belleza.com',
        password: 'password123',
        referralCode: 'PROM-EXACTO',
        businessProfile: 'SERVICES',
        acceptedTerms: true,
        acceptedPrivacy: true,
      });

      expect(createdTenantData).toBeDefined();
      const trialDaysDiff = Math.round(
        (createdTenantData.trial_ends_at.getTime() - beforeTime.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(trialDaysDiff).toBe(15);
      expect(createdTenantData.promoterId).toBe('promoter-uuid-1');
    });

    it('getTrialConfig retorna los días de prueba configurados para registro orgánico y referido', async () => {
      const mockPlatformConfigRepo = {
        findOne: jest.fn().mockResolvedValue({
          defaultTrialDays: 7,
          referredTrialDays: 15,
        }),
      };
      mockDataSource.getRepository = jest.fn().mockReturnValue(mockPlatformConfigRepo);

      const config = await service.getTrialConfig();
      expect(config).toEqual({ defaultTrialDays: 7, referredTrialDays: 15 });
    });
  });
});
