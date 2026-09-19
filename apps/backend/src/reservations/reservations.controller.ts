import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  getAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post('shift')
  shift(@Request() req, @Body() dto: { date: string, timeFrom: string, minutes: number }) {
    return this.service.shiftPendingReservations(req.user.tenantId, dto.date, dto.timeFrom, dto.minutes);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Put(':id/status')
  updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: any) {
    return this.service.updateStatus(req.user.tenantId, id, status);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }

  @Post(':id/abono')
  addAbono(@Request() req, @Param('id') id: string, @Body('amount') amount: number) {
    return this.service.addAbono(req.user.tenantId, id, amount);
  }

  @Delete(':id/abono/:index')
  revertAbono(@Request() req, @Param('id') id: string, @Param('index') index: string) {
    return this.service.revertAbono(req.user.tenantId, id, parseInt(index, 10));
  }
}

