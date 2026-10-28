import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminGuard } from './superadmin.guard';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { ReportPaymentDto } from './dto/report-payment.dto';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';
import { CreatePromoterDto } from './dto/create-promoter.dto';
import { UpdateSuperAdminProfileDto } from './dto/update-superadmin-profile.dto';
import { CreatePlatformExpenseDto } from './dto/create-platform-expense.dto';
import { RecordSeniatPaymentDto } from './dto/record-seniat-payment.dto';
import { SettingsService } from '../settings/settings.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';

@Controller('superadmin')
export class SuperAdminController {
  constructor(
    private readonly superadminService: SuperAdminService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Endpoint for tenants to view their own subscription & referral discount calculations
   */
  @Get('my-subscription')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getMySubscription(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return await this.superadminService.getMySubscription(tenantId);
  }

  /**
   * Endpoint for tenants to report a payment
   */
  @Post('payments/report')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async reportPayment(
    @Req() req: any,
    @Body() body: ReportPaymentDto,
  ) {
    const tenantId = req.user.tenantId;
    return await this.superadminService.reportPayment(tenantId, body);
  }

  /**
   * Endpoint for tenants or SuperAdmin to view official SaaS payment reception accounts
   */
  @Get('platform-config')
  async getPlatformConfig() {
    return await this.superadminService.getPlatformConfig();
  }

  /**
   * Endpoint for SuperAdmin to update official SaaS payment accounts & subscription defaults
   */
  @Put('platform-config')
  @UseGuards(SuperAdminGuard)
  async updatePlatformConfig(@Body() body: UpdatePlatformConfigDto) {
    return await this.superadminService.updatePlatformConfig(body);
  }

  // --- STRICT SUPERADMIN PROTECTED ROUTES ---

  @Get('tenants')
  @UseGuards(SuperAdminGuard)
  async getTenants() {
    return await this.superadminService.getTenants();
  }

  @Patch('tenants/:id/plan')
  @UseGuards(SuperAdminGuard)
  async updateTenantPlan(
    @Param('id') id: string,
    @Body() body: UpdateTenantPlanDto,
  ) {
    return await this.superadminService.updateTenantPlan(id, body);
  }

  @Delete('tenants/:id')
  @UseGuards(SuperAdminGuard)
  async deleteTenant(@Param('id') id: string) {
    return await this.superadminService.deleteTenant(id);
  }

  @Get('payments')
  @UseGuards(SuperAdminGuard)
  async getPendingPayments() {
    return await this.superadminService.getPendingPayments();
  }

  @Post('payments/:id/approve')
  @UseGuards(SuperAdminGuard)
  async approvePayment(@Param('id') id: string) {
    return await this.superadminService.approvePayment(id);
  }

  @Post('payments/:id/reject')
  @UseGuards(SuperAdminGuard)
  async rejectPayment(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return await this.superadminService.rejectPayment(id, reason);
  }

  @Get('promoters')
  @UseGuards(SuperAdminGuard)
  async getPromoters() {
    return await this.superadminService.getPromotersOverview();
  }

  @Post('promoters')
  @UseGuards(SuperAdminGuard)
  async createPromoter(@Body() body: CreatePromoterDto) {
    return await this.superadminService.createPromoter(body);
  }

  @Post('promoters/commissions/:id/pay')
  @UseGuards(SuperAdminGuard)
  async payCommission(
    @Param('id') id: string,
    @Body('paymentReference') paymentReference: string,
  ) {
    return await this.superadminService.payPromoterCommission(id, paymentReference);
  }

  @Post('promoters/:id/payout-bulk')
  @UseGuards(SuperAdminGuard)
  async payBulkCommissions(
    @Param('id') id: string,
    @Body('paymentReference') paymentReference: string,
    @Body('commissionIds') commissionIds?: string[],
  ) {
    return await this.superadminService.payBulkPromoterCommissions(
      id,
      paymentReference,
      commissionIds,
    );
  }

  @Get('profile')
  @UseGuards(SuperAdminGuard)
  async getProfile(@Req() req: any) {
    return await this.superadminService.getSuperAdminProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(SuperAdminGuard)
  async updateProfile(
    @Req() req: any,
    @Body() body: UpdateSuperAdminProfileDto,
  ) {
    return await this.superadminService.updateSuperAdminProfile(req.user.id, body);
  }

  @Get('rates')
  @UseGuards(SuperAdminGuard)
  async getRates() {
    return await this.settingsService.getSettings();
  }

  @Post('sync-rates')
  @UseGuards(SuperAdminGuard)
  async syncRates() {
    return await this.settingsService.syncRates();
  }

  // --- SaaS PLATFORM FINANCES, TAXES (SENIAT) & EXPENSES ---

  @Get('finances/metrics')
  @UseGuards(SuperAdminGuard)
  async getFinanceMetrics() {
    return await this.superadminService.getFinanceMetrics();
  }

  @Get('finances/expenses')
  @UseGuards(SuperAdminGuard)
  async getExpenses(
    @Query('type') type?: string,
    @Query('month') month?: string,
    @Query('search') search?: string,
  ) {
    return await this.superadminService.getExpenses({ type, month, search });
  }

  @Post('finances/expenses')
  @UseGuards(SuperAdminGuard)
  async createExpense(@Body() body: CreatePlatformExpenseDto) {
    return await this.superadminService.createExpense(body);
  }

  @Post('finances/seniat')
  @UseGuards(SuperAdminGuard)
  async recordSeniatPayment(@Body() body: RecordSeniatPaymentDto) {
    return await this.superadminService.recordSeniatPayment(body);
  }

  @Delete('finances/expenses/:id')
  @UseGuards(SuperAdminGuard)
  async deleteExpense(@Param('id') id: string) {
    return await this.superadminService.deleteExpense(id);
  }
}

