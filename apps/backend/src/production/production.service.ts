import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';

@Injectable()
export class ProductionService {
  constructor(private dataSource: DataSource) {}

  async createBatch(productId: string, quantityToProduce: number) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { recipe: true },
      });

      if (!product) throw new BadRequestException('Producto no encontrado');

      // 1. Validar y descontar stock de Materia Prima
      for (const recipeItem of product.recipe) {
        const requiredAmount = recipeItem.quantity * quantityToProduce;
        
        const material = await manager.findOne(RawMaterial, {
          where: { id: recipeItem.rawMaterialId },
        });

        if (!material || material.stockQuantity < requiredAmount) {
          throw new BadRequestException(`Insumo insuficiente: ${material?.name || 'Desconocido'}`);
        }

        material.stockQuantity -= requiredAmount;
        await manager.save(RawMaterial, material);
      }

      // 2. Incrementar el stock de Producto Terminado
      product.stockQuantity += quantityToProduce;
      const updatedProduct = await manager.save(Product, product);

      // 3. Registrar el lote
      const batch = manager.create(ProductionBatch, {
        productId,
        quantity: quantityToProduce,
      });
      await manager.save(ProductionBatch, batch);

      return updatedProduct;
    });
  }
}
