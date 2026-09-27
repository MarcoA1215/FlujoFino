import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliveriesService } from './deliveries.service';

@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('my-history')
  getMyHistory(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.deliveriesService.getMyHistory(tenantId, userId);
  }

  @Get('admin-summary')
  getAdminSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.deliveriesService.getAdminSummary(tenantId);
  }
}
