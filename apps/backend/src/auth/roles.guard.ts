import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@finowork/shared-types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // SuperAdmin master access
    if (user?.role === UserRole.SUPERADMIN) return true;
    const isMasterEmail = user?.email && (
      user.email.toLowerCase() === (process.env.SUPERADMIN_EMAIL || 'superadmin@finowork.com').toLowerCase()
    );
    if (isMasterEmail) return true;

    // If endpoint strictly requires SUPERADMIN and user is not superadmin, deny
    if (requiredRoles.includes(UserRole.SUPERADMIN)) {
      return false;
    }

    // Admin has access to all standard routes
    if (user?.role === UserRole.ADMIN) return true;
    if (requiredRoles.includes(user?.role)) return true;
    if (user?.roles && Array.isArray(user.roles) && user.roles.some((r: any) => requiredRoles.includes(r))) return true;
    if (requiredRoles.includes(UserRole.PROMOTOR) && (user?.isPromoter || user?.role === UserRole.PROMOTOR)) return true;
    return false;
  }
}

