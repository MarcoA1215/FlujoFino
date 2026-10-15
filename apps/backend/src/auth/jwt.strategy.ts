import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { isValidUUID } from '../utils/tenant-crypto';
import { UserRole } from '@finowork/shared-types';

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
        throw new UnauthorizedException('El usuario no existe o su sesión ha sido revocada.');
      }

      // Validar acceso activo al tenant si el payload tiene tenantId y no es SUPERADMIN
      if (payload.tenantId && isValidUUID(payload.tenantId) && user.role !== UserRole.SUPERADMIN && payload.role !== UserRole.SUPERADMIN) {
        const access = await this.dataSource.getRepository(UserTenantAccess).findOne({
          where: { userId: user.id, tenantId: payload.tenantId },
          select: ['id', 'isActive', 'status', 'role', 'roles'],
        });

        if (!access || access.isActive === false || access.status === 'REJECTED') {
          throw new UnauthorizedException('El acceso a este espacio de trabajo ha sido revocado o suspendido.');
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
