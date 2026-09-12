import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { PaymentStatus, OrderStatus, MovementType } from '@nutrideli/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';

export class CreateOrderDto {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  amountBs?: number;
  exchangeRate?: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export class UpdatePaymentDto {
  status: PaymentStatus;
  notes?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  amountBs?: number;
  exchangeRate?: number;
}

@Injectable()
export class OrdersService {
  constructor(private dataSource: DataSource) {}

  async createOrder(dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;

      // Create Order
      const order = manager.create(Order, {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        notes: dto.notes || '',
        paymentStatus: dto.paymentStatus,
        status: OrderStatus.PENDING,
        totalAmount: 0,
        pagoMovilRef: dto.pagoMovilRef,
        pagoMovilPhone: dto.pagoMovilPhone,
        pagoMovilCedula: dto.pagoMovilCedula,
        pagoMovilBank: dto.pagoMovilBank,
        amountBs: dto.amountBs,
        exchangeRate: dto.exchangeRate,
      });
      const savedOrder = await manager.save(Order, order);

      // Process Items
      for (const itemDto of dto.items) {
        const product = await manager.findOne(Product, { 
          where: { id: itemDto.productId },
          relations: {
            comboItems: { component: true },
            recipe: { rawMaterial: true }
          }
        });
        
        if (!product) {
          throw new BadRequestException(`Producto no encontrado (ID: ${itemDto.productId})`);
        }

        const subtotal = itemDto.quantity * itemDto.unitPrice;
        totalAmount += subtotal;

        // Si es un combo, se descuenta el stock de sus componentes y de sus insumos directos
        if (product.comboItems && product.comboItems.length > 0) {
          // Descontar componentes (Sub-productos)
          for (const ci of product.comboItems) {
            if (ci.component) {
              ci.component.stockQuantity -= (itemDto.quantity * ci.quantity);
              await manager.save(Product, ci.component);
            }
          }
          // Descontar insumos directos del combo (ej. la bandeja de empaque)
          if (product.recipe && product.recipe.length > 0) {
            for (const ri of product.recipe) {
              if (ri.rawMaterial) {
                ri.rawMaterial.stockQuantity -= (itemDto.quantity * ri.quantity);
                await manager.save(RawMaterial, ri.rawMaterial);
                
                // Registrar movimiento de salida para la materia prima
                const mov = manager.create(StockMovement, {
                  rawMaterialId: ri.rawMaterial.id,
                  type: MovementType.OUT_SALE,
                  quantity: itemDto.quantity * ri.quantity,
                  totalCost: (itemDto.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                  description: `Venta de Combo: ${product.name}`
                });
                await manager.save(StockMovement, mov);
              }
            }
          }
        } else {
          // Deduct Stock normally for regular product
          product.stockQuantity -= itemDto.quantity;
          await manager.save(Product, product);
        }

        // Save OrderItem
        const orderItem = manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: product.id,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          subtotal: subtotal,
        });
        await manager.save(OrderItem, orderItem);
      }

      savedOrder.totalAmount = totalAmount;
      return manager.save(Order, savedOrder);
    });
  }

  async getAllOrders() {
    return this.dataSource.getRepository(Order).find({
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async updatePaymentStatus(id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    
    order.paymentStatus = dto.status;
    if (dto.notes) order.notes = dto.notes;
    if (dto.pagoMovilRef) order.pagoMovilRef = dto.pagoMovilRef;
    if (dto.pagoMovilPhone) order.pagoMovilPhone = dto.pagoMovilPhone;
    if (dto.pagoMovilCedula) order.pagoMovilCedula = dto.pagoMovilCedula;
    if (dto.pagoMovilBank) order.pagoMovilBank = dto.pagoMovilBank;
    if (dto.amountBs) order.amountBs = dto.amountBs;
    if (dto.exchangeRate) order.exchangeRate = dto.exchangeRate;

    return orderRepo.save(order);
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ 
      where: { id },
      relations: { items: true } 
    });
    
    if (!order) throw new BadRequestException('Pedido no encontrado');

    // Validación solicitada: No entregar si stock actual de los productos está negativo (backorder).
    if (status === OrderStatus.DELIVERED) {
      const productRepo = this.dataSource.getRepository(Product);
      for (const item of order.items) {
        const product = await productRepo.findOne({ 
          where: { id: item.productId },
          relations: {
            comboItems: { component: true }
          }
        });
        
        if (product) {
          if (product.comboItems && product.comboItems.length > 0) {
            // Verificar si algún componente quedó en negativo
            for (const ci of product.comboItems) {
              if (ci.component && ci.component.stockQuantity < 0) {
                throw new BadRequestException(`No se puede entregar el pedido. El componente ${ci.component.name} del combo ${product.name} tiene inventario negativo (${ci.component.stockQuantity}).`);
              }
            }
          } else {
            // Verificación normal
            if (product.stockQuantity < 0) {
              throw new BadRequestException(`No se puede entregar el pedido. El producto ${product.name} tiene inventario negativo (${product.stockQuantity}). ¡Debe producir más primero!`);
            }
          }
        }
      }
    }

    order.status = status;
    return orderRepo.save(order);
  }
}
