import { Controller, Request, Get, Post, Body, Param, Patch, Delete, Put, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrdersService, CreateOrderDto, UpdatePaymentDto } from './orders.service';
import { StorageService } from '../storage/storage.service';
import { OrderStatus } from '@nutrideli/shared-types';

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
  @UseInterceptors(FileInterceptor('file'))
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

  @Get()
  getAllOrders(@Request() req: any) {
    return this.ordersService.getAllOrders(req.user.tenantId);}

  @Get('daily-cash-summary')
  getDailyCashSummary(@Request() req: any, @Query('date') date?: string) {
    return this.ordersService.getDailyCashSummary(req.user.tenantId, date);
  }

  @Get(':id')
  getOrderById(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.tenantId, id);}

  @Patch(':id/payment')
  updatePaymentStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.ordersService.updatePaymentStatus(req.user.tenantId, id, dto);}

  @Patch(':id/status')
  updateOrderStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateOrderStatus(req.user.tenantId, id, status);}

  @Post(':id/clone')
  clone(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.cloneOrder(req.user.tenantId, id);}

  @Put(':id')
  editOrder(@Request() req: any, @Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.editOrder(req.user.tenantId, id, dto, req.user?.id);
  }

  @Post(':id/deliver-partial')
  deliverPartial(@Request() req: any, @Param('id') id: string, @Body('deliveries') deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.ordersService.deliverPartial(req.user.tenantId, id, deliveries);}

  @Get('auto-allocate')
  autoAllocate(@Request() req: any) {
    return this.ordersService.autoAllocatePhysicalStock(req.user.tenantId);}

}
