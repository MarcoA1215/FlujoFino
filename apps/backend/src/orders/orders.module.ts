import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PublicStoreController } from './public-store.controller';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { Tenant } from '../entities/tenant.entity';
import { Settings } from '../entities/settings.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { OrderItemMedia } from '../entities/order-item-media.entity';
import { StorageModule } from '../storage/storage.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      OrderItemMedia,
      Tenant,
      Settings,
      DeliveryZone,
    ]),
    StorageModule,
    CustomersModule,
  ],
  controllers: [OrdersController, PublicStoreController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
