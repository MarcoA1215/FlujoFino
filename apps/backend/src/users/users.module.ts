import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AccessRequest } from '../entities/access-request.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Reservation } from '../entities/reservation.entity';
import { Order } from '../entities/order.entity';
import { SalaryAdvance } from '../entities/salary-advance.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { Product } from '../entities/product.entity';
import { OrderItem } from '../entities/order-item.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AccessRequest,
      UserTenantAccess,
      Reservation,
      Order,
      OrderItem,
      Product,
      SalaryAdvance,
      OperatingExpense,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
