import React, { useState, useContext } from 'react';
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, useIonToast, IonToggle, IonText, IonIcon } from '@ionic/react';
import { informationCircleOutline, arrowBackOutline, arrowForwardOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useIonRouter } from '@ionic/react';

const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [tenantName, setTenantName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [featureCustomerSchedules, setFeatureCustomerSchedules] = useState(false);
  const [featureRecipes, setFeatureRecipes] = useState(false);
  const [featureBuySell, setFeatureBuySell] = useState(false);

  const { login } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  const handleRegister = async () => {
    if (!tenantName || !username || !email || !password) {
      presentToast({ message: 'Por favor, llena los datos de la empresa, correo y usuario.', duration: 3000, color: 'warning' });
      return;
    }
    
    try {
      const res = await apiClient.post('/auth/register', {
        tenantName,
        username,
        email,
        password,
        featureCustomerSchedules,
        featureRecipes,
        featureBuySell
      });
      // Auto login
      login(res.data.access_token, res.data.user);
      presentToast({ message: '¡Negocio registrado con éxito!', duration: 3000, color: 'success' });
      router.push('/dashboard', 'root', 'replace');
    } catch (e: any) {
      presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const showInfo = (title: string, info: string) => {
    presentToast({ header: title, message: info, duration: 4000, position: 'top', color: 'dark' });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f4f5f8' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
          <IonCard style={{ width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
            <IonCardHeader className="ion-text-center" style={{ paddingBottom: 0 }}>
              <div style={{ width: '50px', height: '50px', background: 'var(--ion-color-primary)', color: 'white', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: '900', margin: '0 auto 10px auto', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                F
              </div>
              <IonCardTitle style={{ fontWeight: 'bold' }}>Registro</IonCardTitle>
              <p style={{ margin: '5px 0 10px 0', color: 'gray' }}>Paso {step} de 2</p>
            </IonCardHeader>
            <IonCardContent>
              {step === 1 && (
                <>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Nombre del Negocio</IonLabel>
                    <IonInput value={tenantName} placeholder="Ej. La Hamburguesería" onIonInput={e => setTenantName(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Correo Electrónico</IonLabel>
                    <IonInput type="email" value={email} placeholder="Ej. admin@negocio.com" onIonInput={e => setEmail(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Usuario Administrador</IonLabel>
                    <IonInput value={username} placeholder="Ej. admin" onIonInput={e => setUsername(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Contraseña</IonLabel>
                    <IonInput type="password" value={password} placeholder="Mínimo 6 caracteres" onIonInput={e => setPassword(e.detail.value!)} />
                  </IonItem>
                  
                  <IonButton expand="block" className="ion-margin-top" onClick={() => setStep(2)}>
                    Siguiente <IonIcon slot="end" icon={arrowForwardOutline} />
                  </IonButton>
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <IonButton fill="clear" color="medium" onClick={() => router.push('/login', 'back')}>
                      Volver al Login
                    </IonButton>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <IonText color="medium">Configura tus módulos. Podrás cambiarlos luego.</IonText>
                  </div>

                  <IonCard style={{ margin: '0 0 15px 0', boxShadow: 'none', border: '1px solid #ddd' }}>
                    <IonItem lines="none">
                      <IonLabel className="ion-text-wrap" style={{ fontSize: '14px' }}>
                        ¿Tu negocio ofrece servicios con citas y reservaciones de clientes?
                      </IonLabel>
                      <IonToggle checked={featureCustomerSchedules} onIonChange={e => setFeatureCustomerSchedules(e.detail.checked)} />
                      <IonButton fill="clear" slot="end" onClick={() => showInfo('Citas y Reservaciones', 'Permite que tus clientes reserven citas y turnos de atención para tus servicios.')}>
                        <IonIcon slot="icon-only" icon={informationCircleOutline} />
                      </IonButton>
                    </IonItem>
                  </IonCard>

                  <IonCard style={{ margin: '0 0 15px 0', boxShadow: 'none', border: '1px solid #ddd' }}>
                    <IonItem lines="none">
                      <IonLabel className="ion-text-wrap" style={{ fontSize: '14px' }}>
                        ¿Usas recetas prefabricadas que descuentan insumos?
                      </IonLabel>
                      <IonToggle checked={featureRecipes} onIonChange={e => setFeatureRecipes(e.detail.checked)} />
                      <IonButton fill="clear" slot="end" onClick={() => showInfo('Recetas', 'Permite que un producto final descuente ingredientes base de tu inventario al venderse.')}>
                        <IonIcon slot="icon-only" icon={informationCircleOutline} />
                      </IonButton>
                    </IonItem>
                  </IonCard>

                  <IonCard style={{ margin: '0 0 15px 0', boxShadow: 'none', border: '1px solid #ddd' }}>
                    <IonItem lines="none">
                      <IonLabel className="ion-text-wrap" style={{ fontSize: '14px' }}>
                        ¿Tu negocio se basa en la compra-venta directa?
                      </IonLabel>
                      <IonToggle checked={featureBuySell} onIonChange={e => setFeatureBuySell(e.detail.checked)} />
                      <IonButton fill="clear" slot="end" onClick={() => showInfo('Compra-Venta', 'Optimizado para negocios tipo retail o bodega donde vendes lo mismo que compras.')}>
                        <IonIcon slot="icon-only" icon={informationCircleOutline} />
                      </IonButton>
                    </IonItem>
                  </IonCard>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <IonButton expand="block" fill="outline" onClick={() => setStep(1)} style={{ flex: 1 }}>
                      <IonIcon slot="start" icon={arrowBackOutline} /> Atrás
                    </IonButton>
                    <IonButton expand="block" onClick={handleRegister} style={{ flex: 2 }}>
                      Finalizar <IonIcon slot="end" icon={checkmarkDoneOutline} />
                    </IonButton>
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;

