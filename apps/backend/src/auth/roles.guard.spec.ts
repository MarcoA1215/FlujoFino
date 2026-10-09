import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@finowork/shared-types';

describe('RolesGuard - Control de Acceso Basado en Roles (RBAC)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('debe permitir acceso si la ruta no tiene roles requeridos definidos en metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRole.POS });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('debe denegar acceso (retornar false) si no existe usuario en la petición', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createMockExecutionContext(null);

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(false);
  });

  it('debe denegar acceso si el usuario tiene un rol insuficiente para el endpoint', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.KITCHEN, UserRole.DELIVERY]);
    const context = createMockExecutionContext({ role: UserRole.POS, email: 'pos@tienda.com' });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(false);
  });

  it('debe permitir acceso si el usuario posee exactamente el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.POS]);
    const context = createMockExecutionContext({ role: UserRole.POS });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('debe permitir acceso a usuarios con rol ADMIN a rutas estándar', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.INVENTORY]);
    const context = createMockExecutionContext({ role: UserRole.ADMIN });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('debe denegar acceso a ADMIN si la ruta requiere estrictamente SUPERADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPERADMIN]);
    const context = createMockExecutionContext({ role: UserRole.ADMIN, email: 'admin@tienda.com' });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(false);
  });

  it('debe permitir acceso incondicional si el usuario posee rol SUPERADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPERADMIN]);
    const context = createMockExecutionContext({ role: UserRole.SUPERADMIN });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });
});
