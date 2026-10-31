import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/react';
import {
  cloudDownloadOutline,
  timeOutline,
  alertCircleOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useAppUpdater, type UseAppUpdaterReturn } from '../hooks/useAppUpdater';

interface AppUpdateModalProps {
  updaterState?: UseAppUpdaterReturn;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ updaterState }) => {
  const internalUpdater = useAppUpdater();
  const updater = updaterState || internalUpdater;

  const {
    isOpen,
    latestUpdate,
    canPostpone,
    daysRemaining,
    isStrictlyMandatory,
    isDownloading,
    downloadProgress,
    errorMessage,
    startUpdate,
    postponeUpdate,
  } = updater;

  if (!isOpen || !latestUpdate) {
    return null;
  }

  const renderBadge = (type: string) => {
    switch (type) {
      case 'ADDED':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0',
            }}
          >
            NUEVO
          </span>
        );
      case 'IMPLEMENTED':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
            }}
          >
            MEJORA
          </span>
        );
      case 'FIXED':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
            }}
          >
            CORRECCIÓN
          </span>
        );
      default:
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#F1F5F9',
              color: '#475569',
              border: '1px solid #CBD5E1',
            }}
          >
            CAMBIO
          </span>
        );
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      backdropDismiss={canPostpone && !isDownloading}
      onDidDismiss={() => {
        if (canPostpone && !isDownloading) {
          postponeUpdate();
        }
      }}
      style={{
        '--max-width': '480px',
        '--border-radius': '20px',
        '--box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      } as any}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar
          style={{
            '--background': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            '--color': '#FFFFFF',
            padding: '8px 12px',
          } as any}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IonIcon icon={sparklesOutline} style={{ fontSize: '20px', color: 'var(--theme-primary, #10B981)' }} />
            </div>
            <div>
              <IonTitle style={{ fontSize: '17px', fontWeight: 700, padding: 0 }}>
                {isStrictlyMandatory ? 'Actualización Requerida' : 'Nueva Versión de FinoWork'}
              </IonTitle>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Versión {latestUpdate.version || 'v' + latestUpdate.versionCode} {latestUpdate.fileSizeMb && `(${latestUpdate.fileSizeMb})`}
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Banner de Estado / Período de Gracia */}
          {isStrictlyMandatory ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '12px',
              }}
            >
              <IonIcon icon={alertCircleOutline} style={{ color: '#DC2626', fontSize: '22px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#991B1B', lineHeight: '1.4' }}>
                <strong>El período de gracia ha finalizado.</strong> Para garantizar la integridad fiscal y sincronización con tu negocio, debes actualizar para continuar operando.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '12px',
              }}
            >
              <IonIcon icon={timeOutline} style={{ color: '#16A34A', fontSize: '22px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#166534', lineHeight: '1.4' }}>
                <strong>No frenes tus ventas.</strong> Tienes{' '}
                <span style={{ fontWeight: 700, textDecoration: 'underline' }}>
                  {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                </span>{' '}
                de gracia para actualizar antes de que sea obligatorio.
              </div>
            </div>
          )}

          {/* Título de la versión y resumen */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              {latestUpdate.title}
            </h4>
            {latestUpdate.summary && (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: '1.45' }}>
                {latestUpdate.summary}
              </p>
            )}

            {/* Lista de Novedades */}
            {latestUpdate.changes && latestUpdate.changes.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  ¿Qué hay de nuevo en esta versión?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {latestUpdate.changes.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#1E293B' }}>
                      <div style={{ marginTop: '1px' }}>{renderBadge(item.type)}</div>
                      <div style={{ flex: 1, lineHeight: '1.35' }}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progreso de Descarga */}
          {isDownloading && (
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                <span>Descargando actualización...</span>
                <span>{downloadProgress}%</span>
              </div>
              <IonProgressBar
                value={downloadProgress / 100}
                color="primary"
                style={{ height: '8px', borderRadius: '4px' }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#10B981' }} />
                <span>Tus datos de ventas e inventario están protegidos y no se perderán.</span>
              </div>
            </div>
          )}

          {/* Mensaje de Error si ocurrió alguno */}
          {errorMessage && (
            <div
              style={{
                fontSize: '12px',
                color: '#DC2626',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Botones de Acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <IonButton
              expand="block"
              disabled={isDownloading}
              onClick={startUpdate}
              style={{
                '--background': 'var(--theme-primary, #10B981)',
                '--color': 'var(--theme-primary-contrast, #ffffff)',
                fontWeight: 700,
                fontSize: '14px',
                height: '44px',
                margin: 0,
              } as any}
            >
              <IonIcon icon={cloudDownloadOutline} slot="start" />
              {isDownloading ? `Descargando (${downloadProgress}%)...` : 'Actualizar ahora'}
            </IonButton>

            {canPostpone && !isDownloading && (
              <IonButton
                fill="clear"
                onClick={postponeUpdate}
                style={{
                  '--color': '#64748B',
                  fontSize: '13px',
                  fontWeight: 600,
                  height: '38px',
                  margin: 0,
                } as any}
              >
                Actualizar más tarde (Continuar vendiendo)
              </IonButton>
            )}
          </div>

        </div>
      </IonContent>
    </IonModal>
  );
};
