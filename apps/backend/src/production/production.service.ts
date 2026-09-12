import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';

@Injectable()
export class ProductionService {
  constructor(private dataSource: DataSource) {}

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
          description: `Producción de Lote: ${product.name} (x${quantityToProduce})`,
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
}
