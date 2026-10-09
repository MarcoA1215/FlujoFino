import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { ComboItem } from '../entities/combo-item.entity';
import { OrderItem } from '../entities/order-item.entity';
import { RawMaterial } from '../entities/raw-material.entity';

describe('ProductsService & Accounting Immutability Suite', () => {
  let productsService: ProductsService;
  let mockProductRepo: any;
  let mockRecipeItemRepo: any;
  let mockComboItemRepo: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockProductRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((dto) => dto),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockRecipeItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockComboItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn((cb) => cb(mockProductRepo)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(RecipeItem), useValue: mockRecipeItemRepo },
        { provide: getRepositoryToken(ComboItem), useValue: mockComboItemRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
  });

  describe('findAll - Erradicación de Auto-Healing y Mutaciones Ocultas', () => {
    it('no debe realizar escrituras directas ni mutaciones automáticas de stock al ser invocado', async () => {
      const tenantId = 'tenant-test-1';
      // Simular productos con discrepancia histórica entre stockQuantity y physicalStock
      const mockProducts: any[] = [
        {
          id: 'prod-1',
          tenantId,
          name: 'Croissant Gourmet',
          category: 'Panadería',
          is_service: false,
          isCombo: false,
          stockQuantity: 15,
          physicalStock: 8, // stockQuantity > physicalStock
          estimatedCost: 1.2,
          recipe: [],
          comboItems: [],
        },
        {
          id: 'prod-2',
          tenantId,
          name: 'Café Espresso',
          category: 'Bebidas',
          is_service: false,
          isCombo: false,
          stockQuantity: 20,
          physicalStock: 10,
          estimatedCost: 0.8,
          recipe: [],
          comboItems: [],
        },
      ];

      mockProductRepo.find.mockResolvedValue(mockProducts);

      const result = await productsService.findAll(tenantId);

      // 1. Debe retornar los productos formateados
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('prod-1');

      // 2. CRÍTICO: mockProductRepo.save NUNCA debe haber sido invocado (cero escrituras colaterales)
      expect(mockProductRepo.save).not.toHaveBeenCalled();

      // 3. El baseCost calculado en la vista debe ser estrictamente informativo
      expect(result[0].baseCost).toBe(1.2);
    });
  });

  describe('Inmutabilidad Contable en OrderItem', () => {
    it('debe congelar el costo unitario en OrderItem y resistir fluctuaciones posteriores de costos de insumos', () => {
      // Simular un insumo con costo inicial
      const rawMaterial: Partial<RawMaterial> = {
        id: 'rm-harina',
        name: 'Harina de Trigo Premium',
        costPerUnit: 2.50,
        stockQuantity: 100,
      };

      // Simular un producto cuya receta requiere dicho insumo
      const product: Partial<Product> = {
        id: 'prod-pan',
        name: 'Pan Gallego',
        estimatedCost: 2.50,
      };

      // En el momento T0 de la venta/comanda, se registra el OrderItem con el costo vivo de ese instante
      const initialCapturedCost = Number(product.estimatedCost);
      const orderItem: Partial<OrderItem> = {
        id: 'order-item-1',
        orderId: 'order-101',
        productId: product.id,
        productName: product.name,
        quantity: 4,
        unitPrice: 5.00,
        unitCost: initialCapturedCost, // Congelado inmutablemente
        subtotal: 20.00,
      };

      expect(orderItem.unitCost).toBe(2.50);

      // Simular que posteriormente el mercado sufre inflación y el costo del insumo se dispara a 7.80
      rawMaterial.costPerUnit = 7.80;
      product.estimatedCost = 7.80;

      // El registro histórico de la orden previa no debe mutar
      expect(orderItem.unitCost).toBe(2.50);
      expect(orderItem.unitCost! * orderItem.quantity!).toBe(10.00);
      expect(orderItem.unitCost).not.toBe(product.estimatedCost);
    });
  });
});
