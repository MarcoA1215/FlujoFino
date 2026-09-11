import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
  ) {}

  async onModuleInit() {
    const exists = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    if (!exists) {
      await this.settingsRepo.save({ id: 'GLOBAL', exchangeRateBs: 40.0 });
    }
  }

  async getExchangeRate() {
    const settings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    return { exchangeRateBs: settings?.exchangeRateBs || 40.0 };
  }

  async updateExchangeRate(rate: number) {
    await this.settingsRepo.update('GLOBAL', { exchangeRateBs: rate });
    return this.getExchangeRate();
  }
}
