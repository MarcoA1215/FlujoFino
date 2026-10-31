import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Tenant } from '../entities/tenant.entity';
import { Promoter } from '../entities/promoter.entity';
import { isValidUUID } from '../utils/tenant-crypto';
import { UserRole } from '@finowork/shared-types';
import { RedisService } from '../redis/redis.service';

interface CachedSessionValidation {
  userId: string;
  tenantId?: string;
  role: UserRole;
  roles: UserRole[];
  expiresAt: number;
}

// Caché en memoria local como respaldo inmediato y fallback
const sessionValidationCache = new Map<string, CachedSessionValidation>();

// TTL de 60 segundos: el usuario se valida en BD como máximo 1 vez por minuto
const SESSION_CACHE_TTL_MS = 60 * 1000;

let globalRedisService: RedisService | null = null;

export function invalidateSessionCache(userId?: string) {
  if (!userId) {
    sessionValidationCache.clear();
    globalRedisService?.delPattern('sess:*');
    return;
  }
  for (const [key, item] of sessionValidationCache.entries()) {
    if (item.userId === userId || key.startsWith(`sess:${userId}:`) || key.startsWith(`${userId}:`)) {
      sessionValidationCache.delete(key);
    }
  }
  globalRedisService?.delPattern(`sess:${userId}:*`);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @Optional() private dataSource?: DataSource,
    @Optional() private redisService?: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
    if (redisService) {
      globalRedisService = redisService;
    }
  }

  async validate(payload: any) {
    if (this.dataSource && this.dataSource.isInitialized) {
      const userId = payload.sub || payload.id;
      const tenantId = payload.tenantId || '';
      const cacheKey = `sess:${userId}:${tenantId}`;
      const now = Date.now();

      // 1. Intentar validar primero con Redis distribuido o con memoria local
      let cached: CachedSessionValidation | null = null;
      if (this.redisService) {
        cached = await this.redisService.getJson<CachedSessionValidation>(cacheKey);
      }
      if (!cached) {
        const ramCached = sessionValidationCache.get(cacheKey);
        if (ramCached && ramCached.expiresAt > now) {
          cached = ramCached;
        }
      }

      if (cached && (cached.expiresAt ? cached.expiresAt > now : true)) {
        return {
          id: payload.sub,
          username: payload.username,
          email: payload.email,
          identification: payload.identification,
          phone: payload.phone,
          isEmailVerified: !!payload.isEmailVerified,
          role: cached.role,
          roles: cached.roles,
          tenantId: payload.tenantId,
          tenantName: payload.tenantName,
        };
      }

      let user: User | null = null;

      if (isValidUUID(userId)) {
        user = await this.dataSource.getRepository(User).findOne({
          where: { id: userId },
          select: { id: true, username: true, email: true, role: true, identification: true, phone: true, isEmailVerified: true, termsAcceptedVersion: true, privacyAcceptedVersion: true },
        });
      } else if (payload.username) {
        user = await this.dataSource.getRepository(User).findOne({
          where: { username: payload.username },
          select: { id: true, username: true, email: true, role: true, identification: true, phone: true, isEmailVerified: true, termsAcceptedVersion: true, privacyAcceptedVersion: true },
        });
      }

      if (!user) {
        sessionValidationCache.delete(cacheKey);
        await this.redisService?.del(cacheKey);
        throw new UnauthorizedException('El usuario no existe o su sesión ha sido revocada.');
      }

      let effectiveRole = payload.role as UserRole;
      let effectiveRoles: UserRole[] =
        payload.roles && payload.roles.length > 0
          ? payload.roles
          : [payload.role as UserRole];

      // Validar acceso activo al tenant si el payload tiene tenantId y no es SUPERADMIN
      if (user.role === UserRole.SUPERADMIN || payload.role === UserRole.SUPERADMIN) {
        effectiveRole = UserRole.SUPERADMIN;
        effectiveRoles = [
          UserRole.SUPERADMIN,
          UserRole.ADMIN,
          UserRole.POS,
          UserRole.INVENTORY,
          UserRole.DELIVERY,
          UserRole.KITCHEN,
        ];
      } else if (payload.tenantId && isValidUUID(payload.tenantId)) {
        let access = await this.dataSource.getRepository(UserTenantAccess).findOne({
          where: { userId: user.id, tenantId: payload.tenantId },
          select: { id: true, isActive: true, status: true, role: true, roles: true },
        });

        if (!access || access.isActive === false || access.status === 'REJECTED') {
          // Regla General: Promotores tienen acceso autorizado a los negocios demo de prueba (isTest: true)
          const isUserPromoter = user.role === UserRole.PROMOTOR || (user.role as string) === 'PROMOTOR' || Boolean(payload.isPromoter);
          if (isUserPromoter) {
            const tenantRepo = this.dataSource.getRepository(Tenant);
            const demoTenant = await tenantRepo.findOne({ where: { id: payload.tenantId, isTest: true } });
            if (demoTenant && demoTenant.name !== 'FinoWork Central') {
              const accessRepo = this.dataSource.getRepository(UserTenantAccess);
              if (typeof accessRepo.create === 'function' && typeof accessRepo.save === 'function') {
                if (!access) {
                  access = accessRepo.create({
                    userId: user.id,
                    tenantId: payload.tenantId,
                    role: UserRole.ADMIN,
                    roles: [UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN],
                    isActive: true,
                    status: 'ACCEPTED',
                  });
                } else {
                  access.isActive = true;
                  access.status = 'ACCEPTED';
                  access.role = UserRole.ADMIN;
                  access.roles = [UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN];
                }
                await accessRepo.save(access);
              } else {
                access = {
                  id: 'demo-promoter-access',
                  userId: user.id,
                  tenantId: payload.tenantId,
                  role: UserRole.ADMIN,
                  roles: [UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY, UserRole.DELIVERY, UserRole.KITCHEN],
                  isActive: true,
                  status: 'ACCEPTED',
                } as any;
              }
            }
          }
        }

        if (!access || access.isActive === false || access.status === 'REJECTED') {
          sessionValidationCache.delete(cacheKey);
          await this.redisService?.del(cacheKey);
          throw new UnauthorizedException('El acceso a este espacio de trabajo ha sido revocado o suspendido.');
        }

        const dbRoles: UserRole[] =
          Array.isArray(access.roles) && access.roles.length > 0
            ? (access.roles as UserRole[])
            : [access.role as UserRole];

        if (access.role && !dbRoles.includes(access.role as UserRole)) {
          dbRoles.unshift(access.role as UserRole);
        }

        effectiveRoles = dbRoles;

        // Si el usuario solicitó un targetRole (switch-mode) y este sigue estando autorizado en la BD:
        if (payload.role && dbRoles.includes(payload.role as UserRole)) {
          effectiveRole = payload.role as UserRole;
        } else {
          // Si el rol en el token ya no está autorizado, usar el rol principal vigente en la BD
          effectiveRole = (access.role as UserRole) || dbRoles[0] || UserRole.POS;
        }
      }

      const sessionData: CachedSessionValidation = {
        userId: user.id,
        tenantId,
        role: effectiveRole,
        roles: effectiveRoles,
        expiresAt: now + SESSION_CACHE_TTL_MS,
      };

      // Guardar validación exitosa tanto en memoria RAM local como en Redis
      sessionValidationCache.set(cacheKey, sessionData);
      if (this.redisService) {
        await this.redisService.setJson(cacheKey, sessionData, 60);
      }

      // Mantenimiento de memoria: limpiar registros viejos si el mapa crece
      if (sessionValidationCache.size > 2000) {
        for (const [k, v] of sessionValidationCache.entries()) {
          if (v.expiresAt <= now) sessionValidationCache.delete(k);
        }
      }

      return {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        identification: payload.identification,
        phone: payload.phone,
        isEmailVerified: !!payload.isEmailVerified,
        role: effectiveRole,
        roles: effectiveRoles,
        tenantId: payload.tenantId,
        tenantName: payload.tenantName,
        termsAcceptedVersion: user.termsAcceptedVersion || payload.termsAcceptedVersion || null,
        privacyAcceptedVersion: user.privacyAcceptedVersion || payload.privacyAcceptedVersion || null,
      };
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
      termsAcceptedVersion: payload.termsAcceptedVersion || null,
      privacyAcceptedVersion: payload.privacyAcceptedVersion || null,
    };
  }
}
