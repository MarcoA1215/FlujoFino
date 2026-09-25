import React, { useState, useEffect } from 'react';
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
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import {
  TenantPlanType,
  TenantStatus,
  SaaSPaymentMethod,
  type SaaSPaymentReportDTO,
  type SuperAdminTenantDTO,
  type UpdateTenantPlanDTO,
} from '@nutrideli/shared-types';

const SuperAdminDashboard: React.FC = () => {
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const [activeTab, setActiveTab] = useState<'tenants' | 'payments' | 'support'>('tenants');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<SuperAdminTenantDTO[]>([]);
  const [pendingPayments, setPendingPayments] = useState<SaaSPaymentReportDTO[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      const [tenantsRes, paymentsRes, supportRes] = await Promise.all([
        apiClient.get<SuperAdminTenantDTO[]>('/superadmin/tenants'),
        apiClient.get<SaaSPaymentReportDTO[]>('/superadmin/payments'),
        apiClient.get<any[]>('/feedback/platform'),
      ]);
      setTenants(tenantsRes.data || []);
      setPendingPayments(paymentsRes.data || []);
      setSupportMessages(supportRes.data || []);
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

  useEffect(() => {
    loadData();
  }, []);

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
      t.name.toLowerCase().includes(q) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(q)) ||
      (t.owner?.email && t.owner.email.toLowerCase().includes(q)) ||
      t.planType.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
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
                              <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                                ${p.amount.toFixed(2)} USD
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>Método de Pago:</span>
                              <span style={{ fontWeight: 700, fontSize: '13px' }}>
                                {p.paymentMethod === SaaSPaymentMethod.PAGO_MOVIL && '📱 Pago Móvil'}
                                {p.paymentMethod === SaaSPaymentMethod.BINANCE && '🟡 Binance Pay'}
                                {p.paymentMethod === SaaSPaymentMethod.CASH && '💵 Efectivo'}
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

        {/* TAB 3: MENSAJES Y SOPORTE */}
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
      </IonContent>
    </IonPage>
  );
};

export default SuperAdminDashboard;
