import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonSpinner,
  IonTextarea,
  IonToggle,
} from '@ionic/react';
import {
  refreshOutline,
  shieldCheckmarkOutline,
  businessOutline,
  cashOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  peopleOutline,
  createOutline,
  copyOutline,
  mailOutline,
  walletOutline,
  saveOutline,
  cardOutline,
  medalOutline,
  personAddOutline,
  keyOutline,
  lockClosedOutline,
  logoWhatsapp,
  calculatorOutline,
  trendingUpOutline,
  trendingDownOutline,
  receiptOutline,
  serverOutline,
  rocketOutline,
  personOutline,
  trashOutline,
  statsChartOutline,
  newspaperOutline,
  addOutline,
  sparklesOutline,
  buildOutline,
  eyeOutline,
  eyeOffOutline,
  calendarOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentMethod,
  PlatformExpenseType,
  PlatformExpenseCategory,
  type SaaSPaymentReportDTO,
  type SuperAdminTenantDTO,
  type UpdateTenantPlanDTO,
  type PlatformConfigDTO,
  type SuperAdminPromoterDTO,
  type CreatePromoterDTO,
  type PlatformExpenseDTO,
  type CreatePlatformExpenseDTO,
  type RecordSeniatTaxPaymentDTO,
  type SuperAdminFinanceMetricsDTO,
  type AppUpdateDTO,
  type AppUpdateItem,
  type AppUpdateChangeType,
  type CreateAppUpdateDTO,
} from '@finowork/shared-types';
import { BankSelect } from '../components/BankSelect';
import { PromoterPayoutCenter } from '../components/PromoterPayoutCenter';

