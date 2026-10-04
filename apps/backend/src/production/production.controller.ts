import { Controller, Request, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

export class CreateBatchDto {
  productId: string;
  quantity: number;
}

@Controller('production')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.KITCHEN)
export class ProductionController {
  @Delete(':id')
  revertBatch(@Request() req: any, @Param('id') id: string) {
    return this.productionService.revertBatch(req.user.tenantId, id);}
  @Get()
  getBatches(@Request() req: any) {
    return this.productionService.getBatches(req.user.tenantId);}

  constructor(private readonly productionService: ProductionService) {}

  @Post()
  createBatch(@Request() req: any, @Body() dto: CreateBatchDto) {
    return this.productionService.createBatch(req.user.tenantId, dto.productId, dto.quantity);}
}




