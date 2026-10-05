import { Tenant } from './entities/tenant.entity';
import { UserTenantAccess } from './entities/user-tenant-access.entity';
import { WorkSchedule } from './entities/work-schedule.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { TenantStatusGuard } from './auth/tenant-status.guard';
import { RolesGuard } from './auth/roles.guard';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
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
import { ReservationsModule } from './reservations/reservations.module';
import { StorageModule } from './storage/storage.module';
import { FeedbackModule } from './feedback/feedback.module';

import { RawMaterial } from './entities/raw-material.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from './entities/product.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Settings } from './entities/settings.entity';
import { Reservation } from './entities/reservation.entity';
import { ComboItem } from './entities/combo-item.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { OperatingExpense } from './entities/operating-expense.entity';
import { AccessRequest } from './entities/access-request.entity';
import { Feedback } from './entities/feedback.entity';
import { OrderItemMedia } from './entities/order-item-media.entity';
import { Customer } from './entities/customer.entity';
import { CustomersModule } from './customers/customers.module';
import { SaaSPaymentReport } from './entities/saas-payment-report.entity';
import { PlatformConfig } from './entities/platform-config.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { SalaryAdvance } from './entities/salary-advance.entity';
import { Investment } from './entities/investment.entity';
import { Promoter } from './entities/promoter.entity';
import { PromoterCommission } from './entities/promoter-commission.entity';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SalaryAdvancesModule } from './salary-advances/salary-advances.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { InvestmentsModule } from './investments/investments.module';
import { PromotersModule } from './promoters/promoters.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        entities: [RawMaterial, StockMovement, RecipeItem, Product, ComboItem, ProductionBatch, Order, OrderItem, Settings, DeliveryZone, User, Tenant, UserTenantAccess, WorkSchedule, Reservation, OperatingExpense, AccessRequest, Feedback, OrderItemMedia, Customer, SaaSPaymentReport, PlatformConfig, PushSubscription, SalaryAdvance, Investment, Promoter, PromoterCommission],
        synchronize: configService.get<string>('DB_SYNCHRONIZE') !== undefined
          ? configService.get<string>('DB_SYNCHRONIZE') === 'true'
          : configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    ProductionModule,
    OrdersModule, DeliveryZonesModule,
    RawMaterialsModule,
    ProductsModule,
    DashboardModule,
    SettingsModule,
    ReservationsModule,
    StorageModule,
    FeedbackModule,
    CustomersModule,
    SuperAdminModule,
    NotificationsModule,
    SalaryAdvancesModule,
    DeliveriesModule,
    InvestmentsModule,
    PromotersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
