import { Controller, Post, Get, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalaryAdvancesService } from './salary-advances.service';
import { CreateSalaryAdvanceDto } from './dto/create-salary-advance.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('salary-advances')
export class SalaryAdvancesController {
  constructor(private readonly service: SalaryAdvancesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.POS)
  create(@Request() req: any, @Body() dto: CreateSalaryAdvanceDto) {
    const tenantId = req.user.tenantId;
    return this.service.create(tenantId, dto);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.POS)
  getPending(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.service.getPending(tenantId);
  }

  @Patch(':id/deduct')
  @Roles(UserRole.ADMIN)
  markAsDeducted(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.service.markAsDeducted(tenantId, id);
  }
}
