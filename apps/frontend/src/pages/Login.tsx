import React, { useState, useContext, useEffect } from 'react';
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonSpinner, useIonToast } from '@ionic/react';
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      presentToast({
        message: 'Tu sesión ha expirado',
        duration: 4000,
        color: 'warning',
        position: 'top'
      });
      window.history.replaceState(null, '', '/login');
    }
  }, [location.search, presentToast]);

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
            <IonCard style={{ width: '100%', maxWidth: '400px' }}>
              <IonCardHeader className="ion-text-center">
                <div style={{ width: '60px', height: '60px', background: 'var(--ion-color-primary)', color: 'white', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '36px', fontWeight: '900', margin: '0 auto 15px auto', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                  F
                </div>
                <IonCardTitle style={{ fontWeight: 'bold' }}>Flujo Fino</IonCardTitle>
                <p style={{ margin: '5px 0 0 0', color: 'gray' }}>Iniciar Sesión</p>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">Usuario o Correo</IonLabel>
                  <IonInput value={username} onIonInput={e => setUsername(e.detail.value!)} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Contraseña</IonLabel>
                  <IonInput type="password" value={password} onIonInput={e => setPassword(e.detail.value!)} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
                </IonItem>
                <IonButton expand="block" className="ion-margin-top" onClick={handleLogin}>
                  Entrar
                </IonButton>
                
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <p style={{ color: 'gray', fontSize: '14px', margin: 0 }}>¿No tienes cuenta?</p>
                  <IonButton fill="clear" color="primary" onClick={() => router.push('/register', 'forward')} style={{ marginTop: '5px' }}>
                    Registra tu negocio
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Login;

