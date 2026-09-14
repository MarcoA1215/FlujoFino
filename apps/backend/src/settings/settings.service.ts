import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const exists = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    if (!exists) {
      await this.settingsRepo.save({ id: 'GLOBAL', exchangeRateBs: 40.0 });
    }

    setInterval(() => {
      this.syncCotizave();
    }, 43200000);
    
    setTimeout(() => this.syncCotizave(), 5000);
  }

  async getSettings() {
    const settings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    return settings || { exchangeRateBs: 40.0 };
  }

  async updateSettings(dto: Partial<Settings>) {
    await this.settingsRepo.update('GLOBAL', dto);
    return this.getSettings();
  }

  async getExchangeRate() {
    const settings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    return { exchangeRateBs: settings?.exchangeRateBs || 40.0 };
  }

  async updateExchangeRate(rate: number) {
    await this.settingsRepo.update('GLOBAL', { exchangeRateBs: rate });
    return this.getExchangeRate();
  }

  async syncCotizave() {
    const apiKey = this.configService.get<string>('COTIZAVE_API_KEY');
    if (!apiKey || apiKey === 'tu_api_key_aqui') {
      this.logger.warn('COTIZAVE_API_KEY no configurada. Saltando sincronización.');
      return;
    }

    try {
      this.logger.log('Sincronizando tasa de cambio desde Cotizave...');
      const response = await fetch('https://api.cotizave.com/v1/fx/rates', {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      let rate = null;

      // Según el log de error, la respuesta tiene "rates" que es un array, y usa la propiedad "mid"
      if (data.rates && Array.isArray(data.rates)) {
        const bcvItem = data.rates.find((item: any) => item.market?.toLowerCase() === 'bcv') 
                     || data.rates.find((item: any) => item.market?.toLowerCase() === 'reference')
                     || data.rates.find((item: any) => item.type?.toLowerCase() === 'reference');
                     
        if (bcvItem) {
          rate = bcvItem.mid || bcvItem.price || bcvItem.value || bcvItem.rate;
        }
      }

      if (rate && !isNaN(parseFloat(rate))) {
        await this.updateExchangeRate(parseFloat(rate));
        this.logger.log(`Tasa BCV actualizada con éxito: ${parseFloat(rate)} Bs`);
      } else {
        this.logger.error('No se pudo extraer la tasa de la estructura JSON: ' + JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      this.logger.error('Error sincronizando con Cotizave: ' + error.message);
    }
  }
}

