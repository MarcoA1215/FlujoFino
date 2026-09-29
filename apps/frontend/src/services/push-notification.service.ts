import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import axios from 'axios';
import { useEffect } from 'react';

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
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio restrictions
  }
}

async function subscribeWebPush(
  identifier: string,
  negocioId?: string,
  role: string = 'CUSTOMER',
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('Web Push not supported in this browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Web Push permission denied by user.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        const res = await axios.get(`${apiBase}/notifications/public-key`);
        publicKey = res.data?.publicKey;
      } catch (e) {
        publicKey = FALLBACK_VAPID_PUBLIC_KEY;
      }
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey || FALLBACK_VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
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
      return true;
    }
  } catch (error) {
    console.warn('Failed to subscribe to Web Push:', error);
  }
  return false;
}

export async function registerPushNotifications(
  identifier: string,
  negocioId?: string,
  role: string = 'ADMIN',
): Promise<boolean> {
  if (!identifier) return false;

  if (Capacitor.isNativePlatform()) {
    // Skip FCM push registration if Firebase is not configured (no google-services.json)
    // PushNotifications.register() crashes at runtime without Firebase initialization
    const hasFirebase = !!(window as any).firebase || 
      document.querySelector('meta[name="firebase-configured"]');
    if (!hasFirebase) {
      console.warn('[Push] Firebase not configured — skipping native push registration');
      return false;
    }
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        console.warn('Native Push Notifications permission not granted');
        return false;
      }

      await PushNotifications.register();

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
        console.error('[Capacitor Native] Error de registro:', JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[Capacitor Native] Notificación recibida:', notification);
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title || 'Flujo Fino', {
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

      return true;
    } catch (error) {
      console.warn('[Capacitor Native] Error al inicializar PushNotifications:', error);
      return false;
    }
  } else {
    return await subscribeWebPush(identifier, negocioId, role);
  }
}

export async function requestAndSubscribePush(
  identifier: string,
  negocioId?: string,
  role: string = 'CUSTOMER',
): Promise<boolean> {
  return registerPushNotifications(identifier, negocioId, role);
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
      user.role === 'SUPERADMIN' ||
      user.email === 'superadmin@flujofino.com';

    const role = isSuperAdmin ? 'SUPERADMIN' : (user.role || 'ADMIN');
    registerPushNotifications(identifier, user.tenantId, role).catch(console.error);
  }, [user?.id, user?.email, user?.role, user?.tenantId]);
}
