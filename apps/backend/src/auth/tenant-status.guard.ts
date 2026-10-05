import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { isTenantSuspendedOrExpired } from '../utils/tenant-status';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() private dataSource?: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user) return true;

    if (user.role === 'SUPERADMIN' || user.isSuperAdmin) return true;

    const tenantId = user.tenantId;
    if (!tenantId) return true;

    // Rutas permitidas aún cuando el tenant esté suspendido/vencido (para que pueda pagar y cambiar de negocio)
    const url = request.originalUrl || request.url || '';
    const exemptPaths = [
      '/superadmin/payments/report',
      '/superadmin/saas-subscription',
      '/superadmin/platform-config',
      '/auth/select-workspace',
      '/auth/switch-mode',
      '/auth/me',
      '/settings',
    ];
    if (exemptPaths.some((path) => url.includes(path))) {
      return true;
    }

    if (!this.dataSource) {
      return true;
    }

    try {
      const tenantRepo = this.dataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
      if (!tenant) return true;

      if (isTenantSuspendedOrExpired(tenant)) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Tu período de prueba o suscripción ha concluido o se encuentra suspendido. Por favor regulariza tu pago para continuar.',
          code: 'TENANT_SUSPENDED_OR_EXPIRED',
        });
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      return true;
    }

    return true;
  }
}
