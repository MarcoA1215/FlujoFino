import { OrdersService } from '../orders/orders.service';
﻿import { Injectable, BadRequestException } from '@nestjs/common';
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

  async createBatch(productId: string, quantityToProduce: number) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { recipe: { rawMaterial: true } },
      });

      if (!product) throw new BadRequestException('Producto no encontrado');
      if (!product.recipe || product.recipe.length === 0) {
        throw new BadRequestException('El producto no tiene receta configurada.');
      }

      let totalBatchCost = 0;

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
        const movement = manager.create(StockMovement, {
          rawMaterialId: material.id,
          type: MovementType.OUT_PRODUCTION,
          quantity: requiredAmount,
          totalCost: materialCostUsed,
          description: `ProducciÃ³n de Lote: ${product.name} (x${quantityToProduce})`,
        });
        await manager.save(StockMovement, movement);
      }

      // 2. Incrementar el stock de Producto Terminado
      product.stockQuantity += quantityToProduce;
      const updatedProduct = await manager.save(Product, product);

      // 3. Registrar el lote
      const batch = manager.create(ProductionBatch, {
        productId,
        quantity: quantityToProduce,
        totalCost: totalBatchCost
      });
      await manager.save(ProductionBatch, batch);

      return {
        product: updatedProduct,
        batch
      };
    });
  }
  async getBatches() {
    return this.dataSource.getRepository(ProductionBatch).find({
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revertBatch(batchId: string) {
    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(ProductionBatch, { 
        where: { id: batchId },
      });
      if (!batch) throw new BadRequestException('Lote no encontrado');

      const product = await manager.findOne(Product, { 
        where: { id: batch.productId },
        relations: { recipe: { rawMaterial: true } }
      });
      if (!product) throw new BadRequestException('Producto asociado no encontrado');

      if (product.stockQuantity < batch.quantity) {
        throw new BadRequestException(`No se puede revertir este lote. El stock actual (${product.stockQuantity}) es menor a la cantidad fabricada (${batch.quantity}). Ya se han vendido/comprometido unidades.`);
      }

      product.stockQuantity -= batch.quantity;
          product.physicalStock -= batch.quantity;
      await manager.save(Product, product);

      if (product.recipe && product.recipe.length > 0) {
        for (const ri of product.recipe) {
          if (ri.rawMaterial) {
            const returnedAmount = ri.quantity * batch.quantity;
            ri.rawMaterial.stockQuantity += returnedAmount;
            await manager.save(RawMaterial, ri.rawMaterial);
            
            const mov = manager.create(StockMovement, {
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

      // Finally, delete the batch record so it doesn't show in history
      await manager.remove(ProductionBatch, batch);
      return { success: true, message: 'Lote revertido correctamente' };
    });
  }
}




