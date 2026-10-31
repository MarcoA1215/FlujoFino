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
      expect(passedPayload.strictStockCheck).toBe(true);
    });
  });

  describe('reportOrderPayment (Confirmación de pago tras apartado de stock)', () => {
    it('debe permitir confirmar pago en efectivo USD con vuelto una vez apartados los productos sin exigir referencia bancaria', async () => {
      const orderMock: any = {
        id: '3a4b5c6d-1111-2222-3333-444455556666',
        tenantId: '00000000-0000-0000-0000-000000000001',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: 'PENDING',
        customerName: 'Cliente Diciembre',
        customerPhone: '04141112233',
        totalAmount: 15,
        amountBs: 750,
        notes: 'Cédula: V-12345678',
        items: [],
      };
      mockOrderRepo.findOne.mockResolvedValue(orderMock);
      mockOrderRepo.save.mockImplementation((o: any) => Promise.resolve(o));

      const res = await controller.reportOrderPayment(orderMock.id, {
        amount: 15,
        method: 'USD',
        notes: 'MÉTODO: Divisas Efectivo (USD) | Paga con: $20.00 | Vuelto a recibir: $5.00',
      });

      expect(res.success).toBe(true);
      expect(res.paymentMethod).toBe('USD');
      expect(res.notes).toContain('Vuelto a recibir: $5.00');
    });

    it('debe registrar comprobante de Pago Móvil con referencia y banco sobre la orden ya apartada', async () => {
      const orderMock: any = {
        id: '3a4b5c6d-1111-2222-3333-444455556666',
        tenantId: '00000000-0000-0000-0000-000000000001',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: 'PENDING',
        customerName: 'Cliente Diciembre',
        customerPhone: '04141112233',
        totalAmount: 15,
        amountBs: 750,
        notes: '',
        abonosTotal: 0,
        abonosHistory: [],
        items: [],
      };
      mockOrderRepo.findOne.mockResolvedValue(orderMock);
      mockOrderRepo.save.mockImplementation((o: any) => Promise.resolve(o));

      const res = await controller.reportOrderPayment(orderMock.id, {
        amount: 15,
        amountBs: 750,
        method: 'PAGO_MOVIL',
        reference: '987654',
        bank: 'Banesco',
      });

      expect(res.success).toBe(true);
      expect(res.paymentMethod).toBe('PAGO_MOVIL');
      expect(res.paymentReported).toBe(true);
      expect(res.pagoMovilRef).toBe('987654');
      expect(res.abonosTotal).toBe(15);
    });
  });

  describe('trackOrder (Búsqueda de pedido por código de 8 caracteres y teléfono o cédula)', () => {
    it('debe usar LOWER(CAST(order.id AS TEXT)) en vez de LOWER(order.id) y validar por teléfono o cédula sin lanzar error de PostgreSQL UUID', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      jest.spyOn(tenantCrypto, 'decodeTenantId').mockReturnValue(tenantId);

      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: '3a4b5c6d-1111-2222-3333-444455556666',
          tenantId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          customerName: 'Juan Perez',
          customerPhone: '0412-1234567',
          identification: 'V-19876543',
          totalAmount: 25,
          amountBs: 1000,
          items: [],
        }),
      };

      mockOrderRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      // 1) Búsqueda usando Cédula
      const resByCedula = await controller.trackOrder('token-valido', {
        orderCode: '#3A4B5C6D',
        phone: '19876543',
      });

      expect(mockOrderRepo.findOne).not.toHaveBeenCalled();
      expect(mockQb.where).toHaveBeenCalledWith('(LOWER(CAST(order.id AS TEXT)) LIKE :prefix OR LOWER(CAST(order.id AS TEXT)) LIKE :suffix)', {
        prefix: '3a4b5c6d%',
        suffix: '%3a4b5c6d',
      });
      expect(resByCedula.orderNumber).toBe('3A4B5C6D');

      // 2) Búsqueda usando Teléfono
      const resByPhone = await controller.trackOrder('token-valido', {
        orderCode: '3A4B5C6D',
        phone: '04121234567',
      });
      expect(resByPhone.orderNumber).toBe('3A4B5C6D');
    });
  });
});
