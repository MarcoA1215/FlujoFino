import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';
import { OrderStatus, DeliveryMethod, UserRole, PaymentStatus } from '@finowork/shared-types';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserTenantAccess)
    private readonly accessRepo: Repository<UserTenantAccess>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly dataSource: DataSource,
  ) {}

  private async getEffectiveExchangeRate(tenantId: string): Promise<number> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    let rate = settings?.exchangeRateBs ? Number(settings.exchangeRateBs) : 0;
    if (!rate || rate <= 0) {
      const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
      rate = globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 0;
    }
    return rate > 0 ? rate : 40.0;
  }

  async getMyHistory(tenantId: string, deliveryUserId: string) {
    const exchangeRate = await this.getEffectiveExchangeRate(tenantId);

    const orders = await this.orderRepo.find({
      where: {
        tenantId,
        deliveryUserId,
        status: OrderStatus.DELIVERED,
        deliveryMethod: DeliveryMethod.DELIVERY,
      },
      relations: {
        deliveryZone: true,
        items: true,
      },
      order: { createdAt: 'DESC' },
    });

    let totalFletesUSD = 0;
    let totalFletesBS = 0;
    let totalCashToCollectUSD = 0;
    let totalCashToCollectBS = 0;

    const formattedOrders = orders.map(o => {
      const fleteUSD = Number(o.deliveryFee || 0);
      const fleteBS = Number((fleteUSD * exchangeRate).toFixed(2));
      totalFletesUSD += fleteUSD;
      totalFletesBS += fleteBS;

      const isCashOrder = o.paymentStatus === PaymentStatus.PENDING || o.paymentMethod === 'USD';
      const cashToCollect = isCashOrder ? Math.max(0, Number(o.totalAmount || 0) - Number(o.abonosTotal || 0)) : 0;
      const cashToCollectBS = Number((cashToCollect * exchangeRate).toFixed(2));
      totalCashToCollectUSD += cashToCollect;
      totalCashToCollectBS += cashToCollectBS;

      return {
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        deliveryZone: o.deliveryZone?.name || 'Zona General',
        deliveryFeeUSD: fleteUSD,
        deliveryFeeBS: fleteBS,
        cashToCollectUSD: Number(cashToCollect.toFixed(2)),
        cashToCollectBS: cashToCollectBS,
        totalAmount: Number(o.totalAmount || 0),
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        deliveredAt: o.createdAt,
      };
    });

    const activeOrders = await this.getMyActiveOrders(tenantId, deliveryUserId);

    return {
      completedCount: orders.length,
      activeCount: activeOrders.length,
      totalFletesUSD: Number(totalFletesUSD.toFixed(2)),
      totalFletesBS: Number(totalFletesBS.toFixed(2)),
      totalCashToCollectUSD: Number(totalCashToCollectUSD.toFixed(2)),
      totalCashToCollectBS: Number(totalCashToCollectBS.toFixed(2)),
      exchangeRate,
      activeOrders,
      orders: formattedOrders,
    };
  }

  async getMyActiveOrders(tenantId: string, deliveryUserId: string) {
    const exchangeRate = await this.getEffectiveExchangeRate(tenantId);

    const orders = await this.orderRepo.find({
      where: [
        { tenantId, deliveryUserId, deliveryMethod: DeliveryMethod.DELIVERY, status: OrderStatus.PREPARING },
        { tenantId, deliveryUserId, deliveryMethod: DeliveryMethod.DELIVERY, status: OrderStatus.IN_TRANSIT },
      ],
      relations: {
        deliveryZone: true,
        items: true,
      },
      order: { createdAt: 'ASC' },
    });

    return orders.map(o => {
      const fleteUSD = Number(o.deliveryFee || 0);
      const fleteBS = Number((fleteUSD * exchangeRate).toFixed(2));

      const isCashOrder = o.paymentStatus === PaymentStatus.PENDING || o.paymentMethod === 'USD';
      const cashToCollect = isCashOrder ? Math.max(0, Number(o.totalAmount || 0) - Number(o.abonosTotal || 0)) : 0;
      const cashToCollectBS = Number((cashToCollect * exchangeRate).toFixed(2));

      return {
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        status: o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        deliveryZone: o.deliveryZone?.name || 'Zona General',
        deliveryFeeUSD: fleteUSD,
        deliveryFeeBS: fleteBS,
        cashToCollectUSD: Number(cashToCollect.toFixed(2)),
        cashToCollectBS: cashToCollectBS,
        totalAmount: Number(o.totalAmount || 0),
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        items: (o.items || []).map(i => ({
          name: i.productName,
          quantity: i.quantity,
        })),
        createdAt: o.createdAt,
      };
    });
  }

  async getAdminSummary(tenantId: string) {
    const exchangeRate = await this.getEffectiveExchangeRate(tenantId);

    // Obtener todos los usuarios con rol DELIVERY en el tenant
    const deliveryAccesses = await this.accessRepo.find({
      where: { tenantId, role: UserRole.DELIVERY, isActive: true },
      relations: { user: true },
    });

    // Obtener todas las órdenes completadas de delivery
    const orders = await this.orderRepo.find({
      where: {
        tenantId,
        status: OrderStatus.DELIVERED,
        deliveryMethod: DeliveryMethod.DELIVERY,
      },
      relations: {
        deliveryUser: true,
        deliveryZone: true,
      },
      order: { createdAt: 'DESC' },
    });

    const driversMap: Record<
      string,
      {
        userId: string;
        username: string;
        name: string;
        completedDeliveries: number;
        totalFletesUSD: number;
        totalFletesBS: number;
        totalCashToCollectUSD: number;
        totalCashToCollectBS: number;
        deliveries: any[];
      }
    > = {};

    // Inicializar con todos los repartidores activos registrados
    for (const acc of deliveryAccesses) {
      if (acc.user) {
        driversMap[acc.user.id] = {
          userId: acc.user.id,
          username: acc.user.username,
          name: acc.user.username,
          completedDeliveries: 0,
          totalFletesUSD: 0,
          totalFletesBS: 0,
          totalCashToCollectUSD: 0,
          totalCashToCollectBS: 0,
          deliveries: [],
        };
      }
    }

    let globalCompleted = 0;
    let globalFletesUSD = 0;
    let globalFletesBS = 0;
    let globalCashToCollectUSD = 0;
    let globalCashToCollectBS = 0;

    for (const o of orders) {
      if (!o.deliveryUserId) continue;

      const fleteUSD = Number(o.deliveryFee || 0);
      const fleteBS = Number((fleteUSD * exchangeRate).toFixed(2));

      const isCashOrder = o.paymentStatus === PaymentStatus.PENDING || o.paymentMethod === 'USD';
      const cashToCollect = isCashOrder ? Math.max(0, Number(o.totalAmount || 0) - Number(o.abonosTotal || 0)) : 0;
      const cashToCollectBS = Number((cashToCollect * exchangeRate).toFixed(2));

      if (!driversMap[o.deliveryUserId]) {
        const dName = o.deliveryUser?.username || 'Repartidor';
        driversMap[o.deliveryUserId] = {
          userId: o.deliveryUserId,
          username: dName,
          name: dName,
          completedDeliveries: 0,
          totalFletesUSD: 0,
          totalFletesBS: 0,
          totalCashToCollectUSD: 0,
          totalCashToCollectBS: 0,
          deliveries: [],
        };
      }

      const driver = driversMap[o.deliveryUserId];
      driver.completedDeliveries += 1;
      driver.totalFletesUSD = Number((driver.totalFletesUSD + fleteUSD).toFixed(2));
      driver.totalFletesBS = Number((driver.totalFletesBS + fleteBS).toFixed(2));
      driver.totalCashToCollectUSD = Number((driver.totalCashToCollectUSD + cashToCollect).toFixed(2));
      driver.totalCashToCollectBS = Number((driver.totalCashToCollectBS + cashToCollectBS).toFixed(2));

      globalCompleted += 1;
      globalFletesUSD += fleteUSD;
      globalFletesBS += fleteBS;
      globalCashToCollectUSD += cashToCollect;
      globalCashToCollectBS += cashToCollectBS;

      driver.deliveries.push({
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        deliveryZone: o.deliveryZone?.name || 'General',
        deliveryFeeUSD: fleteUSD,
        deliveryFeeBS: fleteBS,
        cashToCollectUSD: Number(cashToCollect.toFixed(2)),
        cashToCollectBS: cashToCollectBS,
        totalAmount: Number(o.totalAmount || 0),
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        date: o.createdAt,
      });
    }

    return {
      exchangeRate,
      globalCompleted,
      globalFletesUSD: Number(globalFletesUSD.toFixed(2)),
      globalFletesBS: Number(globalFletesBS.toFixed(2)),
      globalCashToCollectUSD: Number(globalCashToCollectUSD.toFixed(2)),
      globalCashToCollectBS: Number(globalCashToCollectBS.toFixed(2)),
      totalCashToCollectUSD: Number(globalCashToCollectUSD.toFixed(2)),
      totalCashToCollectBS: Number(globalCashToCollectBS.toFixed(2)),
      drivers: Object.values(driversMap),
    };
  }

  async startDelivery(tenantId: string, id: string, deliveryUserId: string) {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId },
    });
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }
    if (order.deliveryUserId !== deliveryUserId) {
      throw new BadRequestException('La orden no está asignada a este repartidor');
    }
    if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(`No se puede iniciar entrega con estado actual: ${order.status}`);
    }
    order.status = OrderStatus.IN_TRANSIT;
    return this.orderRepo.save(order);
  }

  async completeDelivery(tenantId: string, id: string, deliveryUserId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id, tenantId },
        relations: { items: true },
      });
      if (!order) {
        throw new BadRequestException('Pedido no encontrado');
      }
      if (deliveryUserId && order.deliveryUserId && order.deliveryUserId !== deliveryUserId) {
        throw new BadRequestException('La orden no está asignada a este repartidor');
      }
      if (order.status === OrderStatus.CANCELED) {
        throw new BadRequestException('No se puede completar una orden cancelada');
      }

      if (order.status !== OrderStatus.DELIVERED) {
        const itemProductIds = Array.from(new Set((order.items || []).map(i => i.productId).filter(Boolean)));
        const products = itemProductIds.length > 0 ? await manager.find(Product, {
          where: { tenantId, id: In(itemProductIds) },
          relations: { comboItems: { component: true } },
        }) : [];
        const productMap = new Map(products.map(p => [p.id, p]));

        for (const item of order.items || []) {
          const product = productMap.get(item.productId);
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
              const isService = product.is_service === true || (product.is_service !== false && product.category === 'Servicios');
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

      order.status = OrderStatus.DELIVERED;
      return manager.save(Order, order);
    });
  }
}
