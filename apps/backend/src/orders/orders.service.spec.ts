import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { CustomersService } from '../customers/customers.service';
import { Order } from '../entities/order.entity';
import { Settings } from '../entities/settings.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { PaymentStatus, OrderStatus } from '@nutrideli/shared-types';

describe('OrdersService - getDailyCashSummary', () => {
  let service: OrdersService;
  let mockOrderRepo: any;
  let mockSettingsRepo: any;
  let mockExpenseRepo: any;
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

    mockDataSource = {
      getRepository: jest.fn((target: any) => {
        if (target === Order || target?.name === 'Order') return mockOrderRepo;
        if (target === Settings || target?.name === 'Settings') return mockSettingsRepo;
        if (target === OperatingExpense || target?.name === 'OperatingExpense') return mockExpenseRepo;
        return { find: jest.fn(), findOne: jest.fn() };
      }),
    };

    mockCustomersService = {
      normalizePhone: jest.fn((p) => p),
      normalizeId: jest.fn((id) => id),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CustomersService, useValue: mockCustomersService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

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
      status: OrderStatus.DELIVERED,
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
});
