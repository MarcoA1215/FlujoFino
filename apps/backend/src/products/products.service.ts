import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RegisterLossDto } from '../raw-materials/dto/register-loss.dto';
import { MovementType } from '@nutrideli/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';

import { ComboItem } from '../entities/combo-item.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(RecipeItem)
    private recipeItemRepo: Repository<RecipeItem>,
    @InjectRepository(ComboItem)
    private comboItemRepo: Repository<ComboItem>,
    private dataSource: DataSource,
  ) {}

  async findAll(tenantId: string) {
    const products = await this.productRepo.find({ where: { tenantId }, relations: {
        comboItems: { component: { recipe: { rawMaterial: true } } },
        recipe: { rawMaterial: true }
      }
    });

    return products.map(p => {
      let finalStock = p.stockQuantity;
      let finalPhysical = p.physicalStock;

      if (p.comboItems && p.comboItems.length > 0 && !p.isPreAssembled) {
        let minAvail = Infinity;
        let minPhys = Infinity;
        for (const ci of p.comboItems) {
          const availFromComp = Math.floor((ci.component?.stockQuantity || 0) / ci.quantity);
          const physFromComp = Math.floor((ci.component?.physicalStock || 0) / ci.quantity);
          if (availFromComp < minAvail) minAvail = availFromComp;
          if (physFromComp < minPhys) minPhys = physFromComp;
        }
        finalStock = minAvail === Infinity ? 0 : minAvail;
        finalPhysical = minPhys === Infinity ? 0 : minPhys;
      }

      const cleanedComboItems = p.comboItems?.map(ci => ({
        id: ci.id,
        componentId: ci.componentId,
        quantity: ci.quantity
      })) || [];

      let baseCost = 0;
      if (p.isCombo && !p.isPreAssembled && p.comboItems) {
        for (const ci of p.comboItems) {
           if (ci.component && ci.component.recipe) {
             for (const ri of ci.component.recipe) {
               if (ri.rawMaterial) baseCost += ri.quantity * ri.rawMaterial.costPerUnit * ci.quantity;
             }
           }
        }
      }
      if (p.recipe && p.recipe.length > 0) {
        for (const ri of p.recipe) {
           if (ri.rawMaterial) baseCost += ri.quantity * ri.rawMaterial.costPerUnit;
        }
      }

      return {
        ...p,
        baseCost,
        stockQuantity: finalStock,
        physicalStock: finalPhysical,
        comboItems: cleanedComboItems
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.productRepo.findOne({ where: { tenantId, id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const product = this.productRepo.create({ ...dto, tenantId });
    return this.productRepo.save(product);
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.dataSource.transaction(async (manager) => {
      const oldProduct = await manager.findOne(Product, { where: { tenantId, id }, relations: { comboItems: { component: true } } });
      const product = await manager.findOne(Product, { where: { tenantId, id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Check if transitioning from PreAssembled to Virtual
      if (oldProduct && oldProduct.isPreAssembled && dto.isPreAssembled === false) {
        if (oldProduct.physicalStock > 0 || oldProduct.stockQuantity > 0) {
          // Unpack the inventory back to components
          if (oldProduct.comboItems && oldProduct.comboItems.length > 0) {
            for (const ci of oldProduct.comboItems) {
              if (ci.component) {
                if (oldProduct.physicalStock > 0) {
                  ci.component.physicalStock += ci.quantity * oldProduct.physicalStock;
                }
                if (oldProduct.stockQuantity > 0) {
                  ci.component.stockQuantity += ci.quantity * oldProduct.stockQuantity;
                }
                await manager.save(Product, ci.component);
              }
            }
          }
          product.physicalStock = 0;
          product.stockQuantity = 0;
        }
      }

      Object.assign(product, dto);
      return manager.save(Product, product);
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // verifica que exista
    await this.productRepo.softDelete({ tenantId, id });
    return { success: true };
  }

  
  async unpackKit(tenantId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { 
        where: { tenantId, id },
        relations: { comboItems: { component: true } }
      });
      
      if (!product) throw new NotFoundException('Producto no encontrado');
      if (!product.isCombo || !product.isPreAssembled) {
        throw new BadRequestException('Solo se pueden desarmar combos físicos (pre-ensamblados)');
      }
      if (product.physicalStock < 1 || product.stockQuantity < 1) {
        throw new BadRequestException('No hay stock físico de este kit para desarmar');
      }

      // Restar 1 al combo
      product.physicalStock -= 1;
      product.stockQuantity -= 1;
      await manager.save(Product, product);

      // Devolver componentes
      if (product.comboItems && product.comboItems.length > 0) {
        for (const ci of product.comboItems) {
          if (ci.component) {
            ci.component.physicalStock += ci.quantity;
            ci.component.stockQuantity += ci.quantity;
            await manager.save(Product, ci.component);
          }
        }
      }

      return { success: true, message: 'Kit desarmado correctamente' };
    });
  }

  async getRecipeAndCost(tenantId: string, id: string) {
    const items = await this.recipeItemRepo.find({
      where: { product: { tenantId, id } },
      relations: { rawMaterial: true }
    });
    
    const comboItems = await this.comboItemRepo.find({
      where: { combo: { tenantId, id } },
      relations: { component: true }
    });

    let totalCost = 0;
    const formattedRecipeItems = items.map(item => {
      const itemCost = item.quantity * (item.rawMaterial?.costPerUnit || 0);
      totalCost += itemCost;
      return {
        id: item.id,
        rawMaterialId: item.rawMaterial.id,
        rawMaterialName: item.rawMaterial.name,
        unit: item.rawMaterial.unit,
        quantity: item.quantity,
        costPerUnit: item.rawMaterial.costPerUnit,
        totalItemCost: itemCost
      };
    });
    
    // Calcular los costos de los sub-productos (recursivo)
    const formattedComboItems = await Promise.all(comboItems.map(async item => {
      // Obtenemos el costo base del componente
      const componentData = await this.getRecipeAndCost(tenantId, item.componentId);
      const itemCost = item.quantity * componentData.totalRecipeCost;
      totalCost += itemCost;

      return {
        id: item.id,
        componentId: item.componentId,
        componentName: item.component?.name,
        quantity: item.quantity,
        unitCost: componentData.totalRecipeCost,
        totalItemCost: itemCost
      };
    }));

    return {
      items: formattedRecipeItems,
      comboItems: formattedComboItems,
      totalRecipeCost: totalCost
    };
  }

  async updateCombo(tenantId: string, id: string, dto: any) {
    return this.dataSource.transaction(async (manager) => {
      const oldProduct = await manager.findOne(Product, { where: { tenantId, id }, relations: { comboItems: { component: true } } });
      const product = await manager.findOne(Product, { where: { tenantId, id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Validaciones de seguridad
      for (const item of dto.comboItems) {
        if (item.componentId === id) {
          throw new BadRequestException('Un producto no puede ser componente de sí mismo');
        }
        const component = await manager.findOne(Product, { where: { tenantId, id: item.componentId } });
        if (component?.isCombo) {
          throw new BadRequestException('No se pueden agregar combos dentro de otros combos');
        }
      }

      // Eliminar combo viejo
      await manager.delete(ComboItem, { comboId: id });

      // Insertar combo nuevo
      const newItems = dto.comboItems.map((item: any) => {
        return manager.create(ComboItem, { tenantId,
          combo: product,
          component: { id: item.componentId } as Product,
          quantity: item.quantity
        });
      });

      if (newItems.length > 0) {
        await manager.save(ComboItem, newItems);
      }
      return { success: true };
    });
  }

  async updateRecipe(tenantId: string, id: string, dto: UpdateRecipeDto) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { tenantId, id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Eliminar receta vieja
      await manager.delete(RecipeItem, { product: { id } });

      // Insertar receta nueva
      const newItems = dto.items.map(item => {
        return manager.create(RecipeItem, { tenantId,
          product: product,
          rawMaterial: { id: item.rawMaterialId } as RawMaterial,
          quantity: item.quantity
        });
      });

      if (newItems.length > 0) {
        await manager.save(RecipeItem, newItems);
      }
      return { success: true };
    });
  }

  async registerLoss(tenantId: string, id: string, dto: RegisterLossDto) {
    // Para simplificar, en Producto podemos restar directo el stock y opcionalmente guardar en una tabla 'ProductStockMovement'.
    // Como Fase 2, descontamos stock. 
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { tenantId, id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      if (product.stockQuantity < dto.quantity) {
        throw new BadRequestException('Stock insuficiente para la merma solicitada');
      }

      product.stockQuantity -= dto.quantity;
      await manager.save(Product, product);

      // Si hubiéramos creado una tabla de ProductStockMovement la registraríamos aquí.
      // Por ahora la pérdida se anota actualizando el stock.

    });
  }

  async adjustStock(tenantId: string, id: string, quantity: number) {
    const product = await this.findOne(tenantId, id);
    product.stockQuantity += quantity;
    return this.productRepo.save(product);
  }

  async migratePhysicalStock(tenantId: string) {
    const reservedDirect = await this.dataSource.query(`
      SELECT i."productId", SUM(i.quantity) as reserved
      FROM order_item i
      JOIN "order" o ON o.id = i."orderId"
      WHERE o.status IN ('PENDING', 'PREPARING') AND o."tenantId" = $1
      GROUP BY i."productId"
    `, [tenantId]);
    
    const reservedCombos = await this.dataSource.query(`
      SELECT ci."componentId" as "productId", SUM(i.quantity * ci.quantity) as reserved
      FROM order_item i
      JOIN "order" o ON o.id = i."orderId"
      JOIN combo_item ci ON ci."comboId" = i."productId"
      WHERE o.status IN ('PENDING', 'PREPARING') AND o."tenantId" = $1
      GROUP BY ci."componentId"
    `, [tenantId]);

    const reservedMap: Record<string, number> = {};
    for (const row of reservedDirect) {
      reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
    }
    for (const row of reservedCombos) {
      reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
    }

    const products = await this.productRepo.find({ where: { tenantId } });
    for (const p of products) {
      const reserved = reservedMap[p.id] || 0;
      p.physicalStock = p.stockQuantity + reserved;
      await this.productRepo.save(p);
    }
    return { success: true, migratedCount: products.length };
  }

}
