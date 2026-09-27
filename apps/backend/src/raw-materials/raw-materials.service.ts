import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, IsNull, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { RestockRawMaterialDto } from './dto/restock-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { RegisterLossDto } from './dto/register-loss.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';

@Injectable()
export class RawMaterialsService {
  constructor(
    @InjectRepository(RawMaterial)
    private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  async findAll(tenantId: string) {
    const materials = await this.rawMaterialRepo.find({
      where: [
        { tenantId, isActive: true },
        { tenantId, isActive: IsNull() }
      ],
      relations: { movements: true },
      order: { name: 'ASC' }
    });

    for (const m of materials) {
      if ((!m.costPerUnit || Number(m.costPerUnit) === 0) && m.movements?.some(mov => Number(mov.totalCost) > 0)) {
        await this.recalculateStockAndCost(this.dataSource.manager, tenantId, m.id);
        const refreshed = await this.rawMaterialRepo.findOne({ where: { id: m.id } });
        if (refreshed) {
          m.costPerUnit = refreshed.costPerUnit;
          m.stockQuantity = refreshed.stockQuantity;
        }
      }
    }

    return materials;
  }

  async create(tenantId: string, dto: CreateRawMaterialDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = manager.create(RawMaterial, { tenantId,
        name: dto.name,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit,
        minStockAlert: dto.minStockAlert,
        stockQuantity: dto.initialStock || 0,
        allowAsExtra: dto.allowAsExtra || false,
        extraPriceType: dto.extraPriceType || 'COST',
        extraPriceValue: dto.extraPriceValue || 0,
      });
      const savedMaterial = await manager.save(RawMaterial, material);

      if (dto.initialStock && dto.initialStock > 0) {
        const movement = manager.create(StockMovement, { tenantId,
          rawMaterialId: savedMaterial.id,
          type: MovementType.IN_PURCHASE,
          quantity: dto.initialStock,
          totalCost: dto.initialStock * dto.costPerUnit,
          description: 'Stock inicial',
        });
        await manager.save(StockMovement, movement);
      }
      return savedMaterial;
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRawMaterialDto) {
    const material = await this.rawMaterialRepo.findOne({ where: { tenantId, id } });
    if (!material) throw new NotFoundException('Insumo no encontrado');
    
    Object.assign(material, dto);
    return this.rawMaterialRepo.save(material);
  }

  async restock(tenantId: string, id: string, dto: RestockRawMaterialDto) {
    if (dto.quantity <= 0) throw new BadRequestException('La cantidad debe ser mayor a 0');
    if (dto.totalCost < 0) throw new BadRequestException('El costo no puede ser negativo');
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(RawMaterial, { where: { tenantId, id } });
      if (!material) throw new NotFoundException('Insumo no encontrado');

      // Cálculo de Precio Promedio Ponderado (WAC)
      const currentTotalValue = material.stockQuantity * material.costPerUnit;
      const newTotalValue = dto.totalCost;
      const newTotalStock = material.stockQuantity + dto.quantity;

      if (newTotalStock > 0) {
        material.costPerUnit = (currentTotalValue + newTotalValue) / newTotalStock;
      } else {
        material.costPerUnit = dto.totalCost / dto.quantity; // Fallback de seguridad
      }
      
      // Actualizar stock
      material.stockQuantity = newTotalStock;
      
      const updatedMaterial = await manager.save(RawMaterial, material);

      // Registrar el movimiento de entrada (Inversión)
      const movement = manager.create(StockMovement, { tenantId,
        rawMaterialId: id,
        type: MovementType.IN_PURCHASE,
        quantity: dto.quantity,
        totalCost: dto.totalCost,
        description: 'Abastecimiento de stock (Compra)',
      });
      await manager.save(StockMovement, movement);

      return updatedMaterial;
    });
  }

  async registerLoss(tenantId: string, id: string, dto: RegisterLossDto) {
    if (dto.quantity <= 0) throw new BadRequestException('La cantidad debe ser mayor a 0');
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(RawMaterial, { where: { tenantId, id } });
      if (!material) throw new NotFoundException('Insumo no encontrado');

      if (material.stockQuantity < dto.quantity) {
        throw new BadRequestException('Stock insuficiente para la merma solicitada');
      }

      material.stockQuantity -= dto.quantity;
      const updatedMaterial = await manager.save(RawMaterial, material);

      const lossValue = dto.quantity * material.costPerUnit;
      
      const movement = manager.create(StockMovement, { tenantId,
        rawMaterialId: id,
        type: MovementType.LOSS,
        quantity: dto.quantity,
        totalCost: lossValue, // registramos el costo que se perdió
        description: `Merma/Pérdida: ${dto.reason}`,
      });
      await manager.save(StockMovement, movement);

      return updatedMaterial;
    });
  }

  // --- Movimientos ---

  async getMovements(tenantId: string, rawMaterialId: string) {
    return this.stockMovementRepo.find({
      where: { tenantId, rawMaterialId },
      order: { createdAt: 'DESC' }
    });
  }

  async recalculateStockAndCost(manager: EntityManager, tenantId: string, rawMaterialId: string) {
    const material = await manager.findOne(RawMaterial, { where: { tenantId, id: rawMaterialId } });
    if (!material) return null;

    const movements = await manager.find(StockMovement, {
      where: { tenantId, rawMaterialId },
      order: { createdAt: 'ASC' }
    });

    let currentStock = 0;
    let currentCostPerUnit = 0;

    for (const mov of movements) {
      const qty = Number(mov.quantity) || 0;
      const cost = Number(mov.totalCost) || 0;

      if (mov.type === MovementType.IN_PURCHASE || (mov.type as string).startsWith('IN')) {
        const prevStock = currentStock;
        const prevValue = prevStock * currentCostPerUnit;
        const newStock = prevStock + qty;

        if (newStock > 0) {
          currentCostPerUnit = (prevValue + cost) / newStock;
        } else {
          currentCostPerUnit = qty > 0 ? cost / qty : 0;
        }
        currentStock = newStock;
      } else {
        currentStock = Math.max(0, currentStock - qty);
      }
    }

    material.stockQuantity = Number(currentStock.toFixed(4));
    material.costPerUnit = Number(currentCostPerUnit.toFixed(4));
    return manager.save(RawMaterial, material);
  }

  async updateMovement(tenantId: string, id: string, dto: UpdateMovementDto) {
    return this.dataSource.transaction(async (manager) => {
      const movement = await manager.findOne(StockMovement, { where: { tenantId, id }, relations: { rawMaterial: true } });
      if (!movement) throw new NotFoundException('Movimiento no encontrado');

      const material = movement.rawMaterial;
      if (!material) throw new NotFoundException('Insumo asociado no encontrado');

      if (movement.type !== MovementType.IN_PURCHASE && movement.type !== MovementType.LOSS) {
        throw new BadRequestException('Solo se pueden editar compras (IN_PURCHASE) o pérdidas (LOSS)');
      }

      movement.quantity = dto.quantity;
      if (dto.totalCost !== undefined) movement.totalCost = dto.totalCost;
      if (dto.description !== undefined) movement.description = dto.description;
      await manager.save(StockMovement, movement);

      await this.recalculateStockAndCost(manager, tenantId, material.id);

      return movement;
    });
  }

  async archive(tenantId: string, id: string) {
    await this.rawMaterialRepo.update({ id, tenantId }, { isActive: false });
  }
}
