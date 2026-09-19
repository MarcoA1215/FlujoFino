import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  @Get()
  getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.tenantId);
  }

  @Put()
  updateSettings(@Request() req, @Body() dto: any) {
    return this.settingsService.updateSettings(req.user.tenantId, dto);
  }
  constructor(private readonly settingsService: SettingsService) {}

  @Get('exchange-rate')
  getRate() {
    return this.settingsService.getExchangeRate();
  }

  @Put('exchange-rate')
  updateRate(@Body('rate') rate: number) {
    return this.settingsService.updateExchangeRate(rate);
  }
}


