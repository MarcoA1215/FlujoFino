import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { Investment } from '../entities/investment.entity';
import { Reservation } from '../entities/reservation.entity';
import { CashExchange } from '../entities/cash-exchange.entity';
import { Settings } from '../entities/settings.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let rawMaterialRepo: Partial<Record<keyof Repository<RawMaterial>, jest.Mock>>;
  let productRepo: Partial<Record<keyof Repository<Product>, jest.Mock>>;
  let movementRepo: any;
  let orderRepo: any;
  let orderItemRepo: any;
  let expenseRepo: any;
  let investmentRepo: any;
  let reservationRepo: any;
  let cashExchangeRepo: any;
  let settingsRepo: any;

  beforeEach(async () => {
    rawMaterialRepo = {
      find: jest.fn(),
    };

    productRepo = {
      find: jest.fn(),
    };

    const createDummyQueryBuilder = (resultValue: any = { total: 0 }) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(resultValue),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    movementRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    orderItemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    expenseRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    investmentRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    reservationRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    cashExchangeRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    settingsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(RawMaterial),
          useValue: rawMaterialRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepo,
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: movementRepo,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepo,
        },
        {
          provide: getRepositoryToken(OperatingExpense),
          useValue: expenseRepo,
        },
        {
          provide: getRepositoryToken(Investment),
          useValue: investmentRepo,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationRepo,
        },
        {
          provide: getRepositoryToken(CashExchange),
          useValue: cashExchangeRepo,
        },
        {
          provide: getRepositoryToken(Settings),
          useValue: settingsRepo,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getSummary', () => {
    it('un insumo con isActive: false y stock 0 NO debe aparecer en lowStockMaterials (sin alerta roja de reabastecimiento)', async () => {
      // Configuramos el mock de rawMaterialRepo para devolver solo materiales activos
      // tal como lo hace la consulta con where: [{ tenantId, isActive: true }, { tenantId, isActive: IsNull() }]
      const activeRawMaterial = {
        id: 'active-mat-1',
        name: 'Carne de Res',
        stockQuantity: 2,
        minStockAlert: 5,
        costPerUnit: 10,
        isActive: true,
      };

      rawMaterialRepo.find?.mockImplementation(async (options: any) => {
        expect(options.where).toEqual([
          { tenantId: '12345678-1234-4234-8234-123456789abc', isActive: true },
          { tenantId: '12345678-1234-4234-8234-123456789abc', isActive: IsNull() },
        ]);
        return [activeRawMaterial];
      });

      productRepo.find?.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Hamburguesa',
          stockQuantity: -1, // Genera déficit de 1 unidad
          salePrice: 15,
          recipe: [
            {
              rawMaterial: { id: 'archived-mat-999', name: 'Pan Viejo Descontinuado', isActive: false },
              quantity: 2,
            },
            {
              rawMaterial: { id: 'active-mat-1', name: 'Carne de Res', isActive: true },
              quantity: 1,
            },
          ],
        },
      ]);

      const summary = await service.getSummary('12345678-1234-4234-8234-123456789abc');

      // Validar que el insumo archivado con stock 0 NO está en lowStockMaterials
      const archivedInLowStock = summary.lowStockMaterials.find((rm: any) => rm.id === 'archived-mat-999');
      expect(archivedInLowStock).toBeUndefined();

      // Validar que en rawMaterialDebt se ignoró el insumo archivado
      // Solo el insumo activo debe estar presente en lowStockMaterials
      const activeInLowStock = summary.lowStockMaterials.find((rm: any) => rm.id === 'active-mat-1');
      expect(activeInLowStock).toBeDefined();
      expect(activeInLowStock?.debt).toBe(1); // 1 unidad requerida por déficit del producto
      expect(activeInLowStock?.effectiveStock).toBe(1); // 2 de stock - 1 de deuda = 1 <= minStockAlert (5)
    });
  });

  describe('getTreasurySummary - Detección de Abonos de Citas', () => {
    it('debe computar en banco los pagos móviles aprobados en abonosHistory aunque paymentMethod sea ON_ARRIVAL', async () => {
      const tenantId = 'tenant-exotica';
      settingsRepo.findOne.mockResolvedValue({
        id: tenantId,
        exchangeRateBs: 880,
        initialBankBs: 0,
        initialCashUSD: 0,
        currencySymbol: 'Bs.',
      });

      orderRepo.find.mockResolvedValue([
        {
          id: 'ord-maria-moro',
          tenantId,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          paymentMethod: 'ON_ARRIVAL',
          totalAmount: 25,
          exchangeRate: 880,
          splitPayments: null,
          abonosHistory: [
            {
              id: 'abono-1',
              amount: 25,
              amountBs: 22000,
              method: 'PAGO_MOVIL',
              status: 'APPROVED',
              reference: '7959',
            },
          ],
        },
      ]);

      expenseRepo.find.mockResolvedValue([]);
      cashExchangeRepo.find.mockResolvedValue([]);

      const treasury = await service.getTreasurySummary(tenantId);

      expect(treasury.pagoMovilBs).toBe(22000);
      expect(treasury.bankBs).toBe(22000);
      expect(treasury.cashUSD).toBe(0);
    });

    it('debe computar correctamente pagos en divisas / USD con finiquito tras abono previo en tesorería y arqueo mensual', async () => {
      const tenantId = 'tenant-divisas';
      settingsRepo.findOne.mockResolvedValue({
        id: tenantId,
        exchangeRateBs: 50,
        initialBankBs: 0,
        initialCashUSD: 0,
        currencySymbol: 'Bs.',
      });

      // Orden de $50 total, con abono de $20 en USD y luego cobro finiquito de $30 en USD (paymentStatus = PAID)
      orderRepo.find.mockResolvedValue([
        {
          id: 'ord-divisas-1',
          tenantId,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: 'USD',
          totalAmount: 50,
          totalCost: 15,
          exchangeRate: 50,
          createdAt: new Date(),
          abonosHistory: [
            {
              id: 'abono-usd-1',
              amount: 20,
              method: 'USD',
              status: 'APPROVED',
            },
          ],
        },
      ]);

      expenseRepo.find.mockResolvedValue([]);
      cashExchangeRepo.find.mockResolvedValue([]);

      const treasury = await service.getTreasurySummary(tenantId);
      // El total de $50 debe estar en gaveta de efectivo USD ($20 del abono + $30 del finiquito)
      expect(treasury.cashUSD).toBe(50);

      const monthly = await service.getMonthlySummary(tenantId);
      expect(monthly.byMethod.USD).toBe(50);
      expect(monthly.collectedRevenue).toBe(50);
    });

    it('debe computar citas completadas en divisas sin orden POS vinculada en tesorería y arqueo', async () => {
      const tenantId = 'tenant-citas';
      settingsRepo.findOne.mockResolvedValue({
        id: tenantId,
        exchangeRateBs: 50,
        initialBankBs: 0,
        initialCashUSD: 0,
        currencySymbol: 'Bs.',
      });

      orderRepo.find.mockResolvedValue([]);
      expenseRepo.find.mockResolvedValue([]);
      cashExchangeRepo.find.mockResolvedValue([]);

      reservationRepo.find.mockResolvedValue([
        {
          id: 'res-divisas-1',
          tenantId,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: 'DIVISAS',
          totalAmount: 35,
          orderId: null,
          createdAt: new Date(),
        },
      ]);

      const treasury = await service.getTreasurySummary(tenantId);
      expect(treasury.cashUSD).toBe(35);

      const monthly = await service.getMonthlySummary(tenantId);
      expect(monthly.byMethod.USD).toBe(35);
      expect(monthly.collectedRevenue).toBe(35);
    });
  });
});
