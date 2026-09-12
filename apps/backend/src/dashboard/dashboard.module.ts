import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RawMaterial } from '../entities/raw-material.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RawMaterial, Product, StockMovement, Order, OrderItem])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
