import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserRole } from '@finowork/shared-types';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';

describe('JwtStrategy - Seguridad y Revocación Inmediata de Sesiones', () => {
  let strategy: JwtStrategy;
  let mockConfigService: any;
  let mockUserRepo: any;
  let mockAccessRepo: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockAccessRepo = {
      findOne: jest.fn(),
    };

    mockDataSource = {
      isInitialized: true,
      getRepository: jest.fn((entity: any) => {
        if (entity === User || entity?.name === 'User') return mockUserRepo;
        if (entity === UserTenantAccess || entity?.name === 'UserTenantAccess') return mockAccessRepo;
        return mockUserRepo;
      }),
    };

    strategy = new JwtStrategy(mockConfigService as ConfigService, mockDataSource as any);
  });

  it('debe rechazar con UnauthorizedException si el usuario ya no existe en la base de datos (usuario eliminado)', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      username: 'usuario_eliminado',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      role: UserRole.ADMIN,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('El usuario no existe o su sesión ha sido revocada.');
  });

  it('debe rechazar con UnauthorizedException si el usuario no tiene acceso activo al tenant especificado (acceso revocado)', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'empleado_despedido',
      role: UserRole.POS,
    });

    mockAccessRepo.findOne.mockResolvedValue(null); // No tiene acceso al tenant

    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      username: 'empleado_despedido',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      role: UserRole.POS,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('El acceso a este espacio de trabajo ha sido revocado o suspendido.');
  });

  it('debe rechazar con UnauthorizedException si el acceso al tenant está marcado como inactivo (isActive: false)', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'empleado_inactivo',
      role: UserRole.POS,
    });

    mockAccessRepo.findOne.mockResolvedValue({
      id: 'acc-1',
      isActive: false,
      status: 'ACCEPTED',
    });

    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      username: 'empleado_inactivo',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      role: UserRole.POS,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('El acceso a este espacio de trabajo ha sido revocado o suspendido.');
  });

  it('debe permitir la sesión si el usuario existe y su acceso al tenant está activo y aceptado', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'admin_activo',
      email: 'admin@negocio.com',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });

    mockAccessRepo.findOne.mockResolvedValue({
      id: 'acc-1',
      isActive: true,
      status: 'ACCEPTED',
      role: UserRole.ADMIN,
    });

    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      username: 'admin_activo',
      email: 'admin@negocio.com',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      tenantName: 'Techno',
      role: UserRole.ADMIN,
      roles: [UserRole.ADMIN],
    };

    const result = await strategy.validate(payload);
    expect(result).toBeDefined();
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.username).toBe('admin_activo');
    expect(result.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
  });

  it('debe permitir al SUPERADMIN acceder sin necesidad de UserTenantAccess restringido', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'superadmin',
      role: UserRole.SUPERADMIN,
    });

    const payload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      username: 'superadmin',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      role: UserRole.SUPERADMIN,
    };

    const result = await strategy.validate(payload);
    expect(result).toBeDefined();
    expect(result.role).toBe(UserRole.SUPERADMIN);
    expect(mockAccessRepo.findOne).not.toHaveBeenCalled();
  });
});
