import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { isValidUUID } from '../utils/tenant-crypto';
import { UserRole } from '@finowork/shared-types';

interface CachedSessionValidation {
  userId: string;
  tenantId?: string;
  expiresAt: number;
}

// Caché en memoria para evitar saturar la base de datos con consultas repetitivas de sesión
const sessionValidationCache = new Map<string, CachedSessionValidation>();

// TTL de 60 segundos: el usuario se valida en BD como máximo 1 vez por minuto
const SESSION_CACHE_TTL_MS = 60 * 1000;

export function invalidateSessionCache(userId?: string) {
  if (!userId) {
    sessionValidationCache.clear();
    return;
  }
  for (const [key, item] of sessionValidationCache.entries()) {
    if (item.userId === userId || key.startsWith(`${userId}:`)) {
      sessionValidationCache.delete(key);
    }
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @Optional() private dataSource?: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (this.dataSource && this.dataSource.isInitialized) {
      const userId = payload.sub || payload.id;
      const tenantId = payload.tenantId || '';
      const cacheKey = `${userId}:${tenantId}`;
      const now = Date.now();

      // Si la sesión ya fue validada recientemente en memoria RAM, evitamos la llamada a BD
      const cached = sessionValidationCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return {
          id: payload.sub,
          username: payload.username,
          email: payload.email,
          identification: payload.identification,
          phone: payload.phone,
          isEmailVerified: !!payload.isEmailVerified,
          role: payload.role,
          roles: payload.roles,
          tenantId: payload.tenantId,
          tenantName: payload.tenantName,
        };
      }

      let user: User | null = null;

      if (isValidUUID(userId)) {
        user = await this.dataSource.getRepository(User).findOne({
          where: { id: userId },
          select: ['id', 'username', 'email', 'role', 'identification', 'phone', 'isEmailVerified'],
        });
      } else if (payload.username) {
        user = await this.dataSource.getRepository(User).findOne({
          where: { username: payload.username },
          select: ['id', 'username', 'email', 'role', 'identification', 'phone', 'isEmailVerified'],
        });
      }

      if (!user) {
        sessionValidationCache.delete(cacheKey);
        throw new UnauthorizedException('El usuario no existe o su sesión ha sido revocada.');
      }

      // Validar acceso activo al tenant si el payload tiene tenantId y no es SUPERADMIN
      if (payload.tenantId && isValidUUID(payload.tenantId) && user.role !== UserRole.SUPERADMIN && payload.role !== UserRole.SUPERADMIN) {
        const access = await this.dataSource.getRepository(UserTenantAccess).findOne({
          where: { userId: user.id, tenantId: payload.tenantId },
          select: ['id', 'isActive', 'status', 'role', 'roles'],
        });

        if (!access || access.isActive === false || access.status === 'REJECTED') {
          sessionValidationCache.delete(cacheKey);
          throw new UnauthorizedException('El acceso a este espacio de trabajo ha sido revocado o suspendido.');
        }
      }

      // Guardar validación exitosa en memoria RAM por 60 segundos
      sessionValidationCache.set(cacheKey, {
        userId: user.id,
        tenantId,
        expiresAt: now + SESSION_CACHE_TTL_MS,
      });

      // Mantenimiento de memoria: limpiar registros viejos si el mapa crece
      if (sessionValidationCache.size > 2000) {
        for (const [k, v] of sessionValidationCache.entries()) {
          if (v.expiresAt <= now) sessionValidationCache.delete(k);
        }
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      identification: payload.identification,
      phone: payload.phone,
      isEmailVerified: !!payload.isEmailVerified,
      role: payload.role,
      roles: payload.roles,
      tenantId: payload.tenantId,
      tenantName: payload.tenantName,
    };
  }
}
