import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@nutrideli/shared-types';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acceso denegado: Usuario no autenticado');
    }

    const isSuperAdminRole = user.role === UserRole.SUPERADMIN;
    const masterEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@flujofino.com').toLowerCase();
    const isMasterEmail = user.email && user.email.toLowerCase() === masterEmail;

    if (isSuperAdminRole || isMasterEmail) {
      return true;
    }

    throw new ForbiddenException('Acceso restringido únicamente al SuperAdmin de la plataforma');
  }
}
