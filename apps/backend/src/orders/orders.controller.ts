import { Controller, Request, Get, Post, Body, Param, Patch, Delete, Put, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards } from '@nestjs/common';
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
  addAbono(
    @Request() req: any,
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('method') method?: string,
    @Body('ref') ref?: string
  ) {
    return this.ordersService.addAbono(req.user.tenantId, id, amount, method, ref);
  }

  @Delete(':id/abono/:index')
  revertAbono(@Request() req: any, @Param('id') id: string, @Param('index') index: string) {
    return this.ordersService.revertAbono(req.user.tenantId, id, parseInt(index, 10));}

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
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.tenantId, dto, req.user?.id);
  }

  @Post('sync-offline')
  syncOffline(@Request() req: any, @Body('orders') orders: any[]) {
    return this.ordersService.syncOfflineOrders(req.user.tenantId, orders, req.user?.id);
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

  @Get(':id')
  getOrderById(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.tenantId, id);}

  @Patch(':id/payment')
  updatePaymentStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.ordersService.updatePaymentStatus(req.user.tenantId, id, dto);}

  @Patch(':id/approve-payment')
  approvePayment(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.approvePayment(req.user.tenantId, id);
  }

  @Patch(':id/reject-payment')
  rejectPayment(@Request() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.ordersService.rejectPayment(req.user.tenantId, id, reason);
  }

  @Post('fondo-caja')
  registerFondoCaja(
    @Request() req: any,
    @Body('amount') amount: number,
    @Body('description') description?: string
  ) {
    return this.ordersService.registerFondoCaja(req.user.tenantId, amount, description);
  }

  @Patch(':id/status')
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('driverId') driverId?: string,
  ) {
    return this.ordersService.updateOrderStatus(req.user.tenantId, id, status, req.user?.id, req.user?.role, driverId);
  }

  @Post(':id/clone')
  clone(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.cloneOrder(req.user.tenantId, id);
  }

  @Put(':id')
  editOrder(@Request() req: any, @Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.editOrder(req.user.tenantId, id, dto, req.user?.id, req.user?.role);
  }

  @Post(':id/deliver-partial')
  deliverPartial(@Request() req: any, @Param('id') id: string, @Body('deliveries') deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.ordersService.deliverPartial(req.user.tenantId, id, deliveries);}

  @Get('auto-allocate')
  autoAllocate(@Request() req: any) {
    return this.ordersService.autoAllocatePhysicalStock(req.user.tenantId);}

  @Patch(':id/confirm-supplier')
  confirmSupplier(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.confirmSupplier(req.user.tenantId, id);
  }

  @Patch(':id/reject-supplier')
  rejectSupplier(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.rejectSupplier(req.user.tenantId, id);
  }

  @Patch(':id/assign-delivery')
  assignDelivery(
    @Request() req: any,
    @Param('id') id: string,
    @Body('deliveryUserId') deliveryUserId?: string,
    @Body('driverId') driverId?: string,
  ) {
    return this.ordersService.assignDelivery(req.user.tenantId, id, driverId || deliveryUserId);
  }
}
