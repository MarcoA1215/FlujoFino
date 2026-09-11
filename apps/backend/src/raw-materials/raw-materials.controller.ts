import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { RestockRawMaterialDto } from './dto/restock-raw-material.dto';

@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  findAll() {
    return this.rawMaterialsService.findAll();
  }

  @Post()
  create(@Body() createRawMaterialDto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(createRawMaterialDto);
  }

  @Post(':id/restock')
  restock(@Param('id') id: string, @Body() restockDto: RestockRawMaterialDto) {
    return this.rawMaterialsService.restock(id, restockDto);
  }
}

