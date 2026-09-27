import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FALLBACK_VAPID_PUBLIC_KEY = 'BOVNV5aBYlzYON15tj1DdHNuR-YNYsotD3BRGgoCjIOEchUZ2C8rRd7nhDOP-Qis-x5rPKcmpdXOJ9N2hPNGsAI';

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

export async function requestAndSubscribePush(identifier: string, negocioId?: string): Promise<boolean> {
  if (!identifier) return false;
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
        identifier,
        subscription: subscription.toJSON(),
        negocioId,
      });
      return true;
    }
  } catch (error) {
    console.warn('Failed to subscribe to Web Push:', error);
  }
  return false;
}
