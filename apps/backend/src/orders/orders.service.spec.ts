import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { CustomersService } from '../customers/customers.service';
import { Order } from '../entities/order.entity';
import { Settings } from '../entities/settings.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { Product } from '../entities/product.entity';
import { SettingsService } from '../settings/settings.service';
import { PaymentStatus, OrderStatus, UserRole, MovementType } from '@nutrideli/shared-types';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderRepo: any;
  let mockSettingsRepo: any;
  let mockExpenseRepo: any;
  let mockManager: any;
  let mockDataSource: any;
  let mockCustomersService: any;

  beforeEach(async () => {
    mockOrderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockSettingsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockExpenseRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entityClassOrEntity: any, entity?: any) => Promise.resolve(entity || entityClassOrEntity)),
      create: jest.fn((entityClass: any, data: any) => ({ ...data })),
      remove: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn((target: any) => {
        if (target === Order || target?.name === 'Order') return mockOrderRepo;
        if (target === Settings || target?.name === 'Settings') return mockSettingsRepo;
        if (target === OperatingExpense || target?.name === 'OperatingExpense') return mockExpenseRepo;
        if (target === Product || target?.name === 'Product') return { find: mockManager.find, findOne: mockManager.findOne };
        return { find: jest.fn(), findOne: jest.fn() };
      }),
      transaction: jest.fn((cb: any) => cb(mockManager)),
    };

    mockCustomersService = {
      normalizePhone: jest.fn((p) => p),
      normalizeId: jest.fn((id) => id),
    };

    const mockSettingsService = {
      getEffectiveRate: jest.fn().mockResolvedValue(50.0),
      getExchangeRate: jest.fn().mockResolvedValue({ exchangeRateBs: 50.0, currencySymbol: 'Bs.' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('getDailyCashSummary', () => {
    it('debe calcular netCashUSD deduciendo vueltos entregados y vales/egresos de OperatingExpense', async () => {
      const tenantId = 'tenant-test-1';
      const dateStr = '2026-10-01';

      // 1. Mock de tasa de cambio activa
      mockSettingsRepo.findOne.mockResolvedValue({
        tenantId,
        exchangeRateBs: 50.0,
      });

      // 2. Mock de orden con venta en efectivo de $100 USD y vuelto entregado en efectivo de $10 USD
      const sampleOrder = {
        id: 'order-12345678-abcd',
        tenantId,
        totalAmount: 90,
        usdReceived: 100, // Cobró $100 USD en efectivo en gaveta
        changeAmount: 10,  // Entregó $10 USD de vuelto en efectivo
        changeMethod: 'CASH_USD',
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        status: OrderStatus.READY,
        createdAt: new Date('2026-10-01T12:00:00Z'),
      };
      mockOrderRepo.find.mockResolvedValue([sampleOrder]);

      // 3. Mock de egreso registrado en efectivo (vale de empleado de $20 USD)
      const sampleExpense = {
        id: 'exp-uuid-1',
        tenantId,
        description: 'Vale Empleado: Almuerzo - Pedro ($20.00 / Bs. 1000.00)',
        amount: 20,
        paymentMethod: 'CASH',
        category: 'VALE_EMPLEADO',
        createdAt: new Date('2026-10-01T14:30:00Z'),
      };
      mockExpenseRepo.find.mockResolvedValue([sampleExpense]);

      const result = await service.getDailyCashSummary(tenantId, dateStr);

      // Verificaciones de valores
      expect(result.totalCashUSD).toBe(100); // Ventas recibidas en efectivo
      expect(result.totalCashChangeUSD).toBe(10); // Vueltos entregados en divisas
      expect(result.totalCashExpensesUSD).toBe(20); // Vales/egresos en efectivo
      // netCashUSD = 100 (ventas) - 10 (vueltos) - 20 (egresos) = 70
      expect(result.netCashUSD).toBe(70);

      // Verificación del desglose de egresos
      expect(result.cashExpensesList).toHaveLength(1);
      expect(result.cashExpensesList[0]).toEqual({
        id: 'exp-uuid-1',
        description: 'Vale Empleado: Almuerzo - Pedro ($20.00 / Bs. 1000.00)',
        amount: 20,
        category: 'VALE_EMPLEADO',
        createdAt: sampleExpense.createdAt,
      });
    });

    it('debe incluir abonos en efectivo de órdenes con PaymentStatus.PARTIAL en totalCashUSD y totalCashReceivedUSD', async () => {
      const tenantId = 'tenant-test-1';
      const dateStr = '2026-10-01';

      mockSettingsRepo.findOne.mockResolvedValue({
        tenantId,
        exchangeRateBs: 50.0,
      });

      // Orden con pago parcial: Total $50 USD, abono de $30 USD en efectivo y $10 en Pago Móvil
      const partialOrderWithHistory = {
        id: 'order-partial-123',
        tenantId,
        totalAmount: 50,
        abonosTotal: 40,
        paymentStatus: PaymentStatus.PARTIAL,
        paymentMethod: 'MULTIPLE',
        status: OrderStatus.READY,
        createdAt: new Date('2026-10-01T15:00:00Z'),
        abonosHistory: [
          { id: 'abono-1', amount: 30, method: 'USD', createdAt: '2026-10-01T15:00:00Z' },
          { id: 'abono-2', amount: 10, method: 'PAGO_MOVIL', createdAt: '2026-10-01T15:10:00Z' },
        ],
      };

      // Orden con pago parcial sin abonosHistory pero con paymentMethod = 'USD'
      const partialOrderSimple = {
        id: 'order-partial-456',
        tenantId,
        totalAmount: 40,
        abonosTotal: 15,
        paymentStatus: PaymentStatus.PARTIAL,
        paymentMethod: 'USD',
        status: OrderStatus.READY,
        createdAt: new Date('2026-10-01T16:00:00Z'),
      };

      mockOrderRepo.find.mockResolvedValue([partialOrderWithHistory, partialOrderSimple]);
      mockExpenseRepo.find.mockResolvedValue([]);

      const result = await service.getDailyCashSummary(tenantId, dateStr);

      // 30 USD (abono en efectivo de la 1ra) + 15 USD (abono simple en USD de la 2da) = 45 USD
      expect(result.totalCashUSD).toBe(45);
      expect(result.totalCashReceivedUSD).toBe(45);
      expect(result.netCashUSD).toBe(45);
    });

    it('debe incluir en la deducción de egresos de gaveta los registros con paymentMethod CASH, CASH_USD y USD', async () => {
      const tenantId = 'tenant-test-1';
      const dateStr = '2026-10-01';

      mockSettingsRepo.findOne.mockResolvedValue({
        tenantId,
        exchangeRateBs: 50.0,
      });

      const sampleOrder = {
        id: 'order-cash-sales',
        tenantId,
        totalAmount: 100,
        usdReceived: 100,
        changeAmount: 10,
        changeMethod: 'CASH_USD',
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        status: OrderStatus.READY,
        createdAt: new Date('2026-10-01T12:00:00Z'),
      };
      mockOrderRepo.find.mockResolvedValue([sampleOrder]);

      const expense1 = {
        id: 'exp-1',
        tenantId,
        description: 'Gasto menor insumos',
        amount: 15,
        paymentMethod: 'CASH',
        category: 'OPERATIVO',
        createdAt: new Date('2026-10-01T13:00:00Z'),
      };
      const expense2 = {
        id: 'exp-2',
        tenantId,
        description: 'Pago Nómina en Divisas',
        amount: 50,
        paymentMethod: 'CASH_USD',
        category: 'NOMINA',
        createdAt: new Date('2026-10-01T14:00:00Z'),
      };
      const expense3 = {
        id: 'exp-3',
        tenantId,
        description: 'Vale de caja USD',
        amount: 25,
        paymentMethod: 'USD',
        category: 'VALE_EMPLEADO',
        createdAt: new Date('2026-10-01T15:00:00Z'),
      };

      mockExpenseRepo.find.mockResolvedValue([expense1, expense2, expense3]);

      const result = await service.getDailyCashSummary(tenantId, dateStr);

      // Egresos totales = 15 + 50 + 25 = 90
      expect(result.totalCashExpensesUSD).toBe(90);
      expect(result.cashExpensesList).toHaveLength(3);
      // netCashUSD = 100 (ventas) - 10 (vueltos) - 90 (egresos) = 0
      expect(result.netCashUSD).toBe(0);
    });
  });

  describe('autoAllocatePhysicalStock - Servicios', () => {
    it('debe validar que una orden con sólo servicios pase a PENDING sin stock físico, y una sin stock suficiente pase a PREPARING', async () => {
      const tenantId = 'tenant-test-1';

      // Orden 1: Sólo servicios, actualmente en PREPARING
      const serviceOrder = {
        id: 'order-service-1',
        tenantId,
        status: OrderStatus.PREPARING,
        items: [{ productId: 'service-item-1', quantity: 2 }],
      };

      // Orden 2: Producto físico sin stock suficiente, actualmente en PENDING
      const physicalOrder = {
        id: 'order-physical-1',
        tenantId,
        status: OrderStatus.PENDING,
        items: [{ productId: 'phys-item-1', quantity: 5 }],
      };

      // Mock de productos
      const serviceProduct = {
        id: 'service-item-1',
        name: 'Corte de Cabello',
        is_service: true,
        category: 'Servicios',
        physicalStock: 0,
        comboItems: [],
      };

      const physicalProduct = {
        id: 'phys-item-1',
        name: 'Shampoo Especial',
        is_service: false,
        category: 'Capilar',
        physicalStock: 2, // Requiere 5, sólo hay 2
        comboItems: [],
      };

      mockManager.find.mockImplementation((entity: any) => {
        if (entity === Order || entity?.name === 'Order') {
          return Promise.resolve([serviceOrder, physicalOrder]);
        }
        if (entity === Product || entity?.name === 'Product') {
          return Promise.resolve([serviceProduct, physicalProduct]);
        }
        return Promise.resolve([]);
      });

      await service.autoAllocatePhysicalStock(tenantId);

      // La orden de servicios debe promoverse a PENDING
      expect(serviceOrder.status).toBe(OrderStatus.PENDING);
      // La orden física debe degradarse a PREPARING por falta de stock
      expect(physicalOrder.status).toBe(OrderStatus.PREPARING);
    });
  });

  describe('assignDelivery - Personal Multirrol', () => {
    it('debe aceptar con éxito a un usuario con rol POS o ADMIN como repartidor sin arrojar excepción', async () => {
      const tenantId = 'tenant-123';
      const orderId = 'order-999';
      const deliveryUserId = 'user-pos-1';

      const existingOrder = {
        id: orderId,
        tenantId,
        deliveryUserId: null,
      };

      mockOrderRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === orderId) return Promise.resolve(existingOrder);
        return Promise.resolve(null);
      });

      mockDataSource.manager = mockManager;
      mockManager.findOne.mockImplementation((entity: any, opts: any) => {
        if (entity === UserTenantAccess || entity?.name === 'UserTenantAccess') {
          return Promise.resolve({
            userId: deliveryUserId,
            tenantId,
            isActive: true,
            role: UserRole.POS,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.assignDelivery(tenantId, orderId, deliveryUserId);

      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(existingOrder.deliveryUserId).toBe(deliveryUserId);
      expect(result).toBeDefined();
    });
  });

  describe('createOrder - Extras de Insumos Sueltos', () => {
    it('debe descontar el stock directamente de RawMaterial y registrar OUT_SALE cuando se vende un extra suelto', async () => {
      const tenantId = 'tenant-123';
      const rawMaterialExtraId = 'rm-extra-salsa';

      const mockExtraMaterial = {
        id: rawMaterialExtraId,
        tenantId,
        name: 'Salsa Especial',
        allowAsExtra: true,
        stockQuantity: 10,
        costPerUnit: 0.5,
      };

      mockManager.find.mockImplementation((entity: any) => {
        if (entity === Product || entity?.name === 'Product') {
          return Promise.resolve([]); // No es un producto regular
        }
        return Promise.resolve([]);
      });

      mockManager.findOne.mockImplementation((entity: any, opts: any) => {
        if (entity === RawMaterial || entity?.name === 'RawMaterial') {
          return Promise.resolve(mockExtraMaterial);
        }
        return Promise.resolve(null);
      });

      const orderDto: any = {
        customerName: 'Cliente Prueba Extra',
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'USD',
        items: [
          {
            productId: rawMaterialExtraId,
            quantity: 2,
            unitPrice: 1.5,
          },
        ],
      };

      await service.createOrder(tenantId, orderDto);

      // Descuento de stock en RawMaterial: 10 - 2 = 8
      expect(mockExtraMaterial.stockQuantity).toBe(8);
      expect(mockManager.save).toHaveBeenCalledWith(RawMaterial, mockExtraMaterial);

      // Verificación del movimiento de stock OUT_SALE
      expect(mockManager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          tenantId,
          rawMaterialId: rawMaterialExtraId,
          type: MovementType.OUT_SALE,
          quantity: 2,
          totalCost: 2 * 0.5,
          description: 'Venta de Extra Suelto: Salsa Especial',
        }),
      );
    });
  });
});
