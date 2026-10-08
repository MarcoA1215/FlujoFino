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

  private lastSyncSlot = '';

  async onModuleInit() {
    // Migración defensiva autocurativa (idempotente) para evitar caídas si DB_SYNCHRONIZE está desactivado en producción
    try {
      await this.settingsRepo.query(`
        -- Configuración y reservas previas
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "endOfDayOffsetHours" integer DEFAULT 0;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "themePrimaryColor" character varying;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "themeHeaderColor" character varying;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingMaxAdvanceDays" integer DEFAULT 365;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingRequireDeposit" boolean DEFAULT false;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bookingDepositPercentage" numeric(5,2) DEFAULT 0;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "exchangeRateMode" character varying DEFAULT 'BCV';
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "manualExchangeRate" numeric(12,4);
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "currencySymbol" character varying DEFAULT 'Bs.';
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "ratesCache" jsonb;
        ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "featureDelivery" boolean DEFAULT true;
        
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "abonosTotal" numeric(12,4) DEFAULT 0;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "abonosHistory" jsonb;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "rescheduleStatus" character varying;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "originalTime" character varying;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "originalDate" character varying;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "imageUrl" text;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "orderId" character varying;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "paymentReported" boolean DEFAULT false;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "paymentProofUrl" character varying;
        ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "paymentRejectedReason" character varying;

        -- Columnas de Pedidos (Order)
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "paymentReported" boolean NOT NULL DEFAULT false;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "paymentProofUrl" character varying;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "paymentRejectedReason" character varying;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "splitPayments" jsonb;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "driverId" uuid;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "linkedReservationId" character varying;
        CREATE INDEX IF NOT EXISTS "IDX_8bde46c5c57a69f2cb02d02b17" ON "order" ("linkedReservationId");

        -- Columnas de accesos y personal
        ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "roles" text DEFAULT '';
        ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "lunch_start" character varying;
        ALTER TABLE "user_tenant_access" ADD COLUMN IF NOT EXISTS "lunch_end" character varying;

        -- Tenants y Promotores
        ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "promoterId" uuid;

        CREATE TABLE IF NOT EXISTS "promoters" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "userId" uuid NOT NULL,
          "code" character varying(50) NOT NULL,
          "pagoMovilPhone" character varying,
          "pagoMovilCedula" character varying,
          "pagoMovilBank" character varying,
          "binancePayId" character varying,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_e866e887a1e5fba414f2f896b28" UNIQUE ("userId"),
          CONSTRAINT "UQ_9c0a80fbc6cb93bfb63c899bad1" UNIQUE ("code"),
          CONSTRAINT "PK_7ab4bd7b1b1efeb3d2f8efc180f" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9c0a80fbc6cb93bfb63c899bad" ON "promoters" ("code");

        CREATE TABLE IF NOT EXISTS "promoter_commissions" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "promoterId" uuid NOT NULL,
          "tenantId" uuid NOT NULL,
          "type" character varying(30) NOT NULL DEFAULT 'ACTIVATION',
          "amountUSD" numeric(10,2) NOT NULL,
          "saasPaymentReportId" uuid,
          "status" character varying(30) NOT NULL DEFAULT 'PENDING',
          "paidAt" TIMESTAMP,
          "paymentReference" character varying,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_5f1075c7d007c7917cb4ddafe66" PRIMARY KEY ("id")
        );

        -- Usuarios
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" character varying;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" boolean NOT NULL DEFAULT false;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_code" character varying(6);
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMP;

        -- Pagos SaaS
        ALTER TABLE "saas_payment_reports" ADD COLUMN IF NOT EXISTS "months" integer DEFAULT 1;
      `);
    } catch (migrationErr: any) {
      this.logger.warn(`Nota de autocuración de esquema al iniciar: ${migrationErr?.message || migrationErr}`);
    }

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
          updatedAt: new Date().toISOString(),
        },
      });
    }

    // Verificar si la caché existente está vacía o tiene más de 6 horas para hacer sync inicial sin quemar cuota en reinicios
    const globalRecord = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    const lastUpdatedAt = globalRecord?.ratesCache?.updatedAt;
    const diffHours = lastUpdatedAt ? (Date.now() - new Date(lastUpdatedAt).getTime()) / (1000 * 60 * 60) : 999;

    if (diffHours > 6) {
      setTimeout(() => this.syncCotizave(), 5000);
    } else {
      this.logger.log(`Tasas en caché vigentes (hace ${diffHours.toFixed(1)}h). Próxima sincronización en el horario programado (09:15 AM / 05:45 PM Caracas).`);
    }

    // Verificar cada minuto si corresponde ejecutar la sincronización fija
    setInterval(() => {
      this.checkAndTriggerSync();
    }, 60000);
  }

  private checkAndTriggerSync() {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Caracas',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).formatToParts(new Date());

      const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
      const dateKey = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      const hour = parseInt(getPart('hour'), 10);
      const minute = parseInt(getPart('minute'), 10);

      // Slot 1: Mañana a las 09:15 AM (reporte de mañana y apertura bancaria)
      if (hour === 9 && minute >= 15 && this.lastSyncSlot !== `${dateKey}-morning`) {
        this.lastSyncSlot = `${dateKey}-morning`;
        this.logger.log(`[Scheduled Sync] Ejecutando sincronización matutina de tasas (${dateKey} 09:15 Caracas)...`);
        this.syncCotizave();
      }

      // Slot 2: Tarde a las 17:45 (5:45 PM tras cierre de mesas de cambio del BCV)
      if (hour === 17 && minute >= 45 && this.lastSyncSlot !== `${dateKey}-afternoon`) {
        this.lastSyncSlot = `${dateKey}-afternoon`;
        this.logger.log(`[Scheduled Sync] Ejecutando sincronización vespertina de tasas (${dateKey} 17:45 Caracas)...`);
        this.syncCotizave();
      }
    } catch (e: any) {
      this.logger.error(`Error en checkAndTriggerSync: ${e.message}`);
    }
  }

  async getEffectiveRate(tenantId?: string): Promise<number> {
    const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
    const globalCache = globalSettings?.ratesCache;
    const globalBcv = globalCache?.bcv ? Number(globalCache.bcv) : (globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0);

    const { isValidUUID } = require('../utils/tenant-crypto');
    if (!tenantId || !isValidUUID(tenantId)) {
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

    const { isValidUUID } = require('../utils/tenant-crypto');
    if (tenantId && isValidUUID(tenantId)) {
      const tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (tenantSettings) {
        const { encodeTenantId } = require('../utils/tenant-crypto');
        const effectiveRate = await this.getEffectiveRate(tenantId);
        const mode = tenantSettings.exchangeRateMode || 'BCV';
        const defaultSymbol = mode === 'EUR' ? '€' : 'Bs.';
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
    const { isValidUUID } = require('../utils/tenant-crypto');
    if (tenantId && isValidUUID(tenantId)) {
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
    if (payload.endOfDayOffsetHours !== undefined) {
      const offset = Number(payload.endOfDayOffsetHours);
      settings.endOfDayOffsetHours = Math.max(0, Math.min(6, isNaN(offset) ? 0 : Math.floor(offset)));
    }

    if (payload.bookingRequireDeposit !== undefined) settings.bookingRequireDeposit = payload.bookingRequireDeposit;
    if (payload.bookingDepositPercentage !== undefined) {
      settings.bookingDepositPercentage = Math.max(0, Math.min(100, Number(payload.bookingDepositPercentage) || 0));
    }

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

  async updateExchangeRate(rate?: number, tenantId?: string, mode?: 'BCV' | 'PARALELO' | 'USDT' | 'EUR' | 'MANUAL', manualRate?: number) {
    const { isValidUUID } = require('../utils/tenant-crypto');
    if (tenantId && isValidUUID(tenantId)) {
      let tenantSettings = await this.settingsRepo.findOne({ where: { tenantId } });
      if (!tenantSettings) {
        const { randomUUID } = require('crypto');
        tenantSettings = this.settingsRepo.create({ id: randomUUID(), tenantId });
      }
      if (mode !== undefined) {
        tenantSettings.exchangeRateMode = mode;
        if (mode === 'EUR') tenantSettings.currencySymbol = '€';
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

        let globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
        if (!globalSettings) {
          globalSettings = this.settingsRepo.create({ id: 'GLOBAL' });
        }
        const currentCache = globalSettings.ratesCache || {};

        const bcvVal = getRateValue(bcvItem) ?? currentCache.bcv ?? (globalSettings.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 40.0);
        const parallelVal = getRateValue(parallelItem) ?? currentCache.parallel ?? bcvVal;
        const usdtVal = getRateValue(usdtItem) ?? currentCache.usdt ?? parallelVal;
        const eurVal = getRateValue(eurItem) ?? currentCache.eur ?? Number((bcvVal * 1.08).toFixed(2));

        const newRatesCache = {
          bcv: bcvVal,
          parallel: parallelVal,
          usdt: usdtVal,
          eur: eurVal,
          updatedAt: new Date().toISOString(),
        };

        globalSettings.ratesCache = newRatesCache;
        globalSettings.exchangeRateBs = bcvVal;
        await this.settingsRepo.save(globalSettings);

        this.logger.log(`Tasas Cotizave sincronizadas con éxito: BCV=${bcvVal}, Paralelo=${parallelVal}, USDT=${usdtVal}, EUR=${eurVal}`);
      } else {
        this.logger.error('No se pudo extraer la tasa de la estructura JSON: ' + JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      this.logger.error('Error sincronizando con Cotizave: ' + error.message);
    }
  }
}