const SuperAdminDashboard: React.FC = () => {
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'finances' | 'tenants' | 'payments' | 'promoters' | 'config' | 'support' | 'updates'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['finances', 'tenants', 'payments', 'promoters', 'config', 'support', 'updates'].includes(tab)) {
      return tab as any;
    }
    return 'finances';
  });
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<SuperAdminTenantDTO[]>([]);
  const [pendingPayments, setPendingPayments] = useState<SaaSPaymentReportDTO[]>([]);
  const [promoters, setPromoters] = useState<SuperAdminPromoterDTO[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // News & App Updates Management
  const [appUpdates, setAppUpdates] = useState<AppUpdateDTO[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<AppUpdateDTO | null>(null);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateIsPublished, setUpdateIsPublished] = useState(true);
  const [updateChanges, setUpdateChanges] = useState<AppUpdateItem[]>([]);
  const [newChangeType, setNewChangeType] = useState<AppUpdateChangeType>('ADDED');
  const [newChangeText, setNewChangeText] = useState('');
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);

  // SaaS Finances, IVA (SENIAT) & Expenses
  const [financeMetrics, setFinanceMetrics] = useState<SuperAdminFinanceMetricsDTO | null>(null);
  const [expenses, setExpenses] = useState<PlatformExpenseDTO[]>([]);
  const [expenseFilterType, setExpenseFilterType] = useState<'ALL' | PlatformExpenseType>('ALL');
  const [expenseSearch, setExpenseSearch] = useState<string>('');

  // Modal: Registrar Gasto / Inversión / Retiro del Dueño
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [newExpenseType, setNewExpenseType] = useState<PlatformExpenseType>(PlatformExpenseType.OPERATING);
  const [newExpenseCategory, setNewExpenseCategory] = useState<string>(PlatformExpenseCategory.SERVIDORES);
  const [newExpenseDescription, setNewExpenseDescription] = useState<string>('');
  const [newExpenseAmountUsd, setNewExpenseAmountUsd] = useState<string>('');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<string>('TRANSFERENCIA');
  const [newExpenseReference, setNewExpenseReference] = useState<string>('');
  const [newExpenseDate, setNewExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState<boolean>(false);

  // Modal: Declarar / Pagar IVA al SENIAT
  const [isSeniatModalOpen, setIsSeniatModalOpen] = useState<boolean>(false);
  const [seniatAmountUsd, setSeniatAmountUsd] = useState<string>('');
  const [seniatTaxPeriod, setSeniatTaxPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.toLocaleString('es-VE', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())} ${now.getFullYear()}`;
  });
  const [seniatReference, setSeniatReference] = useState<string>('');
  const [seniatPaymentMethod, setSeniatPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [seniatNotes, setSeniatNotes] = useState<string>('');
  const [isSavingSeniat, setIsSavingSeniat] = useState<boolean>(false);

  // Promoters filter & payout rate
  const [promoterFilter, setPromoterFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [selectedPromoterForPayout, setSelectedPromoterForPayout] = useState<SuperAdminPromoterDTO | null>(null);
  const [payoutRateType, setPayoutRateType] = useState<'BCV' | 'PARALLEL' | 'CUSTOM'>('BCV');
  const [customRateValue, setCustomRateValue] = useState<string>('');

  // New Promoter Modal
  const [isCreatePromoterOpen, setIsCreatePromoterOpen] = useState<boolean>(false);
  const [newPromoterUsername, setNewPromoterUsername] = useState<string>('');
  const [newPromoterEmail, setNewPromoterEmail] = useState<string>('');
  const [newPromoterPassword, setNewPromoterPassword] = useState<string>('');
  const [newPromoterCode, setNewPromoterCode] = useState<string>('');
  const [newPromoterPhone, setNewPromoterPhone] = useState<string>('');
  const [newPromoterPagoMovilPhone, setNewPromoterPagoMovilPhone] = useState<string>('');
  const [newPromoterPagoMovilCedula, setNewPromoterPagoMovilCedula] = useState<string>('');
  const [newPromoterPagoMovilBank, setNewPromoterPagoMovilBank] = useState<string>('');
  const [newPromoterBinancePayId, setNewPromoterBinancePayId] = useState<string>('');
  const [isCreatingPromoter, setIsCreatingPromoter] = useState<boolean>(false);

  // Platform accounts configuration
  const [platformConfig, setPlatformConfig] = useState<PlatformConfigDTO>({
    companyBank: '',
    companyCedula: '',
    companyPhone: '',
    companyAccountNumber: '',
    companyAccountHolder: '',
    binancePayId: '',
    binanceEmail: '',
    defaultMonthlyPrice: 20,
    defaultTrialDays: 15,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modal for modifying plan / extending days
  const [selectedTenant, setSelectedTenant] = useState<SuperAdminTenantDTO | null>(null);
  const [editPlanType, setEditPlanType] = useState<TenantPlanType>(TenantPlanType.REGULAR);
  const [editStatus, setEditStatus] = useState<TenantStatus>(TenantStatus.TRIAL);
  const [editBasePrice, setEditBasePrice] = useState<number>(20);
  const [extendDaysToAdd, setExtendDaysToAdd] = useState<number>(0);
  const [editReferredByTenantId, setEditReferredByTenantId] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Reject payment modal
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // SuperAdmin Profile & Security
  const [superAdminProfile, setSuperAdminProfile] = useState<{ username: string; email: string; name?: string }>({
    username: '',
    email: '',
    name: '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Platform Exchange Rates management
  const [platformRates, setPlatformRates] = useState<any>(null);
  const [isSyncingRates, setIsSyncingRates] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, paymentsRes, supportRes, configRes, promotersRes, profileRes, ratesRes, metricsRes, expensesRes, updatesRes] = await Promise.all([
        apiClient.get<SuperAdminTenantDTO[]>('/superadmin/tenants'),
        apiClient.get<SaaSPaymentReportDTO[]>('/superadmin/payments'),
        apiClient.get<any[]>('/feedback/platform'),
        apiClient.get<PlatformConfigDTO>('/superadmin/platform-config'),
        apiClient.get<SuperAdminPromoterDTO[]>('/superadmin/promoters').catch(() => ({ data: [] })),
        apiClient.get<any>('/superadmin/profile').catch(() => ({ data: null })),
        apiClient.get<any>('/superadmin/rates').catch(() => ({ data: null })),
        apiClient.get<SuperAdminFinanceMetricsDTO>('/superadmin/finances/metrics').catch(() => ({ data: null })),
        apiClient.get<PlatformExpenseDTO[]>('/superadmin/finances/expenses').catch(() => ({ data: [] })),
        apiClient.get<AppUpdateDTO[]>('/app-updates/all').catch(() => ({ data: [] })),
      ]);
      setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
      setPendingPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setSupportMessages(Array.isArray(supportRes.data) ? supportRes.data : []);
      setPromoters(Array.isArray(promotersRes.data) ? promotersRes.data : []);
      setAppUpdates(Array.isArray(updatesRes?.data) ? updatesRes.data : []);
      if (metricsRes?.data) {
        setFinanceMetrics(metricsRes.data);
      }
      setExpenses(Array.isArray(expensesRes?.data) ? expensesRes.data : []);
      if (ratesRes?.data) {
        setPlatformRates(ratesRes.data);
      }
      if (configRes.data) {
        setPlatformConfig(configRes.data);
      }
      if (profileRes?.data) {
        setSuperAdminProfile({
          username: profileRes.data.username || '',
          email: profileRes.data.email || '',
          name: profileRes.data.name || '',
        });
      }
    } catch (err: any) {
      presentToast({
        message: 'Error al cargar datos del SuperAdmin: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRates = async () => {
    setIsSyncingRates(true);
    try {
      const res = await apiClient.post('/superadmin/sync-rates');
      if (res.data) {
        setPlatformRates((prev: any) => ({
          ...prev,
          availableRates: res.data,
          ratesCache: res.data,
          exchangeRateBs: res.data.bcv,
        }));
        presentToast({
          message: `¡Tasas de mercado sincronizadas con éxito! BCV: Bs. ${Number(res.data.bcv).toFixed(2)} | Paralelo: Bs. ${Number(res.data.parallel).toFixed(2)}`,
          duration: 4000,
          color: 'success',
          icon: checkmarkCircleOutline,
        });
      }
    } catch (e: any) {
      presentToast({
        message: 'Error al sincronizar tasas: ' + (e.response?.data?.message || e.message),
        duration: 4000,
        color: 'danger',
      });
    } finally {
      setIsSyncingRates(false);
    }
  };

  const handleCreatePromoter = async () => {
    if (!newPromoterUsername.trim()) {
      presentToast({ message: 'Ingresa un nombre de usuario para el promotor', duration: 2500, color: 'warning' });
      return;
    }
    if (!newPromoterEmail.trim()) {
      presentToast({ message: 'Ingresa el correo electrónico del promotor', duration: 2500, color: 'warning' });
      return;
    }

    try {
      setIsCreatingPromoter(true);
      const payload: CreatePromoterDTO = {
        username: newPromoterUsername.trim(),
        email: newPromoterEmail.trim(),
        password: newPromoterPassword.trim() || undefined,
        code: newPromoterCode.trim() || undefined,
        phone: newPromoterPhone.trim() || undefined,
        pagoMovilPhone: newPromoterPagoMovilPhone.trim() || undefined,
        pagoMovilCedula: newPromoterPagoMovilCedula.trim() || undefined,
        pagoMovilBank: newPromoterPagoMovilBank.trim() || undefined,
        binancePayId: newPromoterBinancePayId.trim() || undefined,
      };

      const res = await apiClient.post<SuperAdminPromoterDTO>('/superadmin/promoters', payload);

      presentToast({
        message: `¡Promotor "${res.data.username}" registrado con código ${res.data.code}!`,
        duration: 3500,
        color: 'success',
      });

      // Limpiar formulario y cerrar modal
      setNewPromoterUsername('');
      setNewPromoterEmail('');
      setNewPromoterPassword('');
      setNewPromoterCode('');
      setNewPromoterPhone('');
      setNewPromoterPagoMovilPhone('');
      setNewPromoterPagoMovilCedula('');
      setNewPromoterPagoMovilBank('');
      setNewPromoterBinancePayId('');
      setIsCreatePromoterOpen(false);

      await loadData();
    } catch (err: any) {
      presentToast({
        message: 'Error al crear promotor: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsCreatingPromoter(false);
    }
  };

  const handleSavePlatformConfig = async () => {
    try {
      setIsSavingConfig(true);
      const { id, updatedAt, ...cleanConfig } = platformConfig as any;
      await apiClient.put('/superadmin/platform-config', cleanConfig);
      presentToast({
        message: 'Cuentas de cobro SaaS actualizadas con éxito.',
        duration: 2500,
        color: 'success',
      });
    } catch (err: any) {
      presentToast({
        message: 'Error al guardar cuentas: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpdateSuperAdminProfile = async () => {
    if (!superAdminProfile.email || !superAdminProfile.username) {
      presentToast({ message: 'El correo y usuario son requeridos', duration: 3000, color: 'warning' });
      return;
    }
    if (newPassword) {
      if (newPassword.length < 6) {
        presentToast({ message: 'La nueva contraseña debe tener al menos 6 caracteres', duration: 3000, color: 'warning' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        presentToast({ message: 'Las contraseñas nuevas no coinciden', duration: 3000, color: 'warning' });
        return;
      }
      if (!currentPassword) {
        presentToast({ message: 'Debes ingresar tu contraseña actual para confirmar el cambio', duration: 3000, color: 'warning' });
        return;
      }
    }

    try {
      setIsUpdatingProfile(true);
      const res = await apiClient.patch('/superadmin/profile', {
        username: superAdminProfile.username,
        email: superAdminProfile.email,
        name: superAdminProfile.name,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      presentToast({
        message: res.data?.message || 'Credenciales de SuperAdmin actualizadas con éxito.',
        duration: 3500,
        color: 'success',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      presentToast({
        message: 'Error al actualizar credenciales: ' + (err.response?.data?.message || err.message),
        duration: 4000,
        color: 'danger',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['finances', 'tenants', 'payments', 'promoters', 'config', 'support', 'updates'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    loadData();
  }, [location.search]);

  // App Updates Handlers
  const fetchUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const res = await apiClient.get('/app-updates/all');
      setAppUpdates(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      presentToast({
        message: 'Error al cargar actualizaciones: ' + (err.response?.data?.message || err.message),
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setLoadingUpdates(false);
    }
  };

  const openCreateUpdateModal = () => {
    setEditingUpdate(null);
    setUpdateTitle('');
    setUpdateVersion('');
    setUpdateSummary('');
    setUpdateIsPublished(true);
    setUpdateChanges([]);
    setNewChangeType('ADDED');
    setNewChangeText('');
    setIsUpdateModalOpen(true);
  };

  const openEditUpdateModal = (u: AppUpdateDTO) => {
    setEditingUpdate(u);
    setUpdateTitle(u.title || '');
    setUpdateVersion(u.version || '');
    setUpdateSummary(u.summary || '');
    setUpdateIsPublished(u.isPublished);
    setUpdateChanges(Array.isArray(u.changes) ? [...u.changes] : []);
    setNewChangeType('ADDED');
    setNewChangeText('');
    setIsUpdateModalOpen(true);
  };

  const handleAddChange = () => {
    if (!newChangeText.trim()) return;
    setUpdateChanges((prev) => [...prev, { type: newChangeType, text: newChangeText.trim() }]);
    setNewChangeText('');
  };

  const handleRemoveChange = (index: number) => {
    setUpdateChanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveUpdate = async () => {
    if (!updateTitle.trim()) {
      presentToast({ message: 'El título de la actualización es obligatorio.', duration: 2500, color: 'warning' });
      return;
    }
    try {
      setIsSavingUpdate(true);
      const payload: CreateAppUpdateDTO = {
        title: updateTitle.trim(),
        version: updateVersion.trim() || undefined,
        summary: updateSummary.trim() || undefined,
        isPublished: updateIsPublished,
        changes: updateChanges,
      };

      if (editingUpdate) {
        await apiClient.put(`/app-updates/${editingUpdate.id}`, payload);
        presentToast({ message: 'Actualización editada exitosamente.', duration: 2500, color: 'success' });
      } else {
        await apiClient.post('/app-updates', payload);
        presentToast({ message: 'Actualización creada exitosamente.', duration: 2500, color: 'success' });
      }
      setIsUpdateModalOpen(false);
      fetchUpdates();
    } catch (err: any) {
      presentToast({
        message: 'Error al guardar actualización: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const handleTogglePublish = async (u: AppUpdateDTO) => {
    try {
      const newStatus = !u.isPublished;
      await apiClient.put(`/app-updates/${u.id}`, { isPublished: newStatus });
      presentToast({
        message: newStatus ? 'Actualización publicada a los clientes.' : 'Actualización marcada como borrador.',
        duration: 2500,
        color: 'success',
      });
      fetchUpdates();
    } catch (err: any) {
      presentToast({
        message: 'Error al cambiar estado: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    }
  };

  const handleDeleteUpdate = (u: AppUpdateDTO) => {
    presentAlert({
      header: 'Eliminar Actualización',
      message: `¿Estás seguro de que deseas eliminar "${u.title}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/app-updates/${u.id}`);
              presentToast({ message: 'Actualización eliminada.', duration: 2500, color: 'success' });
              fetchUpdates();
            } catch (err: any) {
              presentToast({
                message: 'Error al eliminar: ' + (err.response?.data?.message || err.message),
                duration: 3500,
                color: 'danger',
              });
            }
          },
        },
      ],
    });
  };

  const openEditModal = (t: SuperAdminTenantDTO) => {
    setSelectedTenant(t);
    setEditPlanType(t.planType);
    setEditStatus(
      (t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) <= 0)
        ? TenantStatus.PAST_DUE
        : t.status
    );
    setEditBasePrice(t.basePrice);
    setExtendDaysToAdd(0);
    setEditReferredByTenantId(t.referredByTenantId || null);
  };

  const handleSavePlan = async () => {
    if (!selectedTenant) return;
    try {
      setIsSavingPlan(true);
      const payload: UpdateTenantPlanDTO = {
        planType: editPlanType,
        status: editStatus,
        basePrice: Number(editBasePrice) || 20,
        extendDays: Number(extendDaysToAdd) || undefined,
        referredByTenantId: editReferredByTenantId,
      };

      await apiClient.patch(`/superadmin/tenants/${selectedTenant.id}/plan`, payload);

      presentToast({
        message: `Configuración actualizada para "${selectedTenant.name}".`,
        duration: 2500,
        color: 'success',
      });

      setSelectedTenant(null);
      loadData();
    } catch (err: any) {
      presentToast({
        message: 'Error al actualizar el plan: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeleteTenant = (t: SuperAdminTenantDTO) => {
    presentAlert({
      header: '¿Eliminar Negocio?',
      subHeader: t.name,
      message: `¿Estás seguro de que deseas eliminar permanentemente el negocio "${t.name}"? Esta acción borrará inmediatamente todas sus ventas, productos, reservas, clientes y accesos asociados sin necesidad de su contraseña.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Eliminar Definitivamente',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/superadmin/tenants/${t.id}`);
              presentToast({
                message: `Negocio "${t.name}" eliminado definitivamente.`,
                duration: 3000,
                color: 'success',
              });
              if (selectedTenant?.id === t.id) {
                setSelectedTenant(null);
              }
              loadData();
            } catch (err: any) {
              const errorMsg = Array.isArray(err?.response?.data?.message)
                ? err.response.data.message.join(', ')
                : (err?.response?.data?.message || err?.message || 'Error al eliminar el negocio.');
              presentToast({
                message: errorMsg,
                duration: 4000,
                color: 'danger',
              });
            }
          },
        },
      ],
    });
  };

  const handleApprovePayment = async (payment: SaaSPaymentReportDTO) => {
    const months = payment.months || 1;
    const days = months === 12 ? 365 : months * 30;
    const periodLabel = months === 12 ? 'Anual (1 Año)' : `${months} Mes${months > 1 ? 'es' : ''}`;

    presentAlert({
      header: `Aprobar Pago • ${periodLabel}`,
      subHeader: `${payment.tenantName || 'Negocio'} - $${payment.amount.toFixed(2)} USD`,
      message: `¿Confirmas que recibiste el pago (Ref: ${payment.reference})? Se extenderán +${days} días a su suscripción y su negocio quedará ACTIVO.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: `Aprobar (+${days} días)`,
          handler: async () => {
            try {
              const res = await apiClient.post(`/superadmin/payments/${payment.id}/approve`);
              presentToast({
                message: res.data.message || `Pago aprobado y suscripción extendida ${days} días.`,
                duration: 3500,
                color: 'success',
              });
              loadData();
            } catch (err: any) {
              presentToast({
                message: 'Error al aprobar pago: ' + (err.response?.data?.message || err.message),
                duration: 3500,
                color: 'danger',
              });
            }
          },
        },
      ],
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectPaymentId) return;
    try {
      await apiClient.post(`/superadmin/payments/${rejectPaymentId}/reject`, {
        reason: rejectReason.trim() || 'Comprobante no válido o pago no recibido',
      });
      presentToast({
        message: 'Reporte de pago rechazado con éxito.',
        duration: 3000,
        color: 'warning',
      });
      setRejectPaymentId(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      presentToast({
        message: 'Error al rechazar pago: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    presentToast({ message: 'Referencia copiada al portapapeles', duration: 1500, color: 'dark' });
  };

  // KPIs
  const safeTenants = Array.isArray(tenants) ? tenants : [];
  const safePendingPayments = Array.isArray(pendingPayments) ? pendingPayments : [];
  const safePromoters = Array.isArray(promoters) ? promoters : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const bcvRate = Number(platformRates?.ratesCache?.bcv || platformRates?.exchangeRateBs || 40);
  const parallelRate = Number(platformRates?.ratesCache?.parallel || platformRates?.ratesCache?.bcv || 40);
  const effectiveRate =
    payoutRateType === 'PARALLEL'
      ? parallelRate
      : payoutRateType === 'CUSTOM' && parseFloat(customRateValue) > 0
      ? parseFloat(customRateValue)
      : bcvRate;

  const totalPromoterPendingUSD = safePromoters.reduce((s, p) => s + (p.pendingBalanceUSD || 0), 0);
  const totalPromoterPaidUSD = safePromoters.reduce((s, p) => s + (p.paidBalanceUSD || 0), 0);
  const promotersWithPendingCount = safePromoters.filter((p) => (p.pendingBalanceUSD || 0) > 0).length;
  const totalPromoterAffiliatedTenants = safePromoters.reduce((s, p) => s + (p.totalAffiliatedTenants || 0), 0);
  const totalPromoterPendingBs = totalPromoterPendingUSD * effectiveRate;

  const handleOpenExpenseModal = (type: PlatformExpenseType, category: string) => {
    setNewExpenseType(type);
    setNewExpenseCategory(category);
    setNewExpenseDescription('');
    setNewExpenseAmountUsd('');
    setNewExpenseReference('');
    setNewExpenseDate(new Date().toISOString().split('T')[0]);
    setIsExpenseModalOpen(true);
  };

  const handleCreateExpense = async () => {
    const amt = parseFloat(newExpenseAmountUsd);
    if (!amt || amt <= 0) {
      presentToast({ message: 'Ingresa un monto en USD mayor a 0', duration: 2500, color: 'warning' });
      return;
    }
    if (!newExpenseDescription.trim()) {
      presentToast({ message: 'Ingresa una descripción o concepto para esta salida', duration: 2500, color: 'warning' });
      return;
    }

    try {
      setIsSavingExpense(true);
      const payload: CreatePlatformExpenseDTO = {
        type: newExpenseType,
        category: newExpenseCategory || PlatformExpenseCategory.OTRO,
        description: newExpenseDescription.trim(),
        amount: amt,
        amountBs: Math.round(amt * bcvRate * 100) / 100,
        exchangeRate: bcvRate,
        paymentMethod: newExpensePaymentMethod,
        reference: newExpenseReference.trim() || undefined,
        expenseDate: newExpenseDate || undefined,
      };
      await apiClient.post('/superadmin/finances/expenses', payload);
      presentToast({
        message: '¡Salida operativa registrada en tu flujo de caja!',
        duration: 3000,
        color: 'success',
        icon: checkmarkCircleOutline,
      });
      setIsExpenseModalOpen(false);
      await loadData();
    } catch (e: any) {
      presentToast({
        message: 'Error al registrar salida: ' + (e.response?.data?.message || e.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleOpenSeniatModal = () => {
    const pendingIva = financeMetrics?.pendingIVASeniatUSD || 0;
    setSeniatAmountUsd(pendingIva > 0 ? pendingIva.toFixed(2) : '');
    setSeniatReference('');
    setSeniatNotes('');
    setIsSeniatModalOpen(true);
  };

  const handleRecordSeniatPayment = async () => {
    const amt = parseFloat(seniatAmountUsd);
    if (!amt || amt <= 0) {
      presentToast({ message: 'Ingresa el monto de IVA a declarar mayor a 0', duration: 2500, color: 'warning' });
      return;
    }
    if (!seniatTaxPeriod.trim()) {
      presentToast({ message: 'Indica el periodo fiscal (ej. Octubre 2026)', duration: 2500, color: 'warning' });
      return;
    }
    if (!seniatReference.trim()) {
      presentToast({ message: 'Ingresa el número de planilla o referencia de pago al SENIAT', duration: 2500, color: 'warning' });
      return;
    }

    try {
      setIsSavingSeniat(true);
      const payload: RecordSeniatTaxPaymentDTO = {
        amount: amt,
        amountBs: Math.round(amt * bcvRate * 100) / 100,
        exchangeRate: bcvRate,
        taxPeriod: seniatTaxPeriod.trim(),
        reference: seniatReference.trim(),
        paymentMethod: seniatPaymentMethod,
        notes: seniatNotes.trim() || undefined,
      };
      await apiClient.post('/superadmin/finances/seniat', payload);
      presentToast({
        message: `¡Declaración de IVA ($${amt.toFixed(2)} USD) al SENIAT registrada y descontada de tu saldo pendiente!`,
        duration: 4000,
        color: 'success',
        icon: checkmarkCircleOutline,
      });
      setIsSeniatModalOpen(false);
      await loadData();
    } catch (e: any) {
      presentToast({
        message: 'Error al registrar pago SENIAT: ' + (e.response?.data?.message || e.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingSeniat(false);
    }
  };

  const handleDeleteExpense = (expense: PlatformExpenseDTO) => {
    presentAlert({
      header: 'Anular Registro de Salida',
      subHeader: `${expense.description} ($${expense.amount.toFixed(2)} USD)`,
      message: '¿Estás seguro de eliminar este movimiento del historial financiero? Se recalculará tu caja disponible.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/superadmin/finances/expenses/${expense.id}`);
              presentToast({ message: 'Movimiento eliminado correctamente', duration: 2500, color: 'medium' });
              await loadData();
            } catch (e: any) {
              presentToast({
                message: 'Error al eliminar: ' + (e.response?.data?.message || e.message),
                duration: 3000,
                color: 'danger',
              });
            }
          },
        },
      ],
    });
  };

  const filteredExpenses = safeExpenses.filter((e) => {
    if (expenseFilterType !== 'ALL' && e.type !== expenseFilterType) return false;
    const q = expenseSearch.toLowerCase().trim();
    if (!q) return true;
    return [e.description, e.category, e.reference, e.taxPeriod, e.promoterName].some(
      (v) => v && v.toLowerCase().includes(q),
    );
  });

  const seniatHistory = safeExpenses.filter((e) => e.type === PlatformExpenseType.TAX_SENIAT);

  const filteredPromoters = safePromoters.filter((p) => {
    if (promoterFilter === 'PENDING' && (p.pendingBalanceUSD || 0) <= 0) return false;
    if (promoterFilter === 'PAID' && (p.pendingBalanceUSD || 0) > 0) return false;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return [p.code, p.username, p.email, p.phone, p.pagoMovilCedula, p.pagoMovilBank].some(
      (v) => v && v.toLowerCase().includes(q),
    );
  });

  const totalTenants = safeTenants.length;
  const activeTenants = safeTenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
  const trialTenants = safeTenants.filter((t) => t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) > 0).length;
  const pendingCount = safePendingPayments.length;
  const estimatedRevenue = safeTenants
    .filter((t) => t.status === TenantStatus.ACTIVE || (t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) > 0))
    .reduce((sum, t) => sum + (t.finalFee || 0), 0);

  // Filtered tenants
  const filteredTenants = safeTenants.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(q)) ||
      (t.owner?.email && t.owner.email.toLowerCase().includes(q)) ||
      (t.planType && t.planType.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    );
  });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #e2e8f0' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonMenuButton style={{ color: '#0f172a' }} />
          </IonButtons>
          <IonTitle>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #d1fae5',
                }}
              >
                <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '18px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                  SuperAdmin
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                  Plataforma SaaS FinoWork
                </span>
              </div>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="outline"
              onClick={handleSyncRates}
              disabled={isSyncingRates}
              title="Sincronizar Tasas de Mercado en Vivo"
              style={{
                '--color': '#0284c7',
                '--border-color': '#bae6fd',
                fontWeight: 700,
                fontSize: '12px',
                marginRight: '8px',
                height: '32px',
              } as React.CSSProperties}
            >
              <IonIcon icon={refreshOutline} slot="start" />
              {isSyncingRates ? 'Sincronizando Tasas...' : 'Sincronizar Tasas'}
            </IonButton>
            <IonButton onClick={loadData} disabled={loading} title="Actualizar datos" style={{ color: '#64748b' }}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f8fafc' }}>
        {/* KPI Cards Header */}
        <IonGrid style={{ padding: 0, marginBottom: '16px' }}>
          <IonRow>
            {/* Total Negocios */}
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Negocios
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={businessOutline} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>
                  {totalTenants}
                </div>
              </div>
            </IonCol>

            {/* Negocios Activos */}
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Negocios Activos
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>
                  {activeTenants}
                </div>
              </div>
            </IonCol>

            {/* En Periodo de Prueba */}
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    En Periodo Prueba
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={timeOutline} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#f59e0b' }}>
                  {trialTenants}
                </div>
              </div>
            </IonCol>

            {/* Pagos Pendientes */}
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <div
                style={{
                  background: pendingCount > 0 ? '#fffdfd' : '#ffffff',
                  borderRadius: '14px',
                  border: pendingCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pagos Pendientes
                    </span>
                    {pendingCount > 0 && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={cashOutline} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: pendingCount > 0 ? '#ef4444' : '#0f172a' }}>
                  {pendingCount}
                </div>
              </div>
            </IonCol>

            {/* Facturación Estimada */}
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Facturación Estimada
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={walletOutline} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#8b5cf6' }}>
                  ${estimatedRevenue.toFixed(2)}
                </div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Tab Switcher con scroll horizontal suave sin truncamiento */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '6px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as any)} scrollable={true}>
            <IonSegmentButton value="finances">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={statsChartOutline} />
                Mi Negocio & Finanzas
                {(financeMetrics?.pendingIVASeniatUSD || 0) > 0 && (
                  <IonBadge color="tertiary" style={{ fontSize: '10px', marginLeft: '4px' }}>
                    IVA
                  </IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="tenants">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={businessOutline} />
                Negocios ({totalTenants})
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="payments">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={cashOutline} />
                Aprobación de Pagos
                {pendingCount > 0 && (
                  <IonBadge color="danger" style={{ fontSize: '11px', marginLeft: '4px' }}>
                    {pendingCount}
                  </IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="promoters">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={medalOutline} />
                Promotores ({promoters.length})
                {promotersWithPendingCount > 0 && (
                  <IonBadge color="warning" style={{ fontSize: '11px', marginLeft: '4px' }}>{promotersWithPendingCount} con saldo</IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="config">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={walletOutline} />
                Cuentas de Cobro
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="support">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={mailOutline} />
                Soporte
                {supportMessages.length > 0 && (
                  <IonBadge color="primary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                    {supportMessages.length}
                  </IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="updates">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={newspaperOutline} />
                Actualizaciones ({appUpdates.length})
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* TAB 0: MI NEGOCIO & FINANZAS SAAS (CONTROL DE CAJA, IVA SENIAT, PROMOTORES, SERVIDORES Y RETIROS) */}
        {activeTab === 'finances' && (
          <div style={{ paddingBottom: '40px' }}>
            {/* Banner y Acciones Rápidas del Dueño */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: '#ffffff',
                marginBottom: '18px',
                boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Dirección Financiera FinoWork
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    Tasa BCV: Bs. {bcvRate.toFixed(2)}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                  Control Financiero de Mi Negocio (SaaS)
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.4 }}>
                  Administra tus ingresos reales, el IVA retenido para el SENIAT, la deuda viva con tus promotores, pagos de servidores, reinversión y tus retiros de utilidad.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenExpenseModal(PlatformExpenseType.OPERATING, PlatformExpenseCategory.SERVIDORES)}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <IonIcon icon={serverOutline} style={{ fontSize: '16px' }} />
                  + Gasto Operativo (Servidores)
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExpenseModal(PlatformExpenseType.INVESTMENT, PlatformExpenseCategory.PUBLICIDAD_MARKETING)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  <IonIcon icon={rocketOutline} style={{ fontSize: '16px' }} />
                  + Inversión / Reinversión
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExpenseModal(PlatformExpenseType.OWNER_PAYOUT, PlatformExpenseCategory.RETIRO_DUEÑO)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <IonIcon icon={personOutline} style={{ fontSize: '16px' }} />
                  + Pagarme a Mí (Retiro)
                </button>

                <button
                  type="button"
                  onClick={handleOpenSeniatModal}
                  style={{
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <IonIcon icon={receiptOutline} style={{ fontSize: '16px' }} />
                  Declarar / Pagar IVA al SENIAT
                </button>
              </div>
            </div>

            {/* Tarjetas Financieras Principales (Grid Auto-fit) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))',
                gap: '14px',
                marginBottom: '22px',
              }}
            >
              {/* 1. Ingresos Brutos Cobrados */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Ingresos Brutos (Con IVA)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={trendingUpOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>
                  ${(financeMetrics?.grossRevenueUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>USD</span>
                </div>
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                  ≈ Bs. {((financeMetrics?.grossRevenueUSD || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  Total ingresado por pagos de suscripciones aprobados.
                </div>
              </div>

              {/* 2. Ingresos Netos del Negocio (Sin IVA) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Ingreso Neto (Sin IVA)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={cashOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#16a34a' }}>
                  ${(financeMetrics?.netRevenueUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>USD</span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginTop: '4px' }}>
                  Base imponible libre de impuesto IVA (16%).
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  Utilidad Operativa: <strong style={{ color: '#0f172a' }}>${(financeMetrics?.netOperatingProfitUSD || 0).toFixed(2)} USD</strong>
                </div>
              </div>

              {/* 3. IVA Recaudado & Pendiente SENIAT */}
              <div
                style={{
                  background: (financeMetrics?.pendingIVASeniatUSD || 0) > 0 ? '#eef2ff' : '#ffffff',
                  borderRadius: '14px',
                  border: (financeMetrics?.pendingIVASeniatUSD || 0) > 0 ? '1.5px solid #818cf8' : '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>
                    IVA Por Pagar al SENIAT (16%)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={receiptOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#3730a3' }}>
                  ${(financeMetrics?.pendingIVASeniatUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700 }}>USD</span>
                </div>
                <div style={{ fontSize: '12px', color: '#4338ca', fontWeight: 700, marginTop: '2px' }}>
                  ≈ Bs. {((financeMetrics?.pendingIVASeniatUSD || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                  <span>IVA Cobrado: <strong>${(financeMetrics?.totalIVACollectedUSD || 0).toFixed(2)}</strong></span>
                  <span>Ya Pagado: <strong>${(financeMetrics?.totalIVAPaidSeniatUSD || 0).toFixed(2)}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSeniatModal}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Marcar "Ya lo pagué al SENIAT"
                </button>
              </div>

              {/* 4. Dinero que le debo a Promotores */}
              <div
                style={{
                  background: (financeMetrics?.totalPromotersDebtUSD || totalPromoterPendingUSD) > 0 ? '#fffbeb' : '#ffffff',
                  borderRadius: '14px',
                  border: (financeMetrics?.totalPromotersDebtUSD || totalPromoterPendingUSD) > 0 ? '1.5px solid #fcd34d' : '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                    Deuda a Promotores
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={medalOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#b45309' }}>
                  ${(financeMetrics?.totalPromotersDebtUSD ?? totalPromoterPendingUSD).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700 }}>USD</span>
                </div>
                <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                  ≈ Bs. {((financeMetrics?.totalPromotersDebtUSD ?? totalPromoterPendingUSD) * effectiveRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                  Ya pagado y descontado: <strong style={{ color: '#059669' }}>${(financeMetrics?.totalPromotersPaidUSD ?? totalPromoterPaidUSD).toFixed(2)} USD</strong>
                </div>
              </div>

              {/* 5. Gastos Operativos (Servidores / OPEX) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>
                    Gastos Operativos (OPEX)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={serverOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#e11d48' }}>
                  ${(financeMetrics?.totalOperatingExpensesUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>USD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Servidores (Supabase, Vercel, VPS), dominios, APIs y costos fijos.
                </div>
              </div>

              {/* 6. Inversión y Reinversión (CAPEX) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                    Inversión y Reinversión
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={rocketOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0284c7' }}>
                  ${(financeMetrics?.totalInvestmentUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>USD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Publicidad (Ads), equipamiento, marketing y crecimiento.
                </div>
              </div>

              {/* 7. Pagos a Mí (Retiros del Dueño) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase' }}>
                    Mis Retiros (Pago al Dueño)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={personOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#7c3aed' }}>
                  ${(financeMetrics?.totalOwnerPayoutsUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>USD</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Dinero retirado por ti como utilidad o salario de fundador.
                </div>
              </div>

              {/* 8. Caja Real Disponible */}
              <div
                style={{
                  background: (financeMetrics?.availableCashUSD || 0) >= 0 ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '14px',
                  border: (financeMetrics?.availableCashUSD || 0) >= 0 ? '2px solid #10b981' : '2px solid #ef4444',
                  padding: '16px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: (financeMetrics?.availableCashUSD || 0) >= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase' }}>
                    Saldo Disponible en Caja
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffffff', color: (financeMetrics?.availableCashUSD || 0) >= 0 ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={walletOutline} style={{ fontSize: '18px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: (financeMetrics?.availableCashUSD || 0) >= 0 ? '#065f46' : '#991b1b' }}>
                  ${(financeMetrics?.availableCashUSD || 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 700 }}>USD</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: (financeMetrics?.availableCashUSD || 0) >= 0 ? '#047857' : '#b91c1c', marginTop: '2px' }}>
                  ≈ Bs. {((financeMetrics?.availableCashUSD || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                  Ingresos Brutos menos todas las salidas registradas (${(financeMetrics?.totalExpensesUSD || 0).toFixed(2)}).
                </div>
              </div>
            </div>

            {/* SECCIÓN A: DESGLOSE AUTOMÁTICO DE DINERO QUE DEBO A MIS PROMOTORES */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                marginBottom: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🤝 Desglose Automático: ¿Cuánto le debo a mis Promotores?
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Cada vez que apruebas el pago de un negocio referido por un promotor, se suma aquí su comisión. Al pagarle, se descuenta automáticamente de tu deuda y se registra la salida.
                  </p>
                </div>
                <IonButton
                  size="small"
                  fill="outline"
                  onClick={() => setActiveTab('promoters')}
                  style={{ fontWeight: 700, fontSize: '12px' }}
                >
                  Ver Todos los Promotores ({safePromoters.length})
                </IonButton>
              </div>

              {safePromoters.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                  Aún no tienes promotores registrados.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {safePromoters.map((p) => {
                    const hasDebt = (p.pendingBalanceUSD || 0) > 0;
                    return (
                      <div
                        key={p.id}
                        style={{
                          border: hasDebt ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                          background: hasDebt ? '#fffbeb' : '#f8fafc',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{p.username}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                Código: <span style={{ color: '#0284c7', fontWeight: 800 }}>{p.code}</span> • {p.activeClientsCount} clientes activos ({p.commissionPercentage}%)
                              </div>
                            </div>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: hasDebt ? '#fef3c7' : '#dcfce7',
                                color: hasDebt ? '#b45309' : '#15803d',
                              }}
                            >
                              {hasDebt ? 'SALDO PENDIENTE' : 'AL DÍA ($0 DEUDA)'}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr',
                              gap: '8px',
                              marginTop: '12px',
                              background: '#ffffff',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Generado</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                ${(p.totalCommissionsUSD || 0).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>Ya Pagado</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                                -${(p.paidBalanceUSD || 0).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: hasDebt ? '#d97706' : '#64748b', fontWeight: 800 }}>Le Debo Hoy</div>
                              <div style={{ fontSize: '14px', fontWeight: 900, color: hasDebt ? '#d97706' : '#64748b' }}>
                                ${(p.pendingBalanceUSD || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {hasDebt && (
                            <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, marginTop: '6px' }}>
                              Equivalente a pagar: Bs. {((p.pendingBalanceUSD || 0) * effectiveRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {p.pagoMovilBank ? ` • PM: ${p.pagoMovilBank} (${p.pagoMovilPhone || ''})` : ''}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPromoterForPayout(p)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: hasDebt ? 'none' : '1px solid #cbd5e1',
                            background: hasDebt ? '#f59e0b' : '#ffffff',
                            color: hasDebt ? '#ffffff' : '#334155',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {hasDebt ? `💸 Pagar y Descontar ($${p.pendingBalanceUSD.toFixed(2)})` : 'Ver Historial de Pagos'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN B: CONTROL DE IVA Y DECLARACIONES AL SENIAT */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                marginBottom: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏛️ Control de Impuestos (IVA 16% SENIAT)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Del total cobrado en suscripciones, el sistema separa automáticamente el 16% de IVA para que sepas cuánto retener y puedas marcar cuando ya lo pagaste al SENIAT.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSeniatModal}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '16px' }} />
                  Registrar Pago al SENIAT
                </button>
              </div>

              {seniatHistory.length === 0 ? (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                  No has registrado declaraciones o pagos al SENIAT todavía. Cuando declares el IVA, presiona <strong>"Registrar Pago al SENIAT"</strong> para descontarlo del saldo pendiente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {seniatHistory.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#312e81' }}>
                          ✓ {item.description}
                        </div>
                        <div style={{ fontSize: '11px', color: '#4338ca', marginTop: '2px' }}>
                          Periodo: <strong>{item.taxPeriod || 'General'}</strong> • Comprobante/Ref: <strong>{item.reference || 'N/A'}</strong> • Fecha: {new Date(item.expenseDate).toLocaleDateString('es-VE')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: '14px', color: '#3730a3' }}>
                            -${item.amount.toFixed(2)} USD
                          </div>
                          {item.amountBs && (
                            <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 600 }}>
                              Bs. {item.amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item)}
                          title="Anular declaración"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <IonIcon icon={trashOutline} style={{ fontSize: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN C: HISTORIAL COMPLETO DE SALIDAS OPERATIVAS, INVERSIONES Y RETIROS */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    📒 Libro de Salidas Operativas, Inversiones y Retiros
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Registro detallado de cada salida de dinero de tu negocio (servidores, publicidad, pagos al SENIAT, comisiones y pagos a ti mismo).
                  </p>
                </div>

                {/* Filtros por tipo */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { key: 'ALL', label: 'Todos' },
                    { key: PlatformExpenseType.OPERATING, label: '🖥️ Servidores / OPEX' },
                    { key: PlatformExpenseType.INVESTMENT, label: '🚀 Inversión' },
                    { key: PlatformExpenseType.OWNER_PAYOUT, label: '👤 Pagos a Mí' },
                    { key: PlatformExpenseType.TAX_SENIAT, label: '🏛️ SENIAT IVA' },
                    { key: PlatformExpenseType.PROMOTER_PAYOUT, label: '🤝 Promotores' },
                  ].map((tab) => {
                    const active = expenseFilterType === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setExpenseFilterType(tab.key as any)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: active ? '#0f172a' : '#f8fafc',
                          color: active ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <IonSearchbar
                  placeholder="Buscar gasto por descripción, servidor, referencia o periodo..."
                  value={expenseSearch}
                  onIonInput={(e) => setExpenseSearch(e.detail.value || '')}
                  style={{ padding: 0 }}
                />
              </div>

              {filteredExpenses.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                  <IonIcon icon={trendingDownOutline} style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>No hay salidas registradas en esta categoría</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Usa los botones superiores para registrar pagos de servidores, inversiones o retiros personales.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredExpenses.map((exp) => {
                    const badgeConfig: Record<string, { label: string; bg: string; color: string }> = {
                      [PlatformExpenseType.OPERATING]: { label: '🖥️ Gasto Operativo (OPEX)', bg: '#ffe4e6', color: '#be123c' },
                      [PlatformExpenseType.INVESTMENT]: { label: '🚀 Inversión / Reinversión', bg: '#e0f2fe', color: '#0369a1' },
                      [PlatformExpenseType.OWNER_PAYOUT]: { label: '👤 Pago a Mí (Retiro Dueño)', bg: '#f3e8ff', color: '#6d28d9' },
                      [PlatformExpenseType.TAX_SENIAT]: { label: '🏛️ Pago IVA SENIAT', bg: '#e0e7ff', color: '#3730a3' },
                      [PlatformExpenseType.PROMOTER_PAYOUT]: { label: '🤝 Comisión Promotor', bg: '#fef3c7', color: '#b45309' },
                    };
                    const badge = badgeConfig[exp.type] || { label: exp.type, bg: '#f1f5f9', color: '#334155' };

                    return (
                      <div
                        key={exp.id}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                        }}
                      >
                        <div style={{ flex: '1 1 260px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                              {exp.category}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              • {new Date(exp.expenseDate).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                            {exp.description}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            Método: <strong>{exp.paymentMethod}</strong>
                            {exp.reference ? ` • Ref: ${exp.reference}` : ''}
                            {exp.taxPeriod ? ` • Periodo Fiscal: ${exp.taxPeriod}` : ''}
                            {exp.promoterName ? ` • Promotor: ${exp.promoterName}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: '#e11d48' }}>
                              -${exp.amount.toFixed(2)} USD
                            </div>
                            {exp.amountBs && (
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                Bs. {exp.amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            title="Eliminar registro"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              borderRadius: '8px',
                              width: '34px',
                              height: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <IonIcon icon={trashOutline} style={{ fontSize: '16px' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: NEGOCIOS Y SUSCRIPCIONES */}
        {activeTab === 'tenants' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <IonSearchbar
                placeholder="Buscar por nombre de negocio, dueño, plan o estado..."
                value={searchTerm}
                onIonInput={(e) => setSearchTerm(e.detail.value || '')}
                style={{ padding: 0 }}
              />
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando negocios...</p>
              </div>
            )}

            {!loading && filteredTenants.length === 0 && (
              <div style={{ background: '#fff', padding: '40px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
                <IonIcon icon={businessOutline} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '10px' }} />
                <p style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>No se encontraron negocios</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Prueba con otro término de búsqueda.</p>
              </div>
            )}

            {!loading && filteredTenants.length > 0 && (
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 16px' }}>Negocio / Dueño</th>
                      <th style={{ padding: '14px 16px' }}>Plan</th>
                      <th style={{ padding: '14px 16px' }}>Referidos Activos</th>
                      <th style={{ padding: '14px 16px' }}>Cuota Mensual</th>
                      <th style={{ padding: '14px 16px' }}>Vencimiento</th>
                      <th style={{ padding: '14px 16px' }}>Estado</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((t) => {
                      const isPioneer = t.planType === TenantPlanType.PIONEER;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          {/* Negocio y Dueño */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{t.name}</div>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                              👤 {t.owner ? `${t.owner.name} (${t.owner.email})` : 'Sin dueño asignado'}
                            </div>
                            {t.referrerName && (
                              <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                                ↳ Ref. por: {t.referrerName}
                              </div>
                            )}
                          </td>

                          {/* Plan Badge */}
                          <td style={{ padding: '14px 16px' }}>
                            {isPioneer ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                  color: '#fff',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)',
                                }}
                              >
                                ⭐ PIONERA
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                }}
                              >
                                REGULAR
                              </span>
                            )}
                          </td>

                          {/* Referidos Activos */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <IonIcon icon={peopleOutline} style={{ color: '#3b82f6', fontSize: '16px' }} />
                              <span style={{ fontSize: '14px', color: '#0f172a' }}>{t.activeReferrals}</span>
                            </div>
                            {t.discountPercentage > 0 && (
                              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                                🎉 {t.discountPercentage}% Descuento
                              </div>
                            )}
                          </td>

                          {/* Cuota Mensual ($) */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: t.finalFee === 0 ? '#10b981' : '#0f172a' }}>
                              ${t.finalFee.toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/ mes</span>
                            </div>
                            {t.discountPercentage > 0 && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                Base: ${t.basePrice.toFixed(2)}
                              </div>
                            )}
                          </td>

                          {/* Vencimiento */}
                          <td style={{ padding: '14px 16px' }}>
                            {t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) > 0 ? (
                              <div>
                                <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <IonIcon icon={timeOutline} /> {t.trialDaysLeft} días prueba
                                </span>
                                {t.trialEndsAt && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Hasta: {new Date(t.trialEndsAt).toLocaleDateString('es-VE')}
                                  </div>
                                )}
                              </div>
                            ) : (t.status === TenantStatus.PAST_DUE || (t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) <= 0)) ? (
                              <div>
                                <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <IonIcon icon={timeOutline} /> {t.currentPeriodEndsAt ? 'Suscripción vencida' : 'Prueba vencida'}
                                </span>
                                {t.trialEndsAt && !t.currentPeriodEndsAt && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Venció: {new Date(t.trialEndsAt).toLocaleDateString('es-VE')}
                                  </div>
                                )}
                                {t.currentPeriodEndsAt && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Venció: {new Date(t.currentPeriodEndsAt).toLocaleDateString('es-VE')}
                                  </div>
                                )}
                              </div>
                            ) : t.currentPeriodEndsAt ? (
                              <div>
                                <span style={{ color: new Date(t.currentPeriodEndsAt) > new Date() ? '#0f172a' : '#ef4444', fontWeight: 600 }}>
                                  {new Date(t.currentPeriodEndsAt).toLocaleDateString('es-VE')}
                                </span>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {Math.ceil((new Date(t.currentPeriodEndsAt).getTime() - Date.now()) / 86400000)} días rest.
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Sin periodo</span>
                            )}
                          </td>

                          {/* Estado */}
                          <td style={{ padding: '14px 16px' }}>
                            {t.status === TenantStatus.ACTIVE && <IonBadge color="success">ACTIVO</IonBadge>}
                            {t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) > 0 && <IonBadge color="warning">PRUEBA</IonBadge>}
                            {(t.status === TenantStatus.PAST_DUE || (t.status === TenantStatus.TRIAL && (t.trialDaysLeft ?? 0) <= 0)) && (
                              <IonBadge color="danger">VENCIDO</IonBadge>
                            )}
                            {t.status === TenantStatus.SUSPENDED && <IonBadge color="medium">SUSPENDIDO</IonBadge>}
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <IonButton
                                size="small"
                                fill="outline"
                                color="primary"
                                onClick={() => openEditModal(t)}
                                style={{ fontWeight: 600 }}
                              >
                                <IonIcon icon={createOutline} slot="start" />
                                Gestionar Plan
                              </IonButton>
                              <button
                                type="button"
                                onClick={() => handleDeleteTenant(t)}
                                title={`Eliminar ${t.name}`}
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: '8px',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <IonIcon icon={trashOutline} style={{ fontSize: '15px' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APROBACIÓN DE PAGOS */}
        {activeTab === 'payments' && (
          <div>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando reportes de pago...</p>
              </div>
            )}

            {!loading && pendingPayments.length === 0 && (
              <div style={{ background: '#fff', padding: '50px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
                <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '56px', color: '#10b981', marginBottom: '12px' }} />
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                  ¡Todo al día! No hay pagos pendientes
                </h3>
                <p style={{ fontSize: '14px', marginTop: '6px' }}>
                  Cuando los negocios reporten su pago mensual por Pago Móvil, Binance o Efectivo, aparecerán aquí para tu aprobación directa.
                </p>
              </div>
            )}

            {!loading && pendingPayments.length > 0 && (
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  {pendingPayments.map((p) => (
                    <IonCol size="12" sizeMd="6" key={p.id}>
                      <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: '4px solid #f59e0b' }}>
                        <IonCardHeader style={{ paddingBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                              {p.tenantName || 'Negocio Registrado'}
                            </IonCardTitle>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {p.months === 12 && (
                                <span style={{ fontSize: '11px', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px' }}>
                                  ⭐ ANUAL (1 AÑO)
                                </span>
                              )}
                              {p.months === 3 && (
                                <span style={{ fontSize: '11px', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px' }}>
                                  TRIMESTRAL (3 MESES)
                                </span>
                              )}
                              {(!p.months || p.months === 1) && (
                                <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>
                                  MENSUAL (1 MES)
                                </span>
                              )}
                              <IonBadge color="warning" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                                PENDIENTE
                              </IonBadge>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            📅 Reportado: {new Date(p.createdAt).toLocaleString('es-VE')}
                          </div>
                        </IonCardHeader>

                        <IonCardContent>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>Monto Reportado:</span>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                                  {p.amountBs ? `Bs. ${p.amountBs.toFixed(2)}` : `$${p.amount.toFixed(2)} USD`}
                                </div>
                                {p.amountBs && (
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    ${p.amount.toFixed(2)} USD {p.exchangeRate ? `(Tasa: Bs. ${p.exchangeRate.toFixed(2)})` : ''}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>Método de Pago:</span>
                              <span style={{ fontWeight: 700, fontSize: '13px' }}>
                                {p.paymentMethod === SaaSPaymentMethod.PAGO_MOVIL && '📱 Pago Móvil (en Bs)'}
                                {p.paymentMethod === SaaSPaymentMethod.BINANCE && '🟡 Binance Pay (USDT)'}
                                {p.paymentMethod === SaaSPaymentMethod.CASH && '🏦 Transferencia / Efectivo'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>Referencia:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', color: '#0f172a' }}>
                                  {p.reference}
                                </span>
                                <IonButton fill="clear" size="small" onClick={() => copyToClipboard(p.reference)} style={{ margin: 0, height: '24px' }}>
                                  <IonIcon icon={copyOutline} slot="icon-only" />
                                </IonButton>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <IonButton
                              expand="block"
                              color="success"
                              style={{ flex: 1, fontWeight: 700 }}
                              onClick={() => handleApprovePayment(p)}
                            >
                              <IonIcon icon={checkmarkCircleOutline} slot="start" />
                              Aprobar (+{p.months === 12 ? '365 días' : `${(p.months || 1) * 30} días`})
                            </IonButton>

                            <IonButton
                              expand="block"
                              color="danger"
                              fill="outline"
                              style={{ fontWeight: 700 }}
                              onClick={() => {
                                setRejectPaymentId(p.id);
                                setRejectReason('');
                              }}
                            >
                              <IonIcon icon={closeCircleOutline} slot="start" />
                              Rechazar
                            </IonButton>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            )}
          </div>
        )}

        {/* TAB: PROMOTORES Y COMISIONES */}
        {activeTab === 'promoters' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: totalPromoterPendingUSD > 0 ? '#fff7ed' : '#ffffff', border: totalPromoterPendingUSD > 0 ? '1px solid #fdba74' : '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Total por liquidar</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#c2410c' }}>${totalPromoterPendingUSD.toFixed(2)} USD</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>≈ Bs. {totalPromoterPendingBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Histórico pagado</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>${totalPromoterPaidUSD.toFixed(2)} USD</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Promotores en espera</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e3a8a' }}>{promotersWithPendingCount} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {safePromoters.length}</span></div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>Tiendas afiliadas</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#581c87' }}>{totalPromoterAffiliatedTenants}</div>
              </div>
            </div>

            {/* Selector de tasa */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <IonIcon icon={calculatorOutline} style={{ color: '#059669' }} />
              <strong style={{ fontSize: '13px' }}>Tasa Pago Móvil: Bs. {effectiveRate.toFixed(2)}</strong>
              {([['BCV', `🏛️ BCV ${bcvRate.toFixed(2)}`], ['PARALLEL', `📈 Paralelo ${parallelRate.toFixed(2)}`], ['CUSTOM', '✏️ Manual']] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPayoutRateType(k)}
                  style={{ minHeight: '36px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: payoutRateType === k ? '2px solid #0284c7' : '1px solid #cbd5e1', background: payoutRateType === k ? '#f0f9ff' : '#ffffff', color: payoutRateType === k ? '#0369a1' : '#475569' }}
                >
                  {label}
                </button>
              ))}
              {payoutRateType === 'CUSTOM' && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Bs."
                  value={customRateValue}
                  onChange={(e) => setCustomRateValue(e.target.value)}
                  style={{ width: '100px', height: '38px', borderRadius: '8px', border: '1px solid #0284c7', padding: '0 10px', fontWeight: 700 }}
                />
              )}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([['ALL', `Todos (${safePromoters.length})`], ['PENDING', `⏳ Con saldo pendiente (${promotersWithPendingCount})`], ['PAID', `✅ Al día (${safePromoters.length - promotersWithPendingCount})`]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPromoterFilter(k)}
                    style={{ minHeight: '38px', padding: '0 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: promoterFilter === k ? '2px solid #0f172a' : '1px solid #e2e8f0', background: promoterFilter === k ? '#0f172a' : '#ffffff', color: promoterFilter === k ? '#ffffff' : '#475569' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <IonSearchbar
                  placeholder="Buscar por código, usuario, correo, teléfono o CI..."
                  value={searchTerm}
                  onIonInput={(e) => setSearchTerm(e.detail.value || '')}
                  style={{ padding: 0 }}
                />
              </div>
              <IonButton color="primary" style={{ fontWeight: 700 }} onClick={() => setIsCreatePromoterOpen(true)}>
                <IonIcon icon={personAddOutline} slot="start" />
                Nuevo Promotor
              </IonButton>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
              </div>
            )}

            {!loading && safePromoters.length === 0 && (
              <div style={{ background: '#fff', padding: '40px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
                <IonIcon icon={medalOutline} style={{ fontSize: '48px', color: '#cbd5e1' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No hay promotores registrados</p>
              </div>
            )}

            {!loading && safePromoters.length > 0 && filteredPromoters.length === 0 && (
              <div style={{ background: '#fff', padding: '30px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
                Sin resultados para el filtro actual.
              </div>
            )}

            {!loading && filteredPromoters.length > 0 && (
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '14px 16px' }}>Promotor / Código</th>
                      <th style={{ padding: '14px 16px' }}>Rango y %</th>
                      <th style={{ padding: '14px 16px' }}>Tiendas</th>
                      <th style={{ padding: '14px 16px' }}>Activ. mes</th>
                      <th style={{ padding: '14px 16px' }}>Por liquidar</th>
                      <th style={{ padding: '14px 16px' }}>Pagado</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPromoters.map((p) => {
                      const rankEmoji = p.currentRank === 'ORO' ? '🥇' : p.currentRank === 'PLATA' ? '🥈' : p.currentRank === 'BRONCE' ? '🥉' : '🪵';
                      const hasPending = p.pendingBalanceUSD > 0;
                      const wa = (p.phone || p.pagoMovilPhone || '').replace(/[^0-9]/g, '');
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{p.username}</strong>
                              {wa && (
                                <button
                                  type="button"
                                  title="WhatsApp"
                                  onClick={() => window.open(`https://wa.me/${wa.startsWith('58') ? wa : '58' + wa.replace(/^0+/, '')}`, '_blank')}
                                  style={{ border: 'none', background: '#ecfdf5', color: '#059669', borderRadius: '6px', minHeight: '28px', minWidth: '28px', cursor: 'pointer' }}
                                >
                                  <IonIcon icon={logoWhatsapp} />
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>{p.code}</span>
                              <button type="button" title="Copiar código" onClick={() => copyToClipboard(p.code)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', minHeight: '28px', minWidth: '28px' }}>
                                <IonIcon icon={copyOutline} />
                              </button>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{p.email}</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '13px' }}>
                            {rankEmoji} {p.currentRank} ({p.commissionPercentage}%)
                            {p.rankBonusUSD > 0 && <div style={{ fontSize: '11px', color: '#10b981' }}>🎁 +${p.rankBonusUSD}</div>}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                            {p.totalAffiliatedTenants}
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>{p.activeClientsCount} activas</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 900 }}>{p.monthlyActivations}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: hasPending ? '#c2410c' : '#64748b' }}>${p.pendingBalanceUSD.toFixed(2)}</div>
                            {hasPending ? (
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c' }}>≈ Bs. {(p.pendingBalanceUSD * effectiveRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            ) : (
                              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>Al día</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#16a34a' }}>${p.paidBalanceUSD.toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <IonButton
                              size="small"
                              color={hasPending ? 'success' : 'primary'}
                              fill={hasPending ? 'solid' : 'outline'}
                              style={{ fontWeight: 800 }}
                              onClick={() => setSelectedPromoterForPayout(p)}
                            >
                              <IonIcon icon={walletOutline} slot="start" />
                              {hasPending ? 'Liquidar saldo' : 'Ver ficha'}
                            </IonButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUENTAS DE COBRO SAAS Y TASAS */}
        {activeTab === 'config' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* CONTROL DE TASAS DE MERCADO DE LA PLATAFORMA */}
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏛️ Control de Tasas de Mercado Oficiales
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {platformRates?.ratesCache?.updatedAt ? (
                      <>Última sincronización: <strong>{new Date(platformRates.ratesCache.updatedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong> ({new Date(platformRates.ratesCache.updatedAt).toLocaleDateString('es-VE')})</>
                    ) : (
                      'Sincronización automática activa (09:15 AM y 05:45 PM Caracas)'
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncRates}
                  disabled={isSyncingRates}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: isSyncingRates ? '#94a3b8' : '#0284c7',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isSyncingRates ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <IonIcon icon={refreshOutline} style={{ fontSize: '16px' }} />
                  {isSyncingRates ? 'Sincronizando Tasas...' : 'Forzar Sincronización Ahora'}
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Como <strong>SuperAdmin</strong>, puedes forzar la actualización de tasas en cualquier momento. Al presionar el botón, el sistema consulta Cotizave y el respaldo venezolano DolarApi, actualiza la cotización global y propaga el valor a todos los negocios que operan en modo automático.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>🏛️ Dólar BCV Oficial</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#14532d', marginTop: '4px' }}>
                    Bs. {Number(platformRates?.ratesCache?.bcv || platformRates?.exchangeRateBs || 40).toFixed(2)}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af' }}>📈 Paralelo Promedio</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>
                    Bs. {Number(platformRates?.ratesCache?.parallel || platformRates?.ratesCache?.bcv || 40).toFixed(2)}
                  </div>
                </div>

                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#854d0e' }}>🟡 Binance USDT</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#713f12', marginTop: '4px' }}>
                    Bs. {Number(platformRates?.ratesCache?.usdt || platformRates?.ratesCache?.parallel || 40).toFixed(2)}
                  </div>
                </div>

                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8' }}>💶 Euro BCV</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#581c87', marginTop: '4px' }}>
                    Bs. {Number(platformRates?.ratesCache?.eur || 40).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={walletOutline} color="primary" />
                Configuración de Cuentas Oficiales de FinoWork
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                Estas son las cuentas bancarias, Pago Móvil y Binance a las que los negocios suscritos transferirán su cuota mensual de SaaS. 
                Aparecerán automáticamente en la ventana de reporte de pago de cada cliente.
              </p>
            </div>

            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                {/* Pago Móvil FinoWork */}
                <IonCol size="12" sizeMd="6">
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={cashOutline} style={{ color: '#10b981' }} />
                        Pago Móvil (Receptor)
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ marginBottom: '10px' }}>
                        <BankSelect
                          label="Banco Receptor"
                          value={platformConfig.companyBank || ''}
                          onChange={(val) => setPlatformConfig({ ...platformConfig, companyBank: val })}
                          placeholder="Selecciona banco receptor..."
                        />
                      </div>

                      <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Cédula / RIF</IonLabel>
                        <IonInput
                          placeholder="Ej: J-12345678-0 ó V-12345678"
                          value={platformConfig.companyCedula || ''}
                          onIonInput={(e) => setPlatformConfig({ ...platformConfig, companyCedula: e.detail.value || '' })}
                        />
                      </IonItem>

                      <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Teléfono Pago Móvil</IonLabel>
                        <IonInput
                          placeholder="Ej: 0414-1234567"
                          value={platformConfig.companyPhone || ''}
                          onIonInput={(e) => setPlatformConfig({ ...platformConfig, companyPhone: e.detail.value || '' })}
                        />
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* Binance Pay */}
                <IonCol size="12" sizeMd="6">
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '18px' }}>₿</span>
                        Binance Pay (Cripto)
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Binance Pay ID</IonLabel>
                        <IonInput
                          placeholder="Ej: 123456789"
                          value={platformConfig.binancePayId || ''}
                          onIonInput={(e) => setPlatformConfig({ ...platformConfig, binancePayId: e.detail.value || '' })}
                        />
                      </IonItem>

                      <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Correo Registrado en Binance</IonLabel>
                        <IonInput
                          type="email"
                          placeholder="Ej: pagos@finowork.com"
                          value={platformConfig.binanceEmail || ''}
                          onIonInput={(e) => setPlatformConfig({ ...platformConfig, binanceEmail: e.detail.value || '' })}
                        />
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* Transferencia Bancaria Nacional */}
                <IonCol size="12">
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={cardOutline} style={{ color: '#3b82f6' }} />
                        Transferencia Bancaria Nacional (Cuenta Corriente)
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonRow>
                        <IonCol size="12" sizeMd="6">
                          <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                            <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Número de Cuenta (20 Dígitos)</IonLabel>
                            <IonInput
                              placeholder="0134-XXXX-XX-XXXXXXXXXX"
                              value={platformConfig.companyAccountNumber || ''}
                              onIonInput={(e) => setPlatformConfig({ ...platformConfig, companyAccountNumber: e.detail.value || '' })}
                            />
                          </IonItem>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                          <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                            <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Titular de la Cuenta</IonLabel>
                            <IonInput
                              placeholder="Ej: FinoWork SaaS C.A."
                              value={platformConfig.companyAccountHolder || ''}
                              onIonInput={(e) => setPlatformConfig({ ...platformConfig, companyAccountHolder: e.detail.value || '' })}
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* Valores SaaS por Defecto */}
                <IonCol size="12">
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        ⚙️ Parámetros Globales de Suscripción
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonRow>
                        <IonCol size="12" sizeMd="6">
                          <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                            <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Precio Base Mensual ($ USD)</IonLabel>
                            <IonInput
                              type="number"
                              min="1"
                              step="1"
                              value={platformConfig.defaultMonthlyPrice ?? 20}
                              onIonInput={(e) => setPlatformConfig({ ...platformConfig, defaultMonthlyPrice: parseFloat(e.detail.value || '20') })}
                            />
                          </IonItem>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                          <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                            <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Días de Prueba para Nuevos Negocios</IonLabel>
                            <IonInput
                              type="number"
                              min="0"
                              step="1"
                              value={platformConfig.defaultTrialDays ?? 15}
                              onIonInput={(e) => setPlatformConfig({ ...platformConfig, defaultTrialDays: parseInt(e.detail.value || '15', 10) })}
                            />
                          </IonItem>
                        </IonCol>
                      </IonRow>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '30px' }}>
              <IonButton
                size="large"
                color="primary"
                onClick={handleSavePlatformConfig}
                disabled={isSavingConfig}
                style={{ fontWeight: 800, minWidth: '280px' }}
              >
                {isSavingConfig ? <IonSpinner name="crescent" /> : (
                  <>
                    <IonIcon icon={saveOutline} slot="start" />
                    Guardar Cuentas de Cobro SaaS
                  </>
                )}
              </IonButton>
            </div>

            {/* SECCIÓN SEGURIDAD Y CREDENCIALES DEL SUPERADMIN */}
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', marginTop: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '24px', color: '#10b981' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Mi Cuenta y Seguridad SuperAdmin
                </h3>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                Actualiza tu correo de contacto oficial (puedes usar tu Gmail personal sin necesidad de dominio propio), tu nombre de usuario y tu contraseña de acceso a la plataforma.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Nombre del SuperAdmin
                  </label>
                  <input
                    type="text"
                    value={superAdminProfile.name || ''}
                    onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, name: e.target.value })}
                    placeholder="Ej. Marco Ávila"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '14px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    value={superAdminProfile.username}
                    onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, username: e.target.value })}
                    placeholder="superadmin"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '14px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Correo Electrónico Oficial (Gmail / Personal) *
                  </label>
                  <input
                    type="email"
                    value={superAdminProfile.email}
                    onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, email: e.target.value })}
                    placeholder="tu_correo@gmail.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '14px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    💡 Con este correo podrás iniciar sesión directamente como SuperAdmin de la plataforma.
                  </span>
                </div>
              </div>

              {/* CAMBIO DE CONTRASEÑA */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={keyOutline} style={{ color: '#64748b' }} />
                  Cambiar Contraseña (Opcional)
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
                  Deja estos campos en blanco si solo deseas actualizar tu correo o nombre.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <IonButton
                  className="ff-btn-primary"
                  onClick={handleUpdateSuperAdminProfile}
                  disabled={isUpdatingProfile}
                  style={{ fontWeight: 800 }}
                >
                  {isUpdatingProfile ? <IonSpinner name="crescent" /> : (
                    <>
                      <IonIcon icon={lockClosedOutline} slot="start" />
                      Guardar Mis Credenciales
                    </>
                  )}
                </IonButton>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MENSAJES Y SOPORTE */}
        {activeTab === 'support' && (
          <div>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando mensajes de soporte...</p>
              </div>
            )}

            {!loading && supportMessages.length === 0 && (
              <div style={{ background: '#fff', padding: '50px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <IonIcon icon={mailOutline} style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px' }} />
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                  Aún no has recibido mensajes de soporte
                </h3>
                <p style={{ fontSize: '14px', marginTop: '6px', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                  Cuando algún negocio escriba un reporte, duda o sugerencia desde la sección de Ayuda en su sistema, aparecerá aquí.
                </p>
              </div>
            )}

            {!loading && supportMessages.length > 0 && (
              <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                {supportMessages.map((msg) => (
                  <IonCard key={msg.id} style={{ margin: '0 0 16px 0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #3b82f6' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IonIcon icon={businessOutline} style={{ color: '#3b82f6' }} />
                          {msg.tenant?.name || 'Negocio Registrado'}
                        </IonCardTitle>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={timeOutline} />
                          {new Date(msg.createdAt).toLocaleString('es-VE')}
                        </span>
                      </div>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: ACTUALIZACIONES DE NOTICIAS */}
        {activeTab === 'updates' && (
          <div style={{ paddingBottom: '30px' }}>
            {/* Header de la sección de actualizaciones con estadísticas y botón de nueva versión */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
                background: '#ffffff',
                padding: '16px 20px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={newspaperOutline} style={{ color: '#059669' }} />
                  Actualizaciones y Registro de Novedades
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Registra lo que se agregó, implementó, corrigió o eliminó. Los clientes verán las últimas 10 publicadas en Ayuda.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <IonButton
                  fill="outline"
                  size="small"
                  onClick={fetchUpdates}
                  disabled={loadingUpdates}
                  style={{ fontWeight: 700, '--border-radius': '8px' }}
                >
                  <IonIcon icon={refreshOutline} slot="start" />
                  Refrescar
                </IonButton>
                <IonButton
                  size="small"
                  color="primary"
                  onClick={openCreateUpdateModal}
                  style={{ fontWeight: 800, '--border-radius': '8px' }}
                >
                  <IonIcon icon={addOutline} slot="start" />
                  Nueva Actualización
                </IonButton>
              </div>
            </div>

            {/* Tarjetas de Métricas Rápidas */}
            <IonGrid style={{ padding: 0, marginBottom: '16px' }}>
              <IonRow>
                <IonCol size="12" sizeSm="4">
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Registradas
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                        {appUpdates.length}
                      </div>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={newspaperOutline} style={{ fontSize: '18px' }} />
                    </div>
                  </div>
                </IonCol>

                <IonCol size="12" sizeSm="4">
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
                        Publicadas (Visibles)
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                        {appUpdates.filter((u) => u.isPublished).length}
                      </div>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '18px' }} />
                    </div>
                  </div>
                </IonCol>

                <IonCol size="12" sizeSm="4">
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
                        Borradores (Ocultos)
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                        {appUpdates.filter((u) => !u.isPublished).length}
                      </div>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={eyeOffOutline} style={{ fontSize: '18px' }} />
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Spinner de carga */}
            {loadingUpdates && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando registro de actualizaciones...</p>
              </div>
            )}

            {/* Lista vacía */}
            {!loadingUpdates && appUpdates.length === 0 && (
              <div style={{ background: '#ffffff', padding: '50px 20px', textAlign: 'center', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <IonIcon icon={newspaperOutline} style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px' }} />
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                  No hay actualizaciones registradas
                </h3>
                <p style={{ fontSize: '14px', marginTop: '6px', maxWidth: '420px', margin: '6px auto 16px auto' }}>
                  Comienza creando la primera actualización con los cambios, correcciones e implementaciones del sistema.
                </p>
                <IonButton color="primary" onClick={openCreateUpdateModal} style={{ fontWeight: 800 }}>
                  <IonIcon icon={addOutline} slot="start" />
                  Crear Primera Actualización
                </IonButton>
              </div>
            )}

            {/* Lista de actualizaciones */}
            {!loadingUpdates && appUpdates.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {appUpdates.map((update) => {
                  const addedCount = Array.isArray(update.changes) ? update.changes.filter((c) => c.type === 'ADDED').length : 0;
                  const implementedCount = Array.isArray(update.changes) ? update.changes.filter((c) => c.type === 'IMPLEMENTED').length : 0;
                  const fixedCount = Array.isArray(update.changes) ? update.changes.filter((c) => c.type === 'FIXED').length : 0;
                  const removedCount = Array.isArray(update.changes) ? update.changes.filter((c) => c.type === 'REMOVED').length : 0;

                  return (
                    <IonCard
                      key={update.id}
                      style={{
                        margin: 0,
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        background: '#ffffff',
                      }}
                    >
                      <div
                        style={{
                          padding: '16px 20px',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            {update.version && (
                              <span
                                style={{
                                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {update.version}
                              </span>
                            )}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: update.isPublished ? '#ecfdf5' : '#fffbeb',
                                color: update.isPublished ? '#059669' : '#d97706',
                                border: `1px solid ${update.isPublished ? '#a7f3d0' : '#fde68a'}`,
                              }}
                            >
                              <IonIcon icon={update.isPublished ? eyeOutline : eyeOffOutline} style={{ fontSize: '12px' }} />
                              {update.isPublished ? 'Publicada' : 'Borrador'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IonIcon icon={calendarOutline} />
                              {update.publishedAt ? new Date(update.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(update.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                            {update.title}
                          </h3>

                          {update.summary && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                              {update.summary}
                            </p>
                          )}
                        </div>

                        {/* Botones de Acción */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IonButton
                            size="small"
                            fill="outline"
                            color={update.isPublished ? 'warning' : 'success'}
                            onClick={() => handleTogglePublish(update)}
                            style={{ fontWeight: 700, '--border-radius': '8px' }}
                            title={update.isPublished ? 'Ocultar a clientes' : 'Hacer visible a clientes'}
                          >
                            <IonIcon icon={update.isPublished ? eyeOffOutline : eyeOutline} slot="start" />
                            {update.isPublished ? 'Despublicar' : 'Publicar'}
                          </IonButton>

                          <IonButton
                            size="small"
                            fill="outline"
                            color="primary"
                            onClick={() => openEditUpdateModal(update)}
                            style={{ fontWeight: 700, '--border-radius': '8px' }}
                          >
                            <IonIcon icon={createOutline} slot="start" />
                            Editar
                          </IonButton>

                          <IonButton
                            size="small"
                            fill="outline"
                            color="danger"
                            onClick={() => handleDeleteUpdate(update)}
                            style={{ fontWeight: 700, '--border-radius': '8px' }}
                          >
                            <IonIcon icon={trashOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      </div>

                      {/* Resumen de Cambios por Categoría */}
                      <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Categorías:</span>
                          {addedCount > 0 && (
                            <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                              ✨ {addedCount} Agregado{addedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {implementedCount > 0 && (
                            <span style={{ background: '#eff6ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                              🚀 {implementedCount} Implementado{implementedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {fixedCount > 0 && (
                            <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                              🛠️ {fixedCount} Corregido{fixedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {removedCount > 0 && (
                            <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                              🗑️ {removedCount} Eliminado{removedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {(!update.changes || update.changes.length === 0) && (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Sin cambios detallados registrados.
                            </span>
                          )}
                        </div>

                        {/* Detalle de ítems si existen */}
                        {Array.isArray(update.changes) && update.changes.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                            {update.changes.map((change, idx) => {
                              const badgeProps = {
                                ADDED: { icon: sparklesOutline, label: 'Agregado', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
                                IMPLEMENTED: { icon: rocketOutline, label: 'Implementado', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
                                FIXED: { icon: buildOutline, label: 'Corregido', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
                                REMOVED: { icon: trashOutline, label: 'Eliminado', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
                              }[change.type] || { icon: sparklesOutline, label: change.type, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    background: '#ffffff',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '13px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      background: badgeProps.bg,
                                      color: badgeProps.text,
                                      border: `1px solid ${badgeProps.border}`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      whiteSpace: 'nowrap',
                                      marginTop: '1px',
                                    }}
                                  >
                                    <IonIcon icon={badgeProps.icon} style={{ fontSize: '11px' }} />
                                    {badgeProps.label}
                                  </span>
                                  <span style={{ color: '#1e293b', flex: 1, lineHeight: '1.4' }}>
                                    {change.text}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </IonCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: GESTIONAR PLAN Y EXTENDER DÍAS */}
        <IonModal isOpen={!!selectedTenant} onDidDismiss={() => setSelectedTenant(null)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle style={{ fontWeight: 700 }}>
                Gestionar Plan • {selectedTenant?.name}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedTenant(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {selectedTenant && (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px' }}>
                  <IonCardContent>
                    <div style={{ marginBottom: '16px' }}>
                      <IonLabel style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                        Tipo de Plan de Suscripción:
                      </IonLabel>
                      <IonSelect
                        value={editPlanType}
                        onIonChange={(e) => setEditPlanType(e.detail.value)}
                        interface="action-sheet"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}
                      >
                        <IonSelectOption value={TenantPlanType.PIONEER}>
                          ⭐ PIONERA (100% Gratis con 2 o más referidos activos)
                        </IonSelectOption>
                        <IonSelectOption value={TenantPlanType.REGULAR}>
                          REGULAR (10% descuento por referido activo hasta 50% max)
                        </IonSelectOption>
                      </IonSelect>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <IonLabel style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                        Estado del Negocio:
                      </IonLabel>
                      <IonSelect
                        value={editStatus}
                        onIonChange={(e) => setEditStatus(e.detail.value)}
                        interface="action-sheet"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}
                      >
                        <IonSelectOption value={TenantStatus.ACTIVE}>ACTIVO (Con acceso pleno)</IonSelectOption>
                        <IonSelectOption value={TenantStatus.TRIAL}>PRUEBA (Periodo de gracia inicial)</IonSelectOption>
                        <IonSelectOption value={TenantStatus.PAST_DUE}>VENCIDO (Pago pendiente)</IonSelectOption>
                        <IonSelectOption value={TenantStatus.SUSPENDED}>SUSPENDIDO (Bloqueado)</IonSelectOption>
                      </IonSelect>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <IonLabel style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                        Precio Base Mensual ($ USD):
                      </IonLabel>
                      <IonInput
                        type="number"
                        min="0"
                        step="1"
                        value={editBasePrice}
                        onIonInput={(e) => setEditBasePrice(parseFloat(e.detail.value || '20'))}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <IonLabel style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                        Referido Por (Negocio Anfitrión):
                      </IonLabel>
                      <IonSelect
                        value={editReferredByTenantId || ''}
                        onIonChange={(e) => setEditReferredByTenantId(e.detail.value ? e.detail.value : null)}
                        interface="action-sheet"
                        placeholder="Sin referidor asignado"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}
                      >
                        <IonSelectOption value="">(Ninguno / Sin Referidor)</IonSelectOption>
                        {safeTenants
                          .filter((item) => item.id !== selectedTenant.id)
                          .map((item) => (
                            <IonSelectOption key={item.id} value={item.id}>
                              {item.name} {item.referralCode ? `(${item.referralCode})` : ''}
                            </IonSelectOption>
                          ))}
                      </IonSelect>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <IonLabel style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                        Extender Días Manualmente:
                      </IonLabel>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <IonButton size="small" fill={extendDaysToAdd === 15 ? 'solid' : 'outline'} onClick={() => setExtendDaysToAdd(15)}>
                          +15 Días
                        </IonButton>
                        <IonButton size="small" fill={extendDaysToAdd === 30 ? 'solid' : 'outline'} onClick={() => setExtendDaysToAdd(30)}>
                          +30 Días
                        </IonButton>
                        <IonButton size="small" fill={extendDaysToAdd === 60 ? 'solid' : 'outline'} onClick={() => setExtendDaysToAdd(60)}>
                          +60 Días
                        </IonButton>
                        <IonButton size="small" fill={extendDaysToAdd === 0 ? 'solid' : 'outline'} color="medium" onClick={() => setExtendDaysToAdd(0)}>
                          Sin extender (0)
                        </IonButton>
                      </div>
                      <IonInput
                        type="number"
                        min="0"
                        placeholder="O escribe cantidad exacta de días a sumar..."
                        value={extendDaysToAdd || ''}
                        onIonInput={(e) => setExtendDaysToAdd(parseInt(e.detail.value || '0', 10) || 0)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}
                      />
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#64748b' }}>
                      💡 <strong>Motor de Referidos:</strong> Este negocio tiene actualmente <strong>{selectedTenant.activeReferrals} referidos activos</strong>.
                      Al asignar el plan {editPlanType === TenantPlanType.PIONEER ? 'PIONERA' : 'REGULAR'}, la cuota calculada se actualizará automáticamente.
                    </div>

                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={handleSavePlan}
                      disabled={isSavingPlan}
                      style={{ fontWeight: 700 }}
                    >
                      {isSavingPlan ? <IonSpinner name="dots" /> : 'Guardar Cambios del Negocio'}
                    </IonButton>

                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                      <IonButton
                        expand="block"
                        fill="outline"
                        color="danger"
                        onClick={() => handleDeleteTenant(selectedTenant)}
                        style={{ fontWeight: 700 }}
                      >
                        <IonIcon icon={trashOutline} slot="start" />
                        Eliminar este Negocio Definitivamente
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* MODAL: RECHAZAR REPORTE DE PAGO */}
        <IonModal isOpen={!!rejectPaymentId} onDidDismiss={() => setRejectPaymentId(null)}>
          <IonHeader>
            <IonToolbar color="danger">
              <IonTitle style={{ fontWeight: 700 }}>Rechazar Reporte de Pago</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setRejectPaymentId(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>
                Indica el motivo del rechazo para que el negocio pueda verificar su transferencia o comprobante:
              </p>
              <IonItem style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px' }}>
                <IonInput
                  placeholder="Ej: Referencia no encontrada en la cuenta bancaria..."
                  value={rejectReason}
                  onIonInput={(e) => setRejectReason(e.detail.value || '')}
                />
              </IonItem>
              <div style={{ display: 'flex', gap: '10px' }}>
                <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} onClick={() => setRejectPaymentId(null)}>
                  Cancelar
                </IonButton>
                <IonButton expand="block" color="danger" style={{ flex: 1, fontWeight: 700 }} onClick={handleConfirmReject}>
                  Confirmar Rechazo
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: CENTRO DE LIQUIDACIÓN DE PROMOTOR */}
        <PromoterPayoutCenter
          promoter={selectedPromoterForPayout}
          rate={effectiveRate}
          onClose={() => setSelectedPromoterForPayout(null)}
          onChanged={loadData}
        />

        {/* MODAL: REGISTRAR NUEVO PROMOTOR */}
        <IonModal isOpen={isCreatePromoterOpen} onDidDismiss={() => setIsCreatePromoterOpen(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle style={{ fontWeight: 700 }}>
                Nuevo Promotor de Calle
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsCreatePromoterOpen(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                💡 <strong>Perfil de Promotor:</strong> Este usuario tendrá rol <code>PROMOTOR</code> con acceso exclusivo a su panel de captación y comisiones (<code>/promoter</code>). No requiere tener negocio propio.
              </div>

              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px' }}>
                <IonCardHeader style={{ paddingBottom: '4px' }}>
                  <IonCardTitle style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    1. Datos de Acceso
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Nombre de Usuario *
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: juancarlos"
                          value={newPromoterUsername}
                          onIonInput={(e) => setNewPromoterUsername(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Correo Electrónico *
                        </IonLabel>
                        <IonInput
                          type="email"
                          placeholder="promotor@gmail.com"
                          value={newPromoterEmail}
                          onIonInput={(e) => setNewPromoterEmail(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Contraseña Inicial
                        </IonLabel>
                        <IonInput
                          type="text"
                          placeholder="Por defecto: 123456"
                          value={newPromoterPassword}
                          onIonInput={(e) => setNewPromoterPassword(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Código Personalizado (Opcional)
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: PROM-JUAN"
                          value={newPromoterCode}
                          onIonInput={(e) => setNewPromoterCode(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Teléfono de Contacto (WhatsApp)
                        </IonLabel>
                        <IonInput
                          type="tel"
                          placeholder="Ej: 04141234567"
                          value={newPromoterPhone}
                          onIonInput={(e) => setNewPromoterPhone(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonCardContent>
              </IonCard>

              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px' }}>
                <IonCardHeader style={{ paddingBottom: '4px' }}>
                  <IonCardTitle style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    2. Datos de Pago para Comisiones (Opcional)
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#475569' }}>
                          Pago Móvil - Teléfono
                        </IonLabel>
                        <IonInput
                          placeholder="04141234567"
                          value={newPromoterPagoMovilPhone}
                          onIonInput={(e) => setNewPromoterPagoMovilPhone(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#475569' }}>
                          Pago Móvil - Cédula
                        </IonLabel>
                        <IonInput
                          placeholder="V-12345678"
                          value={newPromoterPagoMovilCedula}
                          onIonInput={(e) => setNewPromoterPagoMovilCedula(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <div style={{ marginBottom: '12px' }}>
                        <BankSelect
                          label="Pago Móvil - Banco"
                          value={newPromoterPagoMovilBank}
                          onChange={(val) => setNewPromoterPagoMovilBank(val)}
                          placeholder="Selecciona banco del promotor..."
                        />
                      </div>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#475569' }}>
                          Binance Pay ID
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: 123456789"
                          value={newPromoterBinancePayId}
                          onIonInput={(e) => setNewPromoterBinancePayId(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonCardContent>
              </IonCard>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', marginBottom: '24px' }}>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="medium"
                  style={{ flex: 1, fontWeight: 700 }}
                  onClick={() => setIsCreatePromoterOpen(false)}
                >
                  Cancelar
                </IonButton>
                <IonButton
                  expand="block"
                  color="primary"
                  style={{ flex: 2, fontWeight: 800 }}
                  onClick={handleCreatePromoter}
                  disabled={isCreatingPromoter}
                >
                  {isCreatingPromoter ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon icon={personAddOutline} slot="start" />
                      Crear Promotor
                    </>
                  )}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: REGISTRAR GASTO OPERATIVO (SERVIDORES), INVERSIÓN O PAGO AL DUEÑO */}
        <IonModal isOpen={isExpenseModalOpen} onDidDismiss={() => setIsExpenseModalOpen(false)}>
          <IonHeader>
            <IonToolbar color="dark">
              <IonTitle style={{ fontWeight: 800 }}>
                {newExpenseType === PlatformExpenseType.OPERATING
                  ? '🖥️ Registrar Gasto Operativo (OPEX)'
                  : newExpenseType === PlatformExpenseType.INVESTMENT
                  ? '🚀 Registrar Inversión / Reinversión'
                  : '👤 Pagarme a Mí (Retiro de Utilidad)'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsExpenseModalOpen(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
            <div style={{ maxWidth: '580px', margin: '0 auto' }}>
              {/* Selector de Tipo de Movimiento */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                  Tipo de Salida Financiera:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  {[
                    {
                      type: PlatformExpenseType.OPERATING,
                      cat: PlatformExpenseCategory.SERVIDORES,
                      title: '🖥️ Gasto Operativo',
                      sub: 'Servidores, VPS, Hosting, APIs',
                      color: '#e11d48',
                      bg: '#ffe4e6',
                    },
                    {
                      type: PlatformExpenseType.INVESTMENT,
                      cat: PlatformExpenseCategory.PUBLICIDAD_MARKETING,
                      title: '🚀 Inversión / Reinversión',
                      sub: 'Marketing, Ads, Equipos, Mejoras',
                      color: '#0284c7',
                      bg: '#e0f2fe',
                    },
                    {
                      type: PlatformExpenseType.OWNER_PAYOUT,
                      cat: PlatformExpenseCategory.RETIRO_DUEÑO,
                      title: '👤 Pagarme a Mí',
                      sub: 'Retiro de ganancias o sueldo dueño',
                      color: '#7c3aed',
                      bg: '#f3e8ff',
                    },
                  ].map((opt) => {
                    const active = newExpenseType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setNewExpenseType(opt.type);
                          setNewExpenseCategory(opt.cat);
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: active ? `2px solid ${opt.color}` : '1px solid #cbd5e1',
                          background: active ? opt.bg : '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '13px', color: active ? opt.color : '#0f172a' }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <IonCardContent>
                  {/* Categoría */}
                  <div style={{ marginBottom: '14px' }}>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Categoría Específica
                    </IonLabel>
                    <IonSelect
                      value={newExpenseCategory}
                      onIonChange={(e) => setNewExpenseCategory(e.detail.value)}
                      interface="action-sheet"
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', background: '#ffffff' }}
                    >
                      <IonSelectOption value={PlatformExpenseCategory.SERVIDORES}>🖥️ Servidores (Supabase, Vercel, VPS, Cloud)</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.DOMINIOS_APIS}>🌐 Dominios, Correos y APIs Externas</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.PUBLICIDAD_MARKETING}>📢 Publicidad y Marketing (Meta / Google Ads)</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.DESARROLLO_TECNOLOGIA}>💻 Desarrollo, Software y Licencias</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.EQUIPAMIENTO}>🛠️ Equipamiento e Infraestructura</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.RETIRO_DUEÑO}>👤 Pago al Dueño / Retiro de Utilidades</IonSelectOption>
                      <IonSelectOption value={PlatformExpenseCategory.OTRO}>📌 Otro Gasto del Negocio</IonSelectOption>
                    </IonSelect>
                  </div>

                  {/* Concepto / Descripción */}
                  <div style={{ marginBottom: '14px' }}>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Concepto o Descripción *
                    </IonLabel>
                    <IonInput
                      placeholder={
                        newExpenseType === PlatformExpenseType.OPERATING
                          ? 'Ej: Pago mensual servidor Supabase Pro + Vercel'
                          : newExpenseType === PlatformExpenseType.INVESTMENT
                          ? 'Ej: Campaña publicitaria Instagram Ads captación'
                          : 'Ej: Retiro quincenal de utilidades personales'
                      }
                      value={newExpenseDescription}
                      onIonInput={(e) => setNewExpenseDescription(e.detail.value || '')}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff' }}
                    />
                  </div>

                  {/* Monto USD y Equivalente Bs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Monto de Salida ($ USD) *
                      </IonLabel>
                      <IonInput
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newExpenseAmountUsd}
                        onIonInput={(e) => setNewExpenseAmountUsd(e.detail.value || '')}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Equivalente BCV (Bs.)
                      </IonLabel>
                      <div
                        style={{
                          height: '42px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          fontWeight: 800,
                          color: '#334155',
                          fontSize: '14px',
                        }}
                      >
                        Bs. {((parseFloat(newExpenseAmountUsd) || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Método de Pago y Referencia */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Método Utilizado
                      </IonLabel>
                      <IonSelect
                        value={newExpensePaymentMethod}
                        onIonChange={(e) => setNewExpensePaymentMethod(e.detail.value)}
                        interface="action-sheet"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', background: '#ffffff' }}
                      >
                        <IonSelectOption value="TRANSFERENCIA">Transferencia Bancaria</IonSelectOption>
                        <IonSelectOption value="PAGO_MOVIL">Pago Móvil</IonSelectOption>
                        <IonSelectOption value="BINANCE">Binance Pay / USDT</IonSelectOption>
                        <IonSelectOption value="TARJETA_ZINLI">Tarjeta Internacional (Zinli / Wally / PayPal)</IonSelectOption>
                        <IonSelectOption value="EFECTIVO">Efectivo USD</IonSelectOption>
                      </IonSelect>
                    </div>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Referencia / Factura (Opcional)
                      </IonLabel>
                      <IonInput
                        placeholder="Ej: #INV-2026 o Ref bancaria"
                        value={newExpenseReference}
                        onIonInput={(e) => setNewExpenseReference(e.detail.value || '')}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              <div style={{ display: 'flex', gap: '10px' }}>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="medium"
                  style={{ flex: 1, fontWeight: 700 }}
                  onClick={() => setIsExpenseModalOpen(false)}
                >
                  Cancelar
                </IonButton>
                <IonButton
                  expand="block"
                  color="primary"
                  style={{ flex: 2, fontWeight: 800 }}
                  onClick={handleCreateExpense}
                  disabled={isSavingExpense}
                >
                  {isSavingExpense ? <IonSpinner name="crescent" /> : 'Confirmar y Reflejar Salida'}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: DECLARAR / PAGAR IVA AL SENIAT */}
        <IonModal isOpen={isSeniatModalOpen} onDidDismiss={() => setIsSeniatModalOpen(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#4f46e5', '--color': '#ffffff' } as React.CSSProperties}>
              <IonTitle style={{ fontWeight: 800 }}>
                🏛️ Declarar Pago de IVA al SENIAT
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsSeniatModalOpen(false)} style={{ color: '#ffffff' }}>
                  Cerrar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
            <div style={{ maxWidth: '540px', margin: '0 auto' }}>
              <div
                style={{
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '16px',
                  color: '#312e81',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                  Resumen de IVA Retenido en tus Cobros:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span>IVA Total Recaudado (16%):</span>
                  <strong>${(financeMetrics?.totalIVACollectedUSD || 0).toFixed(2)} USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>IVA Ya Pagado al SENIAT:</span>
                  <strong>-${(financeMetrics?.totalIVAPaidSeniatUSD || 0).toFixed(2)} USD</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #c7d2fe',
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#4338ca',
                  }}
                >
                  <span>Saldo de IVA Pendiente:</span>
                  <span>
                    ${(financeMetrics?.pendingIVASeniatUSD || 0).toFixed(2)} USD (Bs. {((financeMetrics?.pendingIVASeniatUSD || 0) * bcvRate).toFixed(2)})
                  </span>
                </div>
              </div>

              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <IonCardContent>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Monto Pagado ($ USD) *
                      </IonLabel>
                      <IonInput
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={seniatAmountUsd}
                        onIonInput={(e) => setSeniatAmountUsd(e.detail.value || '')}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Equivalente en Bolívares (BCV)
                      </IonLabel>
                      <div
                        style={{
                          height: '42px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          fontWeight: 800,
                          color: '#334155',
                          fontSize: '14px',
                        }}
                      >
                        Bs. {((parseFloat(seniatAmountUsd) || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Periodo Fiscal Declarado *
                    </IonLabel>
                    <IonInput
                      placeholder="Ej: Octubre 2026 - 1ra Quincena"
                      value={seniatTaxPeriod}
                      onIonInput={(e) => setSeniatTaxPeriod(e.detail.value || '')}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Nro. Planilla SENIAT / Referencia Bancaria *
                    </IonLabel>
                    <IonInput
                      placeholder="Ej: Planilla 990328412 o Ref Banco de Venezuela"
                      value={seniatReference}
                      onIonInput={(e) => setSeniatReference(e.detail.value || '')}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Método de Pago Fiscal
                    </IonLabel>
                    <IonSelect
                      value={seniatPaymentMethod}
                      onIonChange={(e) => setSeniatPaymentMethod(e.detail.value)}
                      interface="action-sheet"
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', background: '#ffffff' }}
                    >
                      <IonSelectOption value="TRANSFERENCIA">Portal Bancario / Transferencia (BDV / Tesoro)</IonSelectOption>
                      <IonSelectOption value="PAGO_MOVIL">Pago Móvil Fiscal</IonSelectOption>
                      <IonSelectOption value="EFECTIVO">Taquilla Bancaria / Efectivo</IonSelectOption>
                    </IonSelect>
                  </div>

                  <div>
                    <IonLabel style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Observaciones (Opcional)
                    </IonLabel>
                    <IonInput
                      placeholder="Ej: Pagado vía portal SENIAT Banco de Venezuela"
                      value={seniatNotes}
                      onIonInput={(e) => setSeniatNotes(e.detail.value || '')}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', background: '#ffffff' }}
                    />
                  </div>
                </IonCardContent>
              </IonCard>

              <div style={{ display: 'flex', gap: '10px' }}>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="medium"
                  style={{ flex: 1, fontWeight: 700 }}
                  onClick={() => setIsSeniatModalOpen(false)}
                >
                  Cancelar
                </IonButton>
                <IonButton
                  expand="block"
                  style={{ flex: 2, fontWeight: 800, '--background': '#4f46e5' } as React.CSSProperties}
                  onClick={handleRecordSeniatPayment}
                  disabled={isSavingSeniat}
                >
                  {isSavingSeniat ? <IonSpinner name="crescent" /> : '✓ Confirmar: Ya lo pagué al SENIAT'}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: CREAR / EDITAR ACTUALIZACIÓN */}
        <IonModal isOpen={isUpdateModalOpen} onDidDismiss={() => setIsUpdateModalOpen(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle style={{ fontWeight: 700 }}>
                {editingUpdate ? `Editar Actualización • ${editingUpdate.version || editingUpdate.title}` : 'Nueva Actualización de Versión'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsUpdateModalOpen(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  color: '#475569',
                }}
              >
                📢 <strong>Registro de Novedades:</strong> Los clientes verán estas actualizaciones en la pestaña "Actualizaciones" de Ayuda y Soporte. Registra aquí todo lo que se agregó, implementó, corrigió o eliminó.
              </div>

              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <IonCardHeader style={{ paddingBottom: '4px' }}>
                  <IonCardTitle style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    1. Información General
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonRow>
                    <IonCol size="12" sizeMd="8">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Título de la Actualización *
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: Mejoras en POS, Punto de Venta y Control de Caja"
                          value={updateTitle}
                          onIonInput={(e) => setUpdateTitle(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="4">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Versión (opcional)
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: v1.4.0"
                          value={updateVersion}
                          onIonInput={(e) => setUpdateVersion(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12">
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#0f172a' }}>
                          Resumen o Introducción (opcional)
                        </IonLabel>
                        <IonTextarea
                          rows={2}
                          placeholder="Breve explicación de las mejoras introducidas..."
                          value={updateSummary}
                          onIonInput={(e) => setUpdateSummary(e.detail.value || '')}
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            Estado de Publicación
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {updateIsPublished ? 'Visible inmediatamente para todos los clientes' : 'Guardado como borrador oculto'}
                          </div>
                        </div>
                        <IonToggle
                          checked={updateIsPublished}
                          onIonChange={(e) => setUpdateIsPublished(e.detail.checked)}
                          color="success"
                        />
                      </div>
                    </IonCol>
                  </IonRow>
                </IonCardContent>
              </IonCard>

              {/* Sección de Cambios Específicos */}
              <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <IonCardHeader style={{ paddingBottom: '4px' }}>
                  <IonCardTitle style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    2. Detalle de Cambios ({updateChanges.length})
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {/* Selector y entrada para nuevo cambio */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                      Agregar nuevo ítem:
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {(
                        [
                          { type: 'ADDED' as const, label: '✨ Agregado', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
                          { type: 'IMPLEMENTED' as const, label: '🚀 Implementado', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
                          { type: 'FIXED' as const, label: '🛠️ Corregido', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
                          { type: 'REMOVED' as const, label: '🗑️ Eliminado', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
                        ] as const
                      ).map((cat) => {
                        const isSelected = newChangeType === cat.type;
                        return (
                          <button
                            key={cat.type}
                            type="button"
                            onClick={() => setNewChangeType(cat.type)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: isSelected ? `2px solid ${cat.text}` : `1px solid ${cat.border}`,
                              background: isSelected ? cat.bg : '#ffffff',
                              color: cat.text,
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <IonItem lines="none" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        <IonInput
                          placeholder="Describe el cambio (ej: Se corrigió error al exportar libro de ventas en PDF)..."
                          value={newChangeText}
                          onIonInput={(e) => setNewChangeText(e.detail.value || '')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChange();
                            }
                          }}
                        />
                      </IonItem>
                      <IonButton
                        color="primary"
                        onClick={handleAddChange}
                        disabled={!newChangeText.trim()}
                        style={{ fontWeight: 700, '--border-radius': '8px', height: '42px', margin: 0 }}
                      >
                        <IonIcon icon={addOutline} slot="start" />
                        Añadir
                      </IonButton>
                    </div>
                  </div>

                  {/* Lista de cambios agregados */}
                  {updateChanges.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No has agregado cambios todavía a esta actualización.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {updateChanges.map((change, idx) => {
                        const badgeProps = {
                          ADDED: { label: 'Agregado', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
                          IMPLEMENTED: { label: 'Implementado', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
                          FIXED: { label: 'Corregido', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
                          REMOVED: { label: 'Eliminado', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
                        }[change.type];

                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#ffffff',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: badgeProps.bg,
                                  color: badgeProps.text,
                                  border: `1px solid ${badgeProps.border}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {badgeProps.label}
                              </span>
                              <span style={{ fontSize: '13px', color: '#1e293b' }}>
                                {change.text}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveChange(idx)}
                              style={{
                                border: 'none',
                                background: '#fee2e2',
                                color: '#ef4444',
                                borderRadius: '6px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="Eliminar este cambio"
                            >
                              <IonIcon icon={trashOutline} style={{ fontSize: '14px' }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </IonCardContent>
              </IonCard>

              {/* Botones de Acción del Modal */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', marginBottom: '24px' }}>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="medium"
                  style={{ flex: 1, fontWeight: 700 }}
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancelar
                </IonButton>
                <IonButton
                  expand="block"
                  color="primary"
                  style={{ flex: 2, fontWeight: 800 }}
                  onClick={handleSaveUpdate}
                  disabled={isSavingUpdate || !updateTitle.trim()}
                >
                  {isSavingUpdate ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon icon={saveOutline} slot="start" />
                      {editingUpdate ? 'Guardar Cambios' : 'Publicar Actualización'}
                    </>
                  )}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default SuperAdminDashboard;

