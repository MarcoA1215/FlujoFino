import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RawMaterialsService } from './raw-materials.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';

describe('RawMaterialsService (Inventory / Raw Materials Flow)', () => {
  let service: RawMaterialsService;
  let rawMaterialRepo: any;
  let stockMovementRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    rawMaterialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => dto),
    };

    stockMovementRepo = {
      find: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => dto),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RawMaterialsService,
        { provide: getRepositoryToken(RawMaterial), useValue: rawMaterialRepo },
        { provide: getRepositoryToken(StockMovement), useValue: stockMovementRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RawMaterialsService>(RawMaterialsService);
  });

  describe('create raw material', () => {
    it('creates raw material with initial stock movement', async () => {
      const createdMovements: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          create: jest.fn((entityClass: any, dto: any) => {
            const res = { id: 'rm-1', ...dto };
            if (entityClass === StockMovement) {
              createdMovements.push(res);
            }
            return res;
          }),
          save: jest.fn(async (entityClass: any, entity: any) => entity),
        };
        return cb(manager);
      });

      const material = await service.create('tenant-1', {
        name: 'Harina de Trigo',
        unit: 'kg',
        costPerUnit: 1.5,
        minStockAlert: 5,
        initialStock: 20,
      });

      expect(material.name).toBe('Harina de Trigo');
      expect(material.stockQuantity).toBe(20);
      expect(createdMovements.length).toBe(1);
      expect(createdMovements[0].type).toBe(MovementType.IN_PURCHASE);
      expect(createdMovements[0].quantity).toBe(20);
      expect(createdMovements[0].totalCost).toBe(30);
    });
  });

  describe('restock (Weighted Average Cost / WAC)', () => {
    it('throws BadRequestException if quantity <= 0 or cost < 0', async () => {
      await expect(
        service.restock('tenant-1', 'rm-1', { quantity: 0, totalCost: 10 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.restock('tenant-1', 'rm-1', { quantity: 5, totalCost: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calculates weighted average cost properly on restock', async () => {
      const existingMaterial = {
        id: 'rm-carne',
        name: 'Carne Molida',
        stockQuantity: 10,
        costPerUnit: 2.0, // Existing value: 10 * 2.0 = $20
      };

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(existingMaterial),
          save: jest.fn(async (entityClass: any, entity: any) => entity),
          create: jest.fn((entityClass: any, dto: any) => dto),
        };
        return cb(manager);
      });

      // Buy 10 more units for $40 ($4.00/unit)
      // New total stock = 20 units
      // New WAC = ($20 + $40) / 20 = $3.00/unit
      const updated = await service.restock('tenant-1', 'rm-carne', {
        quantity: 10,
        totalCost: 40.0,
      });

      expect(updated.stockQuantity).toBe(20);
      expect(updated.costPerUnit).toBe(3.0);
    });
  });

  describe('registerLoss', () => {
    it('throws BadRequestException if loss quantity <= 0', async () => {
      await expect(
        service.registerLoss('tenant-1', 'rm-1', { quantity: 0, reason: 'Dañado' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if requested loss exceeds available stock', async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'rm-1',
            stockQuantity: 5,
            costPerUnit: 2.0,
          }),
        };
        return cb(manager);
      });

      await expect(
        service.registerLoss('tenant-1', 'rm-1', { quantity: 8, reason: 'Vencido' }),
      ).rejects.toThrow('Stock insuficiente para la merma solicitada');
    });

    it('deducts stock and records loss movement', async () => {
      const existing = {
        id: 'rm-1',
        stockQuantity: 10,
        costPerUnit: 2.5,
      };

      const recordedMovements: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue(existing),
          save: jest.fn(async (entityClass: any, entity: any) => entity),
          create: jest.fn((entityClass: any, dto: any) => {
            recordedMovements.push(dto);
            return dto;
          }),
        };
        return cb(manager);
      });

      const updated = await service.registerLoss('tenant-1', 'rm-1', {
        quantity: 3,
        reason: 'Empaque roto',
      });

      expect(updated.stockQuantity).toBe(7);
      expect(recordedMovements.length).toBe(1);
      expect(recordedMovements[0].type).toBe(MovementType.LOSS);
      expect(recordedMovements[0].quantity).toBe(3);
      expect(recordedMovements[0].totalCost).toBe(7.5);
    });
  });
});
