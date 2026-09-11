import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
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

