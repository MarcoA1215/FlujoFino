import { Controller, Request, Get, Post, Put, Body, Param, Patch } from '@nestjs/common';
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
  findAll(@Request() req: any) {
    return this.rawMaterialsService.findAll(req.user.tenantId);}

  @Post()
  create(@Request() req: any, @Body() dto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(req.user.tenantId, dto);}

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRawMaterialDto) {
    return this.rawMaterialsService.update(req.user.tenantId, id, dto);}

  @Post(':id/restock')
  restock(@Request() req: any, @Param('id') id: string, @Body() dto: RestockRawMaterialDto) {
    return this.rawMaterialsService.restock(req.user.tenantId, id, dto);}

  @Post(':id/loss')
  registerLoss(@Request() req: any, @Param('id') id: string, @Body() dto: RegisterLossDto) {
    return this.rawMaterialsService.registerLoss(req.user.tenantId, id, dto);}

  @Get(':id/movements')
  getMovements(@Request() req: any, @Param('id') id: string) {
    return this.rawMaterialsService.getMovements(req.user.tenantId, id);}
}

// Podríamos ponerlo en su propio Controller, Request, pero por simplicidad de la Fase 2 lo dejamos aquí, en otra ruta
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Put(':id')
  updateMovement(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMovementDto) {
    return this.rawMaterialsService.updateMovement(req.user.tenantId, id, dto);}

  @Patch(':id/archive')
  archive(@Request() req: any, @Param('id') id: string) {
    return this.rawMaterialsService.archive(req.user.tenantId, id);}
}
