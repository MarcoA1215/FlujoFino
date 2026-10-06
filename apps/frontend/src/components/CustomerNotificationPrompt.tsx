import React, { useState, useEffect } from 'react';
import { IonIcon, useIonToast } from '@ionic/react';
import {
  notificationsOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import {
  getNotificationPermission,
  requestAndSubscribePush,
  playNotificationSound,
  type NotificationPermissionState,
} from '../services/push-notification.service';

interface CustomerNotificationPromptProps {
  identifier?: string;
  tenantId?: string;
  type?: 'order' | 'booking' | 'general';
  orderNumber?: string;
  style?: React.CSSProperties;
}

export const CustomerNotificationPrompt: React.FC<CustomerNotificationPromptProps> = ({
  identifier,
  tenantId,
  type = 'general',
  orderNumber,
  style,
}) => {
  const [presentToast] = useIonToast();
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const updatePerm = () => setPermissionState(getNotificationPermission());
    updatePerm();
    window.addEventListener('focus', updatePerm);
    return () => window.removeEventListener('focus', updatePerm);
  }, []);

  if (permissionState === 'unsupported' || isDismissed) {
    return null;
  }

  const handleActivate = async () => {
    if (!identifier) {
      presentToast({
        message: 'No se encontró un número de teléfono o identificación para vincular los avisos.',
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    setIsActivating(true);
    try {
      const result = await requestAndSubscribePush(identifier.trim(), tenantId, 'CUSTOMER');
      const newPerm = getNotificationPermission();
      setPermissionState(newPerm);

      if (newPerm === 'granted' || result.success) {
        playNotificationSound();

        // Mostrar notificación local de confirmación inmediata
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 ¡Avisos activados con éxito!', {
              body:
                type === 'order'
                  ? `Te notificaremos aquí el estado de tu pedido${orderNumber ? ` #${orderNumber}` : ''}.`
                  : 'Te notificaremos en este navegador los avances y recordatorios de tu cita.',
              icon: '/favicon.svg',
            });
          } catch (e) {}
        }

        presentToast({
          message: '¡Avisos activados con éxito! Te notificaremos directamente en este navegador.',
          duration: 4000,
          color: 'success',
          icon: checkmarkCircleOutline,
        });
      } else if (newPerm === 'denied') {
        presentToast({
          message: 'Las notificaciones fueron bloqueadas. Habilítalas en el ícono del candado de tu navegador para recibirlas.',
          duration: 5000,
          color: 'warning',
          icon: alertCircleOutline,
        });
      }
    } catch (err: any) {
      console.warn('Error solicitando permisos de notificación:', err);
    } finally {
      setIsActivating(false);
    }
  };

  if (permissionState === 'granted') {
    return (
      <div
        style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
          marginBottom: '16px',
          textAlign: 'left',
          ...style,
        }}
      >
        <div
          style={{
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '1.25rem' }} />
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#065F46' }}>
            ✓ Avisos activos en este navegador
          </div>
          <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>
            {type === 'order'
              ? 'Recibirás alertas sonoras y visuales cuando tu pedido cambie de estado.'
              : 'Recibirás alertas directas cuando tu cita sea confirmada o tenga alguna actualización.'}
          </div>
        </div>
      </div>
    );
  }

  const title =
    type === 'order'
      ? '¿Quieres recibir avisos del estado de tu pedido?'
      : type === 'booking'
      ? '¿Quieres recibir avisos y recordatorios de tu cita?'
      : '¿Deseas activar avisos en este dispositivo?';

  const desc =
    type === 'order'
      ? 'Te notificaremos al instante cuando tu pedido sea aceptado, preparado y cuando salga en camino.'
      : type === 'booking'
      ? 'Te notificaremos en este navegador cuando tu cita sea confirmada o si hay algún aviso de tiempo.'
      : 'Recibe alertas instantáneas en tu navegador sobre el estado de tus compras o reservas.';

  const btnText =
    type === 'order'
      ? '🔔 Activar Avisos de mi Pedido'
      : type === 'booking'
      ? '🔔 Activar Avisos de mi Cita'
      : '🔔 Activar Notificaciones';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #10B981',
        borderRadius: '16px',
        padding: '16px 18px',
        marginTop: '16px',
        marginBottom: '16px',
        textAlign: 'left',
        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#10B981',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #A7F3D0',
          }}
        >
          <IonIcon icon={notificationsOutline} style={{ fontSize: '1.4rem' }} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0F172A', lineHeight: '1.3' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
            {desc}
          </div>

          {permissionState === 'denied' ? (
            <div
              style={{
                marginTop: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
              }}
            >
              ⚠ Tu navegador tiene las notificaciones bloqueadas. Para activarlas, toca el ícono del candado/ajustes al lado de la URL y permite las notificaciones.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleActivate}
                disabled={isActivating}
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isActivating ? 'Activando...' : btnText}
              </button>

              <button
                onClick={() => setIsDismissed(true)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  border: 'none',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Ahora no
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
