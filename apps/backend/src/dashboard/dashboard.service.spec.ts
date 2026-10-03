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
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    investmentRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
    };
    reservationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createDummyQueryBuilder()),
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
          { tenantId: 'tenant-123', isActive: true },
          { tenantId: 'tenant-123', isActive: IsNull() },
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

      const summary = await service.getSummary('tenant-123');

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
});
