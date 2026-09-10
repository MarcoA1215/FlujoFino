import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderStatus } from '@nutrideli/shared-types';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(private dataSource: DataSource) {}

  async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) throw new BadRequestException('Pedido no encontrado');
    
    // Validar regla de negocio: Descuento de stock en estado DELIVERED
    if (newStatus === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      return this.dataSource.transaction(async (manager) => {
        // 1. Cambiar estado
        order.status = newStatus;
        const updatedOrder = await manager.save(Order, order);

        // 2. Descontar stock de producto terminado para cada item
        for (const item of order.items) {
          const product = await manager.findOne(Product, { where: { id: item.productId } });
          if (!product || product.stockQuantity < item.quantity) {
             throw new BadRequestException(`Stock insuficiente para el producto terminado ${product?.name}`);
          }

          // Descontar
          product.stockQuantity -= item.quantity;
          await manager.save(Product, product);
        }
        return updatedOrder;
      });
    }

    // Actualización de estado normal
    order.status = newStatus;
    return orderRepo.save(order);
  }
}
