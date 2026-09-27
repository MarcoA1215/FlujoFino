import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PushSubscription } from '../entities/push-subscription.entity';

export interface RealtimeEvent {
  tenantId: string;
  type: 'order:created' | 'reservation:created' | 'heartbeat';
  data: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidPublicKey: string;
  private readonly events$ = new Subject<RealtimeEvent>();

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushRepo: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    this.vapidPublicKey =
      this.configService.get<string>('VAPID_PUBLIC_KEY') ||
      'BOVNV5aBYlzYON15tj1DdHNuR-YNYsotD3BRGgoCjIOEchUZ2C8rRd7nhDOP-Qis-x5rPKcmpdXOJ9N2hPNGsAI';
    const privateKey =
      this.configService.get<string>('VAPID_PRIVATE_KEY') ||
      'lj7fJ1UKpWb3uy0U03xQigJCxPAI4QU5gEOoTUH2mJg';
    const subject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      'mailto:admin@flujofino.com';

    webpush.setVapidDetails(subject, this.vapidPublicKey, privateKey);
  }

  getPublicKey(): { publicKey: string } {
    return { publicKey: this.vapidPublicKey };
  }

  async saveSubscription(
    identifier: string,
    subscription: any,
    negocioId?: string,
    role: string = 'CUSTOMER',
  ): Promise<PushSubscription | null> {
    if (!identifier || !subscription?.endpoint) return null;
    const cleanId = identifier.trim().toLowerCase();
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh || '';
    const auth = subscription.keys?.auth || '';

    let existing = await this.pushRepo.findOne({
      where: { endpoint },
    });

    if (existing) {
      existing.identifier = cleanId;
      existing.p256dh = p256dh;
      existing.auth = auth;
      if (negocioId) existing.negocioId = negocioId;
      if (role) existing.role = role.toUpperCase();
      return this.pushRepo.save(existing);
    }

    const created = this.pushRepo.create({
      identifier: cleanId,
      endpoint,
      p256dh,
      auth,
      negocioId,
      role: (role || 'CUSTOMER').toUpperCase(),
    });
    return this.pushRepo.save(created);
  }

  getTenantEventStream(tenantId: string): Observable<MessageEvent> {
    const tenantEvents$ = this.events$.asObservable().pipe(
      filter((evt) => !tenantId || evt.tenantId === tenantId),
      map((evt) => ({
        data: evt,
      } as MessageEvent)),
    );

    // Keep-alive heartbeat every 25s to keep connections alive on reverse proxies / Render
    const heartbeat$ = interval(25000).pipe(
      map(() => ({
        data: { type: 'heartbeat', timestamp: Date.now() },
      } as MessageEvent)),
    );

    return merge(tenantEvents$, heartbeat$);
  }

  async sendNotificationToTenantAdmins(
    tenantId: string,
    payload: { title: string; body: string; data?: any },
  ): Promise<number> {
    if (!tenantId) return 0;

    const subs = await this.pushRepo
      .createQueryBuilder('sub')
      .where('sub.negocioId = :tenantId', { tenantId })
      .andWhere("sub.role IN ('ADMIN', 'CAJERO', 'STAFF') OR sub.identifier = 'admin'")
      .getMany();

    if (!subs.length) {
      this.logger.debug(`No admin push subscriptions found for tenant: ${tenantId}`);
      return 0;
    }

    let sent = 0;
    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription as any,
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.log(`Subscription expired (${err.statusCode}), deleting subscription ${sub.id}`);
          await this.pushRepo.delete(sub.id).catch(() => {});
        } else {
          this.logger.error(`Error sending push notification to admin ${sub.id}: ${err.message}`);
        }
      }
    }
    return sent;
  }

  async notifyNewOrder(tenantId: string, order: any): Promise<void> {
    const total = Number(order.totalAmount || 0).toFixed(2);
    const orderNum = order.id ? order.id.slice(0, 8).toUpperCase() : '';
    const customer = order.customerName || 'Cliente';

    // 1. Emit Real-time SSE Event
    this.events$.next({
      tenantId,
      type: 'order:created',
      data: {
        orderId: order.id,
        orderNumber: orderNum,
        customerName: customer,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt || new Date(),
      },
    });

    // 2. Dispatch Web Push notification to admins/cashiers
    const payload = {
      title: '¡Nuevo Pedido recibido!',
      body: `Pedido #${orderNum} de ${customer} - $${total}`,
      data: {
        url: '/orders',
        type: 'order:created',
        orderId: order.id,
      },
    };

    await this.sendNotificationToTenantAdmins(tenantId, payload);
  }

  async notifyNewReservation(tenantId: string, reservation: any): Promise<void> {
    const timeStr = reservation.time ? reservation.time.substring(0, 5) : '';
    const svc = reservation.serviceName || 'Servicio';
    const customer = reservation.customerName || 'Cliente';

    // 1. Emit Real-time SSE Event
    this.events$.next({
      tenantId,
      type: 'reservation:created',
      data: {
        reservationId: reservation.id,
        customerName: customer,
        serviceName: svc,
        date: reservation.date,
        time: timeStr,
        createdAt: reservation.createdAt || new Date(),
      },
    });

    // 2. Dispatch Web Push notification to admins/cashiers
    const payload = {
      title: '¡Nueva Cita reservada!',
      body: `${customer} - ${svc} a las ${timeStr}`,
      data: {
        url: '/reservations',
        type: 'reservation:created',
        reservationId: reservation.id,
      },
    };

    await this.sendNotificationToTenantAdmins(tenantId, payload);
  }

  async sendNotificationToIdentifier(
    identifier: string,
    payload: { title: string; body: string; data?: any },
  ): Promise<number> {
    if (!identifier) return 0;
    const cleanId = identifier.trim().toLowerCase();
    const digitsOnly = cleanId.replace(/\D/g, '');

    const query = this.pushRepo
      .createQueryBuilder('sub')
      .where('LOWER(sub.identifier) = :cleanId', { cleanId });

    if (digitsOnly.length >= 6) {
      query.orWhere('sub.identifier LIKE :digits', { digits: `%${digitsOnly}%` });
    }

    const subs = await query.getMany();
    if (!subs.length) {
      this.logger.warn(`No push subscriptions found for identifier: ${identifier}`);
      return 0;
    }

    let sent = 0;
    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription as any,
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.log(`Subscription expired (${err.statusCode}), deleting subscription ${sub.id}`);
          await this.pushRepo.delete(sub.id).catch(() => {});
        } else {
          this.logger.error(`Error sending push notification to ${sub.id}: ${err.message}`);
        }
      }
    }
    return sent;
  }
}
