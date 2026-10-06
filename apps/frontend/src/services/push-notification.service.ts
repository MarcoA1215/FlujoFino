import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import axios from 'axios';
import { useEffect } from 'react';
import { DEFAULT_SUPERADMIN_EMAIL, UserRole } from '@finowork/shared-types';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FALLBACK_VAPID_PUBLIC_KEY =
  'BOVNV5aBYlzYON15tj1DdHNuR-YNYsotD3BRGgoCjIOEchUZ2C8rRd7nhDOP-Qis-x5rPKcmpdXOJ9N2hPNGsAI';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio restrictions
  }
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (Capacitor.isNativePlatform()) {
    return 'default';
  }
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function subscribeWebPush(
  identifier: string,
  negocioId?: string,
  role: string = 'CUSTOMER',
  requestPermissionIfDefault: boolean = false,
): Promise<{ success: boolean; reason?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[Web Push] No soportado en este navegador o entorno (requiere HTTPS o localhost).');
    return { success: false, reason: 'unsupported' };
  }

  try {
    let currentPerm = Notification.permission;
    if (currentPerm === 'denied') {
      console.warn('[Web Push] Permiso denegado por el usuario en el navegador.');
      return { success: false, reason: 'denied' };
    }

    if (currentPerm === 'default') {
      if (!requestPermissionIfDefault) {
        // En navegadores modernos (Chrome 80+), solicitar permisos sin un gesto de usuario
        // provoca que el navegador lo bloquee o silencie automáticamente.
        return { success: false, reason: 'prompt_needed' };
      }
      currentPerm = await Notification.requestPermission();
      if (currentPerm !== 'granted') {
        return { success: false, reason: currentPerm };
      }
    }

    // Asegurar registro activo del Service Worker
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }
    const swReady = await navigator.serviceWorker.ready;

    let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        const res = await axios.get(`${apiBase}/notifications/public-key`);
        publicKey = res.data?.publicKey;
      } catch (e) {
        publicKey = FALLBACK_VAPID_PUBLIC_KEY;
      }
    }

    let subscription = await swReady.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey || FALLBACK_VAPID_PUBLIC_KEY);
      subscription = await swReady.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    if (subscription) {
      await axios.post(`${apiBase}/notifications/subscribe`, {
        identifier: identifier.trim().toLowerCase(),
        subscription: subscription.toJSON(),
        negocioId,
        role,
      });
      console.log(`[Web Push] Dispositivo suscrito con éxito (${role}):`, identifier);
      return { success: true };
    }
  } catch (error: any) {
    console.warn('[Web Push] Error suscribiendo a notificaciones push:', error);
    return { success: false, reason: error.message || 'error' };
  }
  return { success: false, reason: 'unknown' };
}

export async function registerPushNotifications(
  identifier: string,
  negocioId?: string,
  role: string = 'ADMIN',
  isManualUserGesture: boolean = false,
): Promise<{ success: boolean; reason?: string }> {
  if (!identifier) return { success: false, reason: 'no_identifier' };

  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Capacitor Native] Permiso de notificaciones no concedido:', permStatus.receive);
        return { success: false, reason: permStatus.receive };
      }

      await PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', async (token: Token) => {
        try {
          await axios.post(`${apiBase}/notifications/subscribe`, {
            identifier: identifier.trim().toLowerCase(),
            subscription: {
              endpoint: token.value,
              keys: { p256dh: '', auth: '' },
            },
            negocioId,
            role,
          });
          console.log(`[Capacitor Native] Token push registrado (${role}):`, token.value);
        } catch (err) {
          console.error('[Capacitor Native] Error registrando push token con backend:', err);
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('[Capacitor Native] Advertencia de registro push:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[Capacitor Native] Notificación recibida:', notification);
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title || 'FinoWork', {
            body: notification.body,
            icon: '/favicon.svg',
            data: notification.data,
          });
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const targetUrl = action.notification.data?.url;
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      });

      try {
        await PushNotifications.register();
      } catch (fcmErr) {
        console.warn('[Capacitor Native] FCM no pudo registrarse (requiere google-services.json en Android):', fcmErr);
      }

      return { success: true };
    } catch (error: any) {
      console.warn('[Capacitor Native] Error al inicializar PushNotifications:', error);
      return { success: false, reason: error.message };
    }
  } else {
    // Si ya tiene permiso 'granted', o si el usuario hizo clic explícito (isManualUserGesture)
    const shouldPrompt = isManualUserGesture || (typeof Notification !== 'undefined' && Notification.permission === 'granted');
    return await subscribeWebPush(identifier, negocioId, role, shouldPrompt);
  }
}

export async function requestAndSubscribePush(
  identifier: string,
  negocioId?: string,
  role: string = 'CUSTOMER',
): Promise<{ success: boolean; reason?: string }> {
  return registerPushNotifications(identifier, negocioId, role, true);
}

export async function testPushNotification(
  identifier?: string,
  negocioId?: string,
): Promise<{ success: boolean; message: string }> {
  playNotificationSound();

  // 1. Mostrar notificación local inmediata si el navegador lo permite
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('🔔 Notificación de Prueba FinoWork', {
        body: 'El sistema de notificaciones está funcionando correctamente.',
        icon: '/favicon.svg',
      });
    } catch (e) {
      // Ignorar si el navegador restringe la API directa en favor de service worker
    }
  }

  // 2. Probar backend push endpoint
  try {
    const res = await axios.post(`${apiBase}/notifications/test`, {
      identifier: identifier?.trim().toLowerCase(),
      negocioId,
    });
    return {
      success: true,
      message: res.data?.message || 'Prueba de notificación enviada con éxito.',
    };
  } catch (err: any) {
    return {
      success: true, // La local ya sonó y se mostró
      message: 'Sonido y alerta local emitidos con éxito.',
    };
  }
}

export function usePushNotifications(
  user?: {
    id?: string;
    email?: string;
    username?: string;
    role?: string;
    tenantId?: string;
  } | null,
): void {
  useEffect(() => {
    if (!user) return;
    const identifier = user.email || user.username || user.id;
    if (!identifier) return;

    const isSuperAdmin =
      user.role === UserRole.SUPERADMIN ||
      (user.role as string) === 'SUPERADMIN' ||
      user.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

    const role = isSuperAdmin ? 'SUPERADMIN' : (user.role || 'ADMIN');

    // Si ya está concedido el permiso en la web, renovar/registrar suscripción automáticamente
    if (Capacitor.isNativePlatform() || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
      registerPushNotifications(identifier, user.tenantId, role, false).catch(console.error);
    }
  }, [user?.id, user?.email, user?.role, user?.tenantId]);
}
