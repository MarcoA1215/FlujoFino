import { Controller, Get, Request, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { SettingsService } from './settings/settings.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly settingsService: SettingsService,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'disconnected';
      }
    } else if (this.dataSource && !this.dataSource.isInitialized) {
      dbStatus = 'uninitialized';
    }

    const isHealthy = dbStatus === 'connected' || dbStatus === 'ok';
    return {
      status: isHealthy ? 'ok' : 'degraded',
      database: dbStatus,
      redis: this.redisService?.isReady() ? 'connected' : 'fallback-ram',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('exchange-rate')
  async getExchangeRate(@Request() req: any) {
    const rate = await this.settingsService.getExchangeRate(req?.user?.tenantId);
    return { ...rate, rate: rate.exchangeRateBs };
  }
}
