import { Controller, Get, Post, Put, Patch, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@nutrideli/shared-types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('employees')
  findActiveEmployees(@Request() req: any) {
    return this.usersService.findActiveEmployees(req.user.tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get('check/:email')
  @Roles(UserRole.ADMIN)
  async checkEmail(@Param('email') email: string) {
    const user = await this.usersService.findByUsername(email);
    return { exists: !!user, username: user?.username };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Request() req, @Body() data: any) {
    return this.usersService.create(req.user.tenantId, data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.usersService.update(req.user.tenantId, id, data);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  patch(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.usersService.update(req.user.tenantId, id, data);
  }

  @Post(':id/pay')
  @Roles(UserRole.ADMIN)
  paySalary(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.usersService.paySalary(req.user.tenantId, id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Request() req, @Param('id') id: string) {
    return this.usersService.delete(req.user.tenantId, id);
  }
}
