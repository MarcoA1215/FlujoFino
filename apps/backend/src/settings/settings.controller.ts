import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@nutrideli/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put()
  updateSettings(@Request() req, @Body() dto: any) {
    return this.settingsService.updateSettings(req.user.tenantId, dto);
  }

  @Get('exchange-rate')
  getRate(@Request() req: any) {
    return this.settingsService.getExchangeRate(req.user?.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('exchange-rate')
  updateRate(@Request() req: any, @Body() body: any) {
    const rate = typeof body?.rate === 'number' ? body.rate : (typeof body === 'number' ? body : undefined);
    const mode = body?.mode;
    const manualRate = body?.manualRate;
    return this.settingsService.updateExchangeRate(rate, req.user?.tenantId, mode, manualRate);
  }
}


