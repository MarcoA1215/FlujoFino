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
      await this.settingsRepo.save({
        id: 'GLOBAL',
        exchangeRateBs: 40.0,
        exchangeRateMode: 'BCV',
        currencySymbol: 'Bs.',
        ratesCache: {
          bcv: 40.0,
          parallel: 40.0,
          usdt: 40.0,
          eur: 43.0,
          cop: 4000.0,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    setInterval(() => {
      this.syncCotizave();
    }, 43200000);
    
    setTimeout(() => this.syncCotizave(), 5000);
  }

  async getEffectiveRate(tenantId?: string): Promise<number> {
    const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    const globalCache = globalSettings?.ratesCache;
    const globalBcv = globalCache?.bcv ? Number(globalCache.bcv) : (globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0);

    if (!tenantId) {
      return globalBcv;
    }

    const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!tenantSettings) {
      return globalBcv;
    }

    const mode = tenantSettings.exchangeRateMode || 'BCV';
    let effectiveRate = globalBcv;

    switch (mode) {
      case 'MANUAL':
        effectiveRate = Number(tenantSettings.manualExchangeRate || tenantSettings.exchangeRateBs || 40.0);
        break;
      case 'BCV':
        effectiveRate = Number(globalCache?.bcv || tenantSettings.exchangeRateBs || 40.0);
        break;
      case 'PARALELO':
        effectiveRate = Number(globalCache?.parallel || globalCache?.bcv || 40.0);
        break;
      case 'USDT':
        effectiveRate = Number(globalCache?.usdt || globalCache?.parallel || 40.0);
        break;
      case 'EUR':
        effectiveRate = Number(globalCache?.eur || 40.0);
        break;
      case 'COP':
        effectiveRate = Number(globalCache?.cop || 4000.0);
        break;
      default:
        effectiveRate = Number(globalCache?.bcv || tenantSettings.exchangeRateBs || 40.0);
    }

    if (mode !== 'MANUAL' && Number(tenantSettings.exchangeRateBs) !== effectiveRate) {
      tenantSettings.exchangeRateBs = effectiveRate;
      await this.settingsRepo.save(tenantSettings);
    }

    return effectiveRate;
  }

  async getSettings(tenantId?: string) {
    const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    const globalRate = globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0;
    const availableRates = globalSettings?.ratesCache || null;

    if (tenantId) {
      const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (tenantSettings) {
        const { encodeTenantId } = require('../utils/tenant-crypto');
        const effectiveRate = await this.getEffectiveRate(tenantId);
        const mode = tenantSettings.exchangeRateMode || 'BCV';
        const defaultSymbol = mode === 'COP' ? 'COP' : (mode === 'EUR' ? '€' : 'Bs.');
        const currencySymbol = tenantSettings.currencySymbol || defaultSymbol;

        return { 
          ...tenantSettings, 
          exchangeRateBs: effectiveRate,
          exchangeRateMode: mode,
          manualExchangeRate: tenantSettings.manualExchangeRate,
          currencySymbol,
          availableRates,
          publicToken: encodeTenantId(tenantId) 
        };
      }
    }

    return {
      ...(globalSettings || {}),
      exchangeRateBs: globalRate,
      exchangeRateMode: 'BCV',
      manualExchangeRate: null,
      currencySymbol: 'Bs.',
      availableRates,
    };
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
    
    if (payload.exchangeRateMode !== undefined) settings.exchangeRateMode = payload.exchangeRateMode;
    if (payload.manualExchangeRate !== undefined) settings.manualExchangeRate = payload.manualExchangeRate;
    if (payload.currencySymbol !== undefined) settings.currencySymbol = payload.currencySymbol;
    if (payload.ratesCache !== undefined) settings.ratesCache = payload.ratesCache;
    if (payload.exchangeRateBs !== undefined) settings.exchangeRateBs = payload.exchangeRateBs;
    if (settings.exchangeRateMode === 'MANUAL' && payload.manualExchangeRate !== undefined && payload.manualExchangeRate !== null) {
      settings.exchangeRateBs = payload.manualExchangeRate;
    }
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

    if (payload.themePrimaryColor !== undefined) settings.themePrimaryColor = payload.themePrimaryColor;
    if (payload.themeHeaderColor !== undefined) settings.themeHeaderColor = payload.themeHeaderColor;

    await this.settingsRepo.save(settings);
    return this.getSettings(tenantId);
  }

  async getExchangeRate(tenantId?: string) {
    const s = await this.getSettings(tenantId);
    return {
      exchangeRateBs: Number(s.exchangeRateBs || 40.0),
      exchangeRateMode: s.exchangeRateMode || 'BCV',
      manualExchangeRate: s.manualExchangeRate,
      currencySymbol: s.currencySymbol || 'Bs.',
      availableRates: s.availableRates || null,
    };
  }

  async updateExchangeRate(rate?: number, tenantId?: string, mode?: 'BCV' | 'PARALELO' | 'USDT' | 'EUR' | 'COP' | 'MANUAL', manualRate?: number) {
    if (tenantId) {
      let tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (!tenantSettings) {
        const { randomUUID } = require('crypto');
        tenantSettings = this.settingsRepo.create({ id: randomUUID(), tenantId });
      }
      if (mode !== undefined) {
        tenantSettings.exchangeRateMode = mode;
        if (mode === 'COP') tenantSettings.currencySymbol = 'COP';
        else if (mode === 'EUR') tenantSettings.currencySymbol = '€';
        else tenantSettings.currencySymbol = 'Bs.';
      }
      if (manualRate !== undefined) {
        tenantSettings.manualExchangeRate = manualRate;
      }
      if (rate !== undefined && (!mode || mode === 'MANUAL')) {
        tenantSettings.manualExchangeRate = rate;
        tenantSettings.exchangeRateBs = rate;
      }
      await this.settingsRepo.save(tenantSettings);
      await this.getEffectiveRate(tenantId);
    } else {
      if (rate !== undefined) {
        await this.settingsRepo.update({ id: 'GLOBAL' }, { exchangeRateBs: rate });
        await this.settingsRepo.createQueryBuilder()
          .update(Settings)
          .set({ exchangeRateBs: rate })
          .where('(exchangeRateMode = :defMode OR exchangeRateMode IS NULL) AND (exchangeRateBs = :def OR exchangeRateBs IS NULL)', { defMode: 'BCV', def: 40.0 })
          .execute();
      }
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
          'X-API-Key': apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      const getRateValue = (item: any): number | null => {
        if (!item) return null;
        const val = item.mid ?? item.price ?? item.value ?? item.rate;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      if (data.rates && Array.isArray(data.rates)) {
        const rates = data.rates;

        // bcv: market === 'bcv' y pair === 'USD/VES' (o reference)
        const bcvItem = rates.find((item: any) => 
          (item.market?.toLowerCase() === 'bcv' && (item.pair?.toUpperCase() === 'USD/VES' || !item.pair)) ||
          item.market?.toLowerCase() === 'reference' ||
          item.type?.toLowerCase() === 'reference'
        );

        // parallel: market === 'enparalelovzla' o parallel
        const parallelItem = rates.find((item: any) => 
          item.market?.toLowerCase() === 'enparalelovzla' || 
          item.market?.toLowerCase() === 'parallel' ||
          item.market?.toLowerCase() === 'paralelo' ||
          item.type?.toLowerCase() === 'parallel'
        );

        // usdt: Binance P2P o USDT (market === 'binance' o pair === 'USDT/VES')
        const usdtItem = rates.find((item: any) => 
          item.market?.toLowerCase() === 'binance' || 
          item.pair?.toUpperCase() === 'USDT/VES' ||
          item.market?.toLowerCase() === 'usdt'
        );

        // eur: Euro BCV (pair === 'EUR/VES')
        const eurItem = rates.find((item: any) => 
          item.pair?.toUpperCase() === 'EUR/VES' ||
          (item.market?.toLowerCase() === 'bcv' && item.pair?.toUpperCase()?.includes('EUR'))
        );

        // cop: Peso Colombiano (pair === 'COP/VES' o COP/USD)
        const copItem = rates.find((item: any) => 
          item.pair?.toUpperCase() === 'COP/VES' || 
          item.pair?.toUpperCase() === 'COP/USD' ||
          item.market?.toLowerCase()?.includes('cop')
        );

        let globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
        if (!globalSettings) {
          globalSettings = this.settingsRepo.create({ id: 'GLOBAL' });
        }
        const currentCache = globalSettings.ratesCache || {};

        const bcvVal = getRateValue(bcvItem) ?? currentCache.bcv ?? (globalSettings.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0);
        const parallelVal = getRateValue(parallelItem) ?? currentCache.parallel ?? bcvVal;
        const usdtVal = getRateValue(usdtItem) ?? currentCache.usdt ?? parallelVal;
        const eurVal = getRateValue(eurItem) ?? currentCache.eur ?? Number((bcvVal * 1.08).toFixed(2));
        const copVal = getRateValue(copItem) ?? currentCache.cop ?? 4000.0;

        const newRatesCache = {
          bcv: bcvVal,
          parallel: parallelVal,
          usdt: usdtVal,
          eur: eurVal,
          cop: copVal,
          updatedAt: new Date().toISOString(),
        };

        globalSettings.ratesCache = newRatesCache;
        globalSettings.exchangeRateBs = bcvVal;
        await this.settingsRepo.save(globalSettings);

        this.logger.log(`Tasas Cotizave sincronizadas con éxito: BCV=${bcvVal}, Paralelo=${parallelVal}, USDT=${usdtVal}, EUR=${eurVal}, COP=${copVal}`);
      } else {
        this.logger.error('No se pudo extraer la tasa de la estructura JSON: ' + JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      this.logger.error('Error sincronizando con Cotizave: ' + error.message);
    }
  }
}

