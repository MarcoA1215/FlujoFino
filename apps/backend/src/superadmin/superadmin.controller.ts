import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
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

@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly superadminService: SuperAdminService) {}

  /**
   * Endpoint for tenants to view their own subscription & referral discount calculations
   */
  @Get('my-subscription')
  async getMySubscription(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return await this.superadminService.getMySubscription(tenantId);
  }

  /**
   * Endpoint for tenants to report a payment
   */
  @Post('payments/report')
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
}

