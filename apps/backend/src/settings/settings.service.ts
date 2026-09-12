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

    // Tarea recurrente manual (cada 12 horas = 43200000 ms)
    setInterval(() => {
      this.syncCotizave();
    }, 43200000);
    
    // Sincronizar en el arranque de manera diferida
    setTimeout(() => this.syncCotizave(), 5000);
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
      
      // Intentamos extraer la tasa BCV de distintas formas comunes en respuestas REST JSON
      let rate = null;
      if (data.bcv && data.bcv.price) rate = data.bcv.price;
      else if (data.bcv && data.bcv.rate) rate = data.bcv.rate;
      else if (data.bcv && data.bcv.value) rate = data.bcv.value;
      else if (data.rates && data.rates.bcv && data.rates.bcv.price) rate = data.rates.bcv.price;
      else if (data.price || data.rate || data.value) rate = data.price || data.rate || data.value;
      else if (data.bcv && typeof data.bcv === 'number') rate = data.bcv;

      // Si es un array, buscar el item donde market === 'bcv'
      if (!rate && Array.isArray(data)) {
        const bcvItem = data.find(item => item.market?.toLowerCase() === 'bcv' || item.name?.toLowerCase() === 'bcv');
        if (bcvItem) {
          rate = bcvItem.price || bcvItem.rate || bcvItem.value;
        }
      }

      if (rate && !isNaN(parseFloat(rate))) {
        await this.updateExchangeRate(parseFloat(rate));
        this.logger.log(`Tasa BCV actualizada con éxito: ${parseFloat(rate)} Bs`);
      } else {
        this.logger.error('No se pudo interpretar la estructura JSON de Cotizave: ' + JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      this.logger.error('Error sincronizando con Cotizave: ' + error.message);
    }
  }
}
