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
  jobTitle?: string;
  entryTime?: string;
  exitTime?: string;
  salaryAmount?: number;
  salaryPeriod?: string;
  status?: string;
  createdAt: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.POS);
  const [jobTitle, setJobTitle] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('SEMANAL');
  
  const [selectedUserForPay, setSelectedUserForPay] = useState<UserData | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('USD');
  const [payDate, setPayDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState<UserRole>(UserRole.POS);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editEntryTime, setEditEntryTime] = useState('');
  const [editExitTime, setEditExitTime] = useState('');
  const [editSalaryAmount, setEditSalaryAmount] = useState('');
  const [editSalaryPeriod, setEditSalaryPeriod] = useState('SEMANAL');
  
  const [isChecked, setIsChecked] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  
  const [presentToast] = useIonToast();
  const { user } = useContext(AuthContext);

  const fetchAccessRequests = async () => {
    try {
      const res = await apiClient.get('/users/access-requests');
      setAccessRequests(res.data || []);
    } catch (e) {
      console.error('Error cargando solicitudes de acceso', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<UserData[]>('/users');
      setUsers(res.data);
      try {
        const setRes = await apiClient.get<any>('/settings');
        setSettings(setRes.data || {});
      } catch (err) {
        console.error('Error cargando settings', err);
      }
      fetchAccessRequests();
    } catch (e) {
      presentToast({ message: 'Error cargando usuarios', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchUsers();
      fetchAccessRequests();
      const interval = setInterval(fetchAccessRequests, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleApproveAccess = async (id: string, userName: string) => {
    try {
      await apiClient.post(`/users/access-requests/${id}/approve`);
      presentToast({ message: `Acceso aprobado para ${userName}`, duration: 2500, color: 'success' });
      fetchAccessRequests();
    } catch (e: any) {
      presentToast({ message: 'Error al aprobar: ' + (e.response?.data?.message || e.message), duration: 3500, color: 'danger' });
    }
  };

  const handleRejectAccess = async (id: string, userName: string) => {
    try {
      await apiClient.post(`/users/access-requests/${id}/reject`);
      presentToast({ message: `Acceso rechazado para ${userName}`, duration: 2500, color: 'warning' });
      fetchAccessRequests();
    } catch (e: any) {
      presentToast({ message: 'Error al rechazar: ' + (e.response?.data?.message || e.message), duration: 3500, color: 'danger' });
    }
  };

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
    setJobTitle('');
    setEntryTime('');
    setExitTime('');
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
        jobTitle: jobTitle.trim() || undefined,
        entryTime: entryTime || undefined,
        exitTime: exitTime || undefined,
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

  const handleOpenEdit = (u: UserData) => {
    setSelectedUserForEdit(u);
    setEditRole((u.role as UserRole) || UserRole.POS);
    setEditJobTitle(u.jobTitle || '');
    setEditEntryTime(u.entryTime || '');
    setEditExitTime(u.exitTime || '');
    setEditSalaryAmount(u.salaryAmount !== undefined && u.salaryAmount !== null ? String(u.salaryAmount) : '');
    setEditSalaryPeriod(u.salaryPeriod || 'SEMANAL');
  };

  const handleSaveEdit = async () => {
    if (!selectedUserForEdit) return;
    try {
      await apiClient.put(`/users/${selectedUserForEdit.id}`, {
        role: editRole,
        jobTitle: editJobTitle.trim() || null,
        entryTime: editEntryTime || null,
        exitTime: editExitTime || null,
        salaryAmount: editSalaryAmount ? Number(editSalaryAmount) : null,
        salaryPeriod: editSalaryPeriod || 'SEMANAL',
      });
      presentToast({ message: 'Usuario actualizado exitosamente', duration: 2000, color: 'success' });
      setSelectedUserForEdit(null);
      fetchUsers();
    } catch (e: any) {
      presentToast({ message: 'Error al actualizar: ' + (e.response?.data?.message || e.message), duration: 4000, color: 'danger' });
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
                          {settings?.featureRecipes !== false && (
                            <IonSelectOption value={UserRole.KITCHEN}>Cocina (KITCHEN)</IonSelectOption>
                          )}
                          {settings?.featureBuySell !== false && (
                            <IonSelectOption value={UserRole.DELIVERY}>Repartidor (DELIVERY)</IonSelectOption>
                          )}
                          <IonSelectOption value={UserRole.INVENTORY}>Reabastecedor (INVENTORY)</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Cargo / Puesto (Opcional)</IonLabel>
                        <IonInput 
                          value={jobTitle} 
                          onIonInput={e => setJobTitle(e.detail.value!)} 
                          placeholder="Ej. Manicurista, Estilista, Mesero, Vendedora" 
                        />
                      </IonItem>
                      <IonRow style={{ padding: 0 }}>
                        <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                          <IonItem>
                            <IonLabel position="stacked">Hora Entrada</IonLabel>
                            <IonInput 
                              type="time" 
                              value={entryTime} 
                              onIonInput={e => setEntryTime(e.detail.value!)} 
                            />
                          </IonItem>
                        </IonCol>
                        <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                          <IonItem>
                            <IonLabel position="stacked">Hora Salida</IonLabel>
                            <IonInput 
                              type="time" 
                              value={exitTime} 
                              onIonInput={e => setExitTime(e.detail.value!)} 
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                      <IonItem>
                        <IonLabel position="stacked">Sueldo Acordado (USD)</IonLabel>
                        <IonInput type="number" min="0" placeholder="Ej: 50" value={salaryAmount} onIonChange={e => setSalaryAmount(e.detail.value!)} />
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
                          <th>Usuario / Cargo</th>
                          <th>Correo</th>
                          <th>Rol</th>
                          <th>Horario</th>
                          <th>Estado</th>
                          <th>Fecha de Creación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u: any) => {
                          const isCurrentUser = (user?.id && user.id === u.id) || (user?.username && user.username === u.username);
                          return (
                            <tr key={u.id}>
                              <td>
                                <div><strong>{u.username}</strong></div>
                                {u.jobTitle && (
                                  <div style={{ fontSize: '0.85em', color: '#92949c' }}>
                                    {u.jobTitle}
                                  </div>
                                )}
                              </td>
                              <td>{u.email}</td>
                              <td>
                                <IonBadge color={u.role === UserRole.ADMIN ? 'danger' : 'primary'}>{u.role}</IonBadge>
                              </td>
                              <td>
                                {u.entryTime && u.exitTime ? (
                                  <span style={{ fontSize: '0.85rem' }}>{u.entryTime} - {u.exitTime}</span>
                                ) : (
                                  <span style={{ fontSize: '0.85rem', color: '#888' }}>Sin definir</span>
                                )}
                              </td>
                              <td>
                                <IonBadge color={u.status === 'PENDING' ? 'warning' : 'success'}>
                                  {u.status === 'PENDING' ? 'Invitado' : 'Activo'}
                                </IonBadge>
                              </td>
                              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                              <td>
                                <IonButton size="small" color="primary" fill="clear" onClick={() => handleOpenEdit(u)}>
                                  ✏️ Editar
                                </IonButton>
                                <IonButton size="small" color="success" fill="clear" onClick={() => setSelectedUserForPay(u)}>
                                  💵 Pagar
                                </IonButton>
                                {u.username !== 'admin' && !isCurrentUser && (
                                  <IonButton size="small" color="danger" fill="clear" onClick={() => handleDelete(u.id)}>
                                    Eliminar
                                  </IonButton>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {users.length === 0 && (
                          <tr><td colSpan={7} className="ion-text-center">Cargando...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Solicitudes de Acceso Pendientes */}
          <IonRow className="ion-margin-top">
            <IonCol size="12">
              <IonCard>
                <IonCardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IonCardTitle style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                      ⏳ Solicitudes de Acceso Pendientes
                    </IonCardTitle>
                    {accessRequests.length > 0 && (
                      <IonBadge color="warning" style={{ fontSize: '0.85rem' }}>
                        {accessRequests.length} pendientes
                      </IonBadge>
                    )}
                  </div>
                  <IonButton size="small" fill="outline" color="medium" onClick={fetchAccessRequests}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    Actualizar
                  </IonButton>
                </IonCardHeader>
                <IonCardContent style={{ padding: accessRequests.length === 0 ? '20px' : 0 }}>
                  {accessRequests.length === 0 ? (
                    <div className="ion-text-center" style={{ color: '#64748b', padding: '15px' }}>
                      <p style={{ margin: 0 }}>No hay solicitudes de acceso pendientes en este momento.</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>
                        Cuando un empleado intente ingresar fuera de su horario asignado o si la política de aprobación está activa, aparecerá aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>Empleado / Cargo</th>
                            <th>Hora Intento</th>
                            <th>Horario Asignado</th>
                            <th>Motivo</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessRequests.map((req: any) => (
                            <tr key={req.id}>
                              <td>
                                <div><strong>{req.userName}</strong></div>
                                {req.jobTitle && (
                                  <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                                    {req.jobTitle}
                                  </div>
                                )}
                                <IonBadge color="medium" style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                                  {req.role}
                                </IonBadge>
                              </td>
                              <td>
                                <strong style={{ color: '#b45309' }}>⏱️ {req.attemptTime}</strong>
                              </td>
                              <td>
                                {req.entryTime && req.exitTime ? (
                                  <span>{req.entryTime} - {req.exitTime}</span>
                                ) : (
                                  <span style={{ color: '#888' }}>Sin horario</span>
                                )}
                              </td>
                              <td>
                                <IonBadge color={req.reason === 'POLICY_ALWAYS_REQUIRE' ? 'tertiary' : 'warning'}>
                                  {req.reason === 'POLICY_ALWAYS_REQUIRE' ? 'Aprobación Obligatoria' : 'Fuera de Horario'}
                                </IonBadge>
                              </td>
                              <td>
                                <IonButton 
                                  size="small" 
                                  color="success" 
                                  onClick={() => handleApproveAccess(req.id, req.userName)}
                                  style={{ marginRight: '6px' }}
                                >
                                  ✅ Aprobar
                                </IonButton>
                                <IonButton 
                                  size="small" 
                                  color="danger" 
                                  fill="outline"
                                  onClick={() => handleRejectAccess(req.id, req.userName)}
                                >
                                  ❌ Rechazar
                                </IonButton>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
      
      {/* Modal Editar Usuario */}
      {selectedUserForEdit && (
        <IonModal isOpen={!!selectedUserForEdit} onDidDismiss={() => setSelectedUserForEdit(null)}>
          <IonHeader>
            <IonToolbar color="dark">
              <IonTitle>Editar: {selectedUserForEdit.username}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedUserForEdit(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Correo Electrónico</IonLabel>
              <IonInput disabled value={selectedUserForEdit.email} />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Rol / Permiso</IonLabel>
              <IonSelect value={editRole} onIonChange={e => setEditRole(e.detail.value)}>
                <IonSelectOption value={UserRole.ADMIN}>Administrador</IonSelectOption>
                <IonSelectOption value={UserRole.POS}>Cajero (POS)</IonSelectOption>
                {settings?.featureRecipes !== false && (
                  <IonSelectOption value={UserRole.KITCHEN}>Cocina (KITCHEN)</IonSelectOption>
                )}
                {settings?.featureBuySell !== false && (
                  <IonSelectOption value={UserRole.DELIVERY}>Repartidor (DELIVERY)</IonSelectOption>
                )}
                <IonSelectOption value={UserRole.INVENTORY}>Reabastecedor (INVENTORY)</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Cargo / Puesto (Opcional)</IonLabel>
              <IonInput 
                value={editJobTitle} 
                onIonInput={e => setEditJobTitle(e.detail.value!)} 
                placeholder="Ej. Manicurista, Estilista, Mesero, Vendedora" 
              />
            </IonItem>

            <IonRow style={{ padding: 0 }}>
              <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                <IonItem>
                  <IonLabel position="stacked">Hora Entrada</IonLabel>
                  <IonInput 
                    type="time" 
                    value={editEntryTime} 
                    onIonInput={e => setEditEntryTime(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
              <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                <IonItem>
                  <IonLabel position="stacked">Hora Salida</IonLabel>
                  <IonInput 
                    type="time" 
                    value={editExitTime} 
                    onIonInput={e => setEditExitTime(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            <IonItem>
              <IonLabel position="stacked">Sueldo Acordado (USD)</IonLabel>
              <IonInput 
                type="number" 
                min="0" 
                placeholder="Ej: 50" 
                value={editSalaryAmount} 
                onIonChange={e => setEditSalaryAmount(e.detail.value!)} 
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Frecuencia de Pago</IonLabel>
              <IonSelect value={editSalaryPeriod} onIonChange={e => setEditSalaryPeriod(e.detail.value)}>
                <IonSelectOption value="SEMANAL">Semanal</IonSelectOption>
                <IonSelectOption value="QUINCENAL">Quincenal</IonSelectOption>
                <IonSelectOption value="MENSUAL">Mensual</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div className="ion-margin-top">
              <IonButton expand="block" color="primary" onClick={handleSaveEdit}>
                💾 Guardar Cambios
              </IonButton>
              <IonButton expand="block" fill="clear" color="medium" onClick={() => setSelectedUserForEdit(null)}>
                Cancelar
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      )}

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
              <IonInput type="number" min="0" placeholder="Ej. 20" value={payAmount} onIonChange={e => setPayAmount(e.detail.value!)} />
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
