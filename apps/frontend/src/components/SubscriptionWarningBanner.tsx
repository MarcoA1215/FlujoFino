import React, { useContext } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { cardOutline, warningOutline } from 'ionicons/icons';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@finowork/shared-types';

export const SubscriptionWarningBanner: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { daysLeft, isExpired, setIsReportModalOpen } = useContext(SubscriptionContext);

  const isSuperAdmin =
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'SUPERADMIN' ||
    user?.email === 'superadmin@flujofino.com';

  if (isSuperAdmin || !user?.tenantId || isExpired) {
    return null;
  }

  // Mostrar únicamente si faltan entre 0 y 5 días
  if (daysLeft < 0 || daysLeft > 5 || isExpired) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fef3c7',
        borderBottom: '1px solid #f59e0b',
        color: '#92400e',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.88rem',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IonIcon icon={warningOutline} style={{ fontSize: '1.2rem', color: '#d97706' }} />
        <span>
          {daysLeft === 0 ? (
            <>⚠️ Tu período de prueba vence hoy</>
          ) : (
            <>
              ⚠️ Tu período de prueba vence en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>.
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
