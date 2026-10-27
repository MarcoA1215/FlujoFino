import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Request() req: any, @Body() dto: CreateInvestmentDto) {
    const tenantId = req.user.tenantId;
    return this.service.create(tenantId, dto);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN)
  getSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.service.getSummary(tenantId);
  }
}
