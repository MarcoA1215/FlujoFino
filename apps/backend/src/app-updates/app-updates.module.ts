import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUpdate } from '../entities/app-update.entity';
import { AppUpdatesService } from './app-updates.service';
import { AppUpdatesController } from './app-updates.controller';
import { SuperAdminGuard } from '../superadmin/superadmin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AppUpdate])],
  controllers: [AppUpdatesController],
  providers: [AppUpdatesService, SuperAdminGuard],
  exports: [AppUpdatesService],
})
export class AppUpdatesModule {}
