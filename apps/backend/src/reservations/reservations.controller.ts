import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@finowork/shared-types';
import { safeImageUploadOptions } from '../common/utils/multer-options';

@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get('availability')
  getAvailability(
    @Request() req,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
    @Query('exclude') exclude?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.calculateAvailableSlots(req.user.tenantId, date, serviceId, exclude, employeeId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN)
  getAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post('shift')
  @Roles(UserRole.ADMIN, UserRole.POS)
  shift(@Request() req, @Body() dto: { date: string, timeFrom: string, minutes: number }) {
    return this.service.shiftPendingReservations(req.user.tenantId, dto.date, dto.timeFrom, dto.minutes);
  }

  @Post('block')
  @Roles(UserRole.ADMIN, UserRole.POS)
  blockSchedule(@Request() req, @Body() dto: {
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    employeeId?: string;
    employeeName?: string;
    reason?: string;
  }) {
    return this.service.createScheduleBlock(req.user.tenantId, dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.POS)
  create(@Request() req, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.POS)
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN)
  updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: any) {
    return this.service.updateStatus(req.user.tenantId, id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }

  @Post(':id/media')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN)
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  uploadMedia(@Request() req, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadMedia(req.user.tenantId, id, file);
  }

  @Delete(':id/media')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN)
  removeMedia(@Request() req, @Param('id') id: string) {
    return this.service.removeMedia(req.user.tenantId, id);
  }

  @Post(':id/abono')
  @Roles(UserRole.ADMIN, UserRole.POS)
  addAbono(
    @Request() req,
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('method') method?: string,
    @Body('ref') ref?: string,
    @Body('bank') bank?: string,
  ) {
    return this.service.addAbono(req.user.tenantId, id, amount, method, ref, bank);
  }

  @Post(':id/pay-full')
  @Roles(UserRole.ADMIN, UserRole.POS)
  payFull(@Request() req, @Param('id') id: string) {
    return this.service.payFull(req.user.tenantId, id);
  }

  @Patch(':id/approve-payment')
  @Roles(UserRole.ADMIN, UserRole.POS)
  approvePayment(@Request() req, @Param('id') id: string) {
    return this.service.approvePayment(req.user.tenantId, id);
  }

  @Patch(':id/reject-payment')
  @Roles(UserRole.ADMIN, UserRole.POS)
  rejectPayment(@Request() req, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.rejectPayment(req.user.tenantId, id, reason);
  }

  @Delete(':id/abono/:index')
  @Roles(UserRole.ADMIN)
  revertAbono(@Request() req, @Param('id') id: string, @Param('index') index: string) {
    return this.service.revertAbono(req.user.tenantId, id, index);
  }

  @Post(':id/notify-delay')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN)
  notifyDelay(
    @Request() req,
    @Param('id') id: string,
    @Body('minutes') minutes: number,
  ) {
    return this.service.notifyDelay(req.user.tenantId, id, Number(minutes) || 15);
  }

  @Post(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.POS)
  reschedule(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: { date: string; time: string; reason?: string; force?: boolean },
  ) {
    return this.service.reschedule(req.user.tenantId, id, dto);
  }
}

