import { OrdersService } from '../orders/orders.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';
import { MovementType } from '@finowork/shared-types';
import { StockMovement } from '../entities/stock-movement.entity';
import { ScaledMath } from '../common/utils/scaled-math';

@Injectable()
export class ProductionService {
  constructor(
    private ordersService: OrdersService,
    private dataSource: DataSource,
  ) {}

  async createBatch(tenantId: string, productId: string, quantityToProduce: number) {
    if (quantityToProduce <= 0) {
      throw new BadRequestException('La cantidad a producir debe ser mayor a cero');
    }

    return this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista del producto objetivo antes de cualquier cálculo o mutación
      let product: Product | null = null;
      if (manager.createQueryBuilder) {
        try {
          product = await manager
            .createQueryBuilder(Product, 'p')
            .setLock('pessimistic_write')
            .leftJoinAndSelect('p.recipe', 'recipe')
            .leftJoinAndSelect('recipe.rawMaterial', 'rawMaterial')
            .leftJoinAndSelect('p.comboItems', 'comboItems')
            .leftJoinAndSelect('comboItems.component', 'component')
            .where('p.tenantId = :tenantId AND p.id = :productId', { tenantId, productId })
            .getOne();
        } catch {
          product = null;
        }
      }

      if (!product) {
        product = await manager.findOne(Product, {
          where: { tenantId, id: productId },
          relations: { recipe: { rawMaterial: true }, comboItems: { component: true } },
          lock: { mode: 'pessimistic_write' },
        });
      }

      if (!product) throw new BadRequestException('Producto no encontrado');

      const isService = product.is_service === true || product.category === 'Servicios' || Boolean(product.durationMinutes);
      if (isService) {
        throw new BadRequestException('No se puede producir un servicio');
      }

      let scaledTotalBatchCost = 0n;
      const scaledQuantityToProduce = ScaledMath.toScaled(quantityToProduce);

      if (product.isCombo) {
        if (!product.isPreAssembled) {
          throw new BadRequestException('No se puede producir un combo virtual. Marque el combo como Pre-ensamblado.');
        }
        if (!product.comboItems || product.comboItems.length === 0) {
          throw new BadRequestException('El combo no tiene componentes configurados.');
        }

        // Bloqueo de escritura pesimista sobre los componentes del combo antes de la sustracción numérica
        const componentIds = product.comboItems.map((ci) => ci.componentId).filter(Boolean);
        let lockedComponentsMap = new Map<string, Product>();
        if (componentIds.length > 0 && manager.createQueryBuilder) {
          try {
            const lockedComponents = await manager
              .createQueryBuilder(Product, 'comp')
              .setLock('pessimistic_write')
              .where('comp.tenantId = :tenantId AND comp.id IN (:...ids)', { tenantId, ids: componentIds })
              .getMany();
            if (Array.isArray(lockedComponents)) {
              lockedComponentsMap = new Map(lockedComponents.map((c) => [c.id, c]));
            }
          } catch {
            // fallback en entornos mock sin queryBuilder completo
          }
        }

        // 1. Validar stock físico de componentes
        const missing: string[] = [];
        for (const ci of product.comboItems) {
          const scaledCiQty = ScaledMath.toScaled(ci.quantity);
          const scaledRequired = ScaledMath.mul(scaledCiQty, scaledQuantityToProduce);
          const comp = (ci.componentId ? lockedComponentsMap.get(ci.componentId) : null) || ci.component;
          if (!comp) continue;

          const scaledPhys = ScaledMath.toScaled(comp.physicalStock);
          if (scaledPhys < scaledRequired) {
            const missingQty = ScaledMath.fromScaled(ScaledMath.sub(scaledRequired, scaledPhys));
            missing.push(`${comp.name} (Faltan ${missingQty})`);
          }
        }

        if (missing.length > 0) {
          throw new BadRequestException('Stock físico insuficiente de componentes: ' + missing.join(', '));
        }

        // 2. Descontar componentes y acumular costo en escala entera exacta
        for (const ci of product.comboItems) {
          const scaledCiQty = ScaledMath.toScaled(ci.quantity);
          const scaledRequired = ScaledMath.mul(scaledCiQty, scaledQuantityToProduce);
          const comp = (ci.componentId ? lockedComponentsMap.get(ci.componentId) : null) || ci.component;
          if (!comp) continue;

          const scaledPhys = ScaledMath.toScaled(comp.physicalStock);
          const scaledStock = ScaledMath.toScaled(comp.stockQuantity);

          comp.physicalStock = ScaledMath.fromScaled(ScaledMath.sub(scaledPhys, scaledRequired));
          comp.stockQuantity = ScaledMath.fromScaled(ScaledMath.sub(scaledStock, scaledRequired));
          comp.stock = comp.stockQuantity;
          await manager.save(Product, comp);

          const compCost = Number(comp.cost || comp.estimatedCost || 0);
          const scaledCompCost = ScaledMath.toScaled(compCost);
          const scaledCostUsed = ScaledMath.mul(scaledRequired, scaledCompCost);
          scaledTotalBatchCost = ScaledMath.add(scaledTotalBatchCost, scaledCostUsed);
        }
      } else {
        if (!product.recipe || product.recipe.length === 0) {
          throw new BadRequestException('El producto no tiene receta configurada.');
        }

        // Bloqueo de escritura pesimista sobre insumos de materia prima
        const rawMaterialIds = product.recipe.map((ri) => ri.rawMaterialId).filter(Boolean);
        let lockedMaterialsMap = new Map<string, RawMaterial>();
        if (rawMaterialIds.length > 0 && manager.createQueryBuilder) {
          try {
            const lockedMaterials = await manager
              .createQueryBuilder(RawMaterial, 'rm')
              .setLock('pessimistic_write')
              .where('rm.tenantId = :tenantId AND rm.id IN (:...ids)', { tenantId, ids: rawMaterialIds })
              .getMany();
            if (Array.isArray(lockedMaterials)) {
              lockedMaterialsMap = new Map(lockedMaterials.map((m) => [m.id, m]));
            }
          } catch {
            // fallback en entornos mock
          }
        }

        // 1. Validar stock de Materia Prima
        const missing: string[] = [];
        for (const recipeItem of product.recipe) {
          const scaledItemQty = ScaledMath.toScaled(recipeItem.quantity);
          const scaledRequiredAmount = ScaledMath.mul(scaledItemQty, scaledQuantityToProduce);
          const material = (recipeItem.rawMaterialId ? lockedMaterialsMap.get(recipeItem.rawMaterialId) : null) || recipeItem.rawMaterial;

          if (!material) {
            missing.push('Desconocido');
            continue;
          }

          const scaledMatStock = ScaledMath.toScaled(material.stockQuantity);
          if (scaledMatStock < scaledRequiredAmount) {
            missing.push(material.name || 'Desconocido');
          }
        }

        if (missing.length > 0) {
          if (missing.length === 1) {
            throw new BadRequestException(`Insumo insuficiente: ${missing[0]}`);
          } else {
            throw new BadRequestException(`Faltan ${missing.length} insumos para fabricar este lote.`);
          }
        }

        // 2. Descontar stock y registrar movimientos con aritmética exacta
        for (const recipeItem of product.recipe) {
          const scaledItemQty = ScaledMath.toScaled(recipeItem.quantity);
          const scaledRequiredAmount = ScaledMath.mul(scaledItemQty, scaledQuantityToProduce);
          const requiredAmount = ScaledMath.fromScaled(scaledRequiredAmount);
          const material = (recipeItem.rawMaterialId ? lockedMaterialsMap.get(recipeItem.rawMaterialId) : null) || recipeItem.rawMaterial;

          const scaledMatCost = ScaledMath.toScaled(material.costPerUnit);
          const scaledMaterialCostUsed = ScaledMath.mul(scaledRequiredAmount, scaledMatCost);
          const materialCostUsed = ScaledMath.fromScaled(scaledMaterialCostUsed);

          scaledTotalBatchCost = ScaledMath.add(scaledTotalBatchCost, scaledMaterialCostUsed);

          const scaledMatStock = ScaledMath.toScaled(material.stockQuantity);
          material.stockQuantity = ScaledMath.fromScaled(ScaledMath.sub(scaledMatStock, scaledRequiredAmount));
          await manager.save(RawMaterial, material);

          const movement = manager.create(StockMovement, {
            tenantId,
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
      const scaledProductStock = ScaledMath.toScaled(product.stockQuantity);
      const scaledProductPhys = ScaledMath.toScaled(product.physicalStock);

      product.stockQuantity = ScaledMath.fromScaled(ScaledMath.add(scaledProductStock, scaledQuantityToProduce));
      product.physicalStock = ScaledMath.fromScaled(ScaledMath.add(scaledProductPhys, scaledQuantityToProduce));
      product.stock = product.stockQuantity;
      const updatedProduct = await manager.save(Product, product);

      // 4. Registrar el lote con el total exacto desescalado
      const totalBatchCost = ScaledMath.fromScaled(scaledTotalBatchCost);
      const batch = manager.create(ProductionBatch, {
        tenantId,
        productId,
        quantity: quantityToProduce,
        totalCost: totalBatchCost,
      });
      await manager.save(ProductionBatch, batch);

      await this.ordersService.autoAllocatePhysicalStock(tenantId, manager);

      return {
        product: updatedProduct,
        batch,
      };
    });
  }

  async getBatches(tenantId: string) {
    return this.dataSource.getRepository(ProductionBatch).find({
      where: { tenantId },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revertBatch(tenantId: string, batchId: string) {
    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(ProductionBatch, {
        where: { tenantId, id: batchId },
      });
      if (!batch) throw new BadRequestException('Lote no encontrado');

      let product: Product | null = null;
      if (manager.createQueryBuilder) {
        try {
          product = await manager
            .createQueryBuilder(Product, 'p')
            .setLock('pessimistic_write')
            .leftJoinAndSelect('p.recipe', 'recipe')
            .leftJoinAndSelect('recipe.rawMaterial', 'rawMaterial')
            .leftJoinAndSelect('p.comboItems', 'comboItems')
            .leftJoinAndSelect('comboItems.component', 'component')
            .where('p.tenantId = :tenantId AND p.id = :productId', { tenantId, productId: batch.productId })
            .getOne();
        } catch {
          product = null;
        }
      }

      if (!product) {
        product = await manager.findOne(Product, {
          where: { tenantId, id: batch.productId },
          relations: { recipe: { rawMaterial: true }, comboItems: { component: true } },
          lock: { mode: 'pessimistic_write' },
        });
      }

      if (!product) throw new BadRequestException('Producto asociado no encontrado');

      if (product.physicalStock < batch.quantity) {
        throw new BadRequestException(
          `No se puede revertir este lote porque el stock físico actual (${product.physicalStock}) es menor a la cantidad del lote (${batch.quantity}). Esto significa que los productos de este lote ya fueron entregados a clientes.`,
        );
      }

      const scaledBatchQty = ScaledMath.toScaled(batch.quantity);
      const scaledProductStock = ScaledMath.toScaled(product.stockQuantity);
      const scaledProductPhys = ScaledMath.toScaled(product.physicalStock);

      product.stockQuantity = ScaledMath.fromScaled(ScaledMath.sub(scaledProductStock, scaledBatchQty));
      product.physicalStock = ScaledMath.fromScaled(ScaledMath.sub(scaledProductPhys, scaledBatchQty));
      product.stock = product.stockQuantity;
      await manager.save(Product, product);

      if (product.isCombo && product.isPreAssembled) {
        if (product.comboItems && product.comboItems.length > 0) {
          const compIds = product.comboItems.map((ci) => ci.componentId).filter(Boolean);
          let lockedComps = new Map<string, Product>();
          if (compIds.length > 0 && manager.createQueryBuilder) {
            try {
              const comps = await manager
                .createQueryBuilder(Product, 'comp')
                .setLock('pessimistic_write')
                .where('comp.tenantId = :tenantId AND comp.id IN (:...ids)', { tenantId, ids: compIds })
                .getMany();
              if (Array.isArray(comps)) {
                lockedComps = new Map(comps.map((c) => [c.id, c]));
              }
            } catch {
              // fallback
            }
          }

          for (const ci of product.comboItems) {
            const comp = (ci.componentId ? lockedComps.get(ci.componentId) : null) || ci.component;
            if (comp) {
              const scaledCiQty = ScaledMath.toScaled(ci.quantity);
              const scaledReturn = ScaledMath.mul(scaledCiQty, scaledBatchQty);

              const scaledCompPhys = ScaledMath.toScaled(comp.physicalStock);
              const scaledCompStock = ScaledMath.toScaled(comp.stockQuantity);

              comp.physicalStock = ScaledMath.fromScaled(ScaledMath.add(scaledCompPhys, scaledReturn));
              comp.stockQuantity = ScaledMath.fromScaled(ScaledMath.add(scaledCompStock, scaledReturn));
              comp.stock = comp.stockQuantity;
              await manager.save(Product, comp);
            }
          }
        }
      } else {
        if (product.recipe && product.recipe.length > 0) {
          const rawIds = product.recipe.map((ri) => ri.rawMaterialId).filter(Boolean);
          let lockedRms = new Map<string, RawMaterial>();
          if (rawIds.length > 0 && manager.createQueryBuilder) {
            try {
              const rms = await manager
                .createQueryBuilder(RawMaterial, 'rm')
                .setLock('pessimistic_write')
                .where('rm.tenantId = :tenantId AND rm.id IN (:...ids)', { tenantId, ids: rawIds })
                .getMany();
              if (Array.isArray(rms)) {
                lockedRms = new Map(rms.map((r) => [r.id, r]));
              }
            } catch {
              // fallback
            }
          }

          for (const ri of product.recipe) {
            const material = (ri.rawMaterialId ? lockedRms.get(ri.rawMaterialId) : null) || ri.rawMaterial;
            if (material) {
              const scaledRiQty = ScaledMath.toScaled(ri.quantity);
              const scaledReturnedAmount = ScaledMath.mul(scaledRiQty, scaledBatchQty);
              const returnedAmount = ScaledMath.fromScaled(scaledReturnedAmount);

              const scaledMatStock = ScaledMath.toScaled(material.stockQuantity);
              material.stockQuantity = ScaledMath.fromScaled(ScaledMath.add(scaledMatStock, scaledReturnedAmount));
              await manager.save(RawMaterial, material);

              const scaledMatCost = ScaledMath.toScaled(material.costPerUnit);
              const totalCost = ScaledMath.fromScaled(ScaledMath.mul(scaledReturnedAmount, scaledMatCost));

              const mov = manager.create(StockMovement, {
                tenantId,
                rawMaterialId: material.id,
                type: MovementType.IN,
                quantity: returnedAmount,
                totalCost,
                description: `Reverso de Lote: ${product.name} (x${batch.quantity})`,
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
