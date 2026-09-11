import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { RestockRawMaterialDto } from './dto/restock-raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(
    @InjectRepository(RawMaterial)
    private rawMaterialRepo: Repository<RawMaterial>,
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
          type: MovementType.IN,
          quantity: dto.initialStock,
          totalCost: dto.initialStock * dto.costPerUnit,
          description: 'Stock inicial',
        });
        await manager.save(StockMovement, movement);
      }
      return savedMaterial;
    });
  }

  async restock(id: string, dto: RestockRawMaterialDto) {
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(RawMaterial, { where: { id } });
      if (!material) throw new NotFoundException('Insumo no encontrado');

      // Actualizar stock
      material.stockQuantity += dto.quantity;
      // Actualizamos el costo promedio o el último costo unitario de compra
      material.costPerUnit = dto.totalCost / dto.quantity;
      
      const updatedMaterial = await manager.save(RawMaterial, material);

      // Registrar el movimiento de entrada (Inversión)
      const movement = manager.create(StockMovement, {
        rawMaterialId: id,
        type: MovementType.IN,
        quantity: dto.quantity,
        totalCost: dto.totalCost,
        description: 'Abastecimiento de stock (Compra)',
      });
      await manager.save(StockMovement, movement);

      return updatedMaterial;
    });
  }
}

