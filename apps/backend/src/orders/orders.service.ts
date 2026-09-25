import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Between } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { PaymentStatus, OrderStatus, MovementType, DeliveryMethod, UserRole } from '@nutrideli/shared-types';
import { RawMaterial } from '../entities/raw-material.entity';
import { DeliveryZone } from '../entities/delivery-zone.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';

export class CreateOrderDto {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  tableNumber?: string;
  paymentStatus: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  deliveryZoneId?: string;
  employeeId?: string;
  employee_id?: string;
  paymentMethod?: string;
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
  paymentMethod?: string;
  notes?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  amountBs?: number;
  exchangeRate?: number;
}

import { CustomersService } from '../customers/customers.service';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private readonly customersService: CustomersService,
  ) {}

  async addAbono(tenantId: string, orderId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
    const order = await this.dataSource.getRepository(Order).findOne({ where: { tenantId, id: orderId } });
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

  async revertAbono(tenantId: string, orderId: string, index: number) {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { tenantId, id: orderId } });
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

  async createOrder(tenantId: string, dto: CreateOrderDto, authUserId?: string) {
    if (!dto.items || (dto.items.length === 0 && dto.paymentStatus !== PaymentStatus.PENDING)) {
      throw new BadRequestException('El carrito no puede estar vacío');
    }
    for (const item of dto.items || []) {
      if (item.quantity <= 0) throw new BadRequestException('La cantidad de un producto debe ser mayor a cero');
      if (item.unitPrice < 0) throw new BadRequestException('El precio no puede ser negativo');
    }
    if ((dto.discountAmount || 0) < 0) throw new BadRequestException('El descuento no puede ser negativo');

    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      let totalCost = 0;
      let deliveryFee = 0;
      const discountAmount = dto.discountAmount || 0;

      const targetEmployeeId = dto.employeeId || dto.employee_id || authUserId || null;
      let employeeIdToSave: string | undefined = undefined;
      if (targetEmployeeId) {
        const user = await manager.findOne(User, { where: { id: targetEmployeeId } });
        if (!user) {
          throw new BadRequestException('El empleado asignado no existe');
        }
        const access = await manager.findOne(UserTenantAccess, {
          where: { userId: targetEmployeeId, tenantId, isActive: true }
        });
        if (!access && user.role !== UserRole.ADMIN) {
          throw new BadRequestException('El empleado seleccionado no pertenece o no está activo en esta sucursal');
        }
        employeeIdToSave = user.id;
      }

      if (dto.deliveryMethod === DeliveryMethod.DELIVERY && dto.deliveryZoneId) {
        const zone = await manager.findOne(DeliveryZone, { where: { tenantId, id: dto.deliveryZoneId } });
        if (zone) {
          deliveryFee = zone.feePrice;
        }
      }

      // Check if we have enough available stock (Disponible) for everything
      let requiresPreparation = false;
      for (const itemDto of dto.items) {
        const product = await manager.findOne(Product, { 
          where: { tenantId, id: itemDto.productId },
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
            const isService = product.category === 'Servicios' || Boolean(product.durationMinutes);
            if (!isService && product.stockQuantity < itemDto.quantity) {
              requiresPreparation = true;
            }
          }
        }
      }

      const initialStatus = requiresPreparation ? OrderStatus.PREPARING : OrderStatus.PENDING;

      let customerId: string | undefined = undefined;
      let identification: string | undefined = dto.pagoMovilCedula;
      if (dto.customerName && dto.customerPhone) {
        try {
          const customer = await this.customersService.findOrCreateOrUpdate(tenantId, {
            name: dto.customerName,
            phone: dto.customerPhone,
            identification: dto.pagoMovilCedula
          });
          customerId = customer.id;
          if (!identification && customer.identification) {
            identification = customer.identification;
          }
        } catch (err) {
          console.error('Customer sync error in OrdersService.create:', err);
        }
      }

      const order = manager.create(Order, { tenantId,
        customerId,
        identification,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        notes: dto.notes || '',
        tableNumber: dto.tableNumber || '',
        paymentStatus: dto.paymentStatus,
        status: initialStatus,
        deliveryMethod: dto.deliveryMethod || DeliveryMethod.IN_STORE,
        deliveryZoneId: (dto.deliveryMethod === DeliveryMethod.DELIVERY && dto.deliveryZoneId && dto.deliveryZoneId.trim() !== '') ? dto.deliveryZoneId : undefined,
        deliveryFee: deliveryFee,
        discountAmount: discountAmount,
        totalCost: 0,
        netProfit: 0,
        totalAmount: 0,
        employeeId: employeeIdToSave,
        paymentMethod: dto.paymentMethod,
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
          where: { tenantId, id: itemDto.productId },
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
        } else if (product.recipe && product.recipe.length > 0 && !product.isPreAssembled) {
          for (const ri of product.recipe) {
            if (ri.rawMaterial) {
              ri.rawMaterial.stockQuantity -= (itemDto.quantity * ri.quantity);
              await manager.save(RawMaterial, ri.rawMaterial);
              const mov = manager.create(StockMovement, { tenantId,
                rawMaterialId: ri.rawMaterial.id,
                type: MovementType.OUT_SALE,
                quantity: itemDto.quantity * ri.quantity,
                totalCost: (itemDto.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                description: 'Venta de Producto: ' + product.name
              });
              await manager.save(StockMovement, mov);
            }
          }
        } else if (!product.isCombo || product.isPreAssembled) {
          const isService = product.category === 'Servicios' || Boolean(product.durationMinutes);
          if (!isService) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }
        }

        let unitCost = 0;
        if (product.isCombo && !product.isPreAssembled && product.comboItems) {
            for (const ci of product.comboItems) {
                if (ci.component) {
                    const comp = await manager.findOne(Product, { where: { tenantId, id: ci.component.id }, relations: { recipe: { rawMaterial: true } } });
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
        } else if (product.estimatedCost) {
            unitCost = Number(product.estimatedCost);
        }
        
        totalCost += unitCost * itemDto.quantity;

        const orderItem = manager.create(OrderItem, { tenantId,
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

  private mapOrderEmployee(order: Order, tenantId: string): Order {
    if (order && order.employee) {
      const access = order.employee.tenantAccess?.find(a => a.tenantId === tenantId);
      if (access) {
        if (access.jobTitle) {
          (order.employee as any).jobTitle = access.jobTitle;
        }
        if (access.role) {
          order.employee.role = access.role as any;
        }
      }
      delete (order.employee as any).passwordHash;
      delete (order.employee as any).tenantAccess;
    }
    return order;
  }

  async getAllOrders(tenantId: string) {
    const orders = await this.dataSource.getRepository(Order).find({
      where: { tenantId },
      relations: { items: { product: true, media: true }, deliveryZone: true, employee: { tenantAccess: true } },
      order: { createdAt: 'DESC' },
    });
    return orders.map(order => this.mapOrderEmployee(order, tenantId));
  }

  async getOrderById(tenantId: string, id: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { tenantId, id },
      relations: { items: { product: true, media: true }, deliveryZone: true, employee: { tenantAccess: true } }
    });
    return order ? this.mapOrderEmployee(order, tenantId) : null;
  }

  async updatePaymentStatus(tenantId: string, id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { tenantId, id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido está cancelado');
    
    order.paymentStatus = dto.status;
    if (dto.paymentMethod) order.paymentMethod = dto.paymentMethod;
    if (dto.notes) order.notes = dto.notes;
    if (dto.pagoMovilRef) order.pagoMovilRef = dto.pagoMovilRef;
    if (dto.pagoMovilPhone) order.pagoMovilPhone = dto.pagoMovilPhone;
    if (dto.pagoMovilCedula) order.pagoMovilCedula = dto.pagoMovilCedula;
    if (dto.pagoMovilBank) order.pagoMovilBank = dto.pagoMovilBank;
    if (dto.amountBs) order.amountBs = dto.amountBs;
    if (dto.exchangeRate) order.exchangeRate = dto.exchangeRate;

    return orderRepo.save(order);
  }

  async updateOrderStatus(tenantId: string, id: string, status: OrderStatus) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
        relations: { items: true } 
      });
      
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido ya está cancelado');

      if (status === OrderStatus.DELIVERED) {
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { tenantId, id: item.productId },
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
                const isService = product.category === 'Servicios' || Boolean(product.durationMinutes);
                if (!isService) {
                  if (product.physicalStock < item.quantity) {
                    throw new BadRequestException('Falta stock físico para entregar');
                  }
                  product.physicalStock -= item.quantity;
                  await manager.save(Product, product);
                }
              }
          }
        }
      }

      if (status === OrderStatus.CANCELED) {
        // Reverse inventory
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { tenantId, id: item.productId },
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
            } else if (product.recipe && product.recipe.length > 0 && !product.isPreAssembled) {
              // Restore raw materials
              for (const ri of product.recipe) {
                if (ri.rawMaterial) {
                  ri.rawMaterial.stockQuantity += (item.quantity * ri.quantity);
                  await manager.save(RawMaterial, ri.rawMaterial);
                  const mov = manager.create(StockMovement, { tenantId,
                    rawMaterialId: ri.rawMaterial.id,
                    type: MovementType.IN,
                    quantity: item.quantity * ri.quantity,
                    totalCost: (item.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                    description: 'Reverso por Cancelación de Pedido: ' + order.id
                  });
                  await manager.save(StockMovement, mov);
                }
              }
            } else if (!product.isCombo || product.isPreAssembled) {
                const isService = product.category === 'Servicios' || Boolean(product.durationMinutes);
                if (!isService) {
                  product.stockQuantity += item.quantity;
                  if (order.status === OrderStatus.DELIVERED) {
                    product.physicalStock += item.quantity;
                  }
                  await manager.save(Product, product);
                }
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

  async cloneOrder(tenantId: string, id: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ 
      where: { tenantId, id },
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

    return this.createOrder(tenantId, dto);
  }

  async autoAllocatePhysicalStock(tenantId: string) {
    // This is the intelligent FIFO routing system
    return this.dataSource.transaction(async (manager) => {
      // 1. Get all active orders (PENDING and PREPARING) ordered by creation date (FIFO)
      const activeOrders = await manager.find(Order, {
        where: [
          { status: OrderStatus.PENDING, tenantId },
          { status: OrderStatus.PREPARING, tenantId }
        ],
        order: { createdAt: 'ASC' },
        relations: { items: true }
      });

      // 2. We need a fast lookup for physical stock
      const products = await manager.find(Product, {
        where: { tenantId },
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

  async editOrder(tenantId: string, id: string, dto: CreateOrderDto, authUserId?: string) {
    if (!dto.items || (dto.items.length === 0 && dto.paymentStatus !== PaymentStatus.PENDING)) {
      throw new BadRequestException('El carrito no puede estar vacío');
    }
    for (const item of dto.items || []) {
      if (item.quantity <= 0) throw new BadRequestException('La cantidad de un producto debe ser mayor a cero');
      if (item.unitPrice < 0) throw new BadRequestException('El precio no puede ser negativo');
    }
    if ((dto.discountAmount || 0) < 0) throw new BadRequestException('El descuento no puede ser negativo');

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
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
          where: { tenantId, id: productId },
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
          const isService = product.category === 'Servicios' || Boolean(product.durationMinutes);
          if (!isService) {
            product.stockQuantity += (quantity * multiplier);
            await manager.save(Product, product);
          }
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
             where: { tenantId, id: productId },
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
              } else if (product.estimatedCost) {
                  unitCost = Number(product.estimatedCost);
              }
          }
          
          const subtotal = newItem.quantity * newItem.unitPrice;
          const orderItem = manager.create(OrderItem, { tenantId,
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

      const targetEmployeeId = dto.employeeId !== undefined ? dto.employeeId : (dto.employee_id !== undefined ? dto.employee_id : undefined);
      if (targetEmployeeId !== undefined) {
        if (targetEmployeeId) {
          const user = await manager.findOne(User, { where: { id: targetEmployeeId } });
          if (!user) {
            throw new BadRequestException('El empleado asignado no existe');
          }
          const access = await manager.findOne(UserTenantAccess, {
            where: { userId: targetEmployeeId, tenantId, isActive: true }
          });
          if (!access && user.role !== UserRole.ADMIN) {
            throw new BadRequestException('El empleado seleccionado no pertenece o no está activo en esta sucursal');
          }
          order.employeeId = user.id;
        } else {
          order.employeeId = null as any;
        }
      }

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
  
  async deliverPartial(tenantId: string, id: string, deliveries: { orderItemId: string, quantityToDeliver: number }[]) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { tenantId, id },
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
            where: { tenantId, id: item.productId },
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

  async addMediaToOrderItem(tenantId: string, orderItemId: string, imageUrl: string) {
    const OrderItemMedia = require('../entities/order-item-media.entity').OrderItemMedia; // Avoid circular/direct import issues if any
    return this.dataSource.transaction(async (manager) => {
      const orderItem = await manager.findOne(OrderItem, { 
        where: { id: orderItemId, order: { tenantId } },
        relations: { order: true }
      });
      if (!orderItem) throw new BadRequestException('Order Item no encontrado');

      const media = manager.create(OrderItemMedia, {
        tenantId,
        orderItemId: orderItem.id,
        imageUrl: imageUrl
      });
      
      await manager.save(OrderItemMedia, media);
      return media;
    });
  }

  async getDailyCashSummary(tenantId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const orders = await this.dataSource.getRepository(Order).find({
      where: {
        tenantId,
        createdAt: Between(startOfDay, endOfDay),
      },
      relations: { items: { product: true }, deliveryZone: true, employee: true },
      order: { createdAt: 'DESC' },
    });

    const settings = await this.dataSource.getRepository(Settings).findOne({ where: { tenantId } });
    const exchangeRate = Number(settings?.exchangeRateBs || 40.0);

    let totalSalesUSD = 0;
    let totalPaidUSD = 0;
    let totalPendingUSD = 0;
    let totalPagoMovilBs = 0;
    let totalPagoMovilUSD = 0;
    let totalPuntoBs = 0;
    let totalPuntoUSD = 0;
    let totalCashUSD = 0;

    let deliveryOrdersCount = 0;
    let inStoreOrdersCount = 0;
    let webOrdersCount = 0;

    const pagoMovilList: any[] = [];
    const puntoList: any[] = [];
    const recentOrders: any[] = [];

    for (const o of orders) {
      if (o.status === OrderStatus.CANCELED) continue;

      const orderTotal = Number(o.totalAmount || 0);
      const abonos = Number(o.abonosTotal || 0);
      totalSalesUSD += orderTotal;

      if (o.paymentStatus === PaymentStatus.PAID) {
        totalPaidUSD += orderTotal;
      } else if (o.paymentStatus === PaymentStatus.PARTIAL) {
        totalPaidUSD += abonos;
        totalPendingUSD += Math.max(0, orderTotal - abonos);
      } else {
        totalPendingUSD += orderTotal;
      }

      // Check delivery method
      if (o.deliveryMethod === DeliveryMethod.DELIVERY) deliveryOrdersCount++;
      else inStoreOrdersCount++;

      if (!o.employeeId) webOrdersCount++;

      // Punto de Venta vs Pago Movil vs Cash Divisas
      const isPunto = o.paymentMethod === 'PUNTO' || 
                      o.pagoMovilBank?.toLowerCase().includes('punto') || 
                      o.notes?.toLowerCase().includes('punto');

      if (isPunto) {
        const bs = Number(o.amountBs || (orderTotal * exchangeRate));
        totalPuntoBs += bs;
        totalPuntoUSD += bs / exchangeRate;
        puntoList.push({
          orderId: o.id,
          orderNumber: o.id.slice(0, 8).toUpperCase(),
          customerName: o.customerName,
          ref: o.pagoMovilRef,
          bank: o.pagoMovilBank || 'Punto de Venta',
          amountBs: bs,
          createdAt: o.createdAt,
        });
      } else if (o.pagoMovilRef && o.pagoMovilRef.trim().length > 0) {
        const bs = Number(o.amountBs || (orderTotal * exchangeRate));
        totalPagoMovilBs += bs;
        totalPagoMovilUSD += bs / exchangeRate;
        pagoMovilList.push({
          orderId: o.id,
          orderNumber: o.id.slice(0, 8).toUpperCase(),
          customerName: o.customerName,
          ref: o.pagoMovilRef,
          bank: o.pagoMovilBank || 'Pago Móvil',
          phone: o.pagoMovilPhone || o.customerPhone,
          amountBs: bs,
          createdAt: o.createdAt,
        });
      } else if (o.paymentStatus === PaymentStatus.PAID) {
        totalCashUSD += orderTotal;
      }

      recentOrders.push({
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        totalAmount: orderTotal,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        status: o.status,
        deliveryMethod: o.deliveryMethod,
        pagoMovilRef: o.pagoMovilRef,
        createdAt: o.createdAt,
      });
    }

    return {
      date: startOfDay.toISOString().split('T')[0],
      exchangeRate,
      totalSalesUSD: Number(totalSalesUSD.toFixed(2)),
      totalPaidUSD: Number(totalPaidUSD.toFixed(2)),
      totalPendingUSD: Number(totalPendingUSD.toFixed(2)),
      totalPagoMovilBs: Number(totalPagoMovilBs.toFixed(2)),
      totalPagoMovilUSD: Number(totalPagoMovilUSD.toFixed(2)),
      totalPuntoBs: Number(totalPuntoBs.toFixed(2)),
      totalPuntoUSD: Number(totalPuntoUSD.toFixed(2)),
      totalCashUSD: Number(totalCashUSD.toFixed(2)),
      ordersCount: orders.filter(o => o.status !== OrderStatus.CANCELED).length,
      paidOrdersCount: orders.filter(o => o.paymentStatus === PaymentStatus.PAID && o.status !== OrderStatus.CANCELED).length,
      pendingOrdersCount: orders.filter(o => o.paymentStatus !== PaymentStatus.PAID && o.status !== OrderStatus.CANCELED).length,
      cancelledOrdersCount: orders.filter(o => o.status === OrderStatus.CANCELED).length,
      deliveryOrdersCount,
      inStoreOrdersCount,
      webOrdersCount,
      pagoMovilList,
      puntoList,
      recentOrders: recentOrders.slice(0, 15),
    };
  }
}
