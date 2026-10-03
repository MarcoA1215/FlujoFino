import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliveriesService } from './deliveries.service';

@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('my-history')
  getMyHistory(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.getMyHistory(tenantId, userId);
  }

  @Get('my-active')
  getMyActiveOrders(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.getMyActiveOrders(tenantId, userId);
  }

  @Get('admin-summary')
  getAdminSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.deliveriesService.getAdminSummary(tenantId);
  }

  @Patch(':id/start')
  startDelivery(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.startDelivery(tenantId, id, userId);
  }

  @Patch(':id/complete')
  completeDelivery(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.completeDelivery(tenantId, id, userId);
  }
}
