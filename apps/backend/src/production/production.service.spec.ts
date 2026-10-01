import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProductionService } from './production.service';
import { OrdersService } from '../orders/orders.service';
import { Product } from '../entities/product.entity';
import { ProductionBatch } from '../entities/production-batch.entity';

describe('ProductionService', () => {
  let service: ProductionService;
  let mockOrdersService: any;
  let mockManager: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockOrdersService = {
      autoAllocatePhysicalStock: jest.fn().mockResolvedValue(undefined),
    };

    mockManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entityClassOrEntity: any, entity?: any) => Promise.resolve(entity || entityClassOrEntity)),
      create: jest.fn((entityClass: any, data: any) => ({ ...data, id: 'batch-123' })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      transaction: jest.fn((cb: any) => cb(mockManager)),
      getRepository: jest.fn(() => ({
        find: jest.fn(),
        findOne: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
  });

  describe('createBatch - Combos', () => {
    it('debe calcular el costo del lote sumando el costo real de cada componente (nunca $0.00) y sincronizar stocks', async () => {
      const tenantId = 'tenant-1';
      const productId = 'combo-prod-1';
      const quantityToProduce = 2;

      const comp1: any = {
        id: 'comp-1',
        name: 'Pan de Hamburguesa',
        cost: 1.5,
        estimatedCost: 1.0,
        stockQuantity: 20,
        physicalStock: 20,
        stock: 20,
      };

      const comp2: any = {
        id: 'comp-2',
        name: 'Carne Molida',
        cost: 0,
        estimatedCost: 3.5, // debe usar estimatedCost como fallback
        stockQuantity: 10,
        physicalStock: 10,
        stock: 10,
      };

      const comboProduct: any = {
        id: productId,
        tenantId,
        name: 'Combo Doble Burger',
        isCombo: true,
        isPreAssembled: true,
        is_service: false,
        stockQuantity: 5,
        physicalStock: 5,
        stock: 5,
        comboItems: [
          { quantity: 2, component: comp1 }, // 2 * 2 = 4 unidades * $1.50 = $6.00
          { quantity: 1, component: comp2 }, // 1 * 2 = 2 unidades * $3.50 = $7.00
        ],
      };

      mockManager.findOne.mockResolvedValue(comboProduct);

      const result = await service.createBatch(tenantId, productId, quantityToProduce);

      // 1. Costo total esperado = 6.00 + 7.00 = 13.00 (nunca 0)
      expect(result.batch.totalCost).toBe(13.0);
      expect(result.batch.totalCost).toBeGreaterThan(0);

      // 2. Descuento y sincronización de stock en componentes
      expect(comp1.physicalStock).toBe(16);
      expect(comp1.stockQuantity).toBe(16);
      expect(comp1.stock).toBe(16);

      expect(comp2.physicalStock).toBe(8);
      expect(comp2.stockQuantity).toBe(8);
      expect(comp2.stock).toBe(8);

      // 3. Aumento y sincronización de stock en producto terminado
      expect(comboProduct.physicalStock).toBe(7);
      expect(comboProduct.stockQuantity).toBe(7);
      expect(comboProduct.stock).toBe(7);

      // 4. Se debe haber disparado la asignación automática FIFO
      expect(mockOrdersService.autoAllocatePhysicalStock).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('revertBatch', () => {
    it('debe restaurar los componentes y mantener sincronizado product.stock = product.stockQuantity', async () => {
      const tenantId = 'tenant-1';
      const batchId = 'batch-abc';

      const comp1: any = {
        id: 'comp-1',
        stockQuantity: 16,
        physicalStock: 16,
        stock: 16,
      };

      const comboProduct: any = {
        id: 'combo-prod-1',
        tenantId,
        name: 'Combo Doble Burger',
        isCombo: true,
        isPreAssembled: true,
        stockQuantity: 7,
        physicalStock: 7,
        stock: 7,
        comboItems: [{ quantity: 2, component: comp1 }],
      };

      const batch: any = {
        id: batchId,
        tenantId,
        productId: comboProduct.id,
        quantity: 2,
        totalCost: 13,
      };

      mockManager.findOne
        .mockResolvedValueOnce(batch) // primer findOne para batch
        .mockResolvedValueOnce(comboProduct); // segundo findOne para product

      const result = await service.revertBatch(tenantId, batchId);

      expect(result.success).toBe(true);

      // Producto terminado deducido y sincronizado
      expect(comboProduct.physicalStock).toBe(5);
      expect(comboProduct.stockQuantity).toBe(5);
      expect(comboProduct.stock).toBe(5);

      // Componente restaurado y sincronizado (16 + 2*2 = 20)
      expect(comp1.physicalStock).toBe(20);
      expect(comp1.stockQuantity).toBe(20);
      expect(comp1.stock).toBe(20);

      expect(mockManager.remove).toHaveBeenCalledWith(ProductionBatch, batch);
      expect(mockOrdersService.autoAllocatePhysicalStock).toHaveBeenCalledWith(tenantId);
    });

    it('debe rechazar el reverso con BadRequestException si el producto ya fue entregado físicamente', async () => {
      const tenantId = 'tenant-1';
      const batchId = 'batch-delivered';

      const comboProduct: any = {
        id: 'combo-prod-1',
        tenantId,
        physicalStock: 1, // Menor que la cantidad del lote (2)
        stockQuantity: 1,
      };

      const batch: any = {
        id: batchId,
        tenantId,
        productId: comboProduct.id,
        quantity: 2,
      };

      mockManager.findOne
        .mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(comboProduct);

      await expect(service.revertBatch(tenantId, batchId)).rejects.toThrow(BadRequestException);
    });
  });
});
