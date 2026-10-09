import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicStoreController } from './public-store.controller';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Order } from '../entities/order.entity';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { Product } from '../entities/product.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { PaymentStatus, OrderStatus } from '@finowork/shared-types';
import * as tenantCrypto from '../utils/tenant-crypto';

describe('PublicStoreController', () => {
  let controller: PublicStoreController;
  let mockOrdersService: any;
  let mockNotificationsService: any;
  let mockOrderRepo: any;
  let mockTenantRepo: any;
  let mockSettingsRepo: any;
  let mockProductRepo: any;
  let mockDeliveryZoneRepo: any;

  beforeEach(async () => {
    mockOrdersService = {
      createOrder: jest.fn().mockImplementation((tenantId, payload) => {
        return Promise.resolve({
          id: 'ord-public-12345678',
          tenantId,
          status: payload.status,
          paymentStatus: payload.paymentStatus,
          paymentReported: payload.paymentReported,
          totalAmount: 100,
          amountBs: 5000,
          deliveryMethod: payload.deliveryMethod,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          items: payload.items || [],
        });
      }),
    };

    mockNotificationsService = {
      notifyNewOrder: jest.fn().mockResolvedValue(undefined),
    };

    mockOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mockTenantRepo = {
      findOne: jest.fn(),
    };
    mockSettingsRepo = {
      findOne: jest.fn(),
    };
    mockProductRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'p-1', name: 'Producto 1', salePrice: 50, stockQuantity: 10 }),
    };
    mockDeliveryZoneRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicStoreController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(Settings), useValue: mockSettingsRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(DeliveryZone), useValue: mockDeliveryZoneRepo },
      ],
    }).compile();

    controller = module.get<PublicStoreController>(PublicStoreController);
  });

  describe('createPublicStoreOrder (Blindaje de seguridad en tienda pública)', () => {
    it('debe forzar paymentStatus a PENDING y purgar usdReceived y splitPayments aunque el cliente intente auto-aprobarse', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);

      mockTenantRepo.findOne.mockResolvedValue({ id: tenantId, name: 'Comercio Test', isActive: true, status: 'ACTIVE' });
      mockSettingsRepo.findOne.mockResolvedValue({ tenantId, exchangeRateBs: 50.0 });
      mockProductRepo.find.mockResolvedValue([
        { id: 'p-1', name: 'Producto 1', salePrice: 50, stockQuantity: 10 },
      ]);

      const maliciousDto: any = {
        customerName: 'Atacante',
        customerPhone: '04141234567',
        paymentStatus: PaymentStatus.PAID,
        usdReceived: 9999,
        changeAmount: 500,
        changeAmountBs: 25000,
        changeMethod: 'CASH_USD',
        changeRef: 'FAKEREF',
        splitPayments: [{ method: 'USD', amountUSD: 9999 }],
        discountAmount: 100,
        initialAbono: 50,
        items: [{ productId: 'p-1', quantity: 2 }],
      };

      const result = await controller.createPublicStoreOrder('token-tienda-valido', maliciousDto);

      expect(result).toBeDefined();
      expect(mockOrdersService.createOrder).toHaveBeenCalledTimes(1);
      const passedPayload = mockOrdersService.createOrder.mock.calls[0][1];

      // Verificación estricta de mitigación de vulnerabilidad
      expect(passedPayload.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(passedPayload.usdReceived).toBeUndefined();
      expect(passedPayload.splitPayments).toBeUndefined();
      expect(passedPayload.changeAmount).toBeUndefined();
      expect(passedPayload.changeAmountBs).toBeUndefined();
      expect(passedPayload.changeMethod).toBeUndefined();
      expect(passedPayload.changeRef).toBeUndefined();
      expect(passedPayload.discountAmount).toBe(0);
      expect(passedPayload.initialAbono).toBeUndefined();
    });
  });
});
