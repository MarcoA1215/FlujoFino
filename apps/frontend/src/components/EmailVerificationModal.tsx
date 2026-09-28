import React, { useState, useContext } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSpinner,
  useIonToast
} from '@ionic/react';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateUser } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [loading, setLoading] = useState(false);
  const [presentToast] = useIonToast();

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/send-verification', {
        email: user?.email,
        username: user?.username,
      });
      presentToast({
        message: res.data?.message || 'Código enviado a tu correo',
        duration: 3500,
        color: 'success',
      });
      setStep('VERIFY');
    } catch (err: any) {
      presentToast({
        message: err.response?.data?.message || 'Error al enviar código',
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.trim().length !== 6) {
      presentToast({
        message: 'Ingresa el código de 6 dígitos',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-email', {
        email: user?.email,
        code: code.trim(),
      });
      await updateUser({ isEmailVerified: true });
      presentToast({
        message: res.data?.message || '¡Correo verificado con éxito!',
        duration: 3000,
        color: 'success',
      });
      setCode('');
      setStep('REQUEST');
      onClose();
    } catch (err: any) {
      presentToast({
        message: err.response?.data?.message || 'Código inválido o expirado',
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ '--max-width': '420px', '--height': 'auto', '--border-radius': '16px' } as any}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #e2e8f0' } as any}>
          <IonTitle style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
            Verificación de Correo
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} color="medium">Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#ffffff' } as any}>
        <div style={{ textAlign: 'center', padding: '12px 6px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            margin: '0 auto 16px auto',
          }}>
            ✉️
          </div>

          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            Protege tu cuenta
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
            {user?.email
              ? `Verifica tu dirección ${user.email} para asegurar el acceso a tu negocio.`
              : 'Verifica tu correo electrónico para garantizar la seguridad.'}
          </p>

          {step === 'REQUEST' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="w-full bg-theme-primary font-bold py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} /> : 'Enviar Código al Correo'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>
                  Código de 6 dígitos:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  style={{
                    width: '100%',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: '800',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full bg-theme-primary font-bold py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} /> : 'Confirmar Verificación'}
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: '4px' }}
              >
                ¿No recibiste el correo? Reenviar código
              </button>
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
