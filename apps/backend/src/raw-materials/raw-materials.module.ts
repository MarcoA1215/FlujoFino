import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawMaterialsService } from './raw-materials.service';
import { RawMaterialsController, StockMovementsController } from './raw-materials.controller';
import { RawMaterial } from '../entities/raw-material.entity';
import { StockMovement } from '../entities/stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RawMaterial, StockMovement])],
  controllers: [RawMaterialsController, StockMovementsController],
  providers: [RawMaterialsService],
  exports: [RawMaterialsService],
})
export class RawMaterialsModule {}

