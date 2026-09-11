import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { RestockRawMaterialDto } from './dto/restock-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { RegisterLossDto } from './dto/register-loss.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';

@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Get()
  findAll() {
    return this.rawMaterialsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(id, dto);
  }

  @Post(':id/restock')
  restock(@Param('id') id: string, @Body() dto: RestockRawMaterialDto) {
    return this.rawMaterialsService.restock(id, dto);
  }

  @Post(':id/loss')
  registerLoss(@Param('id') id: string, @Body() dto: RegisterLossDto) {
    return this.rawMaterialsService.registerLoss(id, dto);
  }

  @Get(':id/movements')
  getMovements(@Param('id') id: string) {
    return this.rawMaterialsService.getMovements(id);
  }
}

// Podríamos ponerlo en su propio controller, pero por simplicidad de la Fase 2 lo dejamos aquí, en otra ruta
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Put(':id')
  updateMovement(@Param('id') id: string, @Body() dto: UpdateMovementDto) {
    return this.rawMaterialsService.updateMovement(id, dto);
  }
}
