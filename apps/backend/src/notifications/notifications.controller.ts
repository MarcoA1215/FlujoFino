import { Controller, Post, Get, Body, Param, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { Public } from '../auth/public.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get('public-key')
  getPublicKey() {
    return this.notificationsService.getPublicKey();
  }

  @Public()
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribePushDto) {
    const saved = await this.notificationsService.saveSubscription(
      dto.identifier,
      dto.subscription,
      dto.negocioId,
      dto.role,
    );
    return { success: true, id: saved?.id };
  }

  @Public()
  @Post('test')
  async test(@Body() body: { identifier?: string; negocioId?: string }) {
    return this.notificationsService.sendTestNotification(body?.identifier, body?.negocioId);
  }
}
