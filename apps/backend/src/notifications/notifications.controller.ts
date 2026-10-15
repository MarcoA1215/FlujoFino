import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { Public } from '../auth/public.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get('public-key')
  getPublicKey() {
    return this.notificationsService.getPublicKey();
  }

  @Public()
  @Post('subscribe')
  async subscribe(@Req() req: Request, @Body() dto: SubscribePushDto) {
    let authUser: any = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        authUser = this.jwtService.verify(token);
      } catch {
        authUser = null;
      }
    }

    let effectiveRole = 'CUSTOMER';
    let effectiveNegocioId = dto.negocioId;
    let effectiveIdentifier = dto.identifier;

    if (authUser) {
      // Usuario autenticado: negocioId y rol tomados del token verificado
      effectiveNegocioId = authUser.tenantId || dto.negocioId;
      effectiveIdentifier =
        authUser.email || authUser.username || authUser.id || dto.identifier;

      const allowedRoles =
        Array.isArray(authUser.roles) && authUser.roles.length > 0
          ? authUser.roles
          : [authUser.role];

      if (dto.role && (allowedRoles.includes(dto.role) || authUser.role === 'SUPERADMIN')) {
        effectiveRole = dto.role;
      } else {
        effectiveRole = authUser.role || 'ADMIN';
      }
    } else {
      // Petición pública / anónima:
      // Rechazar tajantemente si intenta adjudicarse roles de administración o caja
      if (dto.role && dto.role !== 'CUSTOMER') {
        throw new ForbiddenException(
          'Para registrar alertas operativas de negocio se requiere una sesión autenticada.',
        );
      }
      effectiveRole = 'CUSTOMER';
    }

    const saved = await this.notificationsService.saveSubscription(
      effectiveIdentifier,
      dto.subscription,
      effectiveNegocioId,
      effectiveRole,
    );
    return { success: true, id: saved?.id };
  }

  @Post('test')
  async test(@Req() req: any, @Body() body: { identifier?: string; negocioId?: string }) {
    const user = req.user;
    const isSuperAdmin = user?.role === 'SUPERADMIN';
    const negocioId = isSuperAdmin ? (body?.negocioId || user?.tenantId) : user?.tenantId;
    const identifier = body?.identifier || user?.email || user?.username || user?.id;
    return this.notificationsService.sendTestNotification(identifier, negocioId);
  }
}

