import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.POS)
  findAll(@Request() req, @Query('search') search?: string) {
    return this.customersService.findAll(req.user.tenantId, search);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.POS)
  findOne(@Request() req, @Param('id') id: string) {
    return this.customersService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.POS)
  create(@Request() req, @Body() dto: any) {
    return this.customersService.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.POS)
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Request() req, @Param('id') id: string) {
    return this.customersService.delete(req.user.tenantId, id);
  }
}
