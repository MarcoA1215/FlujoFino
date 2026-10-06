import React, { useContext } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { cardOutline, warningOutline } from 'ionicons/icons';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { UserRole, DEFAULT_SUPERADMIN_EMAIL } from '@finowork/shared-types';

export const SubscriptionWarningBanner: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { subscription, daysLeft, isExpired, isLoading, setIsReportModalOpen } = useContext(SubscriptionContext);

  const isSuperAdmin =
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'SUPERADMIN' ||
    user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

  if (isLoading || !subscription || isSuperAdmin || !user?.tenantId || isExpired) {
    return null;
  }

  // Mostrar únicamente si faltan entre 0 y 5 días
  if (daysLeft < 0 || daysLeft > 5 || isExpired) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #fde68a',
        color: '#92400e',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.82rem',
        fontWeight: 600,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IonIcon icon={warningOutline} style={{ fontSize: '1.2rem', color: '#d97706' }} />
        <span>
          {daysLeft === 0 ? (
            <>⚠️ {subscription.status === 'TRIAL' ? 'Tu período de prueba' : 'Tu suscripción mensual'} vence hoy</>
          ) : (
            <>
              ⚠️ {subscription.status === 'TRIAL' ? 'Tu período de prueba' : 'Tu suscripción mensual'} vence en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>.
            </>
          )}
        </span>
      </div>

      <IonButton
        size="small"
        color="warning"
        onClick={() => setIsReportModalOpen(true)}
        style={{
          '--color': '#78350f',
          fontWeight: 700,
          margin: 0,
          textTransform: 'none',
        }}
      >
        <IonIcon slot="start" icon={cardOutline} />
        Activar Plan / Reportar Pago
      </IonButton>
    </div>
  );
};
