import React, { useState, useEffect, useContext } from 'react';
import { IonIcon, useIonToast } from '@ionic/react';
import { notificationsOutline, closeOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { AuthContext } from '../context/AuthContext';
import {
  getNotificationPermission,
  registerPushNotifications,
  type NotificationPermissionState,
} from '../services/push-notification.service';
import { DEFAULT_SUPERADMIN_EMAIL, UserRole } from '@finowork/shared-types';

export const NotificationPermissionBanner: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dismiss_push_banner') === 'true';
    } catch {
      return false;
    }
  });
  const [isActivating, setIsActivating] = useState<boolean>(false);

  useEffect(() => {
    const updatePerm = () => {
      setPermissionState(getNotificationPermission());
    };
    updatePerm();
    window.addEventListener('focus', updatePerm);
    return () => window.removeEventListener('focus', updatePerm);
  }, []);

  // Solo mostrar si el usuario está autenticado, no está dismiss, y el permiso aún es 'default'
  if (!user || isDismissed || permissionState !== 'default') {
    return null;
  }

  const handleActivate = async () => {
    setIsActivating(true);
    const identifier = user.email || user.username || user.id;
    if (!identifier) {
      setIsActivating(false);
      return;
    }

    const isSuperAdmin =
      user.role === UserRole.SUPERADMIN ||
      (user.role as string) === 'SUPERADMIN' ||
      user.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
    const role = isSuperAdmin ? 'SUPERADMIN' : (user.role || 'ADMIN');

    try {
      const result = await registerPushNotifications(identifier, user.tenantId, role, true);
      const newPerm = getNotificationPermission();
      setPermissionState(newPerm);

      if (newPerm === 'granted' || result.success) {
        presentToast({
          message: '¡Notificaciones activadas con éxito! Recibirás alertas de nuevos pedidos y reservas.',
          duration: 3500,
          color: 'success',
          icon: checkmarkCircleOutline,
        });
      } else if (newPerm === 'denied') {
        presentToast({
          message: 'Las notificaciones fueron bloqueadas. Habilítalas en el ícono de permisos de tu navegador.',
          duration: 4000,
          color: 'warning',
          icon: alertCircleOutline,
        });
      }
    } catch (e: any) {
      console.error('Error activating push notifications:', e);
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('dismiss_push_banner', 'true');
    } catch {}
  };

  return (
    <div
      style={{
        backgroundColor: '#ECFDF5',
        borderBottom: '1px solid #A7F3D0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 9999,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
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
          <IonIcon icon={notificationsOutline} style={{ fontSize: '1.15rem' }} />
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#065F46' }}>
            Activa las notificaciones en este dispositivo
          </div>
          <div style={{ fontSize: '0.8rem', color: '#047857' }}>
            Recibe alertas sonoras al instante cuando lleguen nuevos pedidos o reservas.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleActivate}
          disabled={isActivating}
          style={{
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isActivating ? 'Activando...' : 'Activar Notificaciones'}
        </button>

        <button
          onClick={handleDismiss}
          title="Descartar por ahora"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#065F46',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IonIcon icon={closeOutline} style={{ fontSize: '1.2rem' }} />
        </button>
      </div>
    </div>
  );
};
