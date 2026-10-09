import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RawMaterialsService } from './raw-materials.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { MovementType } from '@finowork/shared-types';

describe('RawMaterialsService', () => {
  let service: RawMaterialsService;
  let rawMaterialRepo: Partial<Record<keyof Repository<RawMaterial>, jest.Mock>>;
  let stockMovementRepo: Partial<Record<keyof Repository<StockMovement>, jest.Mock>>;
  let recipeItemRepo: any;
  let dataSource: any;
  let mockManager: any;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      save: jest.fn((entityClassOrEntity: any, entity?: any) => Promise.resolve(entity || entityClassOrEntity)),
      create: jest.fn((entityClass: any, data: any) => ({ ...data })),
      createQueryBuilder: jest.fn(),
    };

    rawMaterialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
      update: jest.fn(),
    };

    stockMovementRepo = {
      find: jest.fn(),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
    };

    recipeItemRepo = {
      createQueryBuilder: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(mockManager)),
      getRepository: jest.fn((entity: any) => {
        if (entity === RecipeItem || entity?.name === 'RecipeItem') return recipeItemRepo;
        if (entity === RawMaterial || entity?.name === 'RawMaterial') return rawMaterialRepo;
        if (entity === StockMovement || entity?.name === 'StockMovement') return stockMovementRepo;
        return { createQueryBuilder: jest.fn() };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RawMaterialsService,
        {
          provide: getRepositoryToken(RawMaterial),
          useValue: rawMaterialRepo,
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: stockMovementRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<RawMaterialsService>(RawMaterialsService);
  });

  describe('checkUsage', () => {
    it('debe detectar correctamente los productos que usan el insumo', async () => {
      const qbMock: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { id: 'prod-1', name: 'Hamburguesa Especial' },
          { id: 'prod-2', name: 'Papas Rellenas' },
          { id: 'prod-1', name: 'Hamburguesa Especial' }, // repetido intencional para verificar deduplicación
        ]),
      };

      rawMaterialRepo.findOne?.mockResolvedValue({ id: 'mat-1', tenantId: 'tenant-123' });
      recipeItemRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.checkUsage('tenant-123', 'mat-1');

      expect(result.inUse).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(result.products.map(p => p.id)).toEqual(['prod-1', 'prod-2']);
    });

    it('debe retornar inUse: false si ningún producto usa el insumo', async () => {
      const qbMock: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      rawMaterialRepo.findOne?.mockResolvedValue({ id: 'mat-2', tenantId: 'tenant-123' });
      recipeItemRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.checkUsage('tenant-123', 'mat-2');

      expect(result.inUse).toBe(false);
      expect(result.products).toHaveLength(0);
    });
  });

  describe('archive', () => {
    it('debe archivar fijando isActive: false sin remover recetas si removeFromRecipes es false o undefined', async () => {
      const mockMaterial = { id: 'mat-1', tenantId: 'tenant-123', isActive: true, name: 'Harina' };
      rawMaterialRepo.findOne?.mockResolvedValue(mockMaterial);

      const result = await service.archive('tenant-123', 'mat-1', { removeFromRecipes: false });

      expect(mockManager.save).toHaveBeenCalledWith(
        RawMaterial,
        expect.objectContaining({ id: 'mat-1', isActive: false }),
      );
      expect(result.isActive).toBe(false);
    });

    it('debe eliminar las entradas en RecipeItem y fijar isActive: false cuando removeFromRecipes === true', async () => {
      const mockMaterial = { id: 'mat-1', tenantId: 'tenant-123', isActive: true, name: 'Harina' };
      rawMaterialRepo.findOne?.mockResolvedValue(mockMaterial);

      const qbDeleteMock: any = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      mockManager.createQueryBuilder.mockReturnValue(qbDeleteMock);

      const result = await service.archive('tenant-123', 'mat-1', { removeFromRecipes: true });

      expect(qbDeleteMock.where).toHaveBeenCalledWith(
        'rawMaterialId = :id',
        { id: 'mat-1' },
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        RawMaterial,
        expect.objectContaining({ id: 'mat-1', isActive: false }),
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe('findArchived', () => {
    it('solo debe retornar registros con isActive: false', async () => {
      const archivedList = [
        { id: 'mat-archived-1', tenantId: 'tenant-123', isActive: false, name: 'Tomate Vencido' },
        { id: 'mat-archived-2', tenantId: 'tenant-123', isActive: false, name: 'Salsa Antigua' },
      ];
      rawMaterialRepo.find?.mockResolvedValue(archivedList);

      const result = await service.findArchived('tenant-123');

      expect(rawMaterialRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123', isActive: false },
        relations: { movements: true },
        order: { updatedAt: 'DESC' },
      });
      expect(result).toEqual(archivedList);
      expect(result.every((m: any) => m.isActive === false)).toBe(true);
    });
  });

  describe('unarchive', () => {
    it('debe restaurar el insumo fijando isActive: true y retornar { success: true, material }', async () => {
      const mockMaterial = { id: 'mat-archived-1', tenantId: 'tenant-123', isActive: false, name: 'Queso' };
      rawMaterialRepo.findOne?.mockResolvedValue(mockMaterial);
      rawMaterialRepo.save?.mockImplementation(async (mat: any) => mat);

      const result = await service.unarchive('tenant-123', 'mat-archived-1');

      expect(rawMaterialRepo.findOne).toHaveBeenCalledWith({ where: { tenantId: 'tenant-123', id: 'mat-archived-1' } });
      expect(mockMaterial.isActive).toBe(true);
      expect(rawMaterialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
      expect(result).toEqual({
        success: true,
        material: expect.objectContaining({ isActive: true }),
      });
    });
  });

  describe('restock - Abastecimiento y Recálculo de Costo Promedio Ponderado (WAC)', () => {
    it('debe arrojar BadRequestException si la cantidad es menor o igual a 0', async () => {
      await expect(
        service.restock('tenant-1', 'mat-1', { quantity: 0, totalCost: 50 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.restock('tenant-1', 'mat-1', { quantity: -5, totalCost: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe arrojar BadRequestException si el costo total es negativo', async () => {
      await expect(
        service.restock('tenant-1', 'mat-1', { quantity: 10, totalCost: -10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe arrojar NotFoundException si el insumo no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.restock('tenant-1', 'mat-inexistente', { quantity: 5, totalCost: 20 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe recalcular correctamente el costo promedio ponderado y registrar el movimiento IN_PURCHASE', async () => {
      // Estado inicial: 10 unidades a $2.00 cada una (valor en libros = $20.00)
      const existingMaterial = {
        id: 'mat-harina',
        tenantId: 'tenant-1',
        name: 'Harina de Trigo',
        stockQuantity: 10,
        costPerUnit: 2.0,
      };
      mockManager.findOne.mockResolvedValue(existingMaterial);

      // Nueva compra: 10 unidades por un costo total de $40.00 ($4.00 c/u)
      // Total combinado: 20 unidades por $60.00 -> Nuevo costo unitario promedio = $3.00 c/u
      const result = await service.restock('tenant-1', 'mat-harina', {
        quantity: 10,
        totalCost: 40.0,
      });

      expect(result.stockQuantity).toBe(20);
      expect(result.costPerUnit).toBe(3.0);
      expect(mockManager.save).toHaveBeenCalledWith(RawMaterial, expect.objectContaining({
        stockQuantity: 20,
        costPerUnit: 3.0,
      }));

      expect(mockManager.create).toHaveBeenCalledWith(StockMovement, expect.objectContaining({
        tenantId: 'tenant-1',
        rawMaterialId: 'mat-harina',
        type: MovementType.IN_PURCHASE,
        quantity: 10,
        totalCost: 40.0,
      }));
    });
  });

  describe('registerLoss - Registro de Mermas y Desperdicios', () => {
    it('debe arrojar BadRequestException si la cantidad a mermar es menor o igual a 0', async () => {
      await expect(
        service.registerLoss('tenant-1', 'mat-1', { quantity: 0, reason: 'Dañado' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe arrojar NotFoundException si el insumo no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.registerLoss('tenant-1', 'mat-inexistente', { quantity: 2, reason: 'Vencido' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe arrojar BadRequestException si el stock actual es insuficiente para la merma solicitada', async () => {
      const existingMaterial = {
        id: 'mat-tomate',
        tenantId: 'tenant-1',
        name: 'Tomate',
        stockQuantity: 5,
        costPerUnit: 1.5,
      };
      mockManager.findOne.mockResolvedValue(existingMaterial);

      await expect(
        service.registerLoss('tenant-1', 'mat-tomate', { quantity: 10, reason: 'Dañado por lluvia' }),
      ).rejects.toThrow('Stock insuficiente para la merma solicitada');
    });

    it('debe descontar el stock restante y crear el movimiento de tipo LOSS con el valor del costo de la pérdida', async () => {
      // Stock inicial: 10 unidades a $2.50 c/u
      const existingMaterial = {
        id: 'mat-leche',
        tenantId: 'tenant-1',
        name: 'Leche Pasteurizada',
        stockQuantity: 10,
        costPerUnit: 2.5,
      };
      mockManager.findOne.mockResolvedValue(existingMaterial);

      // Registrar merma de 4 unidades:
      // Stock resultante: 10 - 4 = 6
      // Pérdida total monetaria: 4 * $2.50 = $10.00
      const result = await service.registerLoss('tenant-1', 'mat-leche', {
        quantity: 4,
        reason: 'Empaque roto en almacén',
      });

      expect(result.stockQuantity).toBe(6);
      expect(mockManager.save).toHaveBeenCalledWith(RawMaterial, expect.objectContaining({
        stockQuantity: 6,
      }));

      expect(mockManager.create).toHaveBeenCalledWith(StockMovement, expect.objectContaining({
        tenantId: 'tenant-1',
        rawMaterialId: 'mat-leche',
        type: MovementType.LOSS,
        quantity: 4,
        totalCost: 10.0,
        description: 'Merma/Pérdida: Empaque roto en almacén',
      }));
    });
  });
});
