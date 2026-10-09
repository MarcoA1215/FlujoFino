import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './superadmin.guard';
import { UserRole } from '@finowork/shared-types';

describe('SuperAdminGuard - Protección de Endpoints Globales de Plataforma', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('debe arrojar ForbiddenException si la petición no incluye un usuario autenticado', () => {
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Acceso denegado: Usuario no autenticado'),
    );
  });

  it('debe arrojar ForbiddenException si el usuario tiene rol ADMIN o cualquier rol no SuperAdmin', () => {
    const context = createMockExecutionContext({
      id: 'usr-admin',
      role: UserRole.ADMIN,
      email: 'admin@negocio.com',
    });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Acceso restringido únicamente al SuperAdmin de la plataforma'),
    );
  });

  it('debe permitir acceso cuando el usuario posee el rol SUPERADMIN', () => {
    const context = createMockExecutionContext({
      id: 'usr-super',
      role: UserRole.SUPERADMIN,
      email: 'cualquiera@dominio.com',
    });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('debe permitir acceso si el correo electrónico coincide con el SUPERADMIN_EMAIL de plataforma', () => {
    const context = createMockExecutionContext({
      id: 'usr-master',
      role: UserRole.ADMIN, // Aunque su rol en token sea ADMIN, su email es el master
      email: 'superadmin@finowork.com',
    });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
  });
});
