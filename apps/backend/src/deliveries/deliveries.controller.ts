import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliveriesService } from './deliveries.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('my-history')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY)
  getMyHistory(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.getMyHistory(tenantId, userId);
  }

  @Get('my-active')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY)
  getMyActiveOrders(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.getMyActiveOrders(tenantId, userId);
  }

  @Get('admin-summary')
  @Roles(UserRole.ADMIN)
  getAdminSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.deliveriesService.getAdminSummary(tenantId);
  }

  @Patch(':id/start')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY)
  startDelivery(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.startDelivery(tenantId, id, userId);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY)
  completeDelivery(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub;
    return this.deliveriesService.completeDelivery(tenantId, id, userId);
  }
}
