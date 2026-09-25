import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
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

  async getSettings(tenantId?: string) {
    if (tenantId) {
      const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (tenantSettings) {
        const { encodeTenantId } = require('../utils/tenant-crypto');
        return { ...tenantSettings, publicToken: encodeTenantId(tenantId) };
      }
    }
    const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    return globalSettings || { exchangeRateBs: 40.0 };
  }

  async updateSettings(tenantId: string | undefined, payload: Partial<Settings>) {
    let settings;
    if (tenantId) {
      settings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (!settings) {
        const { randomUUID } = require('crypto');
        settings = this.settingsRepo.create({ id: randomUUID(), tenantId });
      }
    } else {
      settings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      if (!settings) {
        settings = this.settingsRepo.create({ id: 'GLOBAL' });
      }
    }
    
    if (payload.exchangeRateBs !== undefined) settings.exchangeRateBs = payload.exchangeRateBs;
    if (payload.companyBank !== undefined) settings.companyBank = payload.companyBank;
    if (payload.companyCedula !== undefined) settings.companyCedula = payload.companyCedula;
    if (payload.companyPhone !== undefined) settings.companyPhone = payload.companyPhone;
    if (payload.allowPartialPayments !== undefined) settings.allowPartialPayments = payload.allowPartialPayments;
    if (payload.minDepositPercentage !== undefined) settings.minDepositPercentage = payload.minDepositPercentage;
    if (payload.allowCashierBypassDeposit !== undefined) settings.allowCashierBypassDeposit = payload.allowCashierBypassDeposit;
    if (payload.acceptCashUsd !== undefined) settings.acceptCashUsd = payload.acceptCashUsd;
    if (payload.acceptPagoMovil !== undefined) settings.acceptPagoMovil = payload.acceptPagoMovil;
    if (payload.acceptCardPos !== undefined) settings.acceptCardPos = payload.acceptCardPos;
    if (payload.acceptBinance !== undefined) settings.acceptBinance = payload.acceptBinance;
    if (payload.acceptTransfer !== undefined) settings.acceptTransfer = payload.acceptTransfer;
    
    if (payload.featureCustomerSchedules !== undefined) settings.featureCustomerSchedules = payload.featureCustomerSchedules;
    if (payload.featureRecipes !== undefined) settings.featureRecipes = payload.featureRecipes;
    if (payload.featureBuySell !== undefined) settings.featureBuySell = payload.featureBuySell;
    if (payload.featureProduction !== undefined) settings.featureProduction = payload.featureProduction;
    if (payload.featureShowCatalog !== undefined) settings.featureShowCatalog = payload.featureShowCatalog;
    if (payload.bookingRequireService !== undefined) settings.bookingRequireService = payload.bookingRequireService;
    if (payload.bookingAllowStaffSelection !== undefined) settings.bookingAllowStaffSelection = payload.bookingAllowStaffSelection;
    if (payload.requireApprovalAlways !== undefined) settings.requireApprovalAlways = payload.requireApprovalAlways;

    if (payload.businessHours !== undefined) settings.businessHours = payload.businessHours;
    if (payload.services !== undefined && Array.isArray(payload.services)) {
      settings.services = payload.services;
      // Sincronizar como productos para POS
      for (const svc of payload.services) {
        let p = await this.productRepo.findOne({ where: { name: svc.name, tenantId: tenantId || 'GLOBAL' } });
        if (!p) {
          p = this.productRepo.create({ 
            name: svc.name, 
            category: 'Servicios', 
            salePrice: svc.price, 
            tenantId: tenantId || 'GLOBAL' 
          });
        } else {
          p.salePrice = svc.price;
        }
        await this.productRepo.save(p);
      }
    }
    if (payload.slotInterval !== undefined) settings.slotInterval = payload.slotInterval;

    await this.settingsRepo.save(settings);
    return this.getSettings(tenantId);
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

