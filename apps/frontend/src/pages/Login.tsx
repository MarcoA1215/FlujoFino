import React, { useState, useContext, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonSpinner,
  useIonToast,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons
} from '@ionic/react';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const router = useIonRouter();
  const location = useLocation();

  // Pending access request state
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(() => {
    return localStorage.getItem('pendingAccessRequestId') || null;
  });
  const [pendingInfo, setPendingInfo] = useState<any>(() => {
    const raw = localStorage.getItem('pendingAccessRequestInfo');
    return raw ? JSON.parse(raw) : null;
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(() => {
    const raw = localStorage.getItem('pendingAccessRequestInfo');
    return raw ? JSON.parse(raw)?.message || '' : '';
  });



  const checkRequestStatus = async (requestId: string) => {
    setIsCheckingStatus(true);
    try {
      const res = await apiClient.get(`/auth/access-request/${requestId}`);
      if (res.data.status === 'APPROVED') {
        presentToast({ message: '¡Acceso aprobado por el administrador!', duration: 2500, color: 'success' });
        localStorage.removeItem('pendingAccessRequestId');
        localStorage.removeItem('pendingAccessRequestInfo');
        setPendingRequestId(null);
        setPendingInfo(null);
        await login(res.data.access_token, res.data.user, res.data.workspaces);
        return;
      }

      if (res.data.status === 'REJECTED') {
        setStatusMessage('Tu solicitud de acceso fue rechazada por el administrador.');
        presentToast({ message: 'Solicitud rechazada por el administrador', duration: 4000, color: 'danger' });
        return;
      }

      setStatusMessage(res.data.message || 'Esperando que un administrador apruebe la solicitud...');
    } catch (err: any) {
      if (err.response?.status === 404) {
        localStorage.removeItem('pendingAccessRequestId');
        localStorage.removeItem('pendingAccessRequestInfo');
        setPendingRequestId(null);
        setPendingInfo(null);
        presentToast({ message: 'La solicitud ya no existe o expiró.', duration: 3000, color: 'warning' });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Poll every 10 seconds while a request is pending
  useEffect(() => {
    if (!pendingRequestId) return;
    checkRequestStatus(pendingRequestId);
    const interval = setInterval(() => {
      checkRequestStatus(pendingRequestId);
    }, 10000);
    return () => clearInterval(interval);
  }, [pendingRequestId]);

  const handleLogin = async () => {
    if (!username || !password) {
      return presentToast({ message: 'Ingresa tu usuario y contraseña', duration: 3000, color: 'warning' });
    }
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      
      if (res.data.requiresApproval) {
        const info = {
          requestId: res.data.requestId,
          username: res.data.user?.username || username,
          attemptTime: res.data.attemptTime,
          message: res.data.message,
        };
        localStorage.setItem('pendingAccessRequestId', res.data.requestId);
        localStorage.setItem('pendingAccessRequestInfo', JSON.stringify(info));
        setPendingRequestId(res.data.requestId);
        setPendingInfo(info);
        setStatusMessage(res.data.message || 'Esperando que un administrador apruebe la solicitud...');
        return;
      }

      login(res.data.access_token, res.data.user, res.data.workspaces);
    } catch (e: any) {
      presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleCancelPending = () => {
    localStorage.removeItem('pendingAccessRequestId');
    localStorage.removeItem('pendingAccessRequestInfo');
    setPendingRequestId(null);
    setPendingInfo(null);
    setStatusMessage('');
  };

  // Forgot Password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'EMAIL' | 'RESET'>('EMAIL');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleRequestResetCode = async () => {
    if (!forgotEmail || !forgotEmail.trim()) {
      return presentToast({ message: 'Ingresa tu correo electrónico', duration: 3000, color: 'warning' });
    }
    setIsForgotLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      presentToast({ message: res.data?.message || 'Código enviado a tu correo', duration: 3500, color: 'success' });
      setForgotStep('RESET');
    } catch (err: any) {
      presentToast({ message: err.response?.data?.message || 'Error al solicitar código', duration: 3500, color: 'danger' });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotCode || !newPassword) {
      return presentToast({ message: 'Ingresa el código y tu nueva contraseña', duration: 3000, color: 'warning' });
    }
    if (newPassword.trim().length < 6) {
      return presentToast({ message: 'La contraseña debe tener al menos 6 caracteres', duration: 3000, color: 'warning' });
    }
    setIsForgotLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword: newPassword.trim(),
      });
      presentToast({ message: res.data?.message || 'Contraseña restablecida con éxito', duration: 3500, color: 'success' });
      setShowForgotPassword(false);
      setForgotStep('EMAIL');
      setForgotCode('');
      setNewPassword('');
    } catch (err: any) {
      presentToast({ message: err.response?.data?.message || 'Error al restablecer contraseña', duration: 3500, color: 'danger' });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f4f5f8' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          {pendingRequestId ? (
            <IonCard style={{ width: '100%', maxWidth: '420px', textAlign: 'center', padding: '10px' }}>
              <IonCardHeader>
                <div style={{ 
                  width: '70px', height: '70px', borderRadius: '50%', 
                  background: statusMessage.includes('rechazada') ? '#fee2e2' : '#fef3c7', 
                  color: statusMessage.includes('rechazada') ? '#dc2626' : '#d97706',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', 
                  fontSize: '32px', margin: '0 auto 15px auto' 
                }}>
                  {statusMessage.includes('rechazada') ? '❌' : <IonSpinner color="warning" />}
                </div>
                <IonCardTitle style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                  {statusMessage.includes('rechazada') ? 'Acceso Rechazado' : 'Esperando Autorización'}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ 
                  background: '#f8fafc', padding: '16px', borderRadius: '12px', 
                  border: '1px solid #e2e8f0', marginBottom: '20px', textAlign: 'left' 
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e293b' }}>
                    <strong>Usuario:</strong> {pendingInfo?.username || username}
                  </p>
                  {pendingInfo?.attemptTime && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                      <strong>Hora de intento:</strong> {pendingInfo.attemptTime}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '14px', color: statusMessage.includes('rechazada') ? '#dc2626' : '#b45309' }}>
                    {statusMessage || 'Tu solicitud está en cola. Un administrador debe aprobar tu ingreso desde su panel.'}
                  </p>
                </div>

                {!statusMessage.includes('rechazada') && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                    🔄 Verificando automáticamente cada 10 segundos...
                  </p>
                )}

                <IonButton 
                  expand="block" 
                  color="primary" 
                  disabled={isCheckingStatus}
                  onClick={() => pendingRequestId && checkRequestStatus(pendingRequestId)}
                >
                  {isCheckingStatus ? 'Verificando...' : '🔄 Verificar Estado Ahora'}
                </IonButton>

                <IonButton 
                  expand="block" 
                  fill="clear" 
                  color="medium" 
                  className="ion-margin-top"
                  onClick={handleCancelPending}
                >
                  Volver al Inicio de Sesión
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard style={{ width: '100%', maxWidth: '400px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
              <IonCardHeader className="ion-text-center">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <img 
                    src="/assets/logo.png" 
                    alt="FinoWork" 
                    style={{
                      width: '72px',
                      height: '72px',
                      maxWidth: '72px',
                      maxHeight: '72px',
                      borderRadius: '16px',
                      objectFit: 'cover',
                      display: 'block',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <IonCardTitle style={{ fontWeight: 'bold' }}>FinoWork</IonCardTitle>
                <p style={{ margin: '5px 0 0 0', color: 'gray' }}>Iniciar Sesión</p>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Usuario o Correo
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Ej. admin o correo@ejemplo.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ textAlign: 'right', marginTop: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(username.includes('@') ? username : '');
                      setForgotStep('EMAIL');
                      setShowForgotPassword(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ion-color-primary, #10b981)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: '600',
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <IonButton expand="block" className="ion-margin-top" onClick={handleLogin}>
                  Entrar
                </IonButton>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <a
                    href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP || '584145652381'}?text=${encodeURIComponent('Hola, tengo problemas para acceder o mi correo es incorrecto en FinoWork. ¿Podrían asistirme?')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: '#059669',
                      textDecoration: 'none',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>💬</span> ¿Problemas para acceder o correo incorrecto? Contactar a Soporte por WhatsApp
                  </a>
                </div>
                
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <p style={{ color: 'gray', fontSize: '14px', margin: 0 }}>¿No tienes cuenta?</p>
                  <IonButton fill="clear" color="primary" onClick={() => router.push('/register', 'forward')} style={{ marginTop: '5px' }}>
                    Registra tu negocio
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Modal Recuperación de Contraseña */}
          <IonModal
            isOpen={showForgotPassword}
            onDidDismiss={() => setShowForgotPassword(false)}
            style={{ '--max-width': '420px', '--height': 'auto', '--border-radius': '16px' } as any}
          >
            <IonHeader className="ion-no-border">
              <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #e2e8f0' } as any}>
                <IonTitle style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  Recuperar Contraseña
                </IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowForgotPassword(false)} color="medium">Cerrar</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>

            <div className="ion-padding" style={{ background: '#ffffff', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ padding: '8px 4px' }}>
                {forgotStep === 'EMAIL' ? (
                  <div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                      Ingresa el correo electrónico asociado a tu cuenta para enviarte un código de seguridad de 6 dígitos.
                    </p>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textAlign: 'left' }}>
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="tu-correo@ejemplo.com"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestResetCode}
                      disabled={isForgotLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-4"
                    >
                      {isForgotLoading ? <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} /> : 'Solicitar Código'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      Enviamos un código de 6 dígitos a <strong>{forgotEmail}</strong>. Ingrésalo junto con tu nueva clave:
                    </p>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Código de 6 dígitos
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={forgotCode}
                        onChange={e => setForgotCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        autoFocus
                        style={{
                          width: '100%',
                          letterSpacing: '6px',
                          textAlign: 'center',
                          fontSize: '22px',
                          fontWeight: '800',
                          padding: '10px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isForgotLoading || forgotCode.length !== 6 || !newPassword}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
                    >
                      {isForgotLoading ? <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} /> : 'Restablecer Contraseña'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep('EMAIL')}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: '4px' }}
                    >
                      Volver a ingresar correo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </IonModal>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Login;

