import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionService } from './production.service';
import { Product } from '../entities/product.entity';
import { RawMaterial } from '../entities/raw-material.entity';
import { ProductionBatch } from '../entities/production-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, RawMaterial, ProductionBatch])],
  providers: [ProductionService],
})
export class ProductionModule {}
