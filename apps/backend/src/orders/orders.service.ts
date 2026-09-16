import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { PaymentStatus, OrderStatus, MovementType, DeliveryMethod } from '@nutrideli/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';

export class CreateOrderDto {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  deliveryZoneId?: string;
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
      let deliveryFee = 0;

      if (dto.deliveryMethod === DeliveryMethod.DELIVERY && dto.deliveryZoneId) {
        const zone = await manager.findOne(DeliveryZone, { where: { id: dto.deliveryZoneId } });
        if (zone) {
          deliveryFee = zone.feePrice;
        }
      }

      // Check if we have enough available stock (Disponible) for everything
      let requiresPreparation = false;
      for (const itemDto of dto.items) {
        const product = await manager.findOne(Product, { 
          where: { id: itemDto.productId },
          relations: { comboItems: { component: true } }
        });
        if (product) {
          if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component && ci.component.stockQuantity < (itemDto.quantity * ci.quantity)) {
                requiresPreparation = true;
              }
            }
          } else if (!product.isCombo || product.isPreAssembled) {
            if (product.stockQuantity < itemDto.quantity) {
              requiresPreparation = true;
            }
          }
        }
      }

      const initialStatus = requiresPreparation ? OrderStatus.PREPARING : OrderStatus.PENDING;

      const order = manager.create(Order, {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        notes: dto.notes || '',
        paymentStatus: dto.paymentStatus,
        status: initialStatus,
        deliveryMethod: dto.deliveryMethod || DeliveryMethod.IN_STORE,
        deliveryZoneId: dto.deliveryZoneId,
        deliveryFee: deliveryFee,
        totalAmount: 0,
        pagoMovilRef: dto.pagoMovilRef,
        pagoMovilPhone: dto.pagoMovilPhone,
        pagoMovilCedula: dto.pagoMovilCedula,
        pagoMovilBank: dto.pagoMovilBank,
        amountBs: dto.amountBs,
        exchangeRate: dto.exchangeRate,
      });
      const savedOrder = await manager.save(Order, order);

      for (const itemDto of dto.items) {
        const product = await manager.findOne(Product, { 
          where: { id: itemDto.productId },
          relations: { comboItems: { component: true }, recipe: { rawMaterial: true } }
        });
        
        if (!product) throw new BadRequestException('Producto no encontrado');

        const subtotal = itemDto.quantity * itemDto.unitPrice;
        totalAmount += subtotal;

        if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
          for (const ci of product.comboItems) {
            if (ci.component) {
              ci.component.stockQuantity -= (itemDto.quantity * ci.quantity);
              await manager.save(Product, ci.component);
            }
          }
          if (product.recipe && product.recipe.length > 0) {
            for (const ri of product.recipe) {
              if (ri.rawMaterial) {
                ri.rawMaterial.stockQuantity -= (itemDto.quantity * ri.quantity);
                await manager.save(RawMaterial, ri.rawMaterial);
                const mov = manager.create(StockMovement, {
                  rawMaterialId: ri.rawMaterial.id,
                  type: MovementType.OUT_SALE,
                  quantity: itemDto.quantity * ri.quantity,
                  totalCost: (itemDto.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                  description: 'Venta de Combo: ' + product.name
                });
                await manager.save(StockMovement, mov);
              }
            }
          }
        } else if (!product.isCombo || product.isPreAssembled) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }

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

      savedOrder.totalAmount = totalAmount + deliveryFee;
      return manager.save(Order, savedOrder);
    });
  }

  async getAllOrders() {
    return this.dataSource.getRepository(Order).find({
      relations: { items: { product: true }, deliveryZone: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updatePaymentStatus(id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido está cancelado');
    
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
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { id },
        relations: { items: true } 
      });
      
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido ya está cancelado');

      if (status === OrderStatus.DELIVERED) {
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { id: item.productId },
            relations: { comboItems: { component: true } }
          });
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
              for (const ci of product.comboItems) {
                if (ci.component) {
                  if (ci.component.physicalStock < (item.quantity * ci.quantity)) {
                    throw new BadRequestException('Falta stock físico para entregar');
                  }
                  ci.component.physicalStock -= (item.quantity * ci.quantity);
                  await manager.save(Product, ci.component);
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
                if (product.physicalStock < item.quantity) {
                  throw new BadRequestException('Falta stock físico para entregar');
                }
                product.physicalStock -= item.quantity;
                await manager.save(Product, product);
              }
          }
        }
      }

      if (status === OrderStatus.CANCELED) {
        // Reverse inventory
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { id: item.productId },
            relations: { comboItems: { component: true }, recipe: { rawMaterial: true } }
          });
          
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
              // Restore combo components
              for (const ci of product.comboItems) {
                if (ci.component) {
                  ci.component.stockQuantity += (item.quantity * ci.quantity);
                  if (order.status === OrderStatus.DELIVERED) {
                     ci.component.physicalStock += (item.quantity * ci.quantity);
                  }
                  await manager.save(Product, ci.component);
                }
              }
              // Restore raw materials
              if (product.recipe && product.recipe.length > 0) {
                for (const ri of product.recipe) {
                  if (ri.rawMaterial) {
                    ri.rawMaterial.stockQuantity += (item.quantity * ri.quantity);
                    await manager.save(RawMaterial, ri.rawMaterial);
                    const mov = manager.create(StockMovement, {
                      rawMaterialId: ri.rawMaterial.id,
                      type: MovementType.IN,
                      quantity: item.quantity * ri.quantity,
                      totalCost: (item.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                      description: 'Reverso por Cancelación de Pedido: ' + order.id
                    });
                    await manager.save(StockMovement, mov);
                  }
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
                product.stockQuantity += item.quantity;
              if (order.status === OrderStatus.DELIVERED) {
                 product.physicalStock += item.quantity;
              }
              await manager.save(Product, product);
            }
          }
        }
        // Reverse Payment
        if (order.paymentStatus === PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.REFUNDED;
        }
      }

      order.status = status;
      return manager.save(Order, order);
    });
  }

  async cloneOrder(id: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ 
      where: { id },
      relations: { items: true } 
    });
    if (!order) throw new BadRequestException('Pedido original no encontrado');

    const dto = new CreateOrderDto();
    dto.customerName = order.customerName + ' (Clon)';
    dto.customerPhone = order.customerPhone;
    dto.customerAddress = order.customerAddress;
    dto.notes = order.notes;
    dto.paymentStatus = order.paymentStatus === PaymentStatus.REFUNDED ? PaymentStatus.PAID : order.paymentStatus;
    dto.deliveryMethod = order.deliveryMethod;
    dto.deliveryZoneId = order.deliveryZoneId;
    dto.pagoMovilRef = order.pagoMovilRef;
    dto.pagoMovilPhone = order.pagoMovilPhone;
    dto.pagoMovilCedula = order.pagoMovilCedula;
    dto.pagoMovilBank = order.pagoMovilBank;
    dto.amountBs = order.amountBs;
    dto.exchangeRate = order.exchangeRate;
    dto.items = order.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    }));

    return this.createOrder(dto);
  }

  async autoAllocatePhysicalStock() {
    // This is the intelligent FIFO routing system
    return this.dataSource.transaction(async (manager) => {
      // 1. Get all active orders (PENDING and PREPARING) ordered by creation date (FIFO)
      const activeOrders = await manager.find(Order, {
        where: [
          { status: OrderStatus.PENDING },
          { status: OrderStatus.PREPARING }
        ],
        order: { createdAt: 'ASC' },
        relations: { items: true }
      });

      // 2. We need a fast lookup for physical stock
      const products = await manager.find(Product, {
        relations: { comboItems: { component: true } }
      });
      const physicalStockMap = new Map<string, number>();
      for (const p of products) {
        physicalStockMap.set(p.id, p.physicalStock);
      }

      let changes = 0;

      // 3. Evaluate each order in FIFO order
      for (const order of activeOrders) {
        let canFulfill = true;

        // Simulate deducting from our virtual physicalStockMap
        const deductions = new Map<string, number>();

        for (const item of order.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component) {
                const currentPhysical = physicalStockMap.get(ci.component.id) || 0;
                const required = item.quantity * ci.quantity;
                if (currentPhysical < required) {
                  canFulfill = false;
                  break;
                }
                deductions.set(ci.component.id, (deductions.get(ci.component.id) || 0) + required);
              }
            }
          } else if (!product.isCombo || product.isPreAssembled) {
              const currentPhysical = physicalStockMap.get(product.id) || 0;
              if (currentPhysical < item.quantity) {
              canFulfill = false;
            } else {
              deductions.set(product.id, (deductions.get(product.id) || 0) + item.quantity);
            }
          }
          if (!canFulfill) break;
        }

        if (canFulfill) {
          // Commit deductions to our tracking map so subsequent orders see less stock
          for (const [pId, amount] of deductions.entries()) {
            physicalStockMap.set(pId, (physicalStockMap.get(pId) || 0) - amount);
          }
          
          if (order.status !== OrderStatus.PENDING) {
            order.status = OrderStatus.PENDING;
            await manager.save(Order, order);
            changes++;
          }
        } else {
          // If it CANNOT be fulfilled, and it's currently PENDING, it must be downgraded to PREPARING
          if (order.status !== OrderStatus.PREPARING) {
            order.status = OrderStatus.PREPARING;
            await manager.save(Order, order);
            changes++;
          }
        }
      }

      return { success: true, processedOrders: activeOrders.length, statusChanges: changes };
    });
  }

}