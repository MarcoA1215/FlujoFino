import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useIonToast } from '@ionic/react';
import { AuthContext } from './AuthContext';
import { playNotificationSound } from '../utils/audio';
import { requestAndSubscribePush } from '../services/push-notification.service';

interface RealtimeContextType {
  pendingOrdersCount: number;
  pendingReservationsCount: number;
  totalAlertsCount: number;
  clearOrdersBadge: () => void;
  clearReservationsBadge: () => void;
  clearAllBadges: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  pendingOrdersCount: 0,
  pendingReservationsCount: 0,
  totalAlertsCount: 0,
  clearOrdersBadge: () => {},
  clearReservationsBadge: () => {},
  clearAllBadges: () => {},
});

export const useRealtimeAlerts = () => useContext(RealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [presentToast] = useIonToast();

  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [pendingReservationsCount, setPendingReservationsCount] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearOrdersBadge = useCallback(() => setPendingOrdersCount(0), []);
  const clearReservationsBadge = useCallback(() => setPendingReservationsCount(0), []);
  const clearAllBadges = useCallback(() => {
    setPendingOrdersCount(0);
    setPendingReservationsCount(0);
  }, []);

  // 1. Subscribe authenticated Admin/Cajero device to Web Push
  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      const roleStr = String(user.role || '').toUpperCase();
      const isAdminOrStaff = roleStr.includes('ADMIN') || roleStr.includes('CAJERO') || roleStr.includes('SUPERADMIN');
      if (isAdminOrStaff) {
        requestAndSubscribePush(
          user.username || user.email || 'ADMIN',
          user.tenantId,
          'ADMIN'
        ).catch(() => {});
      }
    }
  }, [isAuthenticated, user]);

  // 2. Real-time SSE Connection
  useEffect(() => {
    if (!isAuthenticated || !user?.tenantId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const sseUrl = `${apiBase}/notifications/stream/${user.tenantId}`;

    let isSubscribed = true;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!event.data) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'heartbeat') return;

            if (parsed.type === 'order:created') {
              playNotificationSound();
              setPendingOrdersCount((prev) => prev + 1);
              presentToast({
                message: `🛍️ ¡Nuevo Pedido #${parsed.data?.orderNumber || ''} de ${parsed.data?.customerName || 'Cliente'}! ($${Number(parsed.data?.totalAmount || 0).toFixed(2)})`,
                duration: 4500,
                color: 'success',
                position: 'top',
              });
              window.dispatchEvent(new CustomEvent('flujofino:order_created', { detail: parsed.data }));
            } else if (parsed.type === 'reservation:created') {
              playNotificationSound();
              setPendingReservationsCount((prev) => prev + 1);
              presentToast({
                message: `📅 ¡Nueva Cita: ${parsed.data?.customerName || 'Cliente'} para ${parsed.data?.serviceName || 'Servicio'} a las ${parsed.data?.time || ''}!`,
                duration: 4500,
                color: 'primary',
                position: 'top',
              });
              window.dispatchEvent(new CustomEvent('flujofino:reservation_created', { detail: parsed.data }));
            }
          } catch (e) {
            console.error('Error handling SSE message:', e);
          }
        };

        es.onerror = () => {
          es.close();
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectSSE, 5000);
          }
        };
      } catch (err) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, user?.tenantId, presentToast]);

  return (
    <RealtimeContext.Provider
      value={{
        pendingOrdersCount,
        pendingReservationsCount,
        totalAlertsCount: pendingOrdersCount + pendingReservationsCount,
        clearOrdersBadge,
        clearReservationsBadge,
        clearAllBadges,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
