import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RawMaterial, Product, StockMovement])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

