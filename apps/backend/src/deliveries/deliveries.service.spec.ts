import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DeliveriesService } from './deliveries.service';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';
import { OrderStatus, DeliveryMethod, UserRole, PaymentStatus } from '@finowork/shared-types';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let mockOrderRepo: any;
  let mockUserRepo: any;
  let mockAccessRepo: any;
  let mockSettingsRepo: any;

  beforeEach(async () => {
    mockOrderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockAccessRepo = {
      find: jest.fn(),
    };

    mockSettingsRepo = {
      findOne: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          findOne: mockOrderRepo.findOne,
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn(async (entityOrClass, entity) => entity || entityOrClass),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserTenantAccess), useValue: mockAccessRepo },
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  describe('getMyHistory', () => {
    it('debe calcular los fletes en Bs con la tasa dinámica activa del negocio y no un fallback desactualizado (40.0)', async () => {
      const tenantId = 'tenant-delivery-1';
      const deliveryUserId = 'driver-1';
      const dynamicRate = 54.5; // Tasa activa dinámica

      // Mock de configuración del negocio con tasa activa
      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.tenantId === tenantId) {
          return Promise.resolve({ tenantId, exchangeRateBs: dynamicRate });
        }
        return Promise.resolve(null);
      });

      // Orden completada con flete de $4.00 USD
      const order = {
        id: 'ord-deliv-001',
        deliveryFee: 4.0,
        customerName: 'Ana Gomez',
        customerPhone: '04141234567',
        customerAddress: 'Av. Bolivar',
        deliveryZone: { name: 'Norte' },
        totalAmount: 25.0,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        createdAt: new Date('2026-10-01T15:00:00Z'),
      };

      mockOrderRepo.find.mockResolvedValue([order]);

      const result = await service.getMyHistory(tenantId, deliveryUserId);

      // Verificaciones
      expect(result.exchangeRate).toBe(dynamicRate);
      expect(result.totalFletesUSD).toBe(4.0);

      // 4.0 USD * 54.5 = 218.00 Bs (Si usara el 40.0 desactualizado daría 160.00 Bs)
      const expectedBs = Number((4.0 * dynamicRate).toFixed(2)); // 218.00
      expect(result.totalFletesBS).toBe(expectedBs);
      expect(result.orders[0].deliveryFeeBS).toBe(expectedBs);
      expect(result.orders[0].deliveryFeeUSD).toBe(4.0);
    });

    it('debe recurrir a Settings GLOBAL si el tenant no tiene tasa propia configurada', async () => {
      const tenantId = 'tenant-sin-tasa';
      const deliveryUserId = 'driver-2';
      const globalRate = 56.25;

      mockSettingsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'GLOBAL') {
          return Promise.resolve({ id: 'GLOBAL', exchangeRateBs: globalRate });
        }
        return Promise.resolve(null);
      });

      const order = {
        id: 'ord-deliv-002',
        deliveryFee: 2.5,
        deliveryZone: { name: 'Centro' },
        totalAmount: 15.0,
        createdAt: new Date(),
      };

      mockOrderRepo.find.mockResolvedValue([order]);

      const result = await service.getMyHistory(tenantId, deliveryUserId);

      expect(result.exchangeRate).toBe(globalRate);
      expect(result.totalFletesBS).toBe(Number((2.5 * globalRate).toFixed(2))); // 140.63
    });
  });

  describe('getAdminSummary', () => {
    it('debe calcular los totales de fletes globales y por repartidor usando la tasa dinámica', async () => {
      const tenantId = 'tenant-admin-deliv';
      const dynamicRate = 55.0;

      mockSettingsRepo.findOne.mockResolvedValue({ tenantId, exchangeRateBs: dynamicRate });

      mockAccessRepo.find.mockResolvedValue([
        { user: { id: 'd-1', username: 'motorizado1' }, role: UserRole.DELIVERY },
      ]);

      const orders = [
        {
          id: 'ord-10',
          deliveryUserId: 'd-1',
          deliveryFee: 5.0,
          customerName: 'Cliente 1',
          deliveryZone: { name: 'Zona 1' },
          totalAmount: 30.0,
          createdAt: new Date(),
        },
      ];

      mockOrderRepo.find.mockResolvedValue(orders);

      const result = await service.getAdminSummary(tenantId);

      expect(result.exchangeRate).toBe(dynamicRate);
      expect(result.globalFletesUSD).toBe(5.0);
      expect(result.globalFletesBS).toBe(Number((5.0 * dynamicRate).toFixed(2))); // 275.00
      expect(result.drivers[0].totalFletesBS).toBe(Number((5.0 * dynamicRate).toFixed(2)));
    });
  });

  describe('completeDelivery', () => {
    it('debe deducir el stock físico de los productos de la orden al completar la entrega', async () => {
      const tenantId = 'tenant-deliv-stock';
      const orderId = 'ord-stock-1';
      const driverId = 'driver-stock-1';

      const mockOrder = {
        id: orderId,
        tenantId,
        deliveryUserId: driverId,
        status: OrderStatus.IN_TRANSIT,
        items: [
          { productId: 'prod-1', quantity: 2 },
        ],
      };

      const mockProduct = {
        id: 'prod-1',
        tenantId,
        physicalStock: 10,
        isCombo: false,
        isPreAssembled: false,
      };

      mockOrderRepo.findOne.mockResolvedValue(mockOrder);

      const savedEntities: any[] = [];
      const mockManager = {
        findOne: jest.fn().mockImplementation((entityClass: any, options: any) => {
          if (entityClass === Order || entityClass?.name === 'Order') {
            return Promise.resolve(mockOrder);
          }
          if (entityClass === Product || entityClass?.name === 'Product') {
            return Promise.resolve(mockProduct);
          }
          return Promise.resolve(null);
        }),
        find: jest.fn().mockImplementation((entityClass: any) => {
          if (entityClass === Product || entityClass?.name === 'Product') {
            return Promise.resolve([mockProduct]);
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entityClass: any, entity: any) => {
          const item = entity || entityClass;
          savedEntities.push(item);
          return Promise.resolve(item);
        }),
      };

      (service as any).dataSource = {
        transaction: jest.fn(async (cb) => cb(mockManager)),
      };

      const completed = await service.completeDelivery(tenantId, orderId, driverId);

      expect(completed.status).toBe(OrderStatus.DELIVERED);
      expect(mockProduct.physicalStock).toBe(8); // 10 - 2
      expect(mockManager.save).toHaveBeenCalledWith(Product, mockProduct);
    });
  });
});
