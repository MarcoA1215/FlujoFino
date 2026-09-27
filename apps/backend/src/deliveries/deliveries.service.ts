import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';
import { Settings } from '../entities/settings.entity';
import { OrderStatus, DeliveryMethod, UserRole } from '@nutrideli/shared-types';

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
  ) {}

  async getMyHistory(tenantId: string, deliveryUserId: string) {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    const exchangeRate = Number(settings?.exchangeRateBs || 40.0);

    const orders = await this.orderRepo.find({
      where: {
        tenantId,
        deliveryUserId,
        status: OrderStatus.DELIVERED,
      },
      relations: {
        deliveryZone: true,
        items: true,
      },
      order: { createdAt: 'DESC' },
    });

    let totalFletesUSD = 0;
    let totalFletesBS = 0;

    const formattedOrders = orders.map(o => {
      const fleteUSD = Number(o.deliveryFee || 0);
      const fleteBS = Number((fleteUSD * exchangeRate).toFixed(2));
      totalFletesUSD += fleteUSD;
      totalFletesBS += fleteBS;

      return {
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        deliveryZone: o.deliveryZone?.name || 'Zona General',
        deliveryFeeUSD: fleteUSD,
        deliveryFeeBS: fleteBS,
        totalAmount: Number(o.totalAmount || 0),
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        deliveredAt: o.createdAt,
      };
    });

    return {
      completedCount: orders.length,
      totalFletesUSD: Number(totalFletesUSD.toFixed(2)),
      totalFletesBS: Number(totalFletesBS.toFixed(2)),
      exchangeRate,
      orders: formattedOrders,
    };
  }

  async getAdminSummary(tenantId: string) {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    const exchangeRate = Number(settings?.exchangeRateBs || 40.0);

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
          deliveries: [],
        };
      }
    }

    let globalCompleted = 0;
    let globalFletesUSD = 0;
    let globalFletesBS = 0;

    for (const o of orders) {
      if (!o.deliveryUserId) continue;

      const fleteUSD = Number(o.deliveryFee || 0);
      const fleteBS = Number((fleteUSD * exchangeRate).toFixed(2));

      if (!driversMap[o.deliveryUserId]) {
        const dName = o.deliveryUser?.username || 'Repartidor';
        driversMap[o.deliveryUserId] = {
          userId: o.deliveryUserId,
          username: dName,
          name: dName,
          completedDeliveries: 0,
          totalFletesUSD: 0,
          totalFletesBS: 0,
          deliveries: [],
        };
      }

      const driver = driversMap[o.deliveryUserId];
      driver.completedDeliveries += 1;
      driver.totalFletesUSD = Number((driver.totalFletesUSD + fleteUSD).toFixed(2));
      driver.totalFletesBS = Number((driver.totalFletesBS + fleteBS).toFixed(2));

      globalCompleted += 1;
      globalFletesUSD += fleteUSD;
      globalFletesBS += fleteBS;

      driver.deliveries.push({
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        deliveryZone: o.deliveryZone?.name || 'General',
        deliveryFeeUSD: fleteUSD,
        deliveryFeeBS: fleteBS,
        totalAmount: Number(o.totalAmount || 0),
        paymentStatus: o.paymentStatus,
        date: o.createdAt,
      });
    }

    return {
      exchangeRate,
      globalCompleted,
      globalFletesUSD: Number(globalFletesUSD.toFixed(2)),
      globalFletesBS: Number(globalFletesBS.toFixed(2)),
      drivers: Object.values(driversMap),
    };
  }
}
