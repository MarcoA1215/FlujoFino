import React, { useState, useContext } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import {
  shieldCheckmarkOutline,
  documentTextOutline,
  lockClosedOutline,
  openOutline,
  calculatorOutline,
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { CURRENT_LEGAL_VERSION } from '@finowork/shared-types';

export const TermsUpdateModal: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useContext(AuthContext);
  const location = useLocation();
  const [presentToast] = useIonToast();

  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No mostrar el modal si el usuario no está autenticado
  if (!isAuthenticated || !user) {
    return null;
  }

  // Si el usuario ya aceptó la versión 2.0, no mostrar
  const isUpToDate = user.termsAcceptedVersion === CURRENT_LEGAL_VERSION;
  if (isUpToDate) {
    return null;
  }

  // Rutas exentas donde el usuario está leyendo los términos o navegando autenticación pública
  const exemptRoutes = [
    '/terms',
    '/privacy',
    '/promoter/terms',
    '/delete-account',
    '/solicitud-eliminacion',
    '/login',
    '/register',
    '/landing',
  ];

  if (exemptRoutes.includes(location.pathname)) {
    return null;
  }

  const handleAcceptTerms = async () => {
    if (!hasAgreed) {
      presentToast({
        message: 'Debes marcar la casilla para confirmar que has leído y aceptas los términos actualizados.',
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/auth/accept-terms', { version: CURRENT_LEGAL_VERSION });
      
      await updateUser({
        termsAcceptedVersion: CURRENT_LEGAL_VERSION,
        privacyAcceptedVersion: CURRENT_LEGAL_VERSION,
        termsAcceptedAt: new Date().toISOString(),
      });

      presentToast({
        message: '¡Términos y condiciones actualizados aceptados con éxito!',
        duration: 3500,
        color: 'success',
      });
    } catch (err: any) {
      console.error('Error al aceptar términos:', err);
      presentToast({
        message: 'No se pudo registrar la aceptación. Por favor intenta de nuevo.',
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <IonModal
      isOpen={!isUpToDate}
      backdropDismiss={false}
      style={{
        '--max-width': '580px',
        '--border-radius': '20px',
      } as any}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#ffffff', '--border-color': '#e2e8f0' } as any}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                fontSize: '18px',
              }}
            >
              <IonIcon icon={shieldCheckmarkOutline} />
            </div>
            <IonTitle style={{ color: '#0f172a', fontWeight: 800, fontSize: '16px', padding: 0 }}>
              Actualización Legal y Tributaria (v{CURRENT_LEGAL_VERSION})
            </IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        <div style={{ padding: '8px 4px 20px 4px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
          
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
              Estimado(a) comerciante o usuario de FinoWork:
            </p>
            <p style={{ margin: 0, color: '#475569' }}>
              Hemos actualizado nuestros <strong>Términos y Condiciones del Servicio</strong> y nuestra <strong>Política de Privacidad</strong> para incorporar las regulaciones y garantías operativas de nuestro nuevo <strong>Módulo de Asistencia y Gestión Fiscal</strong>.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', marginBottom: '12px' }}>
              Principales Puntos de la Actualización (v{CURRENT_LEGAL_VERSION}):
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '16px',
                }}
              >
                <IonIcon icon={calculatorOutline} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                  Asistencia Fiscal y Responsabilidad Tributaria (SENIAT)
                </div>
                <div style={{ color: '#475569', fontSize: '12.5px', marginTop: '2px' }}>
                  FinoWork provee herramientas tecnológicas de cómputo y emisión. Se clarifica formalmente que cada contribuyente es el único responsable legal directo ante el SENIAT por la veracidad, custodia y declaración de sus impuestos.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '16px',
                }}
              >
                <IonIcon icon={documentTextOutline} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                  Libro de Ventas y Comprobantes de Pago
                </div>
                <div style={{ color: '#475569', fontSize: '12.5px', marginTop: '2px' }}>
                  Se detallan los deberes de resguardo de correlativos fiscales, facturas emitidas, notas de crédito y la auditoría de los reportes mensuales de Libro de Ventas.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '16px',
                }}
              >
                <IonIcon icon={lockClosedOutline} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                  Confidencialidad y Seguridad Criptográfica
                </div>
                <div style={{ color: '#475569', fontSize: '12.5px', marginTop: '2px' }}>
                  Refuerzo en el tratamiento confidencial y cifrado de datos de clientes, comprobantes bancarios y parámetros fiscales de su empresa.
                </div>
              </div>
            </div>
          </div>

          {/* Enlaces a los documentos completos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              marginBottom: '18px',
            }}
          >
            <button
              type="button"
              onClick={() => openDocument('/terms')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Ver Términos y Condiciones</span>
              <IonIcon icon={openOutline} style={{ color: '#64748b' }} />
            </button>

            <button
              type="button"
              onClick={() => openDocument('/privacy')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Ver Política de Privacidad</span>
              <IonIcon icon={openOutline} style={{ color: '#64748b' }} />
            </button>
          </div>

          {/* Casilla de aceptación */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <IonCheckbox
                checked={hasAgreed}
                onIonChange={(e) => setHasAgreed(e.detail.checked)}
                style={{ marginTop: '2px' }}
              />
              <label
                onClick={() => setHasAgreed(!hasAgreed)}
                style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', lineHeight: '1.4' }}
              >
                Declaro que he leído atentamente, comprendo y acepto expresamente los <strong>Términos y Condiciones del Servicio</strong> y la <strong>Política de Privacidad de FinoWork</strong> (Versión {CURRENT_LEGAL_VERSION}).
              </label>
            </div>
          </div>

          {/* Botón de acción */}
          <IonButton
            expand="block"
            disabled={!hasAgreed || isSubmitting}
            onClick={handleAcceptTerms}
            style={{
              '--background': 'var(--theme-primary, #10b981)',
              '--color': 'var(--theme-primary-contrast, #ffffff)',
              '--border-radius': '12px',
              fontWeight: 800,
              fontSize: '14px',
              height: '46px',
              margin: 0,
            } as any}
          >
            {isSubmitting ? (
              <IonSpinner name="dots" />
            ) : (
              'Aceptar Términos y Continuar'
            )}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
