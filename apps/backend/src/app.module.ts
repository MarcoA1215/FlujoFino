import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductionModule } from './production/production.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';
import { ProductsModule } from './products/products.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';

import { RawMaterial } from './entities/raw-material.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from './entities/product.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Settings } from './entities/settings.entity';
import { ComboItem } from './entities/combo-item.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        entities: [RawMaterial, StockMovement, RecipeItem, Product, ComboItem, ProductionBatch, Order, OrderItem, Settings, DeliveryZone],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ProductionModule,
    OrdersModule, DeliveryZonesModule,
    RawMaterialsModule,
    ProductsModule,
    DashboardModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


