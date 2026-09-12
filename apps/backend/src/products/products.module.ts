import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { ComboItem } from '../entities/combo-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, RecipeItem, ComboItem])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

