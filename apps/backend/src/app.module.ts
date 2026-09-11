import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductionModule } from './production/production.module';
import { OrdersModule } from './orders/orders.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';

import { RawMaterial } from './entities/raw-material.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from './entities/product.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: true,
        entities: [
      RawMaterial,
      StockMovement,
      Product,
      RecipeItem,
      ProductionBatch,
      Order,
      OrderItem,
    ],
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    ProductionModule,
    OrdersModule,
    RawMaterialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
