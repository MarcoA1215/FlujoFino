import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProductionService } from './production.service';
import { OrdersService } from '../orders/orders.service';
import { ScaledMath } from '../common/utils/scaled-math';

describe('Production Concurrency & Exact Arithmetic Suite', () => {
  let service: ProductionService;
  let mockOrdersService: any;

  beforeEach(async () => {
    mockOrdersService = {
      autoAllocatePhysicalStock: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('Concurrencia y Bloqueos Pesimistas (Pessimistic Locking)', () => {
    it('debe encolar transacciones concurrentes mediante bloqueo pesimista impidiendo Lost Updates', async () => {
      const tenantId = 'tenant-test';
      const productId = 'prod-burger-supreme';

      // Simular componente compartido con stock inicial de 10 unidades
      const sharedComponent: any = {
        id: 'comp-meat',
        tenantId,
        name: 'Carne Angus',
        cost: 3.5,
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
        stockQuantity: 0,
        physicalStock: 0,
        stock: 0,
        comboItems: [
          { quantity: 2, component: sharedComponent, componentId: sharedComponent.id },
        ],
      };

      // Simular base de datos con Mutex/Lock pesimista encolando transacciones
      let dbLockAcquired = false;
      const lockAcquisitionQueue: number[] = [];

      const createMockTransactionManager = (txId: number) => {
        return {
          createQueryBuilder: jest.fn((entityClass: any, alias: string) => {
            return {
              setLock: jest.fn(function (lockMode: string) {
                expect(lockMode).toBe('pessimistic_write');
                return this;
              }),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn(async () => {
                // Simular que solo una transacción obtiene el lock a la vez
                while (dbLockAcquired) {
                  await new Promise((r) => setTimeout(r, 10));
                }
                dbLockAcquired = true;
                lockAcquisitionQueue.push(txId);
                return comboProduct;
              }),
              getMany: jest.fn(async () => [sharedComponent]),
            };
          }),
          findOne: jest.fn(async () => comboProduct),
          save: jest.fn(async (entityClassOrEntity: any, entity?: any) => {
            const target = entity || entityClassOrEntity;
            return target;
          }),
          create: jest.fn((cls: any, data: any) => ({ ...data, id: `batch-${txId}` })),
        };
      };

      let txCounter = 0;
      const mockDataSource = {
        transaction: jest.fn(async (cb: any) => {
          const currentTxId = ++txCounter;
          const manager = createMockTransactionManager(currentTxId);
          try {
            const res = await cb(manager);
            return res;
          } finally {
            dbLockAcquired = false; // Liberar lock al finalizar commit
          }
        }),
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

      // Disparar dos peticiones concurrentes simultáneas para producir 2 combos cada una (2 * 2 = 4 carnes cada una)
      const [res1, res2] = await Promise.all([
        service.createBatch(tenantId, productId, 2),
        service.createBatch(tenantId, productId, 2),
      ]);

      expect(res1).toBeDefined();
      expect(res2).toBeDefined();

      // Las transacciones se encolaron ordenadamente sin solapamiento
      expect(lockAcquisitionQueue).toEqual([1, 2]);

      // Stock consumido: 10 - 4 - 4 = 2 unidades restantes (NO hubo Lost Update a 6)
      expect(sharedComponent.physicalStock).toBe(2);
      expect(sharedComponent.stockQuantity).toBe(2);

      // Producto final producido: 2 + 2 = 4 unidades
      expect(comboProduct.stockQuantity).toBe(4);
    });
  });

  describe('Precisión Aritmética Exacta ScaledMath', () => {
    it('debe acumular costos secuenciales sin anomalías binarias de punto flotante IEEE 754', async () => {
      const tenantId = 'tenant-test';
      const productId = 'prod-quimico-alta-precision';

      // 0.1 + 0.2 en JS estándar produce 0.30000000000000004
      // Usaremos insumos con cantidades fraccionarias y costos decimales sensibles
      const rawMat1: any = {
        id: 'rm-1',
        name: 'Esencia A',
        costPerUnit: 0.1, // 0.1
        stockQuantity: 100,
      };

      const rawMat2: any = {
        id: 'rm-2',
        name: 'Esencia B',
        costPerUnit: 0.2, // 0.2
        stockQuantity: 100,
      };

      const rawMat3: any = {
        id: 'rm-3',
        name: 'Reactivo C',
        costPerUnit: 1.0005,
        stockQuantity: 100,
      };

      const product: any = {
        id: productId,
        tenantId,
        name: 'Solución Especial',
        isCombo: false,
        stockQuantity: 0,
        physicalStock: 0,
        recipe: [
          { quantity: 1, rawMaterial: rawMat1, rawMaterialId: rawMat1.id },
          { quantity: 1, rawMaterial: rawMat2, rawMaterialId: rawMat2.id },
          { quantity: 2, rawMaterial: rawMat3, rawMaterialId: rawMat3.id }, // 2 * 1.0005 = 2.001
        ],
      };

      const mockManager = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(product),
          getMany: jest.fn().mockResolvedValue([rawMat1, rawMat2, rawMat3]),
        })),
        findOne: jest.fn().mockResolvedValue(product),
        save: jest.fn(async (entityClassOrEntity: any, entity?: any) => entity || entityClassOrEntity),
        create: jest.fn((cls: any, data: any) => ({ ...data, id: 'batch-precise' })),
      };

      const mockDataSource = {
        transaction: jest.fn(async (cb: any) => cb(mockManager)),
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

      // Producir 3 unidades del lote
      // Costo por unidad: 0.1 + 0.2 + (2 * 1.0005) = 0.3 + 2.001 = 2.301
      // Costo total para 3 unidades: 2.301 * 3 = 6.903 EXACTO
      const result = await service.createBatch(tenantId, productId, 3);

      expect(result.batch.totalCost).toBe(6.903);
      // Validar que no hay dígitos basura de flotante
      expect(result.batch.totalCost.toString()).toBe('6.903');
    });

    it('ScaledMath debe calcular sumas, restas, multiplicaciones y divisiones enteras escaladas con cero drift', () => {
      // Test unitario directo de la clase ScaledMath
      const a = 0.1;
      const b = 0.2;
      // Nativo: 0.1 + 0.2 !== 0.3
      expect(a + b).not.toBe(0.3);

      // Con ScaledMath:
      const scaledSum = ScaledMath.addNum(a, b);
      expect(scaledSum).toBe(0.3);

      // Multiplicación exacta
      const mulResult = ScaledMath.mulNum(0.123456, 3);
      expect(mulResult).toBe(0.370368);

      // División exacta
      const divResult = ScaledMath.divNum(10, 4);
      expect(divResult).toBe(2.5);
    });
  });
});
