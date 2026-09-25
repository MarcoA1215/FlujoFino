import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';

describe('SettingsService (Settings & Exchange Rate Flow)', () => {
  let service: SettingsService;
  let settingsRepo: any;
  let productRepo: any;
  let configService: any;

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
      update: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      create: jest.fn((dto) => dto),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(Settings), useValue: settingsRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getExchangeRate & updateExchangeRate', () => {
    it('returns default 40.0 if not configured', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      const res = await service.getExchangeRate();
      expect(res.exchangeRateBs).toBe(40.0);
    });

    it('returns stored exchange rate', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 'GLOBAL', exchangeRateBs: 48.5 });
      const res = await service.getExchangeRate();
      expect(res.exchangeRateBs).toBe(48.5);
    });

    it('updates exchange rate and returns new value', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 'GLOBAL', exchangeRateBs: 52.0 });
      const res = await service.updateExchangeRate(52.0);
      expect(settingsRepo.update).toHaveBeenCalledWith('GLOBAL', { exchangeRateBs: 52.0 });
      expect(res.exchangeRateBs).toBe(52.0);
    });
  });

  describe('payment methods validation in updateSettings', () => {
    it('throws BadRequestException if attempting to deactivate all payment methods', async () => {
      const mockSettings = {
        tenantId: 'tenant-1',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        acceptCardPos: false,
        acceptBinance: false,
        acceptTransfer: false,
      };
      settingsRepo.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.updateSettings('tenant-1', {
          acceptCashUsd: false,
          acceptPagoMovil: false,
          acceptCardPos: false,
          acceptBinance: false,
          acceptTransfer: false,
        }),
      ).rejects.toThrow('Debes mantener al menos un método de pago activo');
    });

    it('allows updating if at least one payment method remains active', async () => {
      const mockSettings = {
        tenantId: 'tenant-1',
        acceptCashUsd: true,
        acceptPagoMovil: true,
        acceptCardPos: false,
        acceptBinance: false,
        acceptTransfer: false,
      };
      settingsRepo.findOne.mockResolvedValue(mockSettings);

      const res = await service.updateSettings('tenant-1', {
        acceptCashUsd: false,
        acceptPagoMovil: true, // Remains active
      });

      expect(settingsRepo.save).toHaveBeenCalled();
    });
  });
});
