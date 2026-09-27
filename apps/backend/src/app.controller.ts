import { Controller, Get, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { SettingsService } from './settings/settings.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly settingsService: SettingsService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get('exchange-rate')
  async getExchangeRate(@Request() req: any) {
    const rate = await this.settingsService.getExchangeRate(req?.user?.tenantId);
    return { ...rate, rate: rate.exchangeRateBs };
  }
}
