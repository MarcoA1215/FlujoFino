import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { PushSubscription } from '../entities/push-subscription.entity';
import { User } from '../entities/user.entity';
import { UserTenantAccess } from '../entities/user-tenant-access.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidPublicKey: string;
  private firebaseApp: App | null = null;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushRepo: Repository<PushSubscription>,
    private readonly configService: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    this.vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY') || '';
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY') || '';
    const subject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      'mailto:admin@finowork.com';

    if (this.vapidPublicKey && privateKey) {
      webpush.setVapidDetails(subject, this.vapidPublicKey, privateKey);
    } else {
      this.logger.warn('Credenciales VAPID no configuradas en entorno. Notificaciones Web Push deshabilitadas.');
    }

    this.initFirebase();
  }

  private initFirebase(): void {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.firebaseApp = existingApps[0];
      return;
    }

    try {
      const serviceAccountEnv = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || 'finowork-3b757';
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      // 1. Variable FIREBASE_SERVICE_ACCOUNT (JSON directo, base64 o ruta)
      if (serviceAccountEnv) {
        let certObj: any;
        const trimmed = serviceAccountEnv.trim();
        if (trimmed.startsWith('{')) {
          certObj = JSON.parse(trimmed);
        } else {
          try {
            const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
            certObj = JSON.parse(decoded);
          } catch {
            certObj = trimmed;
          }
        }
        this.firebaseApp = initializeApp({
          credential: cert(certObj),
          projectId: certObj.project_id || projectId,
        });
        this.logger.log('Firebase Admin SDK inicializado exitosamente mediante FIREBASE_SERVICE_ACCOUNT.');
        return;
      }

      // 2. Credenciales individuales en variables de entorno
      if (clientEmail && privateKey) {
        const formattedKey = privateKey.replace(/\\n/g, '\n');
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
          projectId,
        });
        this.logger.log('Firebase Admin SDK inicializado exitosamente mediante credenciales individuales.');
        return;
      }

      // 3. Archivo local firebase-service-account.json en raíz o backend
      const candidatePaths = [
        path.resolve(process.cwd(), 'firebase-service-account.json'),
        path.resolve(process.cwd(), 'apps/backend/firebase-service-account.json'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          this.firebaseApp = initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || projectId,
          });
          this.logger.log(`Firebase Admin SDK inicializado exitosamente desde archivo ${p}.`);
          return;
        }
      }

      this.logger.warn(
        'Credenciales de Firebase Admin (FIREBASE_SERVICE_ACCOUNT) no configuradas en entorno. Notificaciones nativas Android FCM en espera de configuración.',
      );
    } catch (err: any) {
      this.logger.warn(`No se pudo inicializar Firebase Admin SDK: ${err.message}`);
    }
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

    // Buscar todas las suscripciones existentes con este endpoint para prevenir duplicados
    const existingList = await this.pushRepo.find({
      where: { endpoint },
      order: { createdAt: 'ASC' },
    });

    if (existingList && existingList.length > 0) {
      const primary = existingList[0];
      primary.identifier = cleanId;
      primary.p256dh = p256dh;
      primary.auth = auth;
      if (negocioId) primary.negocioId = negocioId;
      if (role) primary.role = role;

      // Si existen filas duplicadas para este mismo endpoint, eliminarlas
      if (existingList.length > 1) {
        const duplicateIds = existingList.slice(1).map((s) => s.id);
        await this.pushRepo.delete(duplicateIds).catch(() => {});
      }

      return this.pushRepo.save(primary);
    }

    try {
      const created = this.pushRepo.create({
        identifier: cleanId,
        endpoint,
        p256dh,
        auth,
        negocioId,
        role: role || 'CUSTOMER',
      });
      return await this.pushRepo.save(created);
    } catch (saveErr: any) {
      // Si ocurrió una inserción concurrente simultánea, recuperar la fila y actualizarla
      const retry = await this.pushRepo.findOne({ where: { endpoint } });
      if (retry) {
        retry.identifier = cleanId;
        retry.p256dh = p256dh;
        retry.auth = auth;
        if (negocioId) retry.negocioId = negocioId;
        if (role) retry.role = role;
        return await this.pushRepo.save(retry);
      }
      throw saveErr;
    }
  }

  private async dispatchToSubscription(
    sub: PushSubscription,
    payload: { title: string; body: string; data?: any },
  ): Promise<boolean> {
    const isWebPush =
      sub.endpoint.startsWith('http://') || sub.endpoint.startsWith('https://');

    // 1. Despacho Web Push VAPID (Navegadores / PWA)
    if (isWebPush) {
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
        return true;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.logger.log(`Suscripción WebPush expirada (${err.statusCode}), eliminando ${sub.id}`);
          await this.pushRepo.delete(sub.id).catch(() => {});
        } else {
          this.logger.error(`Error enviando WebPush a ${sub.id}: ${err.message}`);
        }
        return false;
      }
    }

    // 2. Despacho Nativo Android (FCM Device Registration Token)
    if (!this.firebaseApp) {
      this.logger.warn(
        `Firebase Admin no inicializado. No se puede enviar notificación FCM a token ${sub.endpoint.slice(0, 10)}... (sub ${sub.id})`,
      );
      return false;
    }

    try {
      const stringData: Record<string, string> = {};
      if (payload.data && typeof payload.data === 'object') {
        for (const [key, val] of Object.entries(payload.data)) {
          if (val !== undefined && val !== null) {
            stringData[key] = typeof val === 'string' ? val : JSON.stringify(val);
          }
        }
      }

      const message: Message = {
        token: sub.endpoint,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'finowork_orders',
            sound: 'default',
            priority: 'high',
            defaultVibrateTimings: true,
            defaultSound: true,
          },
        },
      };

      await getMessaging(this.firebaseApp).send(message);
      return true;
    } catch (err: any) {
      const fcmCode = (err as any)?.code || (err as any)?.errorInfo?.code;
      if (
        fcmCode === 'messaging/registration-token-not-registered' ||
        fcmCode === 'messaging/invalid-registration-token'
      ) {
        this.logger.log(`FCM token inválido o app desinstalada (${fcmCode}), eliminando sub ${sub.id}`);
        await this.pushRepo.delete(sub.id).catch(() => {});
      } else {
        this.logger.error(`Error enviando notificación FCM a ${sub.id}: ${err.message}`);
      }
      return false;
    }
  }

  async resolveSpecialistIdentifiers(
    negocioId: string,
    reservationOrSpecialists: any,
  ): Promise<string[]> {
    if (!reservationOrSpecialists) return [];

    const rawIds = new Set<string>();

    if (Array.isArray(reservationOrSpecialists)) {
      for (const item of reservationOrSpecialists) {
        if (typeof item === 'string' && item.trim()) {
          rawIds.add(item.trim());
        } else if (item && typeof item === 'object') {
          if (item.employeeId) rawIds.add(String(item.employeeId).trim());
          if (item.userId) rawIds.add(String(item.userId).trim());
          if (item.id) rawIds.add(String(item.id).trim());
        }
      }
    } else if (reservationOrSpecialists instanceof Set) {
      for (const item of reservationOrSpecialists) {
        if (typeof item === 'string' && item.trim()) rawIds.add(item.trim());
      }
    } else if (typeof reservationOrSpecialists === 'string') {
      if (reservationOrSpecialists.trim()) rawIds.add(reservationOrSpecialists.trim());
    } else if (typeof reservationOrSpecialists === 'object') {
      if (reservationOrSpecialists.employeeId) {
        rawIds.add(String(reservationOrSpecialists.employeeId).trim());
      }
      if (reservationOrSpecialists.employee?.id) {
        rawIds.add(String(reservationOrSpecialists.employee.id).trim());
      }
      if (Array.isArray(reservationOrSpecialists.serviceSpecialists)) {
        for (const s of reservationOrSpecialists.serviceSpecialists) {
          if (s?.employeeId) {
            rawIds.add(String(s.employeeId).trim());
          }
        }
      }
    }

    if (rawIds.size === 0) return [];

    const matchedIdentifiers = new Set<string>();
    for (const id of rawIds) {
      matchedIdentifiers.add(id.toLowerCase());
    }

    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        const candidateList = Array.from(rawIds);
        const accessRepo = this.dataSource.getRepository(UserTenantAccess);
        const userRepo = this.dataSource.getRepository(User);

        const accesses = await accessRepo.find({
          where: [
            { id: In(candidateList), tenantId: negocioId },
            { userId: In(candidateList), tenantId: negocioId },
          ],
          relations: { user: true },
        });

        for (const acc of accesses) {
          if (acc.id) matchedIdentifiers.add(acc.id.toLowerCase());
          if (acc.userId) matchedIdentifiers.add(acc.userId.toLowerCase());
          if (acc.user) {
            if (acc.user.id) matchedIdentifiers.add(acc.user.id.toLowerCase());
            if (acc.user.email) matchedIdentifiers.add(acc.user.email.toLowerCase().trim());
            if (acc.user.username) matchedIdentifiers.add(acc.user.username.toLowerCase().trim());
            if (acc.user.phone) {
              matchedIdentifiers.add(acc.user.phone.toLowerCase().trim());
              const digits = acc.user.phone.replace(/\D/g, '');
              if (digits) matchedIdentifiers.add(digits);
            }
            if (acc.user.identification) {
              matchedIdentifiers.add(acc.user.identification.toLowerCase().trim());
              const digits = acc.user.identification.replace(/\D/g, '');
              if (digits) matchedIdentifiers.add(digits);
            }
          }
        }

        const directUsers = await userRepo.find({
          where: { id: In(candidateList) },
        });
        for (const u of directUsers) {
          if (u.id) matchedIdentifiers.add(u.id.toLowerCase());
          if (u.email) matchedIdentifiers.add(u.email.toLowerCase().trim());
          if (u.username) matchedIdentifiers.add(u.username.toLowerCase().trim());
          if (u.phone) {
            matchedIdentifiers.add(u.phone.toLowerCase().trim());
            const digits = u.phone.replace(/\D/g, '');
            if (digits) matchedIdentifiers.add(digits);
          }
          if (u.identification) {
            matchedIdentifiers.add(u.identification.toLowerCase().trim());
            const digits = u.identification.replace(/\D/g, '');
            if (digits) matchedIdentifiers.add(digits);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not resolve specialist identifiers: ${err?.message}`);
      }
    }

    return Array.from(matchedIdentifiers);
  }

  async sendNotificationToNegocio(
    negocioId: string,
    payload: { title: string; body: string; data?: any },
    roles: string[] = ['ADMIN', 'CAJERO'],
    reservationOrSpecialists?: any,
  ): Promise<number> {
    if (!negocioId) return 0;

    let specialistIdentifiers: string[] = [];
    if (reservationOrSpecialists) {
      specialistIdentifiers = await this.resolveSpecialistIdentifiers(negocioId, reservationOrSpecialists);
    }

    const query = this.pushRepo
      .createQueryBuilder('sub')
      .where('sub.negocioId = :negocioId', { negocioId });

    const effectiveRoles = [...(roles && roles.length > 0 ? roles : ['ADMIN', 'CAJERO'])];
    if (effectiveRoles.includes('CAJERO') && !effectiveRoles.includes('POS')) {
      effectiveRoles.push('POS');
    }
    if (effectiveRoles.includes('POS') && !effectiveRoles.includes('CAJERO')) {
      effectiveRoles.push('CAJERO');
    }

    if (specialistIdentifiers.length > 0) {
      query.andWhere(
        '(sub.role IN (:...roles) OR (sub.role != :customerRole AND LOWER(sub.identifier) IN (:...specialistIdentifiers)))',
        {
          roles: effectiveRoles,
          customerRole: 'CUSTOMER',
          specialistIdentifiers,
        },
      );
    } else {
      query.andWhere('sub.role IN (:...roles)', { roles: effectiveRoles });
    }

    const subs = await query.getMany();
    if (!subs.length) {
      this.logger.warn(`No push subscriptions found for tenant ${negocioId}`);
      return 0;
    }

    // Deduplicar suscripciones por endpoint único
    const uniqueSubsMap = new Map<string, PushSubscription>();
    for (const sub of subs) {
      if (sub.endpoint && !uniqueSubsMap.has(sub.endpoint)) {
        uniqueSubsMap.set(sub.endpoint, sub);
      }
    }

    let sent = 0;
    for (const sub of uniqueSubsMap.values()) {
      const ok = await this.dispatchToSubscription(sub, payload);
      if (ok) sent++;
    }
    return sent;
  }

  async notifyNewOrder(negocioId: string, order: any): Promise<number> {
    const orderNumber = order?.id ? order.id.slice(0, 8).toUpperCase() : 'N/A';
    const customer = order?.customerName || 'Cliente';
    const amount = Number(order?.totalAmount || 0).toFixed(2);
    const payload = {
      title: '¡Nuevo Pedido recibido! 🛒🛍️',
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
    
    const rawTime = reservation?.time || reservation?.startTime || '';
    const time = rawTime ? (rawTime.length > 5 ? rawTime.substring(0, 5) : rawTime) : '';

    let date = reservation?.date || '';
    if (date && typeof date === 'string' && date.includes('T')) {
      date = date.split('T')[0];
    } else if (date instanceof Date) {
      date = date.toISOString().split('T')[0];
    }

    let body = `${customer} reservó "${serviceName}"`;
    if (date && time) {
      body += ` para el ${date} a las ${time}`;
    } else if (date) {
      body += ` para el ${date}`;
    } else if (time) {
      body += ` a las ${time}`;
    }

    const payload = {
      title: '¡Nueva Cita reservada! 📅✨',
      body: body.trim(),
      data: {
        url: '/reservations',
        reservationId: reservation?.id,
        type: 'NEW_RESERVATION',
      },
    };

    return this.sendNotificationToNegocio(negocioId, payload, ['ADMIN', 'CAJERO'], reservation);
  }

  async notifyRescheduledReservation(
    negocioId: string,
    reservation: any,
    details?: { oldDate?: string; oldTime?: string; reason?: string },
  ): Promise<number> {
    const customer = reservation?.customerName || 'Cliente';
    let date = reservation?.date || '';
    if (date && typeof date === 'string' && date.includes('T')) {
      date = date.split('T')[0];
    } else if (date instanceof Date) {
      date = date.toISOString().split('T')[0];
    }

    const rawTime = reservation?.time || '';
    const time = rawTime ? (rawTime.length > 5 ? rawTime.substring(0, 5) : rawTime) : '';

    let oldDate = details?.oldDate || '';
    if (oldDate && typeof oldDate === 'string' && oldDate.includes('T')) {
      oldDate = oldDate.split('T')[0];
    }
    const rawOldTime = details?.oldTime || '';
    const oldTime = rawOldTime ? (rawOldTime.length > 5 ? rawOldTime.substring(0, 5) : rawOldTime) : '';

    const reasonText = details?.reason ? ` Motivo: ${details.reason.trim()}.` : '';

    let body = '';
    if (oldDate && oldTime) {
      body = `${customer} reprogramó su cita del ${oldDate} (${oldTime}) para el ${date} a las ${time}.${reasonText}`.trim();
    } else if (date && time) {
      body = `La cita de ${customer} fue reprogramada para el ${date} a las ${time}.${reasonText}`.trim();
    } else if (date) {
      body = `La cita de ${customer} fue reprogramada para el ${date}.${reasonText}`.trim();
    } else {
      body = `La cita de ${customer} fue reprogramada.${reasonText}`.trim();
    }

    const payload = {
      title: '🗓️ Cita Reprogramada',
      body,
      data: {
        url: '/reservations',
        reservationId: reservation?.id,
        type: 'APPOINTMENT_RESCHEDULED',
      },
    };

    return this.sendNotificationToNegocio(negocioId, payload, ['ADMIN', 'CAJERO'], reservation);
  }

  async notifyCustomerAppointment(
    reservation: { id: string; customerPhone?: string; identification?: string; [key: string]: any },
    payload: { title: string; body: string; data?: any }
  ): Promise<number> {
    if (!reservation) return 0;
    let sent = 0;
    const fullPayload = {
      ...payload,
      data: {
        url: `/appointment/${reservation.id}`,
        reservationId: reservation.id,
        ...(payload.data || {})
      }
    };
    if (reservation.customerPhone) {
      sent += await this.sendNotificationToIdentifier(reservation.customerPhone, fullPayload);
    }
    if (reservation.identification && reservation.identification !== reservation.customerPhone) {
      sent += await this.sendNotificationToIdentifier(reservation.identification, fullPayload);
    }
    return sent;
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

    // Deduplicar suscripciones por endpoint único
    const uniqueSubsMap = new Map<string, PushSubscription>();
    for (const sub of subs) {
      if (sub.endpoint && !uniqueSubsMap.has(sub.endpoint)) {
        uniqueSubsMap.set(sub.endpoint, sub);
      }
    }

    let sent = 0;
    for (const sub of uniqueSubsMap.values()) {
      const ok = await this.dispatchToSubscription(sub, payload);
      if (ok) sent++;
    }
    return sent;
  }

  async sendTestNotification(
    identifier?: string,
    negocioId?: string,
  ): Promise<{ sent: number; message: string }> {
    const payload = {
      title: '🔔 ¡Prueba de Notificación Exitosa!',
      body: 'FinoWork está configurado correctamente para enviarte alertas.',
      data: {
        url: '/',
        type: 'TEST_NOTIFICATION',
      },
    };

    const targetSubsMap = new Map<string, PushSubscription>();

    // 1. Obtener suscripciones activas del negocio
    if (negocioId) {
      try {
        const negocioSubs = await this.pushRepo
          .createQueryBuilder('sub')
          .where('sub.negocioId = :negocioId', { negocioId })
          .andWhere('sub.role IN (:...roles)', { roles: ['ADMIN', 'CAJERO', 'POS', 'SUPERADMIN'] })
          .getMany();

        for (const s of negocioSubs) {
          if (s.endpoint) targetSubsMap.set(s.endpoint, s);
        }
      } catch (err: any) {
        this.logger.warn(`Error consultando suscripciones de negocio para prueba: ${err.message}`);
      }
    }

    // 2. Obtener suscripciones por identificador (email, teléfono, usuario)
    if (identifier) {
      try {
        const cleanId = identifier.trim().toLowerCase();
        const digitsOnly = cleanId.replace(/\D/g, '');
        const query = this.pushRepo
          .createQueryBuilder('sub')
          .where('LOWER(sub.identifier) = :cleanId', { cleanId });

        if (digitsOnly.length >= 6) {
          query.orWhere('sub.identifier LIKE :digits', { digits: `%${digitsOnly}%` });
        }

        const idSubs = await query.getMany();
        for (const s of idSubs) {
          if (s.endpoint) targetSubsMap.set(s.endpoint, s);
        }
      } catch (err: any) {
        this.logger.warn(`Error consultando suscripciones por identificador para prueba: ${err.message}`);
      }
    }

    const uniqueSubs = Array.from(targetSubsMap.values());
    let sent = 0;
    for (const sub of uniqueSubs) {
      const ok = await this.dispatchToSubscription(sub, payload);
      if (ok) sent++;
    }

    return {
      sent,
      message: sent > 0
        ? `Notificación de prueba enviada exitosamente a ${sent} dispositivo(s).`
        : `No se encontraron suscripciones activas para este usuario/negocio en este momento.`,
    };
  }

  async notifySuperAdmin(payload: { title: string; body: string; data?: any }): Promise<number> {
    const subs = await this.pushRepo.find({
      where: { role: 'SUPERADMIN' },
    });

    if (!subs.length) {
      this.logger.warn('No push subscriptions found for SUPERADMIN');
      return 0;
    }

    const uniqueSubsMap = new Map<string, PushSubscription>();
    for (const sub of subs) {
      if (sub.endpoint && !uniqueSubsMap.has(sub.endpoint)) {
        uniqueSubsMap.set(sub.endpoint, sub);
      }
    }

    let sent = 0;
    for (const sub of uniqueSubsMap.values()) {
      const ok = await this.dispatchToSubscription(sub, payload);
      if (ok) sent++;
    }
    return sent;
  }
}
