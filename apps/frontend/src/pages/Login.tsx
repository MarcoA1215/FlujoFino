import React, { useState, useContext } from 'react';
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, useIonToast, IonIcon } from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useIonRouter } from '@ionic/react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  const handleLogin = async () => {
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      login(res.data.access_token, res.data.user);
      router.push('/', 'root', 'replace'); // Redirigir al inicio
    } catch (e) {
      presentToast({ message: 'Credenciales inválidas', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f4f5f8' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <IonCard style={{ width: '100%', maxWidth: '400px' }}>
            <IonCardHeader className="ion-text-center">
              <IonIcon icon={personCircleOutline} style={{ fontSize: '64px', color: '#3880ff' }} />
              <IonCardTitle>Iniciar Sesión</IonCardTitle>
              <p style={{ margin: '5px 0 0 0', color: 'gray' }}>NutriDeli Sistema de Gestión</p>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">Usuario</IonLabel>
                <IonInput value={username} onIonChange={e => setUsername(e.detail.value!)} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Contraseña</IonLabel>
                <IonInput type="password" value={password} onIonChange={e => setPassword(e.detail.value!)} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
              </IonItem>
              <IonButton expand="block" className="ion-margin-top" onClick={handleLogin}>
                Entrar
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Login;
