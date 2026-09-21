import { Controller, Request, Get, Post, Body, Param, Patch, Delete, Put } from '@nestjs/common';
import { OrdersService, CreateOrderDto, UpdatePaymentDto } from './orders.service';
import { OrderStatus } from '@nutrideli/shared-types';

@Controller('orders')
export class OrdersController {
  @Post(':id/abono')
  addAbono(@Request() req: any, @Param('id') id: string, @Body('amount') amount: number) {
    return this.ordersService.addAbono(req.user.tenantId, id, amount);}

  @Delete(':id/abono/:index')
  revertAbono(@Request() req: any, @Param('id') id: string, @Param('index') index: string) {
    return this.ordersService.revertAbono(req.user.tenantId, id, parseInt(index, 10));}

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.tenantId, dto, req.user?.id);
  }

  @Get()
  getAllOrders(@Request() req: any) {
    return this.ordersService.getAllOrders(req.user.tenantId);}

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
