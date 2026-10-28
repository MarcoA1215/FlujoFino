import { Controller, Request, Get, Post, Body, Param, Patch, Delete, Put, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrdersService, CreateOrderDto, UpdatePaymentDto } from './orders.service';
import { StorageService } from '../storage/storage.service';
import { safeImageUploadOptions } from '../common/utils/multer-options';
import { OrderStatus, UserRole } from '@finowork/shared-types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('orders')
export class OrdersController {
  @Post(':id/abono')
  @Roles(UserRole.ADMIN, UserRole.POS)
  addAbono(
    @Request() req: any,
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('method') method?: string,
    @Body('ref') ref?: string,
    @Body('bank') bank?: string,
    @Body('nextAbonoDueDate') nextAbonoDueDate?: string
  ) {
    return this.ordersService.addAbono(req.user.tenantId, id, amount, method, ref, bank, nextAbonoDueDate);
  }

  @Patch(':id/due-date')
  @Roles(UserRole.ADMIN, UserRole.POS)
  updateAbonoDueDate(
    @Request() req: any,
    @Param('id') id: string,
    @Body('nextAbonoDueDate') nextAbonoDueDate: string | null,
  ) {
    return this.ordersService.updateAbonoDueDate(req.user.tenantId, id, nextAbonoDueDate);
  }

  @Delete(':id/abono/:index')
  @Roles(UserRole.ADMIN)
  revertAbono(@Request() req: any, @Param('id') id: string, @Param('index') index: string) {
    return this.ordersService.revertAbono(req.user.tenantId, id, index);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  deleteOrder(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.deleteOrder(req.user.tenantId, id);
  }

  constructor(
    private readonly ordersService: OrdersService,
    private readonly storageService: StorageService
  ) {}

  @Post('items/:itemId/media')
  @UseInterceptors(FileInterceptor('file', safeImageUploadOptions))
  async uploadMedia(@Request() req: any, @Param('itemId') itemId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    
    const url = await this.storageService.uploadFile(file, `tenant-${req.user.tenantId}/orders`);
    await this.ordersService.addMediaToOrderItem(req.user.tenantId, itemId, url);

    return { url };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.POS)
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.tenantId, dto, req.user?.id, req.user?.role);
  }

  @Post('sync-offline')
  @Roles(UserRole.ADMIN, UserRole.POS)
  syncOffline(@Request() req: any, @Body('orders') orders: any[]) {
    return this.ordersService.syncOfflineOrders(req.user.tenantId, orders, req.user?.id, req.user?.role);
  }

  @Get()
  getAllOrders(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 150;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.ordersService.getAllOrders(req.user.tenantId, l, o);
  }

  @Get('daily-cash-summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.POS)
  getDailyCashSummary(@Request() req: any, @Query('date') date?: string) {
    return this.ordersService.getDailyCashSummary(req.user.tenantId, date);
  }

  @Get('export/csv')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.POS)
  async exportCsv(
    @Request() req: any,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const csvContent = await this.ordersService.exportOrdersCsv(tenantId, desde, hasta);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_transaccional_${desde}_${hasta}.csv"`);
    return res.status(200).send(csvContent);
  }

  @Get(':id')
  getOrderById(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.tenantId, id);}

  @Patch(':id/payment')
  @Roles(UserRole.ADMIN, UserRole.POS)
  updatePaymentStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.ordersService.updatePaymentStatus(req.user.tenantId, id, dto);}

  @Patch(':id/approve-payment')
  @Roles(UserRole.ADMIN, UserRole.POS)
  approvePayment(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.approvePayment(req.user.tenantId, id);
  }

  @Patch(':id/reject-payment')
  @Roles(UserRole.ADMIN, UserRole.POS)
  rejectPayment(@Request() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.ordersService.rejectPayment(req.user.tenantId, id, reason);
  }

  @Post('fondo-caja')
  @Roles(UserRole.ADMIN, UserRole.POS)
  registerFondoCaja(
    @Request() req: any,
    @Body('amount') amount: number,
    @Body('description') description?: string,
    @Body('currency') currency?: 'USD' | 'BS',
  ) {
    return this.ordersService.registerFondoCaja(req.user.tenantId, amount, description, currency);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.KITCHEN, UserRole.DELIVERY)
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('driverId') driverId?: string,
  ) {
    return this.ordersService.updateOrderStatus(req.user.tenantId, id, status, req.user?.id, req.user?.role, driverId);
  }

  @Post(':id/clone')
  @Roles(UserRole.ADMIN, UserRole.POS)
  clone(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.cloneOrder(req.user.tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.POS)
  editOrder(@Request() req: any, @Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.editOrder(req.user.tenantId, id, dto, req.user?.id, req.user?.role);
  }

  @Post(':id/deliver-partial')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.DELIVERY)
  deliverPartial(@Request() req: any, @Param('id') id: string, @Body('deliveries') deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.ordersService.deliverPartial(req.user.tenantId, id, deliveries);}

  @Get('auto-allocate')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY)
  autoAllocate(@Request() req: any) {
    return this.ordersService.autoAllocatePhysicalStock(req.user.tenantId);}

  @Patch(':id/confirm-supplier')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY)
  confirmSupplier(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.confirmSupplier(req.user.tenantId, id);
  }

  @Patch(':id/reject-supplier')
  @Roles(UserRole.ADMIN, UserRole.POS, UserRole.INVENTORY)
  rejectSupplier(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.rejectSupplier(req.user.tenantId, id);
  }

  @Patch(':id/assign-delivery')
  @Roles(UserRole.ADMIN, UserRole.POS)
  assignDelivery(
    @Request() req: any,
    @Param('id') id: string,
    @Body('deliveryUserId') deliveryUserId?: string,
    @Body('driverId') driverId?: string,
  ) {
    return this.ordersService.assignDelivery(req.user.tenantId, id, driverId || deliveryUserId);
  }
}
