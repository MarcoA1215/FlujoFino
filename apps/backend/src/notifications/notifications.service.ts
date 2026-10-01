import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PushSubscription } from '../entities/push-subscription.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidPublicKey: string;

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
    role?: string,
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
      if (role) existing.role = role;
      return this.pushRepo.save(existing);
    }

    const created = this.pushRepo.create({
      identifier: cleanId,
      endpoint,
      p256dh,
      auth,
      negocioId,
      role: role || 'CUSTOMER',
    });
    return this.pushRepo.save(created);
  }

  async sendNotificationToNegocio(
    negocioId: string,
    payload: { title: string; body: string; data?: any },
    roles: string[] = ['ADMIN', 'CAJERO'],
  ): Promise<number> {
    if (!negocioId) return 0;

    const query = this.pushRepo
      .createQueryBuilder('sub')
      .where('sub.negocioId = :negocioId', { negocioId });

    if (roles && roles.length > 0) {
      query.andWhere('sub.role IN (:...roles)', { roles });
    }

    const subs = await query.getMany();
    if (!subs.length) {
      this.logger.warn(`No admin/cashier push subscriptions for tenant ${negocioId}`);
      return 0;
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          } as any,
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.pushRepo.delete(sub.id).catch(() => {});
        } else {
          this.logger.error(`Error sending push to admin ${sub.id}: ${err.message}`);
        }
      }
    }
    return sent;
  }

  async notifyNewOrder(negocioId: string, order: any): Promise<number> {
    const orderNumber = order?.id ? order.id.slice(0, 8).toUpperCase() : 'N/A';
    const customer = order?.customerName || 'Cliente';
    const amount = Number(order?.totalAmount || 0).toFixed(2);
    const payload = {
      title: '¡Nuevo Pedido recibido! 🛍️',
      body: `Pedido #${orderNumber} por $${amount} de ${customer}`,
      data: {
        url: '/orders',
        orderId: order?.id,
        type: 'NEW_ORDER',
      },
    };
    return this.sendNotificationToNegocio(negocioId, payload, ['ADMIN', 'CAJERO']);
  }

  async notifyNewReservation(negocioId: string, reservation: any): Promise<number> {
    const customer = reservation?.customerName || 'Cliente';
    const serviceName = reservation?.serviceName || reservation?.service?.name || 'Servicio';
    const time = reservation?.time || reservation?.startTime || '';
    const payload = {
      title: '¡Nueva Cita reservada! 📅',
      body: `${customer} reservó "${serviceName}" ${time ? `a las ${time}` : ''}`.trim(),
      data: {
        url: '/reservations',
        reservationId: reservation?.id,
        type: 'NEW_RESERVATION',
      },
    };
    return this.sendNotificationToNegocio(negocioId, payload, ['ADMIN', 'CAJERO']);
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

  async notifySuperAdmin(payload: { title: string; body: string; data?: any }): Promise<number> {
    const subs = await this.pushRepo.find({
      where: { role: 'SUPERADMIN' },
    });

    if (!subs.length) {
      this.logger.warn('No push subscriptions found for SUPERADMIN');
      return 0;
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        if (sub.endpoint.startsWith('http://') || sub.endpoint.startsWith('https://')) {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            } as any,
            JSON.stringify(payload),
          );
          sent++;
        } else {
          this.logger.log(`SuperAdmin native push endpoint registered for ${sub.identifier}`);
        }
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.log(`Subscription expired (${err.statusCode}), deleting subscription ${sub.id}`);
          await this.pushRepo.delete(sub.id).catch(() => {});
        } else {
          this.logger.error(`Error sending push notification to superadmin ${sub.id}: ${err.message}`);
        }
      }
    }
    return sent;
  }
}

