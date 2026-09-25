import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { SaaSPaymentReport } from '../entities/saas-payment-report.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { PlatformConfig } from '../entities/platform-config.entity';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, SaaSPaymentReport, UserTenantAccess, PlatformConfig]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
