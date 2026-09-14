import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonButtons, IonMenuButton, useIonToast, IonBadge, IonIcon, IonList } from '@ionic/react';
import { refreshOutline, saveOutline } from 'ionicons/icons';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type Settings = {
  exchangeRateBs: number;
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings>({ exchangeRateBs: 40 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [presentToast] = useIonToast();

  const fetchData = async () => {
    try {
      const res = await apiClient.get<User[]>('/users');
      setUsers(res.data);
      const setRes = await apiClient.get<Settings>('/settings');
      setSettings(setRes.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando datos', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async () => {
    if (!email || !password || !firstName || !lastName) {
      return presentToast({ message: 'Completa todos los campos obligatorios', duration: 3000, color: 'warning' });
    }

    try {
      await apiClient.post('/users', { email, password, firstName, lastName, role });
      presentToast({ message: 'Usuario creado exitosamente', duration: 3000, color: 'success' });
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      fetchData();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al crear usuario';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.put('/settings', {
        companyBank: settings.companyBank,
        companyCedula: settings.companyCedula,
        companyPhone: settings.companyPhone
      });
      presentToast({ message: 'Ajustes guardados exitosamente', duration: 2000, color: 'success' });
      fetchData();
    } catch(e: any) {
      presentToast({ message: 'Error guardando ajustes', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Usuarios y Ajustes</IonTitle>
          <IonButtons slot="end"><IonButton onClick={fetchData}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {/* Formulario de Ajustes */}
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Datos Bancarios de la Empresa</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Estos datos se usarán para autocompletar recibos y textos copiados para WhatsApp.</p>
                  <IonList>
                    <IonItem>
                      <IonLabel position="stacked">Banco Receptor</IonLabel>
                      <IonInput 
                        value={settings.companyBank || ''} 
                        onIonInput={e => setSettings({...settings, companyBank: e.detail.value!})} 
                        placeholder="Ej. Banesco" 
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Cédula / RIF</IonLabel>
                      <IonInput 
                        value={settings.companyCedula || ''} 
                        onIonInput={e => setSettings({...settings, companyCedula: e.detail.value!})} 
                        placeholder="Ej. J-12345678" 
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">Teléfono</IonLabel>
                      <IonInput 
                        value={settings.companyPhone || ''} 
                        onIonInput={e => setSettings({...settings, companyPhone: e.detail.value!})} 
                        placeholder="Ej. 0414-1234567" 
                      />
                    </IonItem>
                  </IonList>
                  <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{marginTop: '15px'}}>
                    <IonIcon slot="start" icon={saveOutline} />
                    Guardar Ajustes
                  </IonButton>
                </IonCardContent>
              </IonCard>

              {/* Formulario de Usuarios */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Crear Usuario</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={firstName} onIonInput={e => setFirstName(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Apellido</IonLabel>
                    <IonInput value={lastName} onIonInput={e => setLastName(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Email / Usuario</IonLabel>
                    <IonInput type="email" value={email} onIonInput={e => setEmail(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Contraseña</IonLabel>
                    <IonInput type="password" value={password} onIonInput={e => setPassword(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Rol</IonLabel>
                    <IonSelect value={role} onIonChange={e => setRole(e.detail.value)}>
                      <IonSelectOption value="ADMIN">Administrador</IonSelectOption>
                      <IonSelectOption value="CASHIER">Cajero</IonSelectOption>
                      <IonSelectOption value="KITCHEN">Cocina</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonButton expand="block" className="ion-margin-top" onClick={handleCreateUser}>
                    Crear
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Lista de Usuarios */}
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Usuarios Activos</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {users.map(u => (
                      <IonItem key={u.id}>
                        <IonLabel>
                          <h2>{u.firstName} {u.lastName}</h2>
                          <p>{u.email}</p>
                        </IonLabel>
                        <IonBadge color={u.isActive ? 'success' : 'medium'} slot="end">
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </IonBadge>
                        <IonBadge color="primary" slot="end">
                          {u.role}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Users;
