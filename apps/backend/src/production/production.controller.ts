import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { ProductionService } from './production.service';

export class CreateBatchDto {
  productId: string;
  quantity: number;
}

@Controller('production')
export class ProductionController {
  @Delete(':id')
  revertBatch(@Param('id') id: string) {
    return this.productionService.revertBatch(id);
  }
  @Get()
  getBatches() {
    return this.productionService.getBatches();
  }

  constructor(private readonly productionService: ProductionService) {}

  @Post()
  createBatch(@Body() dto: CreateBatchDto) {
    return this.productionService.createBatch(dto.productId, dto.quantity);
  }
}




