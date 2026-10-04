import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';

describe('SettingsService (Unit Tests)', () => {
  let service: SettingsService;
  let mockSettingsRepo: any;
  let mockProductRepo: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockSettingsRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((e) => e),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    mockProductRepo = {
      findOne: jest.fn(),
      create: jest.fn((e) => e),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    mockConfigService = {
      get: jest.fn((key) => (key === 'COTIZAVE_API_KEY' ? 'test-api-key' : null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getEffectiveRate', () => {
    it('debe retornar la tasa BCV por defecto si el tenant no tiene tasa configurada', async () => {
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({
            id: 'GLOBAL',
            exchangeRateBs: 52.0,
            ratesCache: { bcv: 52.0, parallel: 60.0, usdt: 59.5, eur: 56.0 },
          });
        }
        return Promise.resolve(null);
      });

      const rate = await service.getEffectiveRate('tenant-123');
      expect(rate).toBe(52.0);
    });

    it('debe retornar la tasa correspondiente según exchangeRateMode (PARALELO, USDT, EUR)', async () => {
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({
            id: 'GLOBAL',
            ratesCache: { bcv: 50.0, parallel: 60.0, usdt: 59.0, eur: 54.0 },
          });
        }
        if (where?.tenantId === 'tenant-paralelo') {
          return Promise.resolve({ tenantId: 'tenant-paralelo', exchangeRateMode: 'PARALELO' });
        }
        if (where?.tenantId === 'tenant-usdt') {
          return Promise.resolve({ tenantId: 'tenant-usdt', exchangeRateMode: 'USDT' });
        }
        return Promise.resolve(null);
      });

      const rateParalelo = await service.getEffectiveRate('tenant-paralelo');
      expect(rateParalelo).toBe(60.0);

      const rateUsdt = await service.getEffectiveRate('tenant-usdt');
      expect(rateUsdt).toBe(59.0);
    });

    it('debe respetar manualExchangeRate cuando el modo es MANUAL', async () => {
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({ id: 'GLOBAL', ratesCache: { bcv: 50.0 } });
        }
        if (where?.tenantId === 'tenant-manual') {
          return Promise.resolve({
            tenantId: 'tenant-manual',
            exchangeRateMode: 'MANUAL',
            manualExchangeRate: 58.5,
          });
        }
        return Promise.resolve(null);
      });

      const rate = await service.getEffectiveRate('tenant-manual');
      expect(rate).toBe(58.5);
    });
  });

  describe('updateExchangeRate', () => {
    it('debe actualizar la tasa y el modo correctamente para un tenant específico', async () => {
      const existingSettings = {
        id: 'set-1',
        tenantId: 'tenant-1',
        exchangeRateMode: 'BCV',
        exchangeRateBs: 50.0,
      };
      mockSettingsRepo.findOne.mockResolvedValue(existingSettings);

      await service.updateExchangeRate(undefined, 'tenant-1', 'PARALELO');

      expect(mockSettingsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          exchangeRateMode: 'PARALELO',
          currencySymbol: 'Bs.',
        }),
      );
    });
  });
});
