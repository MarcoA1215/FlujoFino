import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { OrdersService, CreateOrderDto, UpdatePaymentDto } from './orders.service';
import { OrderStatus } from '@nutrideli/shared-types';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Patch(':id/payment')
  updatePaymentStatus(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.ordersService.updatePaymentStatus(id, dto);
  }

  @Patch(':id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string) {
    return this.ordersService.cloneOrder(id);
  }

  @Get('auto-allocate')
  autoAllocate() {
    return this.ordersService.autoAllocatePhysicalStock();
  }

}