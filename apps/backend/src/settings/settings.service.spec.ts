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

  const TENANT_123_ID = '55555555-5555-4555-8555-555555555555';
  const TENANT_PARALELO_ID = '11111111-1111-4111-8111-111111111111';
  const TENANT_USDT_ID = '22222222-2222-4222-8222-222222222222';
  const TENANT_MANUAL_ID = '33333333-3333-4333-8333-333333333333';
  const TENANT_1_ID = '44444444-4444-4444-8444-444444444444';

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

      const rate = await service.getEffectiveRate(TENANT_123_ID);
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
        if (where?.tenantId === TENANT_PARALELO_ID) {
          return Promise.resolve({ tenantId: TENANT_PARALELO_ID, exchangeRateMode: 'PARALELO' });
        }
        if (where?.tenantId === TENANT_USDT_ID) {
          return Promise.resolve({ tenantId: TENANT_USDT_ID, exchangeRateMode: 'USDT' });
        }
        return Promise.resolve(null);
      });

      const rateParalelo = await service.getEffectiveRate(TENANT_PARALELO_ID);
      expect(rateParalelo).toBe(60.0);

      const rateUsdt = await service.getEffectiveRate(TENANT_USDT_ID);
      expect(rateUsdt).toBe(59.0);
    });

    it('debe respetar manualExchangeRate cuando el modo es MANUAL', async () => {
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({ id: 'GLOBAL', ratesCache: { bcv: 50.0 } });
        }
        if (where?.tenantId === TENANT_MANUAL_ID) {
          return Promise.resolve({
            tenantId: TENANT_MANUAL_ID,
            exchangeRateMode: 'MANUAL',
            manualExchangeRate: 58.5,
          });
        }
        return Promise.resolve(null);
      });

      const rate = await service.getEffectiveRate(TENANT_MANUAL_ID);
      expect(rate).toBe(58.5);
    });
  });

  describe('updateExchangeRate', () => {
    it('debe actualizar la tasa y el modo correctamente para un tenant específico', async () => {
      const existingSettings = {
        id: 'set-1',
        tenantId: TENANT_1_ID,
        exchangeRateMode: 'BCV',
        exchangeRateBs: 50.0,
      };
      mockSettingsRepo.findOne.mockResolvedValue(existingSettings);

      await service.updateExchangeRate(undefined, TENANT_1_ID, 'PARALELO');

      expect(mockSettingsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_1_ID,
          exchangeRateMode: 'PARALELO',
          currencySymbol: 'Bs.',
        }),
      );
    });
  });
});
