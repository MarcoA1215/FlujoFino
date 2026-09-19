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
  tableNumber?: string;
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
  initialAbono?: number;
  discountAmount?: number;
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

  async addAbono(orderId: string, amount: number) {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    const history = order.abonosHistory || [];
    history.push({ id: Date.now().toString(), amount, date: new Date().toISOString() });
    order.abonosHistory = history;
    order.abonosTotal = (order.abonosTotal || 0) + amount;
    if (order.abonosTotal >= order.totalAmount) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (order.abonosTotal > 0 && order.abonosTotal < order.totalAmount) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    }
    
    return this.dataSource.getRepository(Order).save(order);
  }

  async revertAbono(orderId: string, index: number) {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    const history = order.abonosHistory || [];
    if (index >= 0 && index < history.length) {
      const removed = history.splice(index, 1)[0];
      order.abonosHistory = history;
      order.abonosTotal = (order.abonosTotal || 0) - removed.amount;
      if (order.abonosTotal === 0) {
        order.paymentStatus = PaymentStatus.PENDING;
      } else if (order.abonosTotal > 0 && order.abonosTotal < order.totalAmount) {
        order.paymentStatus = PaymentStatus.PARTIAL;
      }
      
      return this.dataSource.getRepository(Order).save(order);
    }
    return order;
  }

  async createOrder(dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      let totalCost = 0;
      let deliveryFee = 0;
      const discountAmount = dto.discountAmount || 0;

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
          tableNumber: dto.tableNumber || '',
          paymentStatus: dto.paymentStatus,
          status: initialStatus,
          deliveryMethod: dto.deliveryMethod || DeliveryMethod.IN_STORE,
          deliveryZoneId: dto.deliveryZoneId,
          deliveryFee: deliveryFee,
          discountAmount: discountAmount,
          totalCost: 0,
          netProfit: 0,
          totalAmount: 0,
        pagoMovilRef: dto.pagoMovilRef,
        pagoMovilPhone: dto.pagoMovilPhone,
        pagoMovilCedula: dto.pagoMovilCedula,
        pagoMovilBank: dto.pagoMovilBank,
          amountBs: dto.amountBs,
          exchangeRate: dto.exchangeRate,
          abonosTotal: dto.initialAbono || 0,
          abonosHistory: (dto.initialAbono && dto.initialAbono > 0) ? [{ id: Date.now().toString(), amount: dto.initialAbono, date: new Date().toISOString() }] : []
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
        } else if (!product.isCombo || product.isPreAssembled) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
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
                description: 'Venta de Producto: ' + product.name
              });
              await manager.save(StockMovement, mov);
            }
          }
        }

        let unitCost = 0;
        if (product.isCombo && !product.isPreAssembled && product.comboItems) {
            for (const ci of product.comboItems) {
                if (ci.component) {
                    const comp = await manager.findOne(Product, { where: { id: ci.component.id }, relations: { recipe: { rawMaterial: true } } });
                    if (comp && comp.recipe) {
                        for (const ri of comp.recipe) {
                            if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit * ci.quantity;
                        }
                    }
                }
            }
        }
        if (product.recipe && product.recipe.length > 0) {
            for (const ri of product.recipe) {
                if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit;
            }
        }
        
        totalCost += unitCost * itemDto.quantity;

        const orderItem = manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: product.id,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          unitCost: unitCost,
          subtotal: subtotal,
          deliveredQuantity: 0
        });
        await manager.save(OrderItem, orderItem);
      }

        const effectiveTotal = totalAmount + deliveryFee;
        const cappedDiscount = Math.min(discountAmount, effectiveTotal);

        savedOrder.discountAmount = cappedDiscount;
        savedOrder.totalAmount = effectiveTotal - cappedDiscount;
        savedOrder.totalCost = totalCost;
        savedOrder.netProfit = savedOrder.totalAmount - deliveryFee - totalCost;
      if (savedOrder.abonosTotal >= savedOrder.totalAmount && savedOrder.totalAmount > 0) {
          savedOrder.paymentStatus = PaymentStatus.PAID;
        } else if (savedOrder.abonosTotal > 0 && savedOrder.abonosTotal < savedOrder.totalAmount) {
          savedOrder.paymentStatus = PaymentStatus.PARTIAL;
        }
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
    dto.tableNumber = order.tableNumber;
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

  async editOrder(id: string, dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { id },
        relations: { items: true }
      });
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('No se puede editar un pedido entregado o cancelado');
      }
  
      const oldItemsMap = new Map<string, OrderItem>();
      for (const item of order.items) {
        oldItemsMap.set(item.productId, item);
      }
  
      const newItemsMap = new Map<string, any>();
      for (const item of dto.items) {
        newItemsMap.set(item.productId, item);
      }
  
      let totalAmount = 0;
      let totalCost = 0;
      const discountAmount = dto.discountAmount || order.discountAmount || 0;
      
      const adjustProductStock = async (productId: string, quantity: number, isDeduction: boolean) => {
        const product = await manager.findOne(Product, { 
          where: { id: productId },
          relations: { recipe: { rawMaterial: true }, comboItems: { component: true } }
        });
        if (!product) return;
        
        const multiplier = isDeduction ? -1 : 1;
        
        if (product.isCombo && !product.isPreAssembled && product.comboItems) {
          for (const cItem of product.comboItems) {
            if(cItem.component) {
              cItem.component.stockQuantity += (quantity * cItem.quantity * multiplier);
              await manager.save(Product, cItem.component);
            }
          }
        } else if (product.recipe && product.recipe.length > 0) {
          for (const rItem of product.recipe) {
            if(rItem.rawMaterial) {
              rItem.rawMaterial.stockQuantity += (quantity * rItem.quantity * multiplier);
              await manager.save(RawMaterial, rItem.rawMaterial);
            }
          }
        } else if (!product.isCombo || product.isPreAssembled) {
          product.stockQuantity += (quantity * multiplier);
          await manager.save(Product, product);
        }
      };

      for (const [productId, oldItem] of oldItemsMap.entries()) {
        const newItem = newItemsMap.get(productId);
        if (!newItem) {
          if (oldItem.deliveredQuantity > 0) {
            throw new BadRequestException('No se puede eliminar un item porque ya tiene entregas parciales');
          }
          await adjustProductStock(productId, oldItem.quantity, false);
          await manager.remove(OrderItem, oldItem);
        } else {
          if (newItem.quantity < oldItem.deliveredQuantity) {
            throw new BadRequestException('La nueva cantidad no puede ser menor a lo que ya se entregó');
          }
          const diff = newItem.quantity - oldItem.quantity;
          if (diff > 0) {
            await adjustProductStock(productId, diff, true);
          } else if (diff < 0) {
            await adjustProductStock(productId, Math.abs(diff), false);
          }
  
          oldItem.quantity = newItem.quantity;
          oldItem.unitPrice = newItem.unitPrice;
          oldItem.subtotal = newItem.quantity * newItem.unitPrice;
          await manager.save(OrderItem, oldItem);
          
          totalAmount += oldItem.subtotal;
          totalCost += oldItem.unitCost * oldItem.quantity;
        }
      }
  
      for (const [productId, newItem] of newItemsMap.entries()) {
        if (!oldItemsMap.has(productId)) {
          await adjustProductStock(productId, newItem.quantity, true);
          
          const product = await manager.findOne(Product, { 
             where: { id: productId },
             relations: { comboItems: { component: { recipe: { rawMaterial: true } } }, recipe: { rawMaterial: true } }
          });
          
          let unitCost = 0;
          if(product) {
              if (product.isCombo && !product.isPreAssembled && product.comboItems) {
                  for (const ci of product.comboItems) {
                      if (ci.component && ci.component.recipe) {
                          for (const ri of ci.component.recipe) {
                              if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit * ci.quantity;
                          }
                      }
                  }
              }
              if (product.recipe && product.recipe.length > 0) {
                  for (const ri of product.recipe) {
                      if (ri.rawMaterial) unitCost += ri.quantity * ri.rawMaterial.costPerUnit;
                  }
              }
          }
          
          const subtotal = newItem.quantity * newItem.unitPrice;
          const orderItem = manager.create(OrderItem, {
            orderId: order.id,
            productId: productId,
            productName: product?.name || '',
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            unitCost: unitCost,
            subtotal: subtotal,
            deliveredQuantity: 0
          });
          await manager.save(OrderItem, orderItem);
          totalAmount += subtotal;
          totalCost += unitCost * newItem.quantity;
        }
      }
  
      const effectiveTotalEdit = totalAmount + order.deliveryFee;
      const cappedDiscountEdit = Math.min(discountAmount, effectiveTotalEdit);

      order.customerName = dto.customerName;
      order.customerPhone = dto.customerPhone || '';
      order.customerAddress = dto.customerAddress || '';
      order.notes = dto.notes || '';
      order.tableNumber = dto.tableNumber || '';
      order.discountAmount = cappedDiscountEdit;
      order.totalCost = totalCost;
      order.totalAmount = effectiveTotalEdit - cappedDiscountEdit;
      order.netProfit = order.totalAmount - order.deliveryFee - totalCost;
      
      return manager.save(Order, order);
    });
  }
  
  async deliverPartial(id: string, deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { id },
        relations: { items: true } 
      });
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException('No se puede entregar parcialmente');
      }
  
      let allDelivered = true;
      let anyDelivered = false;
  
      for (const item of order.items) {
        const deliveryRequest = deliveries.find(d => d.orderItemId === item.id);
        if (deliveryRequest && deliveryRequest.quantityToDeliver > 0) {
          const newDelivered = item.deliveredQuantity + deliveryRequest.quantityToDeliver;
          if (newDelivered > item.quantity) {
            throw new BadRequestException('No puedes entregar más de la cantidad pedida');
          }
  
          const product = await manager.findOne(Product, { 
            where: { id: item.productId },
            relations: { comboItems: { component: true } }
          });
          
          if (product) {
            if (product.isCombo && !product.isPreAssembled && product.comboItems) {
              for (const cItem of product.comboItems) {
                if(cItem.component) {
                  cItem.component.physicalStock -= (deliveryRequest.quantityToDeliver * cItem.quantity);
                  await manager.save(Product, cItem.component);
                }
              }
            } else {
              product.physicalStock -= deliveryRequest.quantityToDeliver;
              await manager.save(Product, product);
            }
          }
  
          item.deliveredQuantity = newDelivered;
          await manager.save(OrderItem, item);
        }
  
        if (item.deliveredQuantity < item.quantity) {
          allDelivered = false;
        }
        if (item.deliveredQuantity > 0) {
          anyDelivered = true;
        }
      }
  
      if (allDelivered) {
        order.status = OrderStatus.DELIVERED;
      } else if (anyDelivered) {
        order.status = OrderStatus.PARTIALLY_DELIVERED;
      }
      
      return manager.save(Order, order);
    });
  }
}