import { Controller, Request, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
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
  getAll(@Request() req: any) {
    return this.zoneRepo.find({ where: { tenantId: req.user.tenantId }, order: { name: 'ASC' } });
  }

  @Post()
  create(@Request() req: any, @Body() body: { name: string; feePrice: number }) {
    const zone = this.zoneRepo.create({ ...body, tenantId: req.user.tenantId });
    return this.zoneRepo.save(zone);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: { name: string; feePrice: number }) {
    await this.zoneRepo.update({ id, tenantId: req.user.tenantId }, body);
    return this.zoneRepo.findOne({ where: { id, tenantId: req.user.tenantId } });
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.zoneRepo.delete({ id, tenantId: req.user.tenantId });
    return { deleted: true };
  }
}
