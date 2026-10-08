import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getSummary(@Request() req: any) {
    return this.dashboardService.getSummary(req.user.tenantId);
  }

  @Get('treasury')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getTreasury(@Request() req: any) {
    return this.dashboardService.getTreasurySummary(req.user.tenantId);
  }

  @Post('buy-usd')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  buyUsd(
    @Request() req: any,
    @Body() dto: { amountBs: number; amountUSD: number; notes?: string; destination?: string }
  ) {
    return this.dashboardService.buyUsd(req.user.tenantId, dto);
  }

  @Post('initial-treasury')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  setInitialTreasury(
    @Request() req: any,
    @Body() dto: { initialCashUSD: number; initialBankBs: number; initialDigitalUSD?: number }
  ) {
    return this.dashboardService.setInitialTreasury(req.user.tenantId, dto);
  }
}

