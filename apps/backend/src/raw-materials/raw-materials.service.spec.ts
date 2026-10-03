import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RawMaterialsService } from './raw-materials.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { RecipeItem } from '../entities/recipe-item.entity';

describe('RawMaterialsService', () => {
  let service: RawMaterialsService;
  let rawMaterialRepo: Partial<Record<keyof Repository<RawMaterial>, jest.Mock>>;
  let stockMovementRepo: Partial<Record<keyof Repository<StockMovement>, jest.Mock>>;
  let dataSource: any;

  beforeEach(async () => {
    rawMaterialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    stockMovementRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          save: jest.fn((entityClass: any, entity: any) => Promise.resolve(entity)),
          createQueryBuilder: jest.fn(),
        };
        return cb(manager);
      }),
      getRepository: jest.fn(),
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

      const recipeRepoMock = {
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      };
      dataSource.getRepository.mockReturnValue(recipeRepoMock);

      const result = await service.checkUsage('tenant-123', 'mat-1');

      expect(dataSource.getRepository).toHaveBeenCalledWith(RecipeItem);
      expect(qbMock.where).toHaveBeenCalledWith('ri.rawMaterialId = :id', { id: 'mat-1' });
      expect(result.inUse).toBe(true);
      expect(result.count).toBe(2);
      expect(result.products).toEqual([
        { id: 'prod-1', name: 'Hamburguesa Especial' },
        { id: 'prod-2', name: 'Papas Rellenas' },
      ]);
    });

    it('debe retornar inUse: false si ningún producto usa el insumo', async () => {
      const qbMock: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      dataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      });

      const result = await service.checkUsage('tenant-123', 'mat-sin-uso');

      expect(result.inUse).toBe(false);
      expect(result.count).toBe(0);
      expect(result.products).toEqual([]);
    });
  });

  describe('archive', () => {
    it('debe archivar fijando isActive: false sin remover recetas si removeFromRecipes es false o undefined', async () => {
      const mockMaterial = { id: 'mat-1', tenantId: 'tenant-123', isActive: true, name: 'Harina' };
      rawMaterialRepo.findOne?.mockResolvedValue(mockMaterial);

      const deleteQbMock = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      let managerPassed: any;
      dataSource.transaction = jest.fn(async (cb: any) => {
        managerPassed = {
          save: jest.fn((entityClass: any, entity: any) => Promise.resolve(entity)),
          createQueryBuilder: jest.fn().mockReturnValue(deleteQbMock),
        };
        return cb(managerPassed);
      });

      const result = await service.archive('tenant-123', 'mat-1');

      expect(rawMaterialRepo.findOne).toHaveBeenCalledWith({ where: { tenantId: 'tenant-123', id: 'mat-1' } });
      expect(deleteQbMock.delete).not.toHaveBeenCalled();
      expect(result.isActive).toBe(false);
      expect(managerPassed.save).toHaveBeenCalledWith(RawMaterial, expect.objectContaining({ isActive: false }));
    });

    it('debe eliminar las entradas en RecipeItem y fijar isActive: false cuando removeFromRecipes === true', async () => {
      const mockMaterial = { id: 'mat-1', tenantId: 'tenant-123', isActive: true, name: 'Harina' };
      rawMaterialRepo.findOne?.mockResolvedValue(mockMaterial);

      const deleteQbMock = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      let managerPassed: any;
      dataSource.transaction = jest.fn(async (cb: any) => {
        managerPassed = {
          save: jest.fn((entityClass: any, entity: any) => Promise.resolve(entity)),
          createQueryBuilder: jest.fn().mockReturnValue(deleteQbMock),
        };
        return cb(managerPassed);
      });

      const result = await service.archive('tenant-123', 'mat-1', { removeFromRecipes: true });

      expect(deleteQbMock.delete).toHaveBeenCalled();
      expect(deleteQbMock.from).toHaveBeenCalledWith(RecipeItem);
      expect(deleteQbMock.where).toHaveBeenCalledWith('rawMaterialId = :id', { id: 'mat-1' });
      expect(deleteQbMock.execute).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
      expect(managerPassed.save).toHaveBeenCalledWith(RawMaterial, expect.objectContaining({ isActive: false }));
    });
  });

  describe('findArchived', () => {
    it('solo debe retornar registros con isActive: false', async () => {
      const archivedList = [
        { id: 'mat-archived-1', name: 'Queso Viejo', isActive: false },
        { id: 'mat-archived-2', name: 'Salsa Descontinuada', isActive: false },
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
});
