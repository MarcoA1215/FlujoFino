import React, { useState, useEffect, useContext } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton, useIonToast, IonIcon, IonSelect, IonSelectOption, IonBadge, IonModal } from '@ionic/react';
import { refreshOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.POS);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('SEMANAL');
  
  const [selectedUserForPay, setSelectedUserForPay] = useState<UserData | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('USD');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isChecked, setIsChecked] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
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

  const handleCheckEmail = async () => {
    if (!email) return presentToast({ message: 'Ingresa un correo electrónico', duration: 3000, color: 'warning' });
    setIsChecking(true);
    try {
      const res = await apiClient.get(`/users/check/${email}`);
      setIsExisting(res.data.exists);
      if (res.data.exists) {
        setUsername(res.data.username);
        setPassword('***'); // dummy password to pass validation, backend ignores it
      }
      setIsChecked(true);
    } catch (e) {
      presentToast({ message: 'Error verificando correo', duration: 3000, color: 'danger' });
    } finally {
      setIsChecking(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setSalaryAmount('');
    setSalaryPeriod('SEMANAL');
    setIsChecked(false);
    setIsExisting(false);
  };

  const handleCreate = async () => {
    if (!email || !username || !password) {
      return presentToast({ message: 'Todos los campos obligatorios son requeridos', duration: 3000, color: 'warning' });
    }
    try {
      await apiClient.post('/users', { 
        username, email, password, role, 
        salaryAmount: salaryAmount ? Number(salaryAmount) : undefined, 
        salaryPeriod 
      });
      presentToast({ message: isExisting ? 'Usuario invitado exitosamente' : 'Usuario creado exitosamente', duration: 2000, color: 'success' });
      resetForm();
      fetchUsers();
    } catch (e: any) {
      presentToast({ message: 'Error al procesar: ' + (e.response?.data?.message || e.message), duration: 4000, color: 'danger' });
    }
  };

  const handlePaySalary = async () => {
    if (!selectedUserForPay || !payAmount) return;
    try {
      await apiClient.post(`/users/${selectedUserForPay.id}/pay`, {
        username: selectedUserForPay.username,
        amount: Number(payAmount),
        method: payMethod,
        date: payDate
      });
      presentToast({ message: 'Pago registrado como gasto de nómina', duration: 3000, color: 'success' });
      setSelectedUserForPay(null);
      setPayAmount('');
    } catch (e: any) {
      presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/users/${id}`);
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
                  {!isChecked ? (
                    <>
                      <IonItem>
                        <IonLabel position="stacked">Correo Electrónico</IonLabel>
                        <IonInput type="email" value={email} onIonInput={e => setEmail(e.detail.value!)} placeholder="Ej. juan@negocio.com" />
                      </IonItem>
                      <IonButton expand="block" color="primary" className="ion-margin-top" onClick={handleCheckEmail} disabled={isChecking}>
                        {isChecking ? 'Verificando...' : 'Siguiente'}
                      </IonButton>
                    </>
                  ) : (
                    <>
                      <IonItem>
                        <IonLabel position="stacked">Correo Electrónico</IonLabel>
                        <IonInput disabled value={email} />
                      </IonItem>
                      {isExisting && (
                        <div className="ion-padding-top ion-padding-bottom">
                          <IonBadge color="warning" className="ion-padding">Usuario existente. Se enviará invitación.</IonBadge>
                        </div>
                      )}
                      <IonItem>
                        <IonLabel position="stacked">Nombre de Usuario</IonLabel>
                        <IonInput disabled={isExisting} value={username} onIonInput={e => setUsername(e.detail.value!)} placeholder="Ej. juan_cajero" />
                      </IonItem>
                      {!isExisting && (
                        <IonItem>
                          <IonLabel position="stacked">Contraseña</IonLabel>
                          <IonInput type="password" value={password} onIonInput={e => setPassword(e.detail.value!)} placeholder="***" />
                        </IonItem>
                      )}
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
                      <IonItem>
                        <IonLabel position="stacked">Sueldo Acordado (USD)</IonLabel>
                        <IonInput type="number" placeholder="Ej: 50" value={salaryAmount} onIonChange={e => setSalaryAmount(e.detail.value!)} />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Frecuencia de Pago</IonLabel>
                        <IonSelect value={salaryPeriod} onIonChange={e => setSalaryPeriod(e.detail.value)}>
                          <IonSelectOption value="SEMANAL">Semanal</IonSelectOption>
                          <IonSelectOption value="QUINCENAL">Quincenal</IonSelectOption>
                          <IonSelectOption value="MENSUAL">Mensual</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      <IonButton expand="block" color="primary" className="ion-margin-top" onClick={handleCreate}>
                        {isExisting ? 'Invitar Usuario' : 'Crear Usuario'}
                      </IonButton>
                      <IonButton expand="block" fill="clear" color="medium" onClick={resetForm}>
                        Cancelar
                      </IonButton>
                    </>
                  )}
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
                          <th>Correo</th>
                          <th>Rol</th>
                          <th>Estado</th>
                          <th>Fecha de Creación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u: any) => (
                          <tr key={u.id}>
                            <td><strong>{u.username}</strong></td>
                            <td>{u.email}</td>
                            <td>
                              <IonBadge color={u.role === UserRole.ADMIN ? 'danger' : 'primary'}>{u.role}</IonBadge>
                            </td>
                            <td>
                              <IonBadge color={u.status === 'PENDING' ? 'warning' : 'success'}>
                                {u.status === 'PENDING' ? 'Invitado' : 'Activo'}
                              </IonBadge>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                              <IonButton size="small" color="success" fill="clear" onClick={() => setSelectedUserForPay(u)}>
                                💵 Pagar
                              </IonButton>
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
      
      {/* Modal Pago de Nómina */}
      {selectedUserForPay && (
        <IonModal isOpen={!!selectedUserForPay} onDidDismiss={() => setSelectedUserForPay(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Registrar Pago a {selectedUserForPay.username}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedUserForPay(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Monto a Pagar (USD)</IonLabel>
              <IonInput type="number" placeholder="Ej. 20" value={payAmount} onIonChange={e => setPayAmount(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Método de Pago</IonLabel>
              <IonSelect value={payMethod} onIonChange={e => setPayMethod(e.detail.value)}>
                <IonSelectOption value="CASH_USD">Efectivo USD</IonSelectOption>
                <IonSelectOption value="PAGO_MOVIL">Pago Móvil</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Fecha</IonLabel>
              <IonInput type="date" value={payDate} onIonChange={e => setPayDate(e.detail.value!)} />
            </IonItem>
            
            <IonButton expand="block" color="success" className="ion-margin-top" onClick={handlePaySalary}>
              💵 Registrar Pago
            </IonButton>
          </IonContent>
        </IonModal>
      )}
    </IonPage>
  );
};
export default Users;
