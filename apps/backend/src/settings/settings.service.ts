import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
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
    const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    const globalRate = globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0;

    if (tenantId) {
      const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (tenantSettings) {
        const { encodeTenantId } = require('../utils/tenant-crypto');
        const tenantRate = Number(tenantSettings.exchangeRateBs || 0);
        // Si el tenant tiene la tasa en 40.0 (default) o vacía, toma la tasa real activa sincronizada
        const effectiveRate = (tenantRate > 0 && tenantRate !== 40.0) ? tenantRate : globalRate;
        return { 
          ...tenantSettings, 
          exchangeRateBs: effectiveRate,
          publicToken: encodeTenantId(tenantId) 
        };
      }
    }
    return globalSettings || { exchangeRateBs: globalRate };
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
    if (payload.companyAccountNumber !== undefined) settings.companyAccountNumber = payload.companyAccountNumber;
    if (payload.companyAccountHolder !== undefined) settings.companyAccountHolder = payload.companyAccountHolder;
    if (payload.binancePayId !== undefined) settings.binancePayId = payload.binancePayId;
    if (payload.binanceEmail !== undefined) settings.binanceEmail = payload.binanceEmail;
    if (payload.binancePhone !== undefined) settings.binancePhone = payload.binancePhone;
    if (payload.allowPartialPayments !== undefined) settings.allowPartialPayments = payload.allowPartialPayments;
    if (payload.minDepositPercentage !== undefined) settings.minDepositPercentage = payload.minDepositPercentage;
    if (payload.allowCashierBypassDeposit !== undefined) settings.allowCashierBypassDeposit = payload.allowCashierBypassDeposit;
    const nextCashUsd = payload.acceptCashUsd !== undefined ? payload.acceptCashUsd : settings.acceptCashUsd;
    const nextPagoMovil = payload.acceptPagoMovil !== undefined ? payload.acceptPagoMovil : settings.acceptPagoMovil;
    const nextCardPos = payload.acceptCardPos !== undefined ? payload.acceptCardPos : settings.acceptCardPos;
    const nextBinance = payload.acceptBinance !== undefined ? payload.acceptBinance : settings.acceptBinance;
    const nextTransfer = payload.acceptTransfer !== undefined ? payload.acceptTransfer : settings.acceptTransfer;

    if (
      payload.acceptCashUsd !== undefined ||
      payload.acceptPagoMovil !== undefined ||
      payload.acceptCardPos !== undefined ||
      payload.acceptBinance !== undefined ||
      payload.acceptTransfer !== undefined
    ) {
      if (!nextCashUsd && !nextPagoMovil && !nextCardPos && !nextBinance && !nextTransfer) {
        throw new BadRequestException('Debes mantener al menos un método de pago activo');
      }
    }

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

  async getExchangeRate(tenantId?: string) {
    const s = await this.getSettings(tenantId);
    return { exchangeRateBs: Number(s.exchangeRateBs || 40.0) };
  }

  async updateExchangeRate(rate: number, tenantId?: string) {
    await this.settingsRepo.update({ id: 'GLOBAL' }, { exchangeRateBs: rate });
    if (tenantId) {
      const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (tenantSettings) {
        tenantSettings.exchangeRateBs = rate;
        await this.settingsRepo.save(tenantSettings);
      }
    } else {
      await this.settingsRepo.createQueryBuilder()
        .update(Settings)
        .set({ exchangeRateBs: rate })
        .where('exchangeRateBs = :def OR exchangeRateBs IS NULL', { def: 40.0 })
        .execute();
    }
    return this.getExchangeRate(tenantId);
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

