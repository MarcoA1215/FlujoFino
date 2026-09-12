import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from '../entities/delivery-zone.entity';

@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly zoneRepo: Repository<DeliveryZone>,
  ) {}

  @Get()
  getAll() {
    return this.zoneRepo.find({ order: { name: 'ASC' } });
  }

  @Post()
  create(@Body() body: { name: string; feePrice: number }) {
    const zone = this.zoneRepo.create(body);
    return this.zoneRepo.save(zone);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name: string; feePrice: number }) {
    await this.zoneRepo.update(id, body);
    return this.zoneRepo.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.zoneRepo.delete(id);
    return { deleted: true };
  }
}
