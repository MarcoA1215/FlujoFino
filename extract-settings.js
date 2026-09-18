const fs = require('fs');

// 1. Create Settings.tsx based on Users.tsx
let usersContent = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');

// We extract just the Settings part.
let settingsTsx = `import React, { useState, useEffect, useContext } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton, useIonToast, IonIcon, IonToggle } from '@ionic/react';
import { saveOutline, refreshOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';

interface Settings {
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  allowPartialPayments?: boolean;
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
          allowPartialPayments: settings.allowPartialPayments
        });
      presentToast({ message: 'Ajustes guardados', duration: 2000, color: 'success' });
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
                  <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{marginTop: '25px'}}>
                    <IonIcon slot="start" icon={saveOutline} />
                    Guardar Ajustes
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};
export default SettingsPage;
`;

fs.writeFileSync('apps/frontend/src/pages/Settings.tsx', settingsTsx);
console.log('Created Settings.tsx');

// 2. Remove Settings logic from Users.tsx
// I will just rewrite Users.tsx without settings logic.
let newUsersTsx = `import React, { useState, useEffect, useContext } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton, useIonToast, IonIcon, IonSelect, IonSelectOption, IonBadge } from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';

interface UserData {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.POS);
  const [presentToast] = useIonToast();
  const { user } = useContext(AuthContext);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<UserData[]>('/users');
      setUsers(res.data);
    } catch (e) {
      presentToast({ message: 'Error cargando usuarios', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchUsers();
    }
  }, [user]);

  const handleCreate = async () => {
    if (!username || !password) {
      return presentToast({ message: 'Usuario y contraseña son requeridos', duration: 3000, color: 'warning' });
    }
    try {
      await apiClient.post('/users', { username, password, role });
      presentToast({ message: 'Usuario creado exitosamente', duration: 2000, color: 'success' });
      setUsername('');
      setPassword('');
      fetchUsers();
    } catch (e: any) {
      presentToast({ message: 'Error al crear usuario', duration: 4000, color: 'danger' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(\`/users/\${id}\`);
      presentToast({ message: 'Usuario eliminado', duration: 2000, color: 'success' });
      fetchUsers();
    } catch (e) {
      presentToast({ message: 'Error al eliminar', duration: 3000, color: 'danger' });
    }
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="danger">
            <IonButtons slot="start"><IonMenuButton /></IonButtons>
            <IonTitle>Acceso Denegado</IonTitle>
            <IonButtons slot="end"><IonButton onClick={fetchUsers}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
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
          <IonTitle>Gestión de Usuarios</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Crear Usuario</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre de Usuario</IonLabel>
                    <IonInput value={username} onIonInput={e => setUsername(e.detail.value!)} placeholder="Ej. juan_cajero" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Contraseña</IonLabel>
                    <IonInput type="password" value={password} onIonInput={e => setPassword(e.detail.value!)} placeholder="***" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Rol / Permiso</IonLabel>
                    <IonSelect value={role} onIonChange={e => setRole(e.detail.value)}>
                      <IonSelectOption value={UserRole.ADMIN}>Administrador</IonSelectOption>
                      <IonSelectOption value={UserRole.POS}>Cajero (POS)</IonSelectOption>
                      <IonSelectOption value={UserRole.KITCHEN}>Cocina (KITCHEN)</IonSelectOption>
                      <IonSelectOption value={UserRole.DELIVERY}>Repartidor (DELIVERY)</IonSelectOption>
                      <IonSelectOption value={UserRole.INVENTORY}>Reabastecedor (INVENTORY)</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonButton expand="block" color="primary" className="ion-margin-top" onClick={handleCreate}>
                    Crear Usuario
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="8">
              <IonCard>
                <IonCardContent style={{ padding: 0 }}>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Rol</th>
                          <th>Fecha de Creación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id}>
                            <td><strong>{u.username}</strong></td>
                            <td>
                              <IonBadge color={u.role === UserRole.ADMIN ? 'danger' : 'primary'}>{u.role}</IonBadge>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                              {u.username !== 'admin' && (
                                <IonButton size="small" color="danger" fill="clear" onClick={() => handleDelete(u.id)}>
                                  Eliminar
                                </IonButton>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={4} className="ion-text-center">Cargando...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
`;

fs.writeFileSync('apps/frontend/src/pages/Users.tsx', newUsersTsx);
console.log('Rewrote Users.tsx');

// 3. Add Settings to App.tsx
let appTsx = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');
appTsx = appTsx.replace(/import Users from '\.\/pages\/Users';/, "import Users from './pages/Users';\nimport SettingsPage from './pages/Settings';");
appTsx = appTsx.replace(/<Route path="\/users" element={<PrivateRoute><Users \/><\/PrivateRoute>} \/>/, "<Route path=\"/users\" element={<PrivateRoute><Users /></PrivateRoute>} />\n              <Route path=\"/settings\" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />");
fs.writeFileSync('apps/frontend/src/App.tsx', appTsx);
console.log('Added Settings to App.tsx');

// 4. Update Menu.tsx
let menuTsx = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
menuTsx = menuTsx.replace(/import {([^}]*)settingsOutline([^}]*)} from 'ionicons\/icons';/g, "import {$1settingsOutline$2} from 'ionicons/icons';"); // Check if settingsOutline is there.
if (!menuTsx.includes('settingsOutline')) {
    menuTsx = menuTsx.replace(/peopleOutline/, 'peopleOutline, settingsOutline');
}
menuTsx = menuTsx.replace(/\{ title: 'Usuarios', url: '\/users', iosIcon: peopleOutline, mdIcon: peopleOutline \}/, "{ title: 'Usuarios', url: '/users', iosIcon: peopleOutline, mdIcon: peopleOutline },\n      { title: 'Configuración', url: '/settings', iosIcon: settingsOutline, mdIcon: settingsOutline }");
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menuTsx);
console.log('Added Configuración to Menu.tsx');
