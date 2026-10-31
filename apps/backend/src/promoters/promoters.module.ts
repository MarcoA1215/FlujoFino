import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promoter } from '../entities/promoter.entity';
import { PromoterCommission } from '../entities/promoter-commission.entity';
import { Tenant } from '../entities/tenant.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { User } from '../entities/user.entity';
import { PromotersService } from './promoters.service';
import { PromotersController } from './promoters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promoter, PromoterCommission, Tenant, UserTenantAccess, User])],
  controllers: [PromotersController],
  providers: [PromotersService],
  exports: [PromotersService],
})
export class PromotersModule {}
