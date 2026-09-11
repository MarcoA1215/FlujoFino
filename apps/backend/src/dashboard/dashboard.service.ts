import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { MovementType } from '@nutrideli/shared-types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(RawMaterial) private rawMaterialRepo: Repository<RawMaterial>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>
  ) {}

  async getSummary() {
    const rawMaterials = await this.rawMaterialRepo.find();
    const products = await this.productRepo.find();
    const movements = await this.movementRepo.find();

    const totalRawMaterialCapital = rawMaterials.reduce((acc, rm) => acc + (rm.stockQuantity * rm.costPerUnit), 0);
    const lowStockMaterials = rawMaterials.filter(rm => rm.stockQuantity <= rm.minStockAlert);
    
    // Asumimos capital en producto en base a su precio de venta esperado, 
    // pero para un negocio es mejor saber la valoración, dejaremos el potencial de venta.
    const expectedRevenue = products.reduce((acc, p) => acc + (p.stockQuantity * p.salePrice), 0);

    const totalLosses = movements
      .filter(m => m.type === MovementType.LOSS)
      .reduce((acc, m) => acc + m.totalCost, 0);

    return {
      totalRawMaterialCapital,
      expectedRevenue,
      lowStockAlerts: lowStockMaterials.map(m => ({
        id: m.id,
        name: m.name,
        stock: m.stockQuantity,
        unit: m.unit
      })),
      totalLosses
    };
  }
}

