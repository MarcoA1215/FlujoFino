import React, { useState, useEffect, useContext } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonButtons,
  IonMenuButton,
  useIonToast,
  useIonAlert,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  IonCheckbox,
  IonSpinner,
} from '@ionic/react';
import { refreshOutline, walletOutline, carOutline, peopleOutline, timeOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@finowork/shared-types';
import { AppHeader } from '../components/AppHeader';
import SalaryAdvanceModal from '../components/SalaryAdvanceModal';
import { formatTime12h, formatTimeRange12h } from '../utils/time';

interface UserData {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: string;
  roles?: UserRole[];
  jobTitle?: string;
  entryTime?: string;
  exitTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
  salaryAmount?: number;
  salaryPeriod?: string;
  compensationType?: string; // 'FIJO' | 'COMISION' | 'MIXTO'
  commissionPercentage?: number;
  lastPayrollDate?: string;
  lastPayrollPeriodStart?: string;
  lastPayrollPeriodEnd?: string;
  lastPayrollAmount?: number;
  status?: string;
  createdAt: string;
}

interface RoleOption {
  role: UserRole;
  label: string;
}

const AVAILABLE_ROLES: RoleOption[] = [
  { role: UserRole.POS, label: 'Caja / Punto de Venta (POS)' },
  { role: UserRole.INVENTORY, label: 'Control de Inventario / Insumos (INVENTORY)' },
  { role: UserRole.DELIVERY, label: 'Repartidor / Delivery (DELIVERY)' },
  { role: UserRole.KITCHEN, label: 'Especialista / Preparación (KITCHEN)' },
  { role: UserRole.ADMIN, label: 'Administrador de Sucursal (ADMIN)' },
];

const getRoleBadgeInfo = (r: string) => {
  switch (r) {
    case UserRole.ADMIN: return { label: 'Admin', color: 'danger' };
    case UserRole.POS: return { label: 'Caja', color: 'primary' };
    case UserRole.INVENTORY: return { label: 'Inventario', color: 'warning' };
    case UserRole.DELIVERY: return { label: 'Reparto', color: 'tertiary' };
    case UserRole.KITCHEN: return { label: 'Especialista / Cocina', color: 'secondary' };
    case UserRole.OPERATIVO: return { label: 'Operativo', color: 'medium' };
    default: return { label: r, color: 'medium' };
  }
};

export const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const Users: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'delivery' | 'requests'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.POS);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([UserRole.POS]);
  const [editRoles, setEditRoles] = useState<UserRole[]>([UserRole.POS]);

  const toggleRole = (r: UserRole) => {
    if (selectedRoles.includes(r)) {
      if (selectedRoles.length === 1) {
        presentToast({ message: 'El usuario debe tener al menos un rol asignado', duration: 2000, color: 'warning' });
        return;
      }
      setSelectedRoles(selectedRoles.filter(role => role !== r));
    } else {
      setSelectedRoles([...selectedRoles, r]);
    }
  };

  const toggleEditRole = (r: UserRole) => {
    if (editRoles.includes(r)) {
      if (editRoles.length === 1) {
        presentToast({ message: 'El usuario debe tener al menos un rol asignado', duration: 2000, color: 'warning' });
        return;
      }
      setEditRoles(editRoles.filter(role => role !== r));
    } else {
      setEditRoles([...editRoles, r]);
    }
  };
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [identification, setIdentification] = useState('');
  const [phone, setPhone] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [lunchStart, setLunchStart] = useState('');
  const [lunchEnd, setLunchEnd] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('SEMANAL');
  const [compensationType, setCompensationType] = useState('FIJO');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  
  // Vales / Anticipos
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
  const [advancesTotalsByUser, setAdvancesTotalsByUser] = useState<Record<string, any>>({});
  const [selectedUserAdvancesModal, setSelectedUserAdvancesModal] = useState<UserData | null>(null);

  // Delivery / Repartidores Summary
  const [deliverySummary, setDeliverySummary] = useState<any>(null);
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<any | null>(null);

  // Liquidación de Nómina Dinámica & Pagos
  const [selectedUserForPay, setSelectedUserForPay] = useState<UserData | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH_USD');
  const [payDate, setPayDate] = useState(formatDateLocal(new Date()));
  const [deductAdvances, setDeductAdvances] = useState(true);
  const [payrollStartDate, setPayrollStartDate] = useState('');
  const [payrollEndDate, setPayrollEndDate] = useState('');
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [loadingPayrollSummary, setLoadingPayrollSummary] = useState(false);
  const [showWorkDetails, setShowWorkDetails] = useState(false);
  const [includeBaseSalary, setIncludeBaseSalary] = useState(true);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserData | null>(null);
  const [editName, setEditName] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editEntryTime, setEditEntryTime] = useState('');
  const [editExitTime, setEditExitTime] = useState('');
  const [editLunchStart, setEditLunchStart] = useState('');
  const [editLunchEnd, setEditLunchEnd] = useState('');
  const [editSalaryAmount, setEditSalaryAmount] = useState('');
  const [editSalaryPeriod, setEditSalaryPeriod] = useState('SEMANAL');
  const [editCompensationType, setEditCompensationType] = useState('FIJO');
  const [editCommissionPercentage, setEditCommissionPercentage] = useState('');
  
  const [isChecked, setIsChecked] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const { user } = useContext(AuthContext);

  const fetchAccessRequests = async () => {
    try {
      const res = await apiClient.get('/users/access-requests');
      setAccessRequests(res.data || []);
    } catch (e) {
      console.error('Error cargando solicitudes de acceso', e);
    }
  };

  const fetchPendingAdvances = async () => {
    try {
      const res = await apiClient.get('/salary-advances/pending');
      setPendingAdvances(res.data.advances || []);
      setAdvancesTotalsByUser(res.data.totalsByUser || {});
    } catch (e) {
      console.error('Error cargando vales pendientes', e);
    }
  };

  const fetchDeliverySummary = async () => {
    try {
      const res = await apiClient.get('/deliveries/admin-summary');
      setDeliverySummary(res.data);
    } catch (e) {
      console.error('Error cargando resumen de delivery', e);
    }
  };

  const handleDeductAdvance = async (id: string) => {
    try {
      await apiClient.patch(`/salary-advances/${id}/deduct`);
      presentToast({ message: 'Vale marcado como descontado de nómina', duration: 2500, color: 'success' });
      fetchPendingAdvances();
      if (selectedUserAdvancesModal) {
        setPendingAdvances(prev => prev.filter(a => a.id !== id));
      }
    } catch (e: any) {
      presentToast({
        message: 'Error al descontar vale: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiClient.get<UserData[]>('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
      try {
        const setRes = await apiClient.get<any>('/settings');
        setSettings(setRes.data || {});
      } catch (err) {
        console.error('Error cargando settings', err);
      }
      fetchAccessRequests();
      fetchPendingAdvances();
      fetchDeliverySummary();
    } catch (e: any) {
      console.error('Error cargando usuarios:', e);
      presentToast({
        message: 'Error al cargar usuarios: ' + (e.response?.data?.message || e.message || 'Verifica tu conexión'),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchUsers();
      fetchAccessRequests();
      fetchPendingAdvances();
      fetchDeliverySummary();
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

  const fetchPayrollSummary = async (userId: string, start?: string, end?: string, forceIncludeBaseSalary?: boolean) => {
    setLoadingPayrollSummary(true);
    try {
      const params: any = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      if (forceIncludeBaseSalary !== undefined) {
        params.includeBaseSalary = String(forceIncludeBaseSalary);
      }
      const res = await apiClient.get(`/users/${userId}/payroll-summary`, { params });
      setPayrollSummary(res.data);
      if (forceIncludeBaseSalary === undefined && res.data?.includeBaseSalary !== undefined) {
        setIncludeBaseSalary(res.data.includeBaseSalary);
      }
      if (res.data?.netPayableUSD !== undefined) {
        setPayAmount(String(res.data.netPayableUSD));
      }
    } catch (e: any) {
      console.error('Error cargando liquidación de nómina', e);
      const errMsg = e.response?.data?.message || 'Error al calcular la nómina';
      presentToast({
        message: Array.isArray(errMsg) ? errMsg.join(', ') : String(errMsg),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoadingPayrollSummary(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setName('');
    setPassword('');
    setJobTitle('');
    setIdentification('');
    setPhone('');
    setEntryTime('');
    setExitTime('');
    setLunchStart('');
    setLunchEnd('');
    setSalaryAmount('');
    setSalaryPeriod('SEMANAL');
    setCompensationType('FIJO');
    setCommissionPercentage('');
    setRole(UserRole.POS);
    setSelectedRoles([UserRole.POS]);
    setIsChecked(false);
    setIsExisting(false);
  };

  const handleCreate = async () => {
    if (role === UserRole.OPERATIVO) {
      if (!username.trim()) {
        return presentToast({ message: 'Ingresa el nombre del empleado operativo', duration: 3000, color: 'warning' });
      }
      try {
        await apiClient.post('/users', {
          name: username.trim(),
          username: username.trim(),
          role: UserRole.OPERATIVO,
          jobTitle: jobTitle.trim() || 'Personal Operativo (Limpieza / Mantenimiento)',
          identification: identification.trim() || undefined,
          phone: phone.trim() || undefined,
          salaryAmount: compensationType !== 'COMISION' && salaryAmount ? Number(salaryAmount) : undefined,
          salaryPeriod: compensationType !== 'COMISION' ? salaryPeriod : undefined,
          compensationType,
          commissionPercentage: compensationType !== 'FIJO' && commissionPercentage ? Number(commissionPercentage) : undefined,
          entryTime: entryTime || undefined,
          exitTime: exitTime || undefined,
          lunchStart: lunchStart || undefined,
          lunchEnd: lunchEnd || undefined,
        });
        presentToast({ message: 'Personal operativo registrado exitosamente', duration: 2000, color: 'success' });
        resetForm();
        fetchUsers();
      } catch (e: any) {
        presentToast({ message: 'Error al registrar: ' + (e.response?.data?.message || e.message), duration: 4000, color: 'danger' });
      }
      return;
    }

    if (!email || !username || !password) {
      return presentToast({ message: 'Todos los campos obligatorios son requeridos', duration: 3000, color: 'warning' });
    }
    try {
      await apiClient.post('/users', { 
        name: name.trim() || undefined,
        username, email, password,
        roles: selectedRoles,
        role: selectedRoles[0] || UserRole.POS, 
        jobTitle: jobTitle.trim() || undefined,
        identification: identification.trim() || undefined,
        phone: phone.trim() || undefined,
        entryTime: entryTime || undefined,
        exitTime: exitTime || undefined,
        lunchStart: lunchStart || undefined,
        lunchEnd: lunchEnd || undefined,
        salaryAmount: compensationType !== 'COMISION' && salaryAmount ? Number(salaryAmount) : undefined, 
        salaryPeriod: compensationType !== 'COMISION' ? salaryPeriod : undefined,
        compensationType,
        commissionPercentage: compensationType !== 'FIJO' && commissionPercentage ? Number(commissionPercentage) : undefined,
      });
      presentToast({ message: isExisting ? 'Usuario invitado exitosamente' : 'Usuario creado exitosamente', duration: 2000, color: 'success' });
      resetForm();
      fetchUsers();
      window.dispatchEvent(new CustomEvent('users_updated'));
    } catch (e: any) {
      presentToast({ message: 'Error al procesar: ' + (e.response?.data?.message || e.message), duration: 4000, color: 'danger' });
    }
  };

  const handleOpenPayModal = (u: UserData) => {
    setSelectedUserForPay(u);
    setShowWorkDetails(false);
    const end = formatDateLocal(new Date());
    let start = '';

    if (u.lastPayrollPeriodEnd) {
      try {
        const lastEndDate = new Date(`${u.lastPayrollPeriodEnd}T00:00:00`);
        const nextDay = new Date(lastEndDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const todayObj = new Date();
        if (nextDay > todayObj) {
          start = formatDateLocal(todayObj);
        } else {
          start = formatDateLocal(nextDay);
        }
      } catch (e) {
        const startObj = new Date();
        startObj.setDate(startObj.getDate() - 7);
        start = formatDateLocal(startObj);
      }
    } else {
      const startObj = new Date();
      startObj.setDate(startObj.getDate() - 7);
      start = formatDateLocal(startObj);
    }

    setPayrollStartDate(start);
    setPayrollEndDate(end);
    setDeductAdvances(true);
    setPayMethod('CASH_USD');
    setPayDate(end);
    fetchPayrollSummary(u.id, start, end);
  };

  const handleToggleBaseSalary = (checked: boolean) => {
    setIncludeBaseSalary(checked);
    if (selectedUserForPay) {
      fetchPayrollSummary(selectedUserForPay.id, payrollStartDate, payrollEndDate, checked);
    }
  };

  const handleToggleWorkItemSettled = async (item: any) => {
    if (!selectedUserForPay) return;
    try {
      const newSettledState = !item.commissionPaid;
      await apiClient.patch(`/users/${selectedUserForPay.id}/settle-work-items`, {
        reservationIds: item.type === 'RESERVATION' ? [item.id] : [],
        orderIds: item.type === 'ORDER' ? [item.id] : [],
        settled: newSettledState,
      });
      presentToast({
        message: newSettledState ? 'Trabajo marcado como liquidado' : 'Trabajo marcado como pendiente de liquidar',
        duration: 2000,
        color: 'success',
      });
      fetchPayrollSummary(selectedUserForPay.id, payrollStartDate, payrollEndDate, includeBaseSalary);
    } catch (e: any) {
      presentToast({ message: 'Error actualizando estado del trabajo', duration: 3000, color: 'danger' });
    }
  };

  const handleToggleDeductAdvances = (checked: boolean) => {
    setDeductAdvances(checked);
    if (!payrollSummary) {
      const adv = advancesTotalsByUser[selectedUserForPay?.id || ''];
      const advTotal = Number(adv?.totalUSD || 0);
      const base = Number(selectedUserForPay?.salaryAmount) || 0;
      if (checked) {
        setPayAmount(String(Math.max(0, Number((base - advTotal).toFixed(2)))));
      } else {
        setPayAmount(String(base));
      }
      return;
    }
    if (checked) {
      setPayAmount(String(payrollSummary.netPayableUSD ?? 0));
    } else {
      setPayAmount(String(payrollSummary.grossTotal ?? 0));
    }
  };

  const handlePaySalary = async () => {
    if (!selectedUserForPay || !payAmount) return;
    try {
      const unsettledWork = payrollSummary?.workItems?.filter((w: any) => !w.commissionPaid && w.isPaid) || [];
      const reservationIds = unsettledWork.filter((w: any) => w.type === 'RESERVATION').map((w: any) => w.id);
      const orderIds = unsettledWork.filter((w: any) => w.type === 'ORDER').map((w: any) => w.id);

      await apiClient.post(`/users/${selectedUserForPay.id}/pay`, {
        username: selectedUserForPay.username,
        amount: Number(payAmount),
        method: payMethod,
        date: payDate,
        deductAdvances: deductAdvances,
        periodStart: payrollStartDate,
        periodEnd: payrollEndDate,
        includeBaseSalary: includeBaseSalary,
        reservationIds,
        orderIds,
      });

      presentToast({ message: 'Pago registrado exitosamente en gastos de nómina y período marcado como liquidado', duration: 3000, color: 'success' });
      setSelectedUserForPay(null);
      setPayrollSummary(null);
      setPayAmount('');
      fetchUsers();
      fetchPendingAdvances();
    } catch (e: any) {
      presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleOpenEdit = (u: UserData) => {
    setSelectedUserForEdit(u);
    const userRoles: UserRole[] = (u.roles && u.roles.length > 0)
      ? u.roles
      : [(u.role as UserRole) || UserRole.POS];
    setEditRoles(userRoles);
    setEditName(u.name || '');
    setEditJobTitle(u.jobTitle || '');
    setEditEntryTime(u.entryTime || '');
    setEditExitTime(u.exitTime || '');
    setEditLunchStart(u.lunchStart || '');
    setEditLunchEnd(u.lunchEnd || '');
    setEditSalaryAmount(u.salaryAmount !== undefined && u.salaryAmount !== null ? String(u.salaryAmount) : '');
    setEditSalaryPeriod(u.salaryPeriod || 'SEMANAL');
    setEditCompensationType(u.compensationType || 'FIJO');
    setEditCommissionPercentage(u.commissionPercentage !== undefined && u.commissionPercentage !== null ? String(u.commissionPercentage) : '');
  };

  const handleSaveEdit = async () => {
    if (!selectedUserForEdit) return;
    try {
      await apiClient.put(`/users/${selectedUserForEdit.id}`, {
        name: editName.trim() || null,
        roles: selectedUserForEdit.role === UserRole.OPERATIVO ? [UserRole.OPERATIVO] : editRoles,
        role: selectedUserForEdit.role === UserRole.OPERATIVO ? UserRole.OPERATIVO : (editRoles[0] || UserRole.POS),
        jobTitle: editJobTitle.trim() || null,
        entryTime: editEntryTime || null,
        exitTime: editExitTime || null,
        lunchStart: editLunchStart || null,
        lunchEnd: editLunchEnd || null,
        salaryAmount: editCompensationType !== 'COMISION' && editSalaryAmount ? Number(editSalaryAmount) : null,
        salaryPeriod: editCompensationType !== 'COMISION' ? (editSalaryPeriod || 'SEMANAL') : null,
        compensationType: editCompensationType,
        commissionPercentage: editCompensationType !== 'FIJO' && editCommissionPercentage ? Number(editCommissionPercentage) : null,
      });
      presentToast({ message: 'Usuario actualizado exitosamente', duration: 2000, color: 'success' });
      setSelectedUserForEdit(null);
      fetchUsers();
      window.dispatchEvent(new CustomEvent('users_updated'));
    } catch (e: any) {
      presentToast({ message: 'Error al actualizar: ' + (e.response?.data?.message || e.message), duration: 4000, color: 'danger' });
    }
  };

  const handleDelete = (id: string, username?: string) => {
    presentAlert({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar a "${username || 'este usuario'}" del negocio? Esta acción revocará todos sus accesos.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/users/${id}`);
              presentToast({ message: 'Usuario eliminado exitosamente', duration: 2000, color: 'success' });
              fetchUsers();
              window.dispatchEvent(new CustomEvent('users_updated'));
            } catch (e: any) {
              presentToast({ message: 'Error al eliminar: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
            }
          },
        },
      ],
    });
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
      <AppHeader title="Gestión de Equipo y Nómina" onRefresh={() => Promise.all([fetchUsers(), fetchAccessRequests(), fetchPendingAdvances(), fetchDeliverySummary()])} />
      <IonContent className="ion-padding ff-has-bottom-nav" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '90px' }}>
          {/* Barra Superior con Segmentos y Acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <IonSegment
              value={activeTab}
              onIonChange={e => setActiveTab(e.detail.value as any)}
              style={{ maxWidth: '520px', background: '#FFFFFF', borderRadius: '12px', padding: '2px' }}
            >
              <IonSegmentButton value="users">
                <IonLabel style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                  <IonIcon icon={peopleOutline} />
                  Equipo ({users.length})
                </IonLabel>
              </IonSegmentButton>
              {settings?.featureDelivery !== false && (
                <IonSegmentButton value="delivery">
                  <IonLabel style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <IonIcon icon={carOutline} />
                    Repartidores
                  </IonLabel>
                </IonSegmentButton>
              )}
              <IonSegmentButton value="requests">
                <IonLabel style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                  <IonIcon icon={timeOutline} />
                  Accesos {accessRequests.length > 0 && `(${accessRequests.length})`}
                </IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {activeTab === 'users' && (
              <IonButton
                color="primary"
                onClick={() => setShowAdvanceModal(true)}
                style={{ '--border-radius': '10px', fontWeight: 700 }}
              >
                <IonIcon icon={walletOutline} slot="start" />
                Registrar Vale / Anticipo
              </IonButton>
            )}
          </div>

          {/* TAB 1: EQUIPO Y NÓMINA */}
          {activeTab === 'users' && (
            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                <IonCol size="12" sizeMd="4">
                  <IonCard style={{ margin: 0 }}>
                    <IonCardHeader>
                      <IonCardTitle>Crear Usuario</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ marginBottom: '14px' }}>
                        <IonLabel style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                          Tipo de Registro
                        </IonLabel>
                        <IonSelect
                          interface="popover"
                          value={role === UserRole.OPERATIVO ? 'OPERATIVO' : 'SYSTEM'}
                          onIonChange={e => {
                            if (e.detail.value === 'OPERATIVO') {
                              setRole(UserRole.OPERATIVO);
                              setIsChecked(true);
                              setIsExisting(false);
                              if (!jobTitle) setJobTitle('Limpieza y Mantenimiento');
                            } else {
                              setRole(UserRole.POS);
                              setIsChecked(false);
                            }
                          }}
                          style={{
                            width: '100%',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            background: '#F8FAFC',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          <IonSelectOption value="SYSTEM">💻 Empleado con Acceso al Sistema (Caja, Admin, Cocina...)</IonSelectOption>
                          <IonSelectOption value="OPERATIVO">🧹 Personal Operativo / Sin Acceso (Limpieza, Vigilancia, etc.)</IonSelectOption>
                        </IonSelect>
                      </div>

                      {role === UserRole.OPERATIVO ? (
                        <>
                          <IonItem>
                            <IonLabel position="stacked">Nombre del Empleado *</IonLabel>
                            <IonInput value={username} onIonInput={e => setUsername(e.detail.value!)} placeholder="Ej. Juan Pérez" />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Cargo / Puesto</IonLabel>
                            <IonInput 
                              value={jobTitle} 
                              onIonInput={e => setJobTitle(e.detail.value!)} 
                              placeholder="Ej. Limpieza y Mantenimiento" 
                            />
                          </IonItem>
                          <IonRow style={{ padding: 0 }}>
                            <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                              <IonItem>
                                <IonLabel position="stacked">Cédula / DNI</IonLabel>
                                <IonInput 
                                  value={identification} 
                                  onIonInput={e => setIdentification(e.detail.value!)} 
                                  placeholder="V-12345678" 
                                />
                              </IonItem>
                            </IonCol>
                            <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                              <IonItem>
                                <IonLabel position="stacked">Teléfono</IonLabel>
                                <IonInput 
                                  type="tel"
                                  value={phone} 
                                  onIonInput={e => setPhone(e.detail.value!)} 
                                  placeholder="0412..." 
                                />
                              </IonItem>
                            </IonCol>
                          </IonRow>
                          <IonRow style={{ padding: 0 }}>
                            <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Hora Entrada {entryTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(entryTime)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={entryTime} 
                                  onIonInput={e => setEntryTime(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                            <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Hora Salida {exitTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(exitTime)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={exitTime} 
                                  onIonInput={e => setExitTime(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                          </IonRow>
                          <IonRow style={{ padding: 0 }}>
                            <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Inicio Almuerzo / Receso {lunchStart && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(lunchStart)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={lunchStart} 
                                  onIonInput={e => setLunchStart(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                            <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Fin Almuerzo / Receso {lunchEnd && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(lunchEnd)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={lunchEnd} 
                                  onIonInput={e => setLunchEnd(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                          </IonRow>
                          <IonItem>
                            <IonLabel position="stacked">Esquema de Remuneración</IonLabel>
                            <IonSelect
                              interface="popover"
                              value={compensationType}
                              onIonChange={e => setCompensationType(e.detail.value)}
                            >
                              <IonSelectOption value="FIJO">💵 Sueldo Fijo</IonSelectOption>
                              <IonSelectOption value="COMISION">💼 100% Por Comisión</IonSelectOption>
                              <IonSelectOption value="MIXTO">⚖️ Mixto (Base + Comisión)</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                          {(compensationType === 'COMISION' || compensationType === 'MIXTO') && (
                            <IonItem>
                              <IonLabel position="stacked">Porcentaje de Comisión (%)</IonLabel>
                              <IonInput
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="Ej: 40 para 40%"
                                value={commissionPercentage}
                                onIonInput={e => setCommissionPercentage(e.detail.value!)}
                              />
                            </IonItem>
                          )}
                          {(compensationType === 'FIJO' || compensationType === 'MIXTO') && (
                            <>
                              <IonItem>
                                <IonLabel position="stacked">
                                  {compensationType === 'MIXTO' ? 'Sueldo Base Acordado (USD)' : 'Sueldo Acordado (USD)'}
                                </IonLabel>
                                <IonInput type="number" min="0" placeholder="Ej: 50" value={salaryAmount} onIonInput={e => setSalaryAmount(e.detail.value!)} />
                              </IonItem>
                              <IonItem>
                                <IonLabel position="stacked">Frecuencia de Pago</IonLabel>
                                <IonSelect value={salaryPeriod} onIonChange={e => setSalaryPeriod(e.detail.value)}>
                                  <IonSelectOption value="SEMANAL">Semanal</IonSelectOption>
                                  <IonSelectOption value="QUINCENAL">Quincenal</IonSelectOption>
                                  <IonSelectOption value="MENSUAL">Mensual</IonSelectOption>
                                </IonSelect>
                              </IonItem>
                            </>
                          )}
                          <IonButton expand="block" color="primary" className="ion-margin-top" onClick={handleCreate}>
                            Registrar Personal Operativo
                          </IonButton>
                          <IonButton expand="block" fill="clear" color="medium" onClick={resetForm}>
                            Cancelar
                          </IonButton>
                        </>
                      ) : !isChecked ? (
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
                            <IonLabel position="stacked">Nombre de Usuario (Para Iniciar Sesión)</IonLabel>
                            <IonInput disabled={isExisting} value={username} onIonInput={e => setUsername(e.detail.value!)} placeholder="Ej. juan_cajero" />
                          </IonItem>
                          {!isExisting && (
                            <IonItem>
                              <IonLabel position="stacked">Nombre Visible / Completo (Opcional - Para Clientes y Reservas)</IonLabel>
                              <IonInput value={name} onIonInput={e => setName(e.detail.value!)} placeholder="Ej. Juan Pérez" />
                            </IonItem>
                          )}
                          {!isExisting && (
                            <IonItem>
                              <IonLabel position="stacked">Contraseña</IonLabel>
                              <IonInput type="password" value={password} onIonInput={e => setPassword(e.detail.value!)} placeholder="***" />
                            </IonItem>
                          )}
                          <div style={{ margin: '14px 0 10px 0' }}>
                            <IonLabel style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                              Roles Autorizados (Modos de Trabajo) *
                            </IonLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                              {AVAILABLE_ROLES.map(opt => {
                                const isCheckedRole = selectedRoles.includes(opt.role);
                                return (
                                  <div 
                                    key={opt.role} 
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '2px 0' }} 
                                    onClick={() => toggleRole(opt.role)}
                                  >
                                    <IonCheckbox
                                      checked={isCheckedRole}
                                      onIonChange={e => {
                                        e.stopPropagation();
                                        toggleRole(opt.role);
                                      }}
                                    />
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: isCheckedRole ? 700 : 500 }}>
                                      {opt.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <IonItem>
                            <IonLabel position="stacked">Cargo / Puesto (Opcional)</IonLabel>
                            <IonInput 
                              value={jobTitle} 
                              onIonInput={e => setJobTitle(e.detail.value!)} 
                              placeholder="Ej. Especialista, Profesional, Terapeuta, etc." 
                            />
                          </IonItem>
                          <IonRow style={{ padding: 0 }}>
                            <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Hora Entrada {entryTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(entryTime)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={entryTime} 
                                  onIonInput={e => setEntryTime(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                            <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Hora Salida {exitTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(exitTime)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={exitTime} 
                                  onIonInput={e => setExitTime(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                          </IonRow>
                          <IonRow style={{ padding: 0 }}>
                            <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Inicio Almuerzo / Receso {lunchStart && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(lunchStart)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={lunchStart} 
                                  onIonInput={e => setLunchStart(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                            <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                              <IonItem>
                                <IonLabel position="stacked">
                                  Fin Almuerzo / Receso {lunchEnd && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(lunchEnd)})</span>}
                                </IonLabel>
                                <IonInput 
                                  type="time" 
                                  value={lunchEnd} 
                                  onIonInput={e => setLunchEnd(e.detail.value!)} 
                                />
                              </IonItem>
                            </IonCol>
                          </IonRow>
                          <IonItem>
                            <IonLabel position="stacked">Esquema de Remuneración</IonLabel>
                            <IonSelect
                              interface="popover"
                              value={compensationType}
                              onIonChange={e => setCompensationType(e.detail.value)}
                            >
                              <IonSelectOption value="FIJO">💵 Sueldo Fijo</IonSelectOption>
                              <IonSelectOption value="COMISION">💼 100% Por Comisión</IonSelectOption>
                              <IonSelectOption value="MIXTO">⚖️ Mixto (Base + Comisión)</IonSelectOption>
                            </IonSelect>
                          </IonItem>
                          {(compensationType === 'COMISION' || compensationType === 'MIXTO') && (
                            <IonItem>
                              <IonLabel position="stacked">Porcentaje de Comisión (%)</IonLabel>
                              <IonInput
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="Ej: 40 para 40%"
                                value={commissionPercentage}
                                onIonInput={e => setCommissionPercentage(e.detail.value!)}
                              />
                            </IonItem>
                          )}
                          {(compensationType === 'FIJO' || compensationType === 'MIXTO') && (
                            <>
                              <IonItem>
                                <IonLabel position="stacked">
                                  {compensationType === 'MIXTO' ? 'Sueldo Base Acordado (USD)' : 'Sueldo Acordado (USD)'}
                                </IonLabel>
                                <IonInput type="number" min="0" placeholder="Ej: 50" value={salaryAmount} onIonInput={e => setSalaryAmount(e.detail.value!)} />
                              </IonItem>
                              <IonItem>
                                <IonLabel position="stacked">Frecuencia de Pago</IonLabel>
                                <IonSelect value={salaryPeriod} onIonChange={e => setSalaryPeriod(e.detail.value)}>
                                  <IonSelectOption value="SEMANAL">Semanal</IonSelectOption>
                                  <IonSelectOption value="QUINCENAL">Quincenal</IonSelectOption>
                                  <IonSelectOption value="MENSUAL">Mensual</IonSelectOption>
                                </IonSelect>
                              </IonItem>
                            </>
                          )}
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
                  <div className="ff-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          Equipo de Trabajo ({users.length})
                        </h3>
                        <IonButton size="small" fill="clear" color="primary" onClick={fetchUsers} title="Actualizar lista">
                          <IonIcon icon={refreshOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ↔ Desliza para ver pagos y vales
                      </span>
                    </div>

                    <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'block' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Usuario / Cargo</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Vales Pendientes</th>
                            <th>Horario</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u: any) => {
                            const isCurrentUser = (user?.id && user.id === u.id) || (user?.username && user.username === u.username);
                            const adv = advancesTotalsByUser[u.id];

                            return (
                              <tr key={u.id}>
                                <td>
                                  <div><strong>{u.name || u.username}</strong></div>
                                  {u.name && u.name !== u.username && (
                                    <div style={{ fontSize: '0.8em', color: '#64748b' }}>@{u.username}</div>
                                  )}
                                  {u.jobTitle && (
                                    <div style={{ fontSize: '0.85em', color: '#92949c' }}>
                                      {u.jobTitle}
                                    </div>
                                  )}
                                  {u.compensationType === 'COMISION' ? (
                                    <div style={{ marginTop: '3px' }}>
                                      <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                        💼 {u.commissionPercentage || 0}% Comisión
                                      </span>
                                    </div>
                                  ) : u.compensationType === 'MIXTO' ? (
                                    <div style={{ marginTop: '3px' }}>
                                      <span style={{ fontSize: '11px', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                        ⚖️ Mixto: ${u.salaryAmount || 0} + {u.commissionPercentage || 0}%
                                      </span>
                                    </div>
                                  ) : u.salaryAmount ? (
                                    <div style={{ marginTop: '3px' }}>
                                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                        💵 ${u.salaryAmount} / {u.salaryPeriod || 'Sem'}
                                      </span>
                                    </div>
                                  ) : null}
                                </td>
                                <td>{u.email}</td>
                                <td>
                                  {u.role === UserRole.OPERATIVO ? (
                                    <IonBadge color="medium">🧹 OPERATIVO</IonBadge>
                                  ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      {(u.roles && u.roles.length > 0 ? u.roles : [u.role]).map((r: string) => {
                                        const badgeInfo = getRoleBadgeInfo(r);
                                        return (
                                          <IonBadge key={r} color={badgeInfo.color} style={{ fontSize: '11px', padding: '3px 7px', fontWeight: 700 }}>
                                            {badgeInfo.label}
                                          </IonBadge>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {adv && adv.totalUSD > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '13px' }}>
                                        ${adv.totalUSD.toFixed(2)} USD
                                      </span>
                                      <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                                        Bs. {adv.totalBS.toFixed(2)} ({adv.count} {adv.count === 1 ? 'vale' : 'vales'})
                                      </span>
                                      <IonButton
                                        size="small"
                                        fill="clear"
                                        color="danger"
                                        style={{ height: '22px', fontSize: '11px', textTransform: 'none', padding: 0, justifyContent: 'flex-start' }}
                                        onClick={() => setSelectedUserAdvancesModal(u)}
                                      >
                                        Ver / Descontar
                                      </IonButton>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>$0.00</span>
                                  )}
                                </td>
                                <td>
                                  {u.entryTime && u.exitTime ? (
                                    <div>
                                      <span style={{ fontSize: '0.85rem' }}>{formatTimeRange12h(u.entryTime, u.exitTime)}</span>
                                      {u.lunchStart && u.lunchEnd && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                          🍽️ {formatTimeRange12h(u.lunchStart, u.lunchEnd)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <span style={{ fontSize: '0.85rem', color: '#888' }}>Sin definir</span>
                                      {u.lunchStart && u.lunchEnd && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                          🍽️ {formatTimeRange12h(u.lunchStart, u.lunchEnd)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <IonBadge color={u.status === 'PENDING' ? 'warning' : 'success'}>
                                    {u.status === 'PENDING' ? 'Invitado' : 'Activo'}
                                  </IonBadge>
                                </td>
                                <td>
                                  <IonButton size="small" color="primary" fill="clear" onClick={() => handleOpenEdit(u)}>
                                    ✏️ Editar
                                  </IonButton>
                                  <IonButton size="small" color="success" fill="clear" onClick={() => handleOpenPayModal(u)}>
                                    💵 Pagar
                                  </IonButton>
                                  {u.username !== 'admin' && !isCurrentUser && (
                                    <IonButton size="small" color="danger" fill="clear" onClick={() => handleDelete(u.id, u.username)}>
                                      Eliminar
                                    </IonButton>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {users.length === 0 && (
                            <tr>
                              <td colSpan={7} className="ion-text-center" style={{ padding: '28px 16px', color: '#64748B' }}>
                                {isLoadingUsers ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <IonSpinner name="crescent" color="primary" />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Cargando equipo de trabajo...</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>No hay usuarios registrados en este negocio</span>
                                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>Usa el formulario a la izquierda para crear o registrar miembros de tu equipo.</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>
          )}

          {/* TAB 2: REPARTIDORES Y CUADRE DE DELIVERY */}
          {activeTab === 'delivery' && (
            <div>
              {/* Tarjetas Resumen Global */}
              <IonGrid style={{ padding: 0, marginBottom: '16px' }}>
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Entregas Realizadas</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
                        {deliverySummary?.globalCompleted || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                        Órdenes de delivery completadas
                      </div>
                    </div>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Total Fletes Acumulados</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0284C7', marginTop: '6px' }}>
                        ${deliverySummary?.globalFletesUSD?.toFixed(2) || '0.00'} USD
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>
                        Bs. {deliverySummary?.globalFletesBS?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </div>
                  </IonCol>
                  <IonCol size="12" sizeMd="4">
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Repartidores Registrados</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#475569', marginTop: '6px' }}>
                        {deliverySummary?.drivers?.length || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        Tasa activa: Bs. {deliverySummary?.exchangeRate?.toFixed(2) || '40.00'}
                      </div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Tabla de Repartidores */}
              <div className="ff-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Cuadre por Repartidor
                  </h3>
                  <IonButton size="small" fill="outline" color="primary" onClick={fetchDeliverySummary}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    Actualizar
                  </IonButton>
                </div>

                {!deliverySummary?.drivers || deliverySummary.drivers.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                    No hay repartidores asignados ni entregas registradas aún.
                  </div>
                ) : (
                  <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'block' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Repartidor</th>
                          <th>Entregas Completadas</th>
                          <th>Total Fletes (USD)</th>
                          <th>Total Fletes (Bs)</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliverySummary.drivers.map((d: any) => (
                          <tr key={d.userId}>
                            <td>
                              <strong>{d.username}</strong>
                            </td>
                            <td>
                              <IonBadge color="primary">{d.completedDeliveries} pedidos</IonBadge>
                            </td>
                            <td>
                              <strong style={{ color: '#0284C7' }}>${d.totalFletesUSD.toFixed(2)} USD</strong>
                            </td>
                            <td>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>
                                Bs. {d.totalFletesBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td>
                              <IonButton
                                size="small"
                                fill="outline"
                                color="primary"
                                onClick={() => setSelectedDriverDetails(d)}
                              >
                                Ver Entregas ({d.deliveries?.length || 0})
                              </IonButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SOLICITUDES DE ACCESO */}
          {activeTab === 'requests' && (
            <div className="ff-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    ⏳ Solicitudes de Acceso Pendientes
                  </h3>
                  {accessRequests.length > 0 && (
                    <IonBadge color="warning" style={{ fontSize: '0.8rem', borderRadius: '6px' }}>
                      {accessRequests.length} pendientes
                    </IonBadge>
                  )}
                </div>
                <IonButton size="small" fill="outline" color="medium" onClick={fetchAccessRequests}>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Actualizar
                </IonButton>
              </div>

              <div style={{ padding: accessRequests.length === 0 ? '20px' : 0 }}>
                {accessRequests.length === 0 ? (
                  <div className="ion-text-center" style={{ color: '#64748b', padding: '15px' }}>
                    <p style={{ margin: 0 }}>No hay solicitudes de acceso pendientes en este momento.</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>
                      Cuando un empleado intente ingresar fuera de su horario asignado o si la política de aprobación está activa, aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'block' }}>
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
                              <strong style={{ color: '#b45309' }}>⏱️ {formatTime12h(req.attemptTime)}</strong>
                            </td>
                            <td>
                              {req.entryTime && req.exitTime ? (
                                <span>{formatTimeRange12h(req.entryTime, req.exitTime)}</span>
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
              </div>
            </div>
          )}
        </div>
      </IonContent>
      
      {/* Modal Editar Usuario */}
      {selectedUserForEdit && (
        <IonModal isOpen={!!selectedUserForEdit} onDidDismiss={() => setSelectedUserForEdit(null)}>
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' }}>
              <IonTitle style={{ color: '#0F172A', fontWeight: 700 }}>Editar: {selectedUserForEdit.username}</IonTitle>
              <IonButtons slot="end">
                <IonButton color="medium" onClick={() => setSelectedUserForEdit(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Correo Electrónico</IonLabel>
              <IonInput disabled value={selectedUserForEdit.email} />
            </IonItem>
            
            {selectedUserForEdit.role === UserRole.OPERATIVO ? (
              <div style={{ margin: '14px 0 10px 0' }}>
                <IonBadge color="medium" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  🧹 Personal Operativo / Sin acceso al sistema
                </IonBadge>
              </div>
            ) : (
              <div style={{ margin: '14px 0 10px 0' }}>
                <IonLabel style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Roles Autorizados (Modos de Trabajo) *
                </IonLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {AVAILABLE_ROLES.map(opt => {
                    const isCheckedRole = editRoles.includes(opt.role);
                    return (
                      <div 
                        key={opt.role} 
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '2px 0' }} 
                        onClick={() => toggleEditRole(opt.role)}
                      >
                        <IonCheckbox
                          checked={isCheckedRole}
                          onIonChange={e => {
                            e.stopPropagation();
                            toggleEditRole(opt.role);
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: isCheckedRole ? 700 : 500 }}>
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <IonItem lines="full" className="ion-margin-bottom">
              <IonLabel position="stacked">Nombre Visible / Completo (Para Clientes y Reservas)</IonLabel>
              <IonInput 
                value={editName} 
                onIonInput={e => setEditName(e.detail.value!)} 
                placeholder="Ej. Eva Gómez (Se mostrará a clientes en reservas)" 
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Cargo / Puesto (Opcional)</IonLabel>
              <IonInput 
                value={editJobTitle} 
                onIonInput={e => setEditJobTitle(e.detail.value!)} 
                placeholder="Ej. Especialista, Profesional, Terapeuta, etc." 
              />
            </IonItem>

            <IonRow style={{ padding: 0 }}>
              <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                <IonItem>
                  <IonLabel position="stacked">
                    Hora Entrada {editEntryTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(editEntryTime)})</span>}
                  </IonLabel>
                  <IonInput 
                    type="time" 
                    value={editEntryTime} 
                    onIonInput={e => setEditEntryTime(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
              <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                <IonItem>
                  <IonLabel position="stacked">
                    Hora Salida {editExitTime && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(editExitTime)})</span>}
                  </IonLabel>
                  <IonInput 
                    type="time" 
                    value={editExitTime} 
                    onIonInput={e => setEditExitTime(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            <IonRow style={{ padding: 0 }}>
              <IonCol size="6" style={{ paddingLeft: 0, paddingRight: '4px' }}>
                <IonItem>
                  <IonLabel position="stacked">
                    Inicio Almuerzo / Receso {editLunchStart && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(editLunchStart)})</span>}
                  </IonLabel>
                  <IonInput 
                    type="time" 
                    value={editLunchStart} 
                    onIonInput={e => setEditLunchStart(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
              <IonCol size="6" style={{ paddingLeft: '4px', paddingRight: 0 }}>
                <IonItem>
                  <IonLabel position="stacked">
                    Fin Almuerzo / Receso {editLunchEnd && <span style={{ color: '#059669', fontWeight: 600 }}>({formatTime12h(editLunchEnd)})</span>}
                  </IonLabel>
                  <IonInput 
                    type="time" 
                    value={editLunchEnd} 
                    onIonInput={e => setEditLunchEnd(e.detail.value!)} 
                  />
                </IonItem>
              </IonCol>
            </IonRow>

            <IonItem>
              <IonLabel position="stacked">Esquema de Remuneración</IonLabel>
              <IonSelect
                interface="popover"
                value={editCompensationType}
                onIonChange={e => setEditCompensationType(e.detail.value)}
              >
                <IonSelectOption value="FIJO">💵 Sueldo Fijo</IonSelectOption>
                <IonSelectOption value="COMISION">💼 100% Por Comisión</IonSelectOption>
                <IonSelectOption value="MIXTO">⚖️ Mixto (Base + Comisión)</IonSelectOption>
              </IonSelect>
            </IonItem>

            {(editCompensationType === 'COMISION' || editCompensationType === 'MIXTO') && (
              <IonItem>
                <IonLabel position="stacked">Porcentaje de Comisión (%)</IonLabel>
                <IonInput 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.5" 
                  placeholder="Ej: 40 para 40%" 
                  value={editCommissionPercentage} 
                  onIonInput={e => setEditCommissionPercentage(e.detail.value!)} 
                />
              </IonItem>
            )}

            {(editCompensationType === 'FIJO' || editCompensationType === 'MIXTO') && (
              <>
                <IonItem>
                  <IonLabel position="stacked">
                    {editCompensationType === 'MIXTO' ? 'Sueldo Base Acordado (USD)' : 'Sueldo Acordado (USD)'}
                  </IonLabel>
                  <IonInput 
                    type="number" 
                    min="0" 
                    placeholder="Ej: 50" 
                    value={editSalaryAmount} 
                    onIonInput={e => setEditSalaryAmount(e.detail.value!)} 
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
              </>
            )}

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

      {/* Modal Pago de Nómina y Liquidación de Comisiones */}
      {selectedUserForPay && (
        <IonModal isOpen={!!selectedUserForPay} onDidDismiss={() => { setSelectedUserForPay(null); setPayrollSummary(null); }}>
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' }}>
              <IonTitle style={{ color: '#0F172A', fontWeight: 700, fontSize: '17px' }}>
                Liquidar Nómina: {selectedUserForPay.name || selectedUserForPay.username}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton color="medium" onClick={() => { setSelectedUserForPay(null); setPayrollSummary(null); }}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
            {/* Selector de Período */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                📅 Período de Liquidación de Trabajos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Desde</label>
                  <input
                    type="date"
                    value={payrollStartDate}
                    onChange={e => setPayrollStartDate(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Hasta</label>
                  <input
                    type="date"
                    value={payrollEndDate}
                    onChange={e => setPayrollEndDate(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                  <IonButton
                    expand="block"
                    size="small"
                    color="primary"
                    disabled={loadingPayrollSummary}
                    onClick={() => fetchPayrollSummary(selectedUserForPay.id, payrollStartDate, payrollEndDate, includeBaseSalary)}
                    style={{ width: '100%', height: '36px', margin: 0, fontWeight: 700 }}
                  >
                    {loadingPayrollSummary ? 'Calculando...' : '🔄 Recalcular'}
                  </IonButton>
                </div>
              </div>
            </div>

            {/* Banner de Última Nómina Liquidada */}
            {(payrollSummary?.lastPayrollDate || selectedUserForPay?.lastPayrollDate) && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '18px' }}>🗓️</span>
                <div style={{ fontSize: '12px', color: '#166534' }}>
                  <strong>Última nómina liquidada:</strong> {payrollSummary?.lastPayrollDate || selectedUserForPay?.lastPayrollDate}
                  {(payrollSummary?.lastPayrollAmount !== null && payrollSummary?.lastPayrollAmount !== undefined) && (
                    <span> (${Number(payrollSummary.lastPayrollAmount).toFixed(2)} USD)</span>
                  )}
                  {payrollSummary?.lastPayrollPeriodEnd && (
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                      Período liquidado: <strong>{payrollSummary.lastPayrollPeriodStart || 'Inicio'}</strong> al <strong>{payrollSummary.lastPayrollPeriodEnd}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loadingPayrollSummary && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '14px' }}>
                <IonSpinner name="crescent" color="primary" />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Calculando liquidación y comisiones...
                </div>
              </div>
            )}

            {/* Error or Empty Fallback */}
            {!loadingPayrollSummary && !payrollSummary && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', padding: '14px', textAlign: 'center', marginBottom: '14px', color: '#92400E', fontSize: '12px' }}>
                ⚠️ No se pudo cargar el cálculo automático. Pulsa <strong>🔄 Recalcular</strong> para intentar de nuevo.
              </div>
            )}

            {/* Tarjeta de Resumen y Desglose Automático */}
            {!loadingPayrollSummary && payrollSummary && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Resumen de Compensación
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: payrollSummary.compensationType === 'COMISION' ? '#ECFDF5' : payrollSummary.compensationType === 'MIXTO' ? '#F0FDF4' : '#F1F5F9',
                    color: payrollSummary.compensationType === 'COMISION' ? '#065F46' : payrollSummary.compensationType === 'MIXTO' ? '#166534' : '#334155',
                    border: '1px solid #CBD5E1'
                  }}>
                    {payrollSummary.compensationType === 'COMISION' ? `💼 COMISIÓN ${payrollSummary.commissionPercentage}%` :
                     payrollSummary.compensationType === 'MIXTO' ? `⚖️ MIXTO (${payrollSummary.commissionPercentage}% + $${payrollSummary.baseSalary})` :
                     `💵 FIJO ($${payrollSummary.baseSalary})`}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Trabajos en Período</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      {payrollSummary.servicesCount + (payrollSummary.ordersCount || 0)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>
                      {(payrollSummary.pendingServicesCount ?? payrollSummary.servicesCount) + (payrollSummary.pendingOrdersCount ?? (payrollSummary.ordersCount || 0))} por liquidar
                      {((payrollSummary.settledServicesCount || 0) + (payrollSummary.settledOrdersCount || 0) > 0) && (
                        <span style={{ color: '#059669', display: 'block', fontWeight: 700 }}>
                          ✓ {(payrollSummary.settledServicesCount || 0) + (payrollSummary.settledOrdersCount || 0)} ya liquidados
                        </span>
                      )}
                    </div>
                  </div>

                  {(payrollSummary.compensationType === 'COMISION' || payrollSummary.compensationType === 'MIXTO') && (
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>Comisión a Liquidar ({payrollSummary.commissionPercentage}%)</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>+${payrollSummary.commissionEarned} USD</div>
                      <div style={{ fontSize: '10px', color: '#047857' }}>
                        {Number(payrollSummary.settledCommission || 0) > 0 ? (
                          <span style={{ fontWeight: 600 }}>(${payrollSummary.settledCommission} ya liquidados)</span>
                        ) : 'Pendientes de liquidar'}
                      </div>
                    </div>
                  )}

                  {((payrollSummary.compensationType === 'COMISION' || payrollSummary.compensationType === 'MIXTO') && Number(payrollSummary.pendingCommission || 0) > 0) && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>Comisión por Cobrar</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706' }}>+${payrollSummary.pendingCommission} USD</div>
                      <div style={{ fontSize: '10px', color: '#B45309' }}>Clientes aún no pagan</div>
                    </div>
                  )}

                  {(payrollSummary.compensationType === 'FIJO' || payrollSummary.compensationType === 'MIXTO') && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sueldo Base</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: includeBaseSalary ? '#0F172A' : '#94A3B8' }}>
                        +${payrollSummary.baseSalary} USD
                      </div>
                      <div style={{ fontSize: '10px', color: payrollSummary.baseSalaryAlreadySettled ? '#059669' : '#64748B', fontWeight: payrollSummary.baseSalaryAlreadySettled ? 700 : 500 }}>
                        {payrollSummary.baseSalaryAlreadySettled ? '✓ Ya liquidado previamente' : (payrollSummary.salaryPeriod || 'Período')}
                      </div>
                    </div>
                  )}

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Bruto a Liquidar</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>${payrollSummary.grossTotal} USD</div>
                  </div>

                  {payrollSummary.advancesDeduction > 0 && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>Vales Pendientes</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>-${payrollSummary.advancesDeduction} USD</div>
                    </div>
                  )}
                </div>

                {/* Toggle para Sueldo Base si aplica */}
                {(payrollSummary.compensationType === 'FIJO' || payrollSummary.compensationType === 'MIXTO') && (Number(payrollSummary.baseSalaryConfigured || 0) > 0 || Number(payrollSummary.salaryAmount || 0) > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    marginBottom: '10px',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        Incluir Sueldo Base (${payrollSummary.baseSalaryConfigured ?? payrollSummary.salaryAmount} USD)
                      </div>
                      <div style={{ fontSize: '10px', color: payrollSummary.baseSalaryAlreadySettled ? '#D97706' : '#64748B' }}>
                        {payrollSummary.baseSalaryAlreadySettled
                          ? '⚠️ El sueldo base ya fue cancelado en una liquidación previa para este período'
                          : 'Se sumará al cálculo de la nómina'}
                      </div>
                    </div>
                    <IonToggle
                      color="primary"
                      checked={includeBaseSalary}
                      onIonChange={e => handleToggleBaseSalary(e.detail.checked)}
                    />
                  </div>
                )}

                {/* Resultado Neto Sugerido */}
                <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>Neto a Pagar Calculado</div>
                    <div style={{ fontSize: '10px', color: '#047857' }}>
                      {deductAdvances ? 'Incluye deducción automática de vales' : 'Sin descontar vales'} (Solo ventas cobradas no liquidadas)
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#065F46' }}>
                    ${deductAdvances ? payrollSummary.netPayableUSD : payrollSummary.grossTotal} USD
                  </div>
                </div>

                {/* Botón para ver desglose de trabajos */}
                {payrollSummary.workItems && payrollSummary.workItems.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => setShowWorkDetails(!showWorkDetails)}
                      style={{ fontSize: '12px', textTransform: 'none', margin: 0, padding: 0 }}
                    >
                      {showWorkDetails ? '🔼 Ocultar lista de trabajos' : `🔽 Ver lista detallada de trabajos (${payrollSummary.workItems.length})`}
                    </IonButton>

                    {showWorkDetails && (
                      <div style={{ marginTop: '8px', maxHeight: '220px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px' }}>
                        {payrollSummary.workItems.map((item: any) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px',
                              padding: '8px 8px',
                              borderBottom: '1px solid #F1F5F9',
                              color: '#334155',
                              background: item.commissionPaid ? '#F8FAFC' : '#FFFFFF',
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{item.date}</strong>
                                <span>- {item.client} ({item.description})</span>
                              </div>
                              <div style={{ marginTop: '3px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {item.commissionPaid ? (
                                  <span style={{ background: '#ECFDF5', color: '#065F46', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, border: '1px solid #A7F3D0' }}>
                                    ✓ Ya liquidado
                                  </span>
                                ) : item.isPaid ? (
                                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, border: '1px solid #BFDBFE' }}>
                                    ⚡ Por liquidar
                                  </span>
                                ) : item.paymentStatus === 'PARTIAL' ? (
                                  <span style={{ background: '#FFFBEB', color: '#B45309', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                                    ⏳ Abono: ${Number(item.paidAmount || 0).toFixed(2)}
                                  </span>
                                ) : (
                                  <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                                    ⏳ Por cobrar
                                  </span>
                                )}
                                {(payrollSummary.compensationType === 'COMISION' || payrollSummary.compensationType === 'MIXTO') && (
                                  <span style={{ fontSize: '10px', color: item.commissionPaid ? '#64748B' : item.isPaid ? '#059669' : '#D97706', fontWeight: 600 }}>
                                    {item.commissionPaid
                                      ? `Comisión liquidada: $${Number(item.historicalCommission || 0).toFixed(2)}`
                                      : `Comisión: $${Number(item.commissionAmount || 0).toFixed(2)}`}
                                    {item.commissionableAmount !== undefined && Math.abs(Number(item.commissionableAmount) - Number(item.amount)) > 0.009 && (
                                      <span style={{ color: '#64748B', fontWeight: 500, marginLeft: '4px' }}>
                                        (s/ ganancia: ${Number(item.commissionableAmount).toFixed(2)})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>
                                ${Number(item.amount).toFixed(2)}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleWorkItemSettled(item)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: item.commissionPaid ? '#D97706' : '#2563EB',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  textDecoration: 'underline',
                                }}
                              >
                                {item.commissionPaid ? 'Desmarcar' : 'Marcar liquidado'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Toggle de Descuento de Vales */}
            {advancesTotalsByUser[selectedUserForPay.id]?.totalUSD > 0 && (
              <IonItem lines="none" style={{ marginTop: '4px', marginBottom: '12px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>
                <IonLabel color="danger" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Descontar vales pendientes (-${Number(advancesTotalsByUser[selectedUserForPay.id].totalUSD).toFixed(2)} USD)
                </IonLabel>
                <IonToggle
                  slot="end"
                  color="danger"
                  checked={deductAdvances}
                  onIonChange={e => handleToggleDeductAdvances(e.detail.checked)}
                />
              </IonItem>
            )}

            {/* Campos de Pago */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px' }}>
              <IonItem lines="none" style={{ marginBottom: '8px' }}>
                <IonLabel position="stacked" style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Monto a Transferir / Pagar (USD)
                </IonLabel>
                <IonInput
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={payAmount}
                  onIonInput={e => setPayAmount(e.detail.value!)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px', marginTop: '4px' }}
                />
              </IonItem>

              <IonItem lines="none" style={{ marginBottom: '8px' }}>
                <IonLabel position="stacked" style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Método de Pago
                </IonLabel>
                <IonSelect
                  interface="popover"
                  value={payMethod}
                  onIonChange={e => setPayMethod(e.detail.value)}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px', marginTop: '4px' }}
                >
                  <IonSelectOption value="CASH_USD">Efectivo USD</IonSelectOption>
                  <IonSelectOption value="PAGO_MOVIL">Pago Móvil</IonSelectOption>
                  <IonSelectOption value="TRANSFER_BS">Transferencia Bancaria Bs</IonSelectOption>
                </IonSelect>
              </IonItem>

              {(payMethod === 'PAGO_MOVIL' || payMethod === 'TRANSFER_BS') && (
                <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Transferir en Bolívares:</span>
                  <IonBadge color="primary" style={{ fontSize: '13px', padding: '6px 10px' }}>
                    Bs. {(Number(payAmount || 0) * (Number(settings?.exchangeRateBs) || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </IonBadge>
                </div>
              )}

              <IonItem lines="none">
                <IonLabel position="stacked" style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Fecha del Registro de Pago
                </IonLabel>
                <IonInput
                  type="date"
                  value={payDate}
                  onIonInput={e => setPayDate(e.detail.value!)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px 10px', marginTop: '4px' }}
                />
              </IonItem>

              <IonButton
                expand="block"
                color="success"
                className="ion-margin-top"
                onClick={handlePaySalary}
                style={{ '--border-radius': '10px', fontWeight: 800, height: '44px' }}
              >
                💵 Confirmar Pago y Liquidar Nómina
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      )}

      {/* Modal Registrar Vale / Anticipo */}
      <SalaryAdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onSuccess={() => fetchPendingAdvances()}
        employees={users}
        defaultExchangeRate={Number(settings?.exchangeRateBs) || undefined}
      />

      {/* Modal Detalle de Vales Pendientes del Empleado */}
      {selectedUserAdvancesModal && (
        <IonModal isOpen={!!selectedUserAdvancesModal} onDidDismiss={() => setSelectedUserAdvancesModal(null)}>
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' }}>
              <IonTitle style={{ color: '#0F172A', fontWeight: 700 }}>Vales Pendientes: {selectedUserAdvancesModal.username}</IonTitle>
              <IonButtons slot="end">
                <IonButton color="medium" onClick={() => setSelectedUserAdvancesModal(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
                Anticipos solicitados que deben descontarse en el próximo pago de nómina:
              </p>
            </div>

            {pendingAdvances.filter(a => a.userId === selectedUserAdvancesModal.id).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                No hay más vales pendientes para este empleado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingAdvances
                  .filter(a => a.userId === selectedUserAdvancesModal.id)
                  .map(adv => (
                    <div
                      key={adv.id}
                      style={{
                        background: '#FFF5F5',
                        border: '1px solid #FECACA',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#DC2626' }}>
                          ${Number(adv.amountUSD).toFixed(2)} USD
                          <span style={{ fontSize: '13px', color: '#475569', marginLeft: '6px', fontWeight: 600 }}>
                            (Bs. {Number(adv.amountBS).toFixed(2)})
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#1E293B', marginTop: '2px', fontWeight: 600 }}>
                          Motivo: {adv.reason || 'Sin motivo'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Fecha: {new Date(adv.date).toLocaleDateString()} (Tasa: Bs. {adv.exchangeRate})
                        </div>
                      </div>

                      <IonButton
                        size="small"
                        color="success"
                        onClick={() => handleDeductAdvance(adv.id)}
                      >
                        ✅ Descontar de Nómina
                      </IonButton>
                    </div>
                  ))}
              </div>
            )}
          </IonContent>
        </IonModal>
      )}

      {/* Modal Detalle de Entregas del Repartidor */}
      {selectedDriverDetails && (
        <IonModal isOpen={!!selectedDriverDetails} onDidDismiss={() => setSelectedDriverDetails(null)}>
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' }}>
              <IonTitle style={{ color: '#0F172A', fontWeight: 700 }}>Entregas: {selectedDriverDetails.username}</IonTitle>
              <IonButtons slot="end">
                <IonButton color="medium" onClick={() => setSelectedDriverDetails(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Total Acumulado en Fletes</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284C7' }}>
                ${selectedDriverDetails.totalFletesUSD.toFixed(2)} USD
                <span style={{ fontSize: '14px', color: '#475569', marginLeft: '8px', fontWeight: 600 }}>
                  (Bs. {selectedDriverDetails.totalFletesBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>

            {(!selectedDriverDetails.deliveries || selectedDriverDetails.deliveries.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                Sin órdenes completadas por este repartidor.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDriverDetails.deliveries.map((del: any) => (
                  <div
                    key={del.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '12px',
                      background: 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>Orden #{del.orderNumber}</span>
                      <strong style={{ color: '#0284C7' }}>+${del.deliveryFeeUSD.toFixed(2)} USD</strong>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                      Cliente: {del.customerName}
                    </div>
                    {del.customerAddress && (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        📍 {del.customerAddress} ({del.deliveryZone})
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {new Date(del.date).toLocaleDateString()} {formatTime12h(new Date(del.date))} • Total orden: ${del.totalAmount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </IonContent>
        </IonModal>
      )}
    </IonPage>
  );
};
export default Users;
