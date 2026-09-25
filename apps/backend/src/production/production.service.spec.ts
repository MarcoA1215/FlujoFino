import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductionService } from './production.service';
import { OrdersService } from '../orders/orders.service';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';

describe('ProductionService (Recipes / Production Flow)', () => {
  let service: ProductionService;
  let dataSource: any;
  let ordersService: any;

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
    };

    ordersService = {
      autoAllocatePhysicalStock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: DataSource, useValue: dataSource },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBatch validation', () => {
    it('throws BadRequestException if quantityToProduce is <= 0', async () => {
      await expect(service.createBatch('tenant-1', 'prod-1', 0)).rejects.toThrow(
        'La cantidad a producir debe ser mayor a cero',
      );
      await expect(service.createBatch('tenant-1', 'prod-1', -5)).rejects.toThrow(
        'La cantidad a producir debe ser mayor a cero',
      );
    });

    it('throws BadRequestException if product is not found', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        return cb(manager);
      });

      await expect(service.createBatch('tenant-1', 'prod-none', 10)).rejects.toThrow(
        'Producto no encontrado',
      );
    });

    it('throws BadRequestException if product has no recipe', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'prod-1',
            name: 'Pizza Simple',
            recipe: [],
          }),
        };
        return cb(manager);
      });

      await expect(service.createBatch('tenant-1', 'prod-1', 5)).rejects.toThrow(
        'El producto no tiene receta configurada',
      );
    });

    it('throws BadRequestException if raw material stock is insufficient', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'prod-1',
            name: 'Hamburguesa Especial',
            recipe: [
              {
                quantity: 2,
                rawMaterial: {
                  id: 'rm-carne',
                  name: 'Carne de Res',
                  stockQuantity: 5, // needs 2 * 5 = 10, but only has 5
                  costPerUnit: 4.0,
                },
              },
            ],
          }),
        };
        return cb(manager);
      });

      await expect(service.createBatch('tenant-1', 'prod-1', 5)).rejects.toThrow(
        'Insumo insuficiente: Carne de Res',
      );
    });

    it('successfully produces batch, deducts raw materials, and increases product stock', async () => {
      const mockRawMaterial = {
        id: 'rm-queso',
        name: 'Queso Mozzarella',
        stockQuantity: 20, // needs 2 * 5 = 10
        costPerUnit: 3.0,
      };

      const mockProduct = {
        id: 'prod-pizza',
        name: 'Pizza Mozzarella',
        physicalStock: 2,
        stockQuantity: 2,
        recipe: [
          {
            quantity: 2,
            rawMaterial: mockRawMaterial,
          },
        ],
      };

      const savedMovements: any[] = [];
      const savedBatches: any[] = [];

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(mockProduct),
          save: jest.fn(async (entityClass: any, entity: any) => {
            if (entityClass === ProductionBatch || entity?.costPerUnit !== undefined) {
              savedBatches.push(entity);
            }
            return entity;
          }),
          create: jest.fn((entityClass: any, dto: any) => {
            if (entityClass === StockMovement) {
              savedMovements.push(dto);
            }
            return dto;
          }),
        };
        return cb(manager);
      });

      const result = await service.createBatch('tenant-1', 'prod-pizza', 5);
      expect(result).toBeDefined();
      expect(result.product).toBeDefined();
      expect(result.batch).toBeDefined();

      // Raw material deducted: 20 - (2 * 5) = 10
      expect(mockRawMaterial.stockQuantity).toBe(10);

      // Product physical stock increased: 2 + 5 = 7
      expect(mockProduct.physicalStock).toBe(7);
      expect(mockProduct.stockQuantity).toBe(7);

      // Movement OUT_PRODUCTION created
      expect(savedMovements.length).toBe(1);
      expect(savedMovements[0].type).toBe(MovementType.OUT_PRODUCTION);
      expect(savedMovements[0].quantity).toBe(10);

      // Batch cost calculated: 10 * 3.0 = $30.00
      expect(result.batch.totalCost).toBe(30);
    });

    it('throws BadRequestException if producing a combo that is not pre-assembled', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'combo-1',
            name: 'Combo Familiar',
            isCombo: true,
            isPreAssembled: false,
          }),
        };
        return cb(manager);
      });

      await expect(service.createBatch('tenant-1', 'combo-1', 2)).rejects.toThrow(
        'No se puede producir un combo virtual',
      );
    });
  });
});
