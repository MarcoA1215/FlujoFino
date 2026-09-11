import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
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

  findAll() {
    return this.rawMaterialRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateRawMaterialDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = manager.create(RawMaterial, {
        name: dto.name,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit,
        minStockAlert: dto.minStockAlert,
        stockQuantity: dto.initialStock || 0,
      });
      const savedMaterial = await manager.save(RawMaterial, material);

      if (dto.initialStock && dto.initialStock > 0) {
        const movement = manager.create(StockMovement, {
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

  async update(id: string, dto: UpdateRawMaterialDto) {
    const material = await this.rawMaterialRepo.findOne({ where: { id } });
    if (!material) throw new NotFoundException('Insumo no encontrado');
    
    Object.assign(material, dto);
    return this.rawMaterialRepo.save(material);
  }

  async restock(id: string, dto: RestockRawMaterialDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(RawMaterial, { where: { id } });
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
      const movement = manager.create(StockMovement, {
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

  async registerLoss(id: string, dto: RegisterLossDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(RawMaterial, { where: { id } });
      if (!material) throw new NotFoundException('Insumo no encontrado');

      if (material.stockQuantity < dto.quantity) {
        throw new BadRequestException('Stock insuficiente para la merma solicitada');
      }

      material.stockQuantity -= dto.quantity;
      const updatedMaterial = await manager.save(RawMaterial, material);

      const lossValue = dto.quantity * material.costPerUnit;
      
      const movement = manager.create(StockMovement, {
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

  async getMovements(rawMaterialId: string) {
    return this.stockMovementRepo.find({
      where: { rawMaterialId },
      order: { createdAt: 'DESC' }
    });
  }

  async updateMovement(id: string, dto: UpdateMovementDto) {
    return this.dataSource.transaction(async (manager) => {
      const movement = await manager.findOne(StockMovement, { where: { id }, relations: { rawMaterial: true } });
      if (!movement) throw new NotFoundException('Movimiento no encontrado');

      if (movement.type !== MovementType.IN_PURCHASE) {
        throw new BadRequestException('Solo se pueden editar compras (IN_PURCHASE)');
      }

      const material = movement.rawMaterial;
      if (!material) throw new NotFoundException('Insumo asociado no encontrado');

      // Revertir matemática anterior
      const oldTotalValue = material.stockQuantity * material.costPerUnit;
      const revertedValue = oldTotalValue - movement.totalCost;
      const revertedStock = material.stockQuantity - movement.quantity;

      // Aplicar nueva matemática
      const newTotalValue = revertedValue + dto.totalCost;
      const newTotalStock = revertedStock + dto.quantity;

      if (newTotalStock > 0) {
        material.costPerUnit = newTotalValue / newTotalStock;
      } else if (newTotalStock === 0) {
        material.costPerUnit = 0;
      }
      
      material.stockQuantity = newTotalStock;
      await manager.save(RawMaterial, material);

      movement.quantity = dto.quantity;
      movement.totalCost = dto.totalCost;
      movement.description = dto.description;
      return manager.save(StockMovement, movement);
    });
  }
}
