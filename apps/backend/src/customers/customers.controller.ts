import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Request() req, @Query('search') search?: string) {
    return this.customersService.findAll(req.user.tenantId, search);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.customersService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.customersService.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.customersService.delete(req.user.tenantId, id);
  }
}
