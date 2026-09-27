import { OrdersService } from '../orders/orders.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { MovementType } from '@nutrideli/shared-types';
import { StockMovement } from '../entities/stock-movement.entity';

@Injectable()
export class ProductionService {
  constructor(
    private ordersService: OrdersService,
    private dataSource: DataSource) {}

  async createBatch(tenantId: string, productId: string, quantityToProduce: number) {
    if (quantityToProduce <= 0) throw new BadRequestException('La cantidad a producir debe ser mayor a cero');
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { tenantId, id: productId },
        relations: { recipe: { rawMaterial: true }, comboItems: { component: true } },
      });

      if (!product) throw new BadRequestException('Producto no encontrado');

      let totalBatchCost = 0;

      if (product.isCombo) {
        if (!product.isPreAssembled) {
          throw new BadRequestException('No se puede producir un combo virtual. Marque el combo como Pre-ensamblado.');
        }
        if (!product.comboItems || product.comboItems.length === 0) {
          throw new BadRequestException('El combo no tiene componentes configurados.');
        }

        // 1. Validar stock de componentes
        const missing: string[] = [];
        for (const ci of product.comboItems) {
          const required = ci.quantity * quantityToProduce;
          if (!ci.component) continue;
          if (ci.component.physicalStock < required) {
            missing.push(`${ci.component.name} (Faltan ${required - ci.component.physicalStock})`);
          }
        }
        if (missing.length > 0) {
          throw new BadRequestException('Stock físico insuficiente de componentes: ' + missing.join(', '));
        }

        // 2. Descontar componentes
        for (const ci of product.comboItems) {
          const required = ci.quantity * quantityToProduce;
          if (!ci.component) continue;

          ci.component.physicalStock -= required;
          ci.component.stockQuantity -= required;
          await manager.save(Product, ci.component);

          totalBatchCost += required * (0);
        }
      } else {
        if (!product.recipe || product.recipe.length === 0) {
          throw new BadRequestException('El producto no tiene receta configurada.');
        }

        // 1. Validar stock de Materia Prima
        const missing: string[] = [];
        for (const recipeItem of product.recipe) {
          const requiredAmount = recipeItem.quantity * quantityToProduce;
          const material = recipeItem.rawMaterial;

          if (!material || material.stockQuantity < requiredAmount) {
            missing.push(material?.name || 'Desconocido');
          }
        }

        if (missing.length > 0) {
          if (missing.length === 1) {
            throw new BadRequestException(`Insumo insuficiente: ${missing[0]}`);
          } else {
            throw new BadRequestException(`Faltan ${missing.length} insumos para fabricar este lote.`);
          }
        }

        // 2. Descontar stock y registrar movimientos
        for (const recipeItem of product.recipe) {
          const requiredAmount = recipeItem.quantity * quantityToProduce;
          const material = recipeItem.rawMaterial;

          const materialCostUsed = requiredAmount * material.costPerUnit;
          totalBatchCost += materialCostUsed;

          // Descontar
          material.stockQuantity -= requiredAmount;
          await manager.save(RawMaterial, material);

          // Registrar movimiento OUT
          const movement = manager.create(StockMovement, { tenantId,
            rawMaterialId: material.id,
            type: MovementType.OUT_PRODUCTION,
            quantity: requiredAmount,
            totalCost: materialCostUsed,
            description: `Producción de Lote: ${product.name} (x${quantityToProduce})`,
          });
          await manager.save(StockMovement, movement);
        }
      }

      // 3. Incrementar el stock de Producto Terminado
      product.stockQuantity += quantityToProduce;
      product.physicalStock += quantityToProduce; // Ensure physical stock increases too
      const updatedProduct = await manager.save(Product, product);

      // 4. Registrar el lote
      const batch = manager.create(ProductionBatch, { tenantId,
        productId,
        quantity: quantityToProduce,
        totalCost: totalBatchCost
      });
      await manager.save(ProductionBatch, batch);

      await this.ordersService.autoAllocatePhysicalStock(tenantId);

      return {
        product: updatedProduct,
        batch
      };
    });
  }

  async getBatches(tenantId: string) {
    return this.dataSource.getRepository(ProductionBatch).find({ where: { tenantId }, relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revertBatch(tenantId: string, batchId: string) {
    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(ProductionBatch, { 
        where: { tenantId, id: batchId },
      });
      if (!batch) throw new BadRequestException('Lote no encontrado');

      const product = await manager.findOne(Product, { 
        where: { tenantId, id: batch.productId },
        relations: { recipe: { rawMaterial: true }, comboItems: { component: true } }
      });
      if (!product) throw new BadRequestException('Producto asociado no encontrado');

      if (product.physicalStock < batch.quantity) {
        throw new BadRequestException(`No se puede revertir este lote porque el stock físico actual (${product.physicalStock}) es menor a la cantidad del lote (${batch.quantity}). Esto significa que los productos de este lote ya fueron entregados a clientes.`);
      }

      product.stockQuantity -= batch.quantity;
      product.physicalStock -= batch.quantity;
      await manager.save(Product, product);

      if (product.isCombo && product.isPreAssembled) {
        if (product.comboItems && product.comboItems.length > 0) {
          for (const ci of product.comboItems) {
            if (ci.component) {
              ci.component.physicalStock += ci.quantity * batch.quantity;
              ci.component.stockQuantity += ci.quantity * batch.quantity;
              await manager.save(Product, ci.component);
            }
          }
        }
      } else {
        if (product.recipe && product.recipe.length > 0) {
          for (const ri of product.recipe) {
            if (ri.rawMaterial) {
              const returnedAmount = ri.quantity * batch.quantity;
              ri.rawMaterial.stockQuantity += returnedAmount;
              await manager.save(RawMaterial, ri.rawMaterial);
              
              const mov = manager.create(StockMovement, { tenantId,
                rawMaterialId: ri.rawMaterial.id,
                type: MovementType.IN,
                quantity: returnedAmount,
                totalCost: returnedAmount * ri.rawMaterial.costPerUnit,
                description: `Reverso de Lote: ${product.name} (x${batch.quantity})`
              });
              await manager.save(StockMovement, mov);
            }
          }
        }
      }

      await manager.remove(ProductionBatch, batch);
      await this.ordersService.autoAllocatePhysicalStock(tenantId);
      return { success: true, message: 'Lote revertido correctamente' };
    });
  }
}
