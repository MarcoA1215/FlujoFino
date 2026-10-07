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

  // CASO 1: Suscripción VENCIDA (PAST_DUE o periodo culminado con días de gracia)
  const isPastDue =
    subscription.status === TenantStatus.PAST_DUE ||
    (subscription.status === TenantStatus.ACTIVE && daysLeft <= 0);

  if (isPastDue) {
    return (
      <div
        style={{
          backgroundColor: '#fef2f2',
          borderBottom: '2px solid #f87171',
          color: '#991b1b',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IonIcon icon={warningOutline} style={{ fontSize: '1.4rem', color: '#dc2626', flexShrink: 0 }} />
          <span>
            🔴 <strong>¡Suscripción Vencida (Pago Pendiente)!</strong> Tu período de pago ha vencido. Cuentas con días de gracia para regularizar tu cuota antes de que tu cuenta sea suspendida.
          </span>
        </div>

        <IonButton
          size="small"
          color="danger"
          onClick={() => setIsReportModalOpen(true)}
          style={{
            fontWeight: 800,
            margin: 0,
            textTransform: 'none',
          }}
        >
          <IonIcon slot="start" icon={cardOutline} />
          Pagar Ahora / Reportar Pago
        </IonButton>
      </div>
    );
  }

  // CASO 2: Próximo a vencer (entre 0 y 5 días restantes)
  if (daysLeft < 0 || daysLeft > 5) {
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
