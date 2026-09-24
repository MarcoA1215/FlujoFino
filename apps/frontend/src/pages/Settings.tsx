import React, { useState, useEffect, useContext } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton, useIonToast, IonIcon, IonToggle } from '@ionic/react';
import { saveOutline, refreshOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import { BookingSettings } from '../components/BookingSettings';

interface Settings {
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  allowPartialPayments?: boolean;
  requireApprovalAlways?: boolean;
  featureCustomerSchedules?: boolean;
  featureRecipes?: boolean;
  featureBuySell?: boolean;
  featureShowCatalog?: boolean;
  publicToken?: string;
  businessHours?: any;
  services?: any[];
  slotInterval?: number;
  themePrimaryColor?: string;
  themeHeaderColor?: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [presentToast] = useIonToast();
  const { user } = useContext(AuthContext);

  const fetchSettings = async () => {
    try {
      const setRes = await apiClient.get<Settings>('/settings');
      setSettings(setRes.data);
    } catch (e) {
      presentToast({ message: 'Error cargando ajustes', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchSettings();
    }
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      await apiClient.put('/settings', { 
          companyBank: settings.companyBank, 
          companyCedula: settings.companyCedula, 
          companyPhone: settings.companyPhone,
          allowPartialPayments: settings.allowPartialPayments,
          requireApprovalAlways: settings.requireApprovalAlways,
          featureCustomerSchedules: settings.featureCustomerSchedules,
          featureRecipes: settings.featureRecipes,
          featureBuySell: settings.featureBuySell,
          featureShowCatalog: settings.featureShowCatalog,
          businessHours: settings.businessHours,
          services: settings.services,
          slotInterval: settings.slotInterval,
          themePrimaryColor: settings.themePrimaryColor,
          themeHeaderColor: settings.themeHeaderColor
        });
        presentToast({
          message: 'Configuración guardada', duration: 2000, color: 'success' });
      fetchSettings();
    } catch(e: any) {
      presentToast({ message: 'Error guardando ajustes', duration: 3000, color: 'danger' });
    }
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="danger">
            <IonButtons slot="start"><IonMenuButton /></IonButtons>
            <IonTitle>Acceso Denegado</IonTitle>
            <IonButtons slot="end"><IonButton onClick={fetchSettings}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <h2>No tienes permiso para ver esta pantalla.</h2>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Configuración</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Datos de la Empresa</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Estos datos se usarán para autocompletar recibos y textos copiados para WhatsApp.</p>
                  <IonItem>
                    <IonLabel position="stacked">Banco Receptor</IonLabel>
                    <IonInput value={settings.companyBank || ''} onIonInput={e => setSettings({...settings, companyBank: e.detail.value!})} placeholder="Ej. Banesco" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Cédula / RIF</IonLabel>
                    <IonInput value={settings.companyCedula || ''} onIonInput={e => setSettings({...settings, companyCedula: e.detail.value!})} placeholder="Ej. J-12345678" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Teléfono</IonLabel>
                    <IonInput value={settings.companyPhone || ''} onIonInput={e => setSettings({...settings, companyPhone: e.detail.value!})} placeholder="Ej. 0414-1234567" />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
            
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Configuración de Sistema</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Opciones generales del punto de venta y operaciones.</p>
                  <IonItem>
                    <IonLabel>Permitir Pagos Parciales (Abonos)</IonLabel>
                    <IonToggle checked={settings.allowPartialPayments || false} onIonChange={e => setSettings({...settings, allowPartialPayments: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">
                      <h2>Siempre solicitar aprobación de entrada a empleados</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Incluso si el empleado está dentro de su horario habitual, deberá ser aprobado por un administrador antes de ingresar.
                      </p>
                    </IonLabel>
                    <IonToggle 
                      checked={settings.requireApprovalAlways || false} 
                      onIonChange={e => setSettings({...settings, requireApprovalAlways: e.detail.checked})} 
                    />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Módulos Activos</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Habilita o deshabilita funcionalidades de tu sucursal según el tipo de negocio.</p>
                  
                  <IonItem>
                    <IonLabel className="ion-text-wrap">Sistema de Citas y Reservaciones de Clientes</IonLabel>
                    <IonToggle checked={settings.featureCustomerSchedules || false} onIonChange={e => setSettings({...settings, featureCustomerSchedules: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">Fórmulas y Control de Insumos (Despiece de materiales para servicios o productos)</IonLabel>
                    <IonToggle checked={settings.featureRecipes || false} onIonChange={e => setSettings({...settings, featureRecipes: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">Compra-Venta Directa (Retail)</IonLabel>
                    <IonToggle checked={settings.featureBuySell || false} onIonChange={e => setSettings({...settings, featureBuySell: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">Portafolio / Catálogo Público de Trabajos</IonLabel>
                    <IonToggle checked={settings.featureShowCatalog || false} onIonChange={e => setSettings({...settings, featureShowCatalog: e.detail.checked})} />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Personalización de Interfaz</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Cambia los colores base de tu sucursal para que coincidan con tu marca.</p>
                  
                  <IonItem>
                    <IonLabel position="stacked">Color Principal (Menú y Botones)</IonLabel>
                    <IonInput type="text" placeholder="#1E293B" value={settings.themePrimaryColor || ''} onIonChange={e => setSettings({...settings, themePrimaryColor: e.detail.value!})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Color Encabezados (Superior)</IonLabel>
                    <IonInput type="text" placeholder="#334155" value={settings.themeHeaderColor || ''} onIonChange={e => setSettings({...settings, themeHeaderColor: e.detail.value!})} />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {settings.featureCustomerSchedules && (
            <BookingSettings settings={settings} setSettings={setSettings} />
          )}

          {settings.featureCustomerSchedules && (
            <IonRow>
              <IonCol size="12">
                <IonCard>
                  <IonCardContent>
                    <div style={{ padding: '15px', backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 10px 0' }}>Enlace Público de Reservaciones</h3>
                      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                        Comparte este enlace con tus clientes en WhatsApp o Instagram para que puedan reservar directamente sin iniciar sesión.
                      </p>
                      <IonInput 
                        readonly 
                        value={`${window.location.origin}/book/${settings.publicToken || user?.tenantId}`} 
                        style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px' }} 
                      />
                      <IonButton 
                        size="small" 
                        color="secondary" 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/book/${settings.publicToken || user?.tenantId}`);
                          presentToast({ message: '¡Enlace copiado!', duration: 2000, color: 'success' });
                        }}
                      >
                        Copiar Enlace
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}

        </IonGrid>
        
        <div style={{ padding: '0 10px 20px 10px' }}>
          <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{ margin: 0, height: '50px' }}>
            <IonIcon slot="start" icon={saveOutline} />
            Guardar Todos los Ajustes
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default SettingsPage;
