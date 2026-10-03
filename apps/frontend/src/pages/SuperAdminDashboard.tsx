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
  checkmarkDoneOutline,
  personAddOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentMethod,
  type SaaSPaymentReportDTO,
  type SuperAdminTenantDTO,
  type UpdateTenantPlanDTO,
  type PlatformConfigDTO,
  type SuperAdminPromoterDTO,
  type PromoterCommissionDTO,
  type CreatePromoterDTO,
  PromoterCommissionStatus,
} from '@nutrideli/shared-types';

const SuperAdminDashboard: React.FC = () => {
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'tenants' | 'payments' | 'promoters' | 'config' | 'support'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['tenants', 'payments', 'promoters', 'config', 'support'].includes(tab)) {
      return tab as any;
    }
    return 'tenants';
  });
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<SuperAdminTenantDTO[]>([]);
  const [pendingPayments, setPendingPayments] = useState<SaaSPaymentReportDTO[]>([]);
  const [promoters, setPromoters] = useState<SuperAdminPromoterDTO[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Promoters liquidation modal
  const [selectedPromoterForPayout, setSelectedPromoterForPayout] = useState<SuperAdminPromoterDTO | null>(null);
  const [selectedCommissionToPay, setSelectedCommissionToPay] = useState<PromoterCommissionDTO | null>(null);
  const [payoutPaymentMethod, setPayoutPaymentMethod] = useState<'PAGO_MOVIL' | 'BINANCE'>('PAGO_MOVIL');
  const [payoutReference, setPayoutReference] = useState<string>('');
  const [isProcessingCommissionPayout, setIsProcessingCommissionPayout] = useState<boolean>(false);

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
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Reject payment modal
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, paymentsRes, supportRes, configRes, promotersRes] = await Promise.all([
        apiClient.get<SuperAdminTenantDTO[]>('/superadmin/tenants'),
        apiClient.get<SaaSPaymentReportDTO[]>('/superadmin/payments'),
        apiClient.get<any[]>('/feedback/platform'),
        apiClient.get<PlatformConfigDTO>('/superadmin/platform-config'),
        apiClient.get<SuperAdminPromoterDTO[]>('/superadmin/promoters').catch(() => ({ data: [] })),
      ]);
      setTenants(tenantsRes.data || []);
      setPendingPayments(paymentsRes.data || []);
      setSupportMessages(supportRes.data || []);
      setPromoters(promotersRes.data || []);
      if (configRes.data) {
        setPlatformConfig(configRes.data);
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

  const handlePayCommission = async () => {
    if (!selectedCommissionToPay) return;
    if (!payoutReference || !payoutReference.trim()) {
      presentToast({ message: 'Por favor, introduce la referencia del pago.', duration: 3000, color: 'warning' });
      return;
    }

    try {
      setIsProcessingCommissionPayout(true);
      const refText = `${payoutPaymentMethod === 'BINANCE' ? 'Binance Pay' : 'Pago Móvil'}: ${payoutReference.trim()}`;
      await apiClient.post(`/superadmin/promoters/commissions/${selectedCommissionToPay.id}/pay`, {
        paymentReference: refText,
      });

      presentToast({
        message: '¡Comisión liquidada y marcada como PAGADA exitosamente!',
        duration: 3000,
        color: 'success',
      });

      // Update promoter modal state and reload
      if (selectedPromoterForPayout) {
        const updatedComms = selectedPromoterForPayout.commissions.map((c) =>
          c.id === selectedCommissionToPay.id
            ? { ...c, status: PromoterCommissionStatus.PAID, paymentReference: refText, paidAt: new Date().toISOString() }
            : c,
        );
        setSelectedPromoterForPayout({
          ...selectedPromoterForPayout,
          commissions: updatedComms,
          pendingBalanceUSD: Math.max(0, selectedPromoterForPayout.pendingBalanceUSD - selectedCommissionToPay.amountUSD),
          paidBalanceUSD: selectedPromoterForPayout.paidBalanceUSD + selectedCommissionToPay.amountUSD,
        });
      }

      setSelectedCommissionToPay(null);
      setPayoutReference('');
      await loadData();
    } catch (err: any) {
      presentToast({
        message: 'Error al liquidar comisión: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsProcessingCommissionPayout(false);
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
      await apiClient.put('/superadmin/platform-config', platformConfig);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['tenants', 'payments', 'config', 'support'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    loadData();
  }, [location.search]);

  const openEditModal = (t: SuperAdminTenantDTO) => {
    setSelectedTenant(t);
    setEditPlanType(t.planType);
    setEditStatus(t.status);
    setEditBasePrice(t.basePrice);
    setExtendDaysToAdd(0);
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

  const handleApprovePayment = async (payment: SaaSPaymentReportDTO) => {
    presentAlert({
      header: 'Aprobar Pago Mensual',
      subHeader: `${payment.tenantName || 'Negocio'} - $${payment.amount.toFixed(2)}`,
      message: `¿Confirmas que recibiste el pago (Ref: ${payment.reference})? Se extenderán +30 días a su suscripción y su negocio quedará ACTIVO.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aprobar (+30 días)',
          handler: async () => {
            try {
              const res = await apiClient.post(`/superadmin/payments/${payment.id}/approve`);
              presentToast({
                message: res.data.message || 'Pago aprobado y suscripción extendida 30 días.',
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
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === TenantStatus.ACTIVE).length;
  const trialTenants = tenants.filter((t) => t.status === TenantStatus.TRIAL).length;
  const pendingCount = pendingPayments.length;
  const estimatedRevenue = tenants
    .filter((t) => t.status === TenantStatus.ACTIVE || t.status === TenantStatus.TRIAL)
    .reduce((sum, t) => sum + (t.finalFee || 0), 0);

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
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
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle style={{ fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={shieldCheckmarkOutline} />
              SuperAdmin • Plataforma SaaS Flujo Fino
            </span>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={loadData} disabled={loading} title="Actualizar datos">
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f1f5f9' }}>
        {/* KPI Cards Header */}
        <IonGrid style={{ padding: 0, marginBottom: '16px' }}>
          <IonRow>
            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                <IonCardContent style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Negocios
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {totalTenants}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <IonCardContent style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Negocios Activos
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    {activeTenants}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                <IonCardContent style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    En Periodo de Prueba
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                    {trialTenants}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: `4px solid ${pendingCount > 0 ? '#ef4444' : '#94a3b8'}` }}>
                <IonCardContent style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pagos Pendientes</span>
                    {pendingCount > 0 && <IonBadge color="danger">{pendingCount}</IonBadge>}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: pendingCount > 0 ? '#ef4444' : '#0f172a', marginTop: '4px' }}>
                    {pendingCount}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="2.4">
              <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
                <IonCardContent style={{ padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Facturación Estimada
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                    ${estimatedRevenue.toFixed(2)}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Tab Switcher */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '6px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as any)}>
            <IonSegmentButton value="tenants">
              <IonLabel style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={businessOutline} />
                Negocios y Suscripciones ({totalTenants})
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="payments">
              <IonLabel style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              <IonLabel style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={medalOutline} />
                Promotores y Comisiones ({promoters.length})
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="config">
              <IonLabel style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={walletOutline} />
                Cuentas de Cobro SaaS
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="support">
              <IonLabel style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={mailOutline} />
                Mensajes de Soporte
                {supportMessages.length > 0 && (
                  <IonBadge color="primary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                    {supportMessages.length}
                  </IonBadge>
                )}
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

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
                            {t.status === TenantStatus.TRIAL ? (
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
                            {t.status === TenantStatus.TRIAL && <IonBadge color="warning">PRUEBA</IonBadge>}
                            {t.status === TenantStatus.PAST_DUE && <IonBadge color="danger">VENCIDO</IonBadge>}
                            {t.status === TenantStatus.SUSPENDED && <IonBadge color="medium">SUSPENDIDO</IonBadge>}
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                              {p.tenantName || 'Negocio Registrado'}
                            </IonCardTitle>
                            <IonBadge color="warning" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                              PENDIENTE
                            </IonBadge>
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
                              Aprobar (+30 días)
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <IonSearchbar
                  placeholder="Buscar por código de promotor, usuario o correo..."
                  value={searchTerm}
                  onIonInput={(e) => setSearchTerm(e.detail.value || '')}
                  style={{ padding: 0 }}
                />
              </div>
              <IonButton
                color="primary"
                style={{ fontWeight: 700 }}
                onClick={() => setIsCreatePromoterOpen(true)}
              >
                <IonIcon icon={personAddOutline} slot="start" />
                + Nuevo Promotor
              </IonButton>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando promotores...</p>
              </div>
            )}

            {!loading && promoters.length === 0 && (
              <div style={{ background: '#fff', padding: '40px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
                <IonIcon icon={medalOutline} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '10px' }} />
                <p style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>No hay promotores registrados</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Los usuarios con rol PROMOTOR aparecerán aquí con sus métricas.</p>
              </div>
            )}

            {!loading && promoters.length > 0 && (
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '14px 16px' }}>Promotor / Código</th>
                      <th style={{ padding: '14px 16px' }}>Rango Mensual</th>
                      <th style={{ padding: '14px 16px' }}>Tiendas Afiliadas</th>
                      <th style={{ padding: '14px 16px' }}>Activaciones (Mes)</th>
                      <th style={{ padding: '14px 16px' }}>Por Liquidar</th>
                      <th style={{ padding: '14px 16px' }}>Total Pagado</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoters
                      .filter((p) => {
                        const q = searchTerm.toLowerCase();
                        return (
                          p.code.toLowerCase().includes(q) ||
                          p.username.toLowerCase().includes(q) ||
                          p.email.toLowerCase().includes(q)
                        );
                      })
                      .map((p) => {
                        const rankEmoji =
                          p.currentRank === 'ORO' ? '🥇' :
                          p.currentRank === 'PLATA' ? '🥈' :
                          p.currentRank === 'BRONCE' ? '🥉' : '🪵';

                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                                {p.username}
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                                {p.code}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {p.email}
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', background: '#f8fafc', padding: '4px 10px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <span>{rankEmoji}</span>
                                <span>{p.currentRank}</span>
                              </div>
                              {p.rankBonusUSD > 0 && (
                                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
                                  🎁 Bono: +${p.rankBonusUSD} USD
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                <IonIcon icon={businessOutline} style={{ color: '#3b82f6', fontSize: '16px' }} />
                                <span style={{ fontSize: '14px', color: '#0f172a' }}>{p.totalAffiliatedTenants} comercios</span>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                {p.monthlyActivations}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Mes actual
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: p.pendingBalanceUSD > 0 ? '#ea580c' : '#64748b' }}>
                                ${p.pendingBalanceUSD.toFixed(2)} USD
                              </div>
                              {p.pendingBalanceUSD > 0 && (
                                <span style={{ fontSize: '11px', background: '#ffedd5', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  Pendiente
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                                ${p.paidBalanceUSD.toFixed(2)} USD
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Histórico cobrado
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <IonButton
                                size="small"
                                color="primary"
                                style={{ fontWeight: 700 }}
                                onClick={() => {
                                  setSelectedPromoterForPayout(p);
                                  setSelectedCommissionToPay(null);
                                  setPayoutReference('');
                                }}
                              >
                                <IonIcon icon={walletOutline} slot="start" />
                                Liquidar Comisiones
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

        {/* TAB 3: CUENTAS DE COBRO SAAS */}
        {activeTab === 'config' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={walletOutline} color="primary" />
                Configuración de Cuentas Oficiales de Flujo Fino
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                Estas son las cuentas bancarias, Pago Móvil y Binance a las que los negocios suscritos transferirán su cuota mensual de SaaS. 
                Aparecerán automáticamente en la ventana de reporte de pago de cada cliente.
              </p>
            </div>

            <IonGrid style={{ padding: 0 }}>
              <IonRow>
                {/* Pago Móvil Flujo Fino */}
                <IonCol size="12" sizeMd="6">
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                    <IonCardHeader style={{ paddingBottom: '8px' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={cashOutline} style={{ color: '#10b981' }} />
                        Pago Móvil (Receptor)
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem lines="none" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 600, color: '#475569' }}>Banco Receptor</IonLabel>
                        <IonInput
                          placeholder="Ej: Banesco (0134)"
                          value={platformConfig.companyBank || ''}
                          onIonInput={(e) => setPlatformConfig({ ...platformConfig, companyBank: e.detail.value || '' })}
                        />
                      </IonItem>

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
                          placeholder="Ej: pagos@flujofino.com"
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
                              placeholder="Ej: Flujo Fino SaaS C.A."
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

        {/* MODAL: LIQUIDAR COMISIONES DE PROMOTOR */}
        <IonModal isOpen={!!selectedPromoterForPayout} onDidDismiss={() => { setSelectedPromoterForPayout(null); setSelectedCommissionToPay(null); }}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle style={{ fontWeight: 700 }}>
                Liquidar Comisiones - {selectedPromoterForPayout?.username} ({selectedPromoterForPayout?.code})
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => { setSelectedPromoterForPayout(null); setSelectedCommissionToPay(null); }}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
            {selectedPromoterForPayout && (
              <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                {/* Resumen de cuentas de cobro del promotor */}
                <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px' }}>
                  <IonCardHeader style={{ paddingBottom: '6px' }}>
                    <IonCardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Datos de Pago Registrados por el Promotor
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonGrid style={{ padding: 0 }}>
                      <IonRow>
                        <IonCol size="12" sizeMd="6">
                          <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>📱 Pago Móvil</div>
                            <div><strong>Banco:</strong> {selectedPromoterForPayout.pagoMovilBank || 'No registrado'}</div>
                            <div><strong>Teléfono:</strong> {selectedPromoterForPayout.pagoMovilPhone || 'No registrado'}</div>
                            <div><strong>Cédula:</strong> {selectedPromoterForPayout.pagoMovilCedula || 'No registrado'}</div>
                          </div>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                          <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>🪙 Binance Pay / Cripto</div>
                            <div><strong>Binance Pay ID / Pay:</strong> {selectedPromoterForPayout.binancePayId || 'No registrado'}</div>
                            <div style={{ marginTop: '8px', fontWeight: 800, color: '#ea580c' }}>
                              Saldo Pendiente Total: ${selectedPromoterForPayout.pendingBalanceUSD.toFixed(2)} USD
                            </div>
                          </div>
                        </IonCol>
                      </IonRow>
                    </IonGrid>
                  </IonCardContent>
                </IonCard>

                {/* Formulario de Pago si se seleccionó una comisión */}
                {selectedCommissionToPay && (
                  <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                    <IonCardHeader>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#1d4ed8' }}>
                        Procesar Pago para Comisión de ${selectedCommissionToPay.amountUSD.toFixed(2)} USD ({selectedCommissionToPay.type === 'ACTIVATION' ? 'Primera Activación $10' : 'Recurrente 10%'})
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem lines="full" style={{ marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700 }}>Método Utilizado para Enviar el Dinero</IonLabel>
                        <IonSelect
                          value={payoutPaymentMethod}
                          onIonChange={(e) => setPayoutPaymentMethod(e.detail.value)}
                        >
                          <IonSelectOption value="PAGO_MOVIL">Pago Móvil (Bolívares)</IonSelectOption>
                          <IonSelectOption value="BINANCE">Binance Pay (USDT)</IonSelectOption>
                        </IonSelect>
                      </IonItem>

                      <IonItem lines="full" style={{ marginBottom: '16px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700 }}>Número de Referencia o Comprobante</IonLabel>
                        <IonInput
                          placeholder="Ej: 98765432 o Order #8928374..."
                          value={payoutReference}
                          onIonInput={(e) => setPayoutReference(e.detail.value || '')}
                        />
                      </IonItem>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <IonButton
                          fill="outline"
                          color="medium"
                          style={{ flex: 1 }}
                          onClick={() => setSelectedCommissionToPay(null)}
                        >
                          Cancelar
                        </IonButton>
                        <IonButton
                          color="success"
                          style={{ flex: 2, fontWeight: 700 }}
                          disabled={isProcessingCommissionPayout}
                          onClick={handlePayCommission}
                        >
                          {isProcessingCommissionPayout ? <IonSpinner name="dots" /> : 'Confirmar y Marcar como PAGADA'}
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Listado de todas las comisiones */}
                <IonCard style={{ margin: 0, borderRadius: '12px' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Historial y Desglose de Comisiones del Promotor
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent style={{ padding: 0 }}>
                    {selectedPromoterForPayout.commissions.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        Este promotor aún no tiene comisiones generadas.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '10px 14px' }}>Tipo</th>
                              <th style={{ padding: '10px 14px' }}>Monto</th>
                              <th style={{ padding: '10px 14px' }}>Fecha</th>
                              <th style={{ padding: '10px 14px' }}>Estado</th>
                              <th style={{ padding: '10px 14px' }}>Referencia</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPromoterForPayout.commissions.map((comm) => (
                              <tr key={comm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  {comm.type === 'ACTIVATION' ? (
                                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                      ⭐ PRIMERA ACTIVACIÓN ($10)
                                    </span>
                                  ) : (
                                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                      🔄 RECURRENTE (10%)
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                                  ${comm.amountUSD.toFixed(2)} USD
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {new Date(comm.createdAt).toLocaleDateString('es-VE')}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {comm.status === PromoterCommissionStatus.PAID ? (
                                    <IonBadge color="success">PAGADA</IonBadge>
                                  ) : comm.status === PromoterCommissionStatus.PENDING ? (
                                    <IonBadge color="warning">PENDIENTE</IonBadge>
                                  ) : (
                                    <IonBadge color="medium">{comm.status}</IonBadge>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                                  {comm.paymentReference || '—'}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  {comm.status === PromoterCommissionStatus.PENDING ? (
                                    <IonButton
                                      size="small"
                                      color="success"
                                      style={{ fontWeight: 700 }}
                                      onClick={() => {
                                        setSelectedCommissionToPay(comm);
                                        setPayoutReference('');
                                      }}
                                    >
                                      Pagar
                                    </IonButton>
                                  ) : (
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <IonIcon icon={checkmarkDoneOutline} /> Pagado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </IonCardContent>
                </IonCard>
              </div>
            )}
          </IonContent>
        </IonModal>

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
                      <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '12px' }}>
                        <IonLabel position="stacked" style={{ fontWeight: 700, color: '#475569' }}>
                          Pago Móvil - Banco
                        </IonLabel>
                        <IonInput
                          placeholder="Ej: Banesco (0134)"
                          value={newPromoterPagoMovilBank}
                          onIonInput={(e) => setNewPromoterPagoMovilBank(e.detail.value || '')}
                        />
                      </IonItem>
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
      </IonContent>
    </IonPage>
  );
};

export default SuperAdminDashboard;
