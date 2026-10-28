import { Controller, Request, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Post('invoices')
  @Roles(UserRole.ADMIN, UserRole.POS)
  issueInvoice(@Request() req: any, @Body() dto: IssueInvoiceDto) {
    return this.fiscalService.issueInvoice(req.user.tenantId, dto);
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.POS)
  getInvoices(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.fiscalService.findAll(
      req.user.tenantId,
      limit ? parseInt(limit, 10) : 50,
      page ? parseInt(page, 10) : 1,
    );
  }

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.POS)
  getInvoice(@Request() req: any, @Param('id') id: string) {
    return this.fiscalService.findOne(req.user.tenantId, id);
  }

  @Post('invoices/:id/cancel')
  @Roles(UserRole.ADMIN)
  cancelInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.fiscalService.cancelInvoice(req.user.tenantId, id, dto);
  }

  @Get('libro-ventas')
  @Roles(UserRole.ADMIN)
  getLibroVentas(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.fiscalService.getLibroVentas(req.user.tenantId, currentYear, currentMonth);
  }
}
