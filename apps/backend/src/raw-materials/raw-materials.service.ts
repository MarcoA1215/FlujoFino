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

  findAll(tenantId: string) {
    return this.rawMaterialRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async create(tenantId: string, dto: CreateRawMaterialDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = manager.create(RawMaterial, { tenantId,
        name: dto.name,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit,
        minStockAlert: dto.minStockAlert,
        stockQuantity: dto.initialStock || 0,
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

  async updateMovement(tenantId: string, id: string, dto: UpdateMovementDto) {
    return this.dataSource.transaction(async (manager) => {
      const movement = await manager.findOne(StockMovement, { where: { tenantId, id }, relations: { rawMaterial: true } });
      if (!movement) throw new NotFoundException('Movimiento no encontrado');

      const material = movement.rawMaterial;
      if (!material) throw new NotFoundException('Insumo asociado no encontrado');

      if (movement.type === MovementType.IN_PURCHASE) {
        // Revertir matemática anterior
        const oldTotalValue = material.stockQuantity * material.costPerUnit;
        const revertedValue = oldTotalValue - movement.totalCost;
        const revertedStock = material.stockQuantity - movement.quantity;
  
        // Aplicar nueva matemática
        const newTotalValue = revertedValue + (dto.totalCost ?? movement.totalCost);
        const newTotalStock = revertedStock + dto.quantity;
  
        if (newTotalStock > 0) {
          material.costPerUnit = newTotalValue / newTotalStock;
        } else if (newTotalStock === 0) {
          material.costPerUnit = 0;
        }
        
        material.stockQuantity = newTotalStock;
        await manager.save(RawMaterial, material);
  
        movement.quantity = dto.quantity;
        if (dto.totalCost !== undefined) movement.totalCost = dto.totalCost;
        if (dto.description !== undefined) movement.description = dto.description;
        
      } else if (movement.type === MovementType.LOSS) {
        // Revertir pérdida anterior
        const revertedStock = material.stockQuantity + movement.quantity;
        
        // Aplicar nueva pérdida
        const newTotalStock = revertedStock - dto.quantity;
        if (newTotalStock < 0) {
          throw new BadRequestException('La nueva cantidad resulta en stock negativo');
        }

        material.stockQuantity = newTotalStock;
        await manager.save(RawMaterial, material);

        movement.quantity = dto.quantity;
        movement.totalCost = dto.quantity * material.costPerUnit;
        if (dto.description !== undefined) movement.description = dto.description;
        
      } else {
        throw new BadRequestException('Solo se pueden editar compras (IN_PURCHASE) o pérdidas (LOSS)');
      }

      return manager.save(StockMovement, movement);
    });
  }

  async archive(tenantId: string, id: string) {
    await this.rawMaterialRepo.update(id, { isActive: false });
  }
}
