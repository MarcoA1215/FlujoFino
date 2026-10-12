import React, { useState, useContext } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { arrowBackOutline, trashOutline, shieldCheckmarkOutline, alertCircleOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';

export const DeleteAccount: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [identifier, setIdentifier] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeletingDirectly, setIsDeletingDirectly] = useState(false);

  const handlePublicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa tu correo electrónico o nombre de usuario.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const response = await apiClient.post('/auth/request-account-deletion', {
        identifier: identifier.trim(),
        reason: reason.trim() || 'Solicitud desde portal web de privacidad',
      });

      setStatusMessage({
        type: 'success',
        text: response.data?.message || 'Tu solicitud de eliminación de cuenta ha sido registrada con éxito.',
      });
      setIdentifier('');
      setReason('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente o contacta a soporte.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAccountDeletion = async () => {
    setIsDeletingDirectly(true);
    setStatusMessage(null);

    try {
      await apiClient.post('/auth/delete-my-account');
      alert('Tu cuenta y datos personales han sido eliminados de la plataforma de forma definitiva.');
      logout();
      navigate('/login');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || 'No se pudo eliminar la cuenta. Si eres el dueño principal de una suscripción activa, contacta a soporte.',
      });
    } finally {
      setIsDeletingDirectly(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#ffffff', '--border-color': '#e2e8f0' } as any}>
          <IonButtons slot="start">
            <IonButton onClick={() => navigate(-1)} style={{ color: '#0f172a' }}>
              <IonIcon icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle style={{ color: '#0f172a', fontWeight: 700, fontSize: '18px' }}>
            Eliminación de Cuenta y Datos
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#f8fafc' } as any} className="ion-padding ff-has-bottom-nav">
        <div style={{ maxWidth: '720px', margin: '0 auto', color: '#334155', lineHeight: '1.6', fontSize: '15px', padding: '16px 0' }}>
          
          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fee2e2', color: '#b91c1c', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              <IonIcon icon={trashOutline} /> Política de Supresión de Datos (Google Play)
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Solicitud de Eliminación de Cuenta FinoWork
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Cumplimiento con las políticas de privacidad y control de datos de Google Play Store.
            </p>
          </div>

          {/* Información sobre el proceso */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#10b981' }} /> ¿Qué ocurre cuando solicitas eliminar tu cuenta?
            </h2>
            <ul style={{ paddingLeft: '20px', margin: '12px 0', fontSize: '14px', color: '#475569' }}>
              <li><strong>Datos eliminados de inmediato:</strong> Nombre de usuario, contraseña cifrada, datos de contacto personal (correo, teléfono) y roles de acceso asignados.</li>
              <li><strong>Desvinculación del Negocio:</strong> Se revoca todo acceso a los paneles comerciales, de caja, cocina o despacho de FinoWork.</li>
              <li><strong>Retención fiscal y legal:</strong> Si fuiste cajero o despachador en ventas históricas ya cerradas, los registros numéricos y comprobantes fiscales se conservan disociados para garantizar la integridad contable del comercio y cumplir con normativas tributarias.</li>
              <li><strong>Copias de respaldo:</strong> Las copias de seguridad automatizadas se sobrescriben en un lapso no mayor a 30 días.</li>
            </ul>
          </div>

          {/* Opción A: Si el usuario tiene sesión activa */}
          {user && (
            <div style={{ background: '#fff1f2', borderRadius: '16px', padding: '24px', border: '1px solid #fecdd3', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#9f1239', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={alertCircleOutline} style={{ color: '#e11d48' }} /> Tienes una sesión iniciada como: {user.username}
              </h3>
              <p style={{ fontSize: '14px', color: '#881337', margin: '8px 0 16px' }}>
                Puedes dar de baja tu perfil y eliminar tus credenciales directamente con un solo clic. Esta acción es inmediata y no se puede deshacer.
              </p>
              <IonButton
                color="danger"
                expand="block"
                onClick={() => setShowConfirmModal(true)}
                disabled={isDeletingDirectly}
                style={{ fontWeight: 700, '--border-radius': '10px' }}
              >
                {isDeletingDirectly ? <IonSpinner name="crescent" /> : 'Eliminar Definitivamente Mi Cuenta Ahora'}
              </IonButton>
            </div>
          )}

          {/* Opción B: Formulario público (Google Play Web Requirement) */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: 0 }}>
              Formulario de Solicitud de Supresión (Para Usuarios o Cuentas Inactivas)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Si no puedes iniciar sesión o ya desinstalaste la aplicación móvil, ingresa el correo electrónico o usuario registrado para tramitar la baja de tus datos personales.
            </p>

            {statusMessage && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handlePublicRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Correo Electrónico o Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ejemplo@correo.com o tu_usuario"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Motivo de la solicitud (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indícanos la razón de tu baja para ayudarnos a mejorar el servicio..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                }}
              >
                {loading ? <IonSpinner name="crescent" color="light" /> : 'Enviar Solicitud de Eliminación'}
              </button>
            </form>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <a href="/privacy" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>
                ← Ver Política de Privacidad
              </a>
              <a href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>
                Términos del Servicio
              </a>
            </div>
          </div>

        </div>

        {/* Modal de confirmación para borrado directo */}
        <IonAlert
          isOpen={showConfirmModal}
          onDidDismiss={() => setShowConfirmModal(false)}
          header="¿Eliminar tu cuenta definitivamente?"
          message="Esta acción no se puede revertir. Se borrarán tus credenciales, datos de perfil y perderás todo acceso a la plataforma."
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Sí, Eliminar Todo',
              role: 'destructive',
              handler: () => {
                handleDirectAccountDeletion();
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default DeleteAccount;
