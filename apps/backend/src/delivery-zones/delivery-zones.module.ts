import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { DeliveryZonesController } from './delivery-zones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone])],
  controllers: [DeliveryZonesController],
})
export class DeliveryZonesModule {}
