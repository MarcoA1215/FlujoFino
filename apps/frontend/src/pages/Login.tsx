import React, { useState, useContext, useEffect } from 'react';
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, useIonToast } from '@ionic/react';
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      presentToast({
        message: 'Tu sesión ha expirado',
        duration: 4000,
        color: 'warning',
        position: 'top'
      });
      // Limpiar URL
      window.history.replaceState(null, '', '/login');
    }
  }, [location.search, presentToast]);

  const handleLogin = async () => {
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      login(res.data.access_token, res.data.user, res.data.workspaces);
      
    } catch (e: any) {
      presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f4f5f8' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
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
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Login;
