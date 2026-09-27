import { Controller, Post, Get, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalaryAdvancesService } from './salary-advances.service';
import { CreateSalaryAdvanceDto } from './dto/create-salary-advance.dto';

@UseGuards(JwtAuthGuard)
@Controller('salary-advances')
export class SalaryAdvancesController {
  constructor(private readonly service: SalaryAdvancesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateSalaryAdvanceDto) {
    const tenantId = req.user.tenantId;
    return this.service.create(tenantId, dto);
  }

  @Get('pending')
  getPending(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.service.getPending(tenantId);
  }

  @Patch(':id/deduct')
  markAsDeducted(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.service.markAsDeducted(tenantId, id);
  }
}
