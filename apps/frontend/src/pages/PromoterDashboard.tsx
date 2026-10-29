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
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  useIonToast,
  IonButtons,
  IonMenuButton,
  IonProgressBar,
  IonItem,
  IonLabel,
  IonInput,
  IonModal,
  IonCheckbox,
} from '@ionic/react';
import {
  copyOutline,
  logoWhatsapp,
  refreshOutline,
  businessOutline,
  ribbonOutline,
  settingsOutline,
  shareSocialOutline,
  cashOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  personOutline,
  callOutline,
  mailOutline,
  chatbubbleEllipsesOutline,
  searchOutline,
  timeOutline,
  bookOutline,
  openOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import {
  type PromoterStatsDTO,
  type PromoterAffiliatedTenantDTO,
  type PromoterReferralSubStatus,
} from '@finowork/shared-types';
import { BankSelect } from '../components/BankSelect';
import { getPublicBaseUrl } from '../utils/public-url';
import { PromoterTermsContent } from './PromoterTermsAndConditions';

type TemplateKey = 'SATISFACTION' | 'PAYMENT' | 'TRIAL' | 'RECOVERY' | 'CUSTOM';

const cleanWhatsAppPhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = '58' + digits.substring(1);
  } else if (
    !digits.startsWith('58') &&
    (digits.startsWith('414') || digits.startsWith('424') || digits.startsWith('412') || digits.startsWith('416') || digits.startsWith('426')) &&
    digits.length === 10
  ) {
    digits = '58' + digits;
  }
  return digits;
};

const generateTemplateMessage = (
  key: TemplateKey,
  tenant: PromoterAffiliatedTenantDTO,
  promoterName: string,
): string => {
  const clientName = tenant.ownerName || 'amigo(a)';
  const businessName = tenant.tenantName || 'tu negocio';

  switch (key) {
    case 'SATISFACTION':
      return `¡Hola ${clientName}! Te saluda ${promoterName} de FinoWork. 🚀\n\nMe pongo en contacto para saber cómo ha sido tu experiencia gestionando ${businessName} con la plataforma. ¿Cómo te ha parecido el sistema? ¿Tienes alguna duda o función adicional que te gustaría que revisemos para sacarle el máximo provecho a tu inventario y ventas?`;

    case 'PAYMENT': {
      const overdueDetail = tenant.daysOverdue ? ` (vencida hace ${tenant.daysOverdue} días)` : '';
      return `¡Hola ${clientName}! Te saluda ${promoterName} de FinoWork. 👋\n\nTe escribo para apoyarte con tu suscripción de ${businessName}. Notamos que tu cuota de servicio se encuentra pendiente${overdueDetail}. ¿Te gustaría que te asista con los métodos de pago (Pago Móvil o Binance) o necesitas soporte para mantener tu sistema activo y que no se detengan tus operaciones?`;
    }

    case 'TRIAL': {
      const trialDetail = tenant.daysRemaining !== null && tenant.daysRemaining !== undefined ? ` (${tenant.daysRemaining} días restantes)` : '';
      return `¡Hola ${clientName}! Te saluda ${promoterName} de FinoWork. 👋\n\nVeo que estás disfrutando de tu período de prueba en ${businessName}${trialDetail}. ¿Cómo te ha ido configurando tus productos, inventario y caja? Si lo deseas, con gusto te ofrezco una breve asesoría guiada para que tu sistema quede al 100% y listo para operar.`;
    }

    case 'RECOVERY':
      return `¡Hola ${clientName}! Te saluda ${promoterName} de FinoWork. 👋\n\nNoté que tu cuenta en ${businessName} no se encuentra activa en el sistema. Para nosotros tu negocio es muy importante y queremos conocer tu opinión sincera: ¿hubo algún motivo específico por el cual no continuaste, o podemos ofrecerte una alternativa o propuesta especial para reactivar tu cuenta hoy mismo?`;

    case 'CUSTOM':
      return `¡Hola ${clientName}! Te saluda ${promoterName} de FinoWork sobre ${businessName}.\n\n`;

    default:
      return '';
  }
};

const PromoterDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<PromoterStatsDTO | null>(null);

  // Filtros y búsqueda de referidos
  const [statusFilter, setStatusFilter] = useState<'ALL' | PromoterReferralSubStatus>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [commissionFilter, setCommissionFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'THIS_MONTH'>('ALL');

  // Modal para contactar / escribir a referidos
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [contactTenant, setContactTenant] = useState<PromoterAffiliatedTenantDTO | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>('SATISFACTION');
  const [contactMessage, setContactMessage] = useState<string>('');

  // Modal obligatorio de Términos y Condiciones / Política de Privacidad
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState<boolean>(false);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState<boolean>(false);

  // Modal para configurar datos de pago (Pago Móvil / Binance Pay)
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [pagoMovilPhone, setPagoMovilPhone] = useState<string>('');
  const [pagoMovilCedula, setPagoMovilCedula] = useState<string>('');
  const [pagoMovilBank, setPagoMovilBank] = useState<string>('');
  const [binancePayId, setBinancePayId] = useState<string>('');
  const [isSavingPayout, setIsSavingPayout] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PromoterStatsDTO>('/promoters/my-stats');
      setStats(res.data);

      if (!res.data.termsAccepted) {
        setIsTermsModalOpen(true);
      }
    } catch (err: any) {
      presentToast({
        message: 'Error al cargar estadísticas: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const referralCode = stats?.code || 'PROM-';
  const affiliateLink = `${getPublicBaseUrl()}/register?ref=${referralCode}`;

  const copyToClipboard = (text: string, label = 'Enlace') => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      presentToast({ message: `¡${label} copiado al portapapeles!`, duration: 2000, color: 'success' });
    } else {
      presentToast({ message: text, duration: 4000, color: 'primary' });
    }
  };

  const handleShareWhatsApp = () => {
    const message = `¡Hola! Te invito a digitalizar tu negocio con FinoWork SaaS (POS, Inventario, Reportes y Catálogo Digital). Regístrate usando mi enlace de promotor oficial para activar tu período de prueba gratuito: ${affiliateLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAcceptTerms = async () => {
    if (!termsAcceptedCheckbox) {
      presentToast({
        message: 'Debes marcar la casilla para aceptar los términos y condiciones',
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    try {
      setIsAcceptingTerms(true);
      const res = await apiClient.put<{ success: boolean; termsAccepted: boolean; termsAcceptedAt: string }>('/promoters/accept-terms');
      presentToast({
        message: '¡Términos y condiciones aceptados con éxito! Tu cuenta de promotor ha sido activada.',
        duration: 3500,
        color: 'success',
      });

      if (stats) {
        setStats({
          ...stats,
          termsAccepted: true,
          termsAcceptedAt: res.data.termsAcceptedAt || new Date().toISOString(),
        });
      }
      setIsTermsModalOpen(false);
    } catch (err: any) {
      presentToast({
        message: 'Error al aceptar los términos: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsAcceptingTerms(false);
    }
  };

  const handleSavePayoutDetails = async () => {
    try {
      setIsSavingPayout(true);
      await apiClient.put('/promoters/my-payout-details', {
        pagoMovilPhone: pagoMovilPhone.trim() || undefined,
        pagoMovilCedula: pagoMovilCedula.trim() || undefined,
        pagoMovilBank: pagoMovilBank.trim() || undefined,
        binancePayId: binancePayId.trim() || undefined,
      });
      presentToast({
        message: '¡Datos de cobro actualizados con éxito!',
        duration: 2500,
        color: 'success',
      });
      setIsPayoutModalOpen(false);
    } catch (err: any) {
      presentToast({
        message: 'Error al guardar datos de cobro: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSavingPayout(false);
    }
  };

  const handleOpenContactModal = (tenant: PromoterAffiliatedTenantDTO) => {
    setContactTenant(tenant);
    let defaultKey: TemplateKey = 'SATISFACTION';
    if (tenant.subStatus === 'PAST_DUE') {
      defaultKey = 'PAYMENT';
    } else if (tenant.subStatus === 'TRIAL') {
      defaultKey = 'TRIAL';
    } else if (tenant.subStatus === 'INACTIVE') {
      defaultKey = 'RECOVERY';
    } else {
      defaultKey = 'SATISFACTION';
    }

    setSelectedTemplateKey(defaultKey);
    const promoterDisplayName = stats?.promoterName || user?.username || 'tu asesor';
    const msg = generateTemplateMessage(defaultKey, tenant, promoterDisplayName);
    setContactMessage(msg);
    setIsContactModalOpen(true);
  };

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplateKey(key);
    if (!contactTenant) return;
    const promoterDisplayName = stats?.promoterName || user?.username || 'tu asesor';
    const msg = generateTemplateMessage(key, contactTenant, promoterDisplayName);
    setContactMessage(msg);
  };

  const handleSendWhatsApp = () => {
    if (!contactTenant) return;
    const cleanPhone = cleanWhatsAppPhone(contactTenant.ownerPhone);
    if (!cleanPhone) {
      presentToast({
        message: 'Este comercio no tiene un número de teléfono registrado en el sistema. Puedes contactarlo por correo.',
        duration: 3500,
        color: 'warning',
      });
      return;
    }
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(contactMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = () => {
    if (!contactTenant || !contactTenant.ownerEmail) {
      presentToast({
        message: 'Este comercio no tiene un correo electrónico registrado.',
        duration: 3000,
        color: 'warning',
      });
      return;
    }
    const subject = `FinoWork - Seguimiento para ${contactTenant.tenantName}`;
    const mailtoUrl = `mailto:${contactTenant.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(contactMessage)}`;
    window.open(mailtoUrl, '_blank');
  };

  // Filtrado de comercios
  const allAffiliated = stats?.affiliatedTenants || [];
  const totalTenantsCount = allAffiliated.length;
  const activeCount = stats?.activeClientsCount ?? allAffiliated.filter((t) => t.subStatus === 'ACTIVE').length;
  const pastDueCount = stats?.pastDueClientsCount ?? allAffiliated.filter((t) => t.subStatus === 'PAST_DUE').length;
  const trialCount = stats?.trialClientsCount ?? allAffiliated.filter((t) => t.subStatus === 'TRIAL').length;
  const inactiveCount = stats?.inactiveClientsCount ?? allAffiliated.filter((t) => t.subStatus === 'INACTIVE').length;

  const filteredTenants = allAffiliated.filter((t) => {
    if (statusFilter !== 'ALL' && t.subStatus !== statusFilter) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchName = t.tenantName?.toLowerCase().includes(q);
      const matchOwner = t.ownerName?.toLowerCase().includes(q);
      const matchPhone = t.ownerPhone?.toLowerCase().includes(q);
      const matchEmail = t.ownerEmail?.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchPhone && !matchEmail) {
        return false;
      }
    }
    return true;
  });

  // Cálculo de progreso hacia el siguiente nivel según clientes activos
  const activeClientsCount = stats?.activeClientsCount ?? 0;
  const commissionPercentage = stats?.commissionPercentage ?? 10;
  const nextRank = stats?.nextRank;

  let progressValue = 1;
  let progressText = '¡Has alcanzado el nivel máximo Oro (20% de comisión)!';

  if (nextRank && nextRank.clientsNeeded && nextRank.clientsNeeded > 0) {
    const totalTarget = activeClientsCount + nextRank.clientsNeeded;
    progressValue = Math.min(1, Math.max(0, activeClientsCount / totalTarget));
    progressText = `Tienes ${activeClientsCount} ${activeClientsCount === 1 ? 'cliente activo' : 'clientes activos'}. Te ${nextRank.clientsNeeded === 1 ? 'falta' : 'faltan'} ${nextRank.clientsNeeded} ${nextRank.clientsNeeded === 1 ? 'cliente activo' : 'clientes activos'} este mes para subir a ${nextRank.rankEmoji} ${nextRank.rank} y comisionar al ${nextRank.targetPercentage ?? 15}% de cada pago.`;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#0f172a', '--color': '#ffffff' } as any}>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle style={{ fontWeight: 800 }}>Panel del Promotor</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="solid"
              color="success"
              size="small"
              onClick={() => window.open('/manual-promotores.html', '_blank')}
              style={{ fontWeight: 700 }}
              title="Abrir Manual de Campo Oficial y Guía de Ventas"
            >
              <IonIcon icon={bookOutline} slot="start" />
              Guía Oficial
            </IonButton>
            <IonButton
              fill="clear"
              color="light"
              size="small"
              onClick={() => setIsTermsModalOpen(true)}
              style={{ fontWeight: 600 }}
              title="Ver Términos y Condiciones"
            >
              <IonIcon icon={documentTextOutline} slot="start" />
              Términos
            </IonButton>
            <IonButton
              fill="outline"
              color="light"
              size="small"
              onClick={() => setIsPayoutModalOpen(true)}
              style={{ fontWeight: 600, marginRight: '8px' }}
            >
              <IonIcon icon={settingsOutline} slot="start" />
              Cuentas de Cobro
            </IonButton>
            <IonButton onClick={fetchStats} title="Recargar">
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <IonSpinner name="crescent" color="primary" />
            <p style={{ color: '#64748b', marginTop: '12px', fontWeight: 600 }}>Cargando tu tablero de comisiones...</p>
          </div>
        )}

        {!loading && stats && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* ENCABEZADO DE BIENVENIDA */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Embajador Oficial FinoWork
                  </span>

                  <span style={{
                    background: '#10b981',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}>
                    Comisión Actual: {commissionPercentage}%
                  </span>
                </div>

                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 4px 0' }}>
                  ¡Hola, {user?.username}! 👋
                </h1>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px', maxWidth: '640px' }}>
                  Recibe del <strong>10% al 20%</strong> sobre cada pago (mensual, trimestral o anual) que realicen tus comercios referidos activos.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '12px 18px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tu Código de Promotor
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em', marginTop: '2px' }}>
                  {stats.code}
                </div>
              </div>
            </div>

            {/* CAJA DE ENLACE DE AFILIADO */}
            <IonCard style={{ margin: '0 0 20px 0', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <IonCardContent style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <IonIcon icon={shareSocialOutline} style={{ color: '#2563eb', fontSize: '20px' }} />
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                    Tu Enlace de Afiliado Exclusivo
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Comparte este enlace directamente con los dueños de negocios para que el sistema vincule automáticamente su comercio a tu cuenta.
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: '220px'
                  }}>
                    {affiliateLink}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <IonButton
                      size="small"
                      color="primary"
                      onClick={() => copyToClipboard(affiliateLink, 'Enlace de afiliado')}
                      style={{ fontWeight: 700 }}
                    >
                      <IonIcon icon={copyOutline} slot="start" />
                      Copiar Link
                    </IonButton>
                    <IonButton
                      size="small"
                      color="success"
                      onClick={handleShareWhatsApp}
                      style={{ fontWeight: 700 }}
                    >
                      <IonIcon icon={logoWhatsapp} slot="start" />
                      Compartir por WhatsApp
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* ACCESO DIRECTO AL MANUAL Y GUÍA DE VENTAS */}
            <IonCard style={{
              margin: '0 0 20px 0',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(to right, #ffffff, #f0fdf4)',
              borderLeft: '5px solid #10b981',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <IonCardContent style={{ padding: '18px 20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div style={{ flex: '1 1 340px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '22px' }}>📖</span>
                      <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                        Manual de Campo Oficial & Guía de Ventas
                      </span>
                      <span style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}>
                        Material de Apoyo
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.45' }}>
                      Consulta el guion de venta de 2 minutos para mostrador, la escalera oficial de comisiones (50% en activación y 10% a 20% recurrente), los bonos por metas y capturas paso a paso de los flujos de FinoWork listas para mostrar a los comercios.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <IonButton
                      color="success"
                      size="small"
                      onClick={() => window.open('/manual-promotores.html', '_blank')}
                      style={{ fontWeight: 700 }}
                    >
                      <IonIcon icon={openOutline} slot="start" />
                      Ver Guía en Línea
                    </IonButton>
                    <IonButton
                      fill="outline"
                      color="dark"
                      size="small"
                      onClick={() => window.open('/manual-promotores.html', '_blank')}
                      style={{ fontWeight: 600 }}
                      title="Abrir e imprimir / guardar versión PDF"
                    >
                      <IonIcon icon={documentTextOutline} slot="start" />
                      Guardar PDF
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* SECCIÓN SUPERIOR CON KPI CARDS */}
            <IonGrid style={{ padding: 0, marginBottom: '20px' }}>
              <IonRow>
                {/* KPI 1: Ganado Este Mes */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #10b981', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Ganado Este Mes
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                        ${(stats.monthlyEarnedUSD ?? 0).toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500, color: '#10b981' }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                        ✅ Pagado mes: ${(stats.monthlyPaidUSD ?? 0).toFixed(2)} • ⏳ Pend: ${(stats.monthlyPendingUSD ?? 0).toFixed(2)}
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 2: Ya Pagado / Liquidado */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #6366f1', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Ya Pagado (Liquidado)
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#6366f1', marginTop: '6px' }}>
                        ${stats.totalPaidBalanceUSD.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                        🎉 Transferido a tu cuenta
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 3: Saldo Pendiente por Cobrar */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #ea580c', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Por Cobrar (Pendiente)
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#ea580c', marginTop: '6px' }}>
                        ${stats.totalPendingBalanceUSD.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ea580c', marginTop: '4px', fontWeight: 600 }}>
                        ⏳ Listo para liquidación
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 4: Clientes Activos y Total Histórico */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #0284c7', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Clientes Activos ({commissionPercentage}%)
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                        {activeClientsCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>activos</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                        Histórico ganado: ${stats.totalCommissionsEarnedUSD.toFixed(2)} USD
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* BARRA DE PROGRESO DINÁMICA: ESCALERA DE NIVELES Y PORCENTAJES */}
            <IonCard style={{ margin: '0 0 20px 0', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={ribbonOutline} style={{ color: '#d97706', fontSize: '22px' }} />
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                      Escala Oficial de Comisiones por Clientes Activos
                    </span>
                  </div>
                  <IonBadge style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                    {activeClientsCount} {activeClientsCount === 1 ? 'cliente activo' : 'clientes activos'} este mes
                  </IonBadge>
                </div>

                <IonProgressBar
                  value={progressValue}
                  color={progressValue >= 1 ? 'success' : 'primary'}
                  style={{ height: '10px', borderRadius: '6px', marginBottom: '10px' }}
                />

                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                  {progressText}
                </div>

                {/* LOS 3 ESCALONES OFICIALES */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  {/* Escalón 1: 1 a 49 */}
                  <div style={{
                    background: (activeClientsCount >= 1 && activeClientsCount < 50) ? '#f0fdf4' : (activeClientsCount === 0 ? '#fffbeb' : '#f8fafc'),
                    padding: '14px',
                    borderRadius: '12px',
                    border: (activeClientsCount >= 1 && activeClientsCount < 50) ? '2px solid #10b981' : (activeClientsCount === 0 ? '1px dashed #f59e0b' : '1px solid #e2e8f0'),
                    position: 'relative'
                  }}>
                    {activeClientsCount < 50 && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '12px',
                        background: activeClientsCount >= 1 ? '#10b981' : '#f59e0b',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {activeClientsCount >= 1 ? 'Nivel Actual' : 'Inicial'}
                      </span>
                    )}
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🥉</span> 1 a 49 Clientes Activos
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      10% <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>de cada pago</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Aprox. <strong>$2.00 USD</strong> por mensualidad ($20).
                    </div>
                  </div>

                  {/* Escalón 2: 50 a 99 */}
                  <div style={{
                    background: (activeClientsCount >= 50 && activeClientsCount < 100) ? '#f0fdf4' : '#f8fafc',
                    padding: '14px',
                    borderRadius: '12px',
                    border: (activeClientsCount >= 50 && activeClientsCount < 100) ? '2px solid #10b981' : '1px solid #e2e8f0',
                    position: 'relative'
                  }}>
                    {activeClientsCount >= 50 && activeClientsCount < 100 && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '12px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Nivel Actual
                      </span>
                    )}
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🥈</span> 50 a 99 Clientes Activos
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      15% <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>de cada pago</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Aprox. <strong>$3.00 USD</strong> por mensualidad ($20).
                    </div>
                  </div>

                  {/* Escalón 3: 100+ */}
                  <div style={{
                    background: activeClientsCount >= 100 ? '#f0fdf4' : '#f8fafc',
                    padding: '14px',
                    borderRadius: '12px',
                    border: activeClientsCount >= 100 ? '2px solid #10b981' : '1px solid #e2e8f0',
                    position: 'relative'
                  }}>
                    {activeClientsCount >= 100 && (
                      <span style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '12px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase'
                      }}>
                        Nivel Máximo
                      </span>
                    )}
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🥇</span> 100+ Clientes Activos
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      20% <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>de cada pago</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Aprox. <strong>$4.00 USD</strong> por mensualidad ($20).
                    </div>
                  </div>
                </div>

                {/* Aclaratoria de Porcentajes sobre Pagos Trimestrales / Anuales */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#334155'
                }}>
                  <IonIcon icon={cashOutline} style={{ fontSize: '22px', color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <strong>Liquidación 100% Porcentual:</strong> Si un cliente referido paga un trimestre ($60) o el año completo ($200), recibes el porcentaje correspondiente (10%, 15% o 20%) de ese pago íntegro (ejemplo: $9 o $12 por un trimestre, $30 o $40 por una anualidad).
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* TARJETA DE METAS HISTÓRICAS DE ACTIVACIÓN Y BONOS ÚNICOS */}
            <IonCard style={{ margin: '0 0 20px 0', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>🎯</span>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                      Metas Históricas de Activación Comercial
                    </span>
                  </div>
                  {stats?.totalBonusCommissionsUSD !== undefined && stats.totalBonusCommissionsUSD > 0 && (
                    <IonBadge style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                      🎁 ${stats.totalBonusCommissionsUSD.toFixed(2)} USD en Bonos Cobrados
                    </IonBadge>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 14px 0' }}>
                  Premian tu constancia captando nuevos comercios. Cada bono se acredita <strong>una única vez de forma definitiva</strong> al alcanzar el número acumulado de activaciones comerciales en tu historia como promotor (no se pierden ni se duplican si un cliente concluye su suscripción más adelante).
                </p>

                {stats?.nextMilestone ? (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ color: '#0f172a' }}>Próxima meta: {stats.nextMilestone.label}</span>
                      <span style={{ color: '#10b981' }}>Bono: +${stats.nextMilestone.bonusUSD} USD</span>
                    </div>
                    <IonProgressBar
                      value={stats.nextMilestone.progressPercentage / 100}
                      color="success"
                      style={{ height: '8px', borderRadius: '4px', marginBottom: '6px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Te {stats.nextMilestone.activationsNeeded === 1 ? 'falta' : 'faltan'} <strong>{stats.nextMilestone.activationsNeeded} {stats.nextMilestone.activationsNeeded === 1 ? 'activación comercial' : 'activaciones comerciales'}</strong> para desbloquear este bono único en tu panel.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '10px', color: '#065f46', fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>
                    🏆 ¡Felicitaciones! Has completado todas las metas de activación comercial disponibles.
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                }}>
                  {[
                    { count: 5, bonus: 10, label: '5 Comercios' },
                    { count: 10, bonus: 25, label: '10 Comercios' },
                    { count: 20, bonus: 50, label: '20 Comercios' },
                    { count: 50, bonus: 100, label: '50 Comercios' },
                  ].map((m) => {
                    const totalActs = (stats?.recentCommissions || []).filter((c) => c.type === 'ACTIVATION').length;
                    const isUnlocked = totalActs >= m.count;
                    return (
                      <div
                        key={m.count}
                        style={{
                          background: isUnlocked ? '#f0fdf4' : '#f8fafc',
                          border: isUnlocked ? '2px solid #10b981' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: isUnlocked ? '#15803d' : '#64748b' }}>
                          {isUnlocked ? '✅ Desbloqueado' : m.label}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                          +${m.bonus} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          al activar {m.count} clientes
                        </div>
                      </div>
                    );
                  })}
                </div>
              </IonCardContent>
            </IonCard>

            {/* SECCIÓN DE COMERCIOS AFILIADOS Y SEGUIMIENTO ACTIVO */}
            <IonCard style={{ margin: '0 0 24px 0', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
              <IonCardHeader style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 20px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <IonCardTitle style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={businessOutline} style={{ color: 'var(--theme-primary, #10b981)' }} />
                      Comercios Referidos ({totalTenantsCount})
                    </IonCardTitle>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Monitorea el estado de tus referidos, su satisfacción con el sistema y contáctalos directamente.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonBadge style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700, padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}>
                      {filteredTenants.length} {filteredTenants.length === 1 ? 'comercio visible' : 'comercios visibles'}
                    </IonBadge>
                  </div>
                </div>

                {/* FILTROS POR ESTADO DE CLIENTE */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingTop: '16px',
                  paddingBottom: '4px',
                  scrollbarWidth: 'none',
                }}>
                  {/* Tab: Todos */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                      background: statusFilter === 'ALL' ? 'var(--theme-primary, #10b981)' : '#ffffff',
                      color: statusFilter === 'ALL' ? 'var(--theme-primary-contrast, #ffffff)' : '#334155',
                      border: statusFilter === 'ALL' ? '1px solid var(--theme-primary, #10b981)' : '1px solid #cbd5e1',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>Todos</span>
                    <span style={{
                      background: statusFilter === 'ALL' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: statusFilter === 'ALL' ? '#ffffff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      {totalTenantsCount}
                    </span>
                  </button>

                  {/* Tab: Activos */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    style={{
                      background: statusFilter === 'ACTIVE' ? '#10b981' : '#f0fdf4',
                      color: statusFilter === 'ACTIVE' ? '#ffffff' : '#15803d',
                      border: statusFilter === 'ACTIVE' ? '1px solid #10b981' : '1px solid #bbf7d0',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>🟢 Activos</span>
                    <span style={{
                      background: statusFilter === 'ACTIVE' ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                      color: statusFilter === 'ACTIVE' ? '#ffffff' : '#15803d',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      {activeCount}
                    </span>
                  </button>

                  {/* Tab: Por Pagar / Vencidos */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PAST_DUE')}
                    style={{
                      background: statusFilter === 'PAST_DUE' ? '#f59e0b' : '#fffbeb',
                      color: statusFilter === 'PAST_DUE' ? '#ffffff' : '#b45309',
                      border: statusFilter === 'PAST_DUE' ? '1px solid #f59e0b' : '1px solid #fde68a',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>⚠️ Por Pagar</span>
                    <span style={{
                      background: statusFilter === 'PAST_DUE' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                      color: statusFilter === 'PAST_DUE' ? '#ffffff' : '#b45309',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      {pastDueCount}
                    </span>
                  </button>

                  {/* Tab: En Prueba */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('TRIAL')}
                    style={{
                      background: statusFilter === 'TRIAL' ? '#0284c7' : '#e0f2fe',
                      color: statusFilter === 'TRIAL' ? '#ffffff' : '#0369a1',
                      border: statusFilter === 'TRIAL' ? '1px solid #0284c7' : '1px solid #bae6fd',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>🔷 En Prueba</span>
                    <span style={{
                      background: statusFilter === 'TRIAL' ? 'rgba(255,255,255,0.25)' : '#bae6fd',
                      color: statusFilter === 'TRIAL' ? '#ffffff' : '#0369a1',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      {trialCount}
                    </span>
                  </button>

                  {/* Tab: Dados de Baja */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('INACTIVE')}
                    style={{
                      background: statusFilter === 'INACTIVE' ? '#ef4444' : '#fef2f2',
                      color: statusFilter === 'INACTIVE' ? '#ffffff' : '#b91c1c',
                      border: statusFilter === 'INACTIVE' ? '1px solid #ef4444' : '1px solid #fecaca',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>⛔ Dados de Baja</span>
                    <span style={{
                      background: statusFilter === 'INACTIVE' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                      color: statusFilter === 'INACTIVE' ? '#ffffff' : '#b91c1c',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}>
                      {inactiveCount}
                    </span>
                  </button>
                </div>

                {/* BUSCADOR DE COMERCIOS / CONTACTOS */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0 12px',
                    height: '42px',
                  }}>
                    <IonIcon icon={searchOutline} style={{ color: '#64748b', fontSize: '18px', marginRight: '8px' }} />
                    <input
                      type="text"
                      placeholder="Buscar por negocio, dueño, teléfono o correo..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        width: '100%',
                        fontSize: '13px',
                        color: '#1e293b',
                      }}
                    />
                    {searchFilter && (
                      <button
                        type="button"
                        onClick={() => setSearchFilter('')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: '4px',
                          fontSize: '14px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </IonCardHeader>

              <IonCardContent style={{ padding: 0 }}>
                {allAffiliated.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    <IonIcon icon={businessOutline} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '10px' }} />
                    <p style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b', margin: 0 }}>Aún no tienes comercios afiliados</p>
                    <p style={{ fontSize: '13px', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                      Comparte tu enlace de promotor oficial por WhatsApp o redes para que tus primeros clientes se registren y aparezcan aquí.
                    </p>
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: '42px', color: '#cbd5e1', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', margin: 0 }}>No hay comercios con este criterio</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>
                      Prueba con otro estado o elimina los filtros de búsqueda.
                    </p>
                    <IonButton
                      fill="outline"
                      size="small"
                      color="dark"
                      style={{ marginTop: '10px', fontWeight: 600 }}
                      onClick={() => {
                        setStatusFilter('ALL');
                        setSearchFilter('');
                      }}
                    >
                      Restablecer Filtros
                    </IonButton>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', display: 'block' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 16px' }}>Negocio y Contacto</th>
                          <th style={{ padding: '12px 16px' }}>Estado y Período</th>
                          <th style={{ padding: '12px 16px' }}>1ª Activación</th>
                          <th style={{ padding: '12px 16px' }}>Renovaciones</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Ganado</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acción Directa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTenants.map((t) => {
                          const cleanPhone = cleanWhatsAppPhone(t.ownerPhone);

                          return (
                            <tr key={t.tenantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {/* Columna: Negocio y Contacto */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                                  {t.tenantName}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  Plan: <span style={{ fontWeight: 600, color: '#334155' }}>{t.planType}</span> • Reg: {new Date(t.createdAt).toLocaleDateString('es-VE')}
                                </div>

                                <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {t.ownerName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: 600 }}>
                                      <IonIcon icon={personOutline} style={{ fontSize: '13px', color: '#64748b' }} />
                                      <span>{t.ownerName}</span>
                                    </div>
                                  )}
                                  {t.ownerPhone ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                                      <IonIcon icon={callOutline} style={{ fontSize: '13px', color: '#64748b' }} />
                                      <span>{t.ownerPhone}</span>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>Sin teléfono</span>
                                  )}
                                  {t.ownerEmail && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px' }}>
                                      <IonIcon icon={mailOutline} style={{ fontSize: '13px' }} />
                                      <span>{t.ownerEmail}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Columna: Estado y Vencimiento */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                {t.subStatus === 'ACTIVE' && (
                                  <div>
                                    <span style={{
                                      background: '#f0fdf4',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      display: 'inline-block',
                                    }}>
                                      🟢 ACTIVO
                                    </span>
                                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                                      {t.daysRemaining !== null && t.daysRemaining !== undefined
                                        ? `${t.daysRemaining} días restantes`
                                        : 'Al día'}
                                    </div>
                                  </div>
                                )}

                                {t.subStatus === 'PAST_DUE' && (
                                  <div>
                                    <span style={{
                                      background: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      display: 'inline-block',
                                    }}>
                                      ⚠️ POR PAGAR
                                    </span>
                                    <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
                                      {t.daysOverdue !== null && t.daysOverdue !== undefined
                                        ? `Vencido hace ${t.daysOverdue} d`
                                        : 'Cuota vencida'}
                                    </div>
                                  </div>
                                )}

                                {t.subStatus === 'TRIAL' && (
                                  <div>
                                    <span style={{
                                      background: '#e0f2fe',
                                      color: '#0369a1',
                                      border: '1px solid #bae6fd',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      display: 'inline-block',
                                    }}>
                                      🔷 EN PRUEBA
                                    </span>
                                    <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginTop: '4px' }}>
                                      {t.daysRemaining !== null && t.daysRemaining !== undefined
                                        ? `${t.daysRemaining} días restantes`
                                        : 'Prueba activa'}
                                    </div>
                                  </div>
                                )}

                                {t.subStatus === 'INACTIVE' && (
                                  <div>
                                    <span style={{
                                      background: '#fef2f2',
                                      color: '#b91c1c',
                                      border: '1px solid #fecaca',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      display: 'inline-block',
                                    }}>
                                      ⛔ DADO DE BAJA
                                    </span>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                      Inactivo / Cancelado
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Columna: Primera Activación */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                {t.activationCommission ? (
                                  <div>
                                    <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '13px' }}>
                                      ✓ ${t.activationCommission.amountUSD.toFixed(2)} USD
                                    </span>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {t.activationCommission.status === 'PAID' ? 'Liquidado' : 'Por liquidar'}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                    ⏳ Pendiente
                                  </span>
                                )}
                              </td>

                              {/* Columna: Renovaciones Recurrentes */}
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                {t.recurringCommissionsCount > 0 ? (
                                  <div>
                                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '13px' }}>
                                      ${t.recurringCommissionsUSD.toFixed(2)} USD
                                    </span>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {t.recurringCommissionsCount} {t.recurringCommissionsCount === 1 ? 'cuota' : 'cuotas'}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                    0 cuotas
                                  </span>
                                )}
                              </td>

                              {/* Columna: Total Generado y Estado de Pago */}
                              <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: t.totalCommissionsUSD > 0 ? '#0f172a' : '#94a3b8' }}>
                                  ${t.totalCommissionsUSD.toFixed(2)} USD
                                </span>
                                {(t.monthlyCommissionsUSD ?? 0) > 0 && (
                                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                                    Este mes: ${(t.monthlyCommissionsUSD ?? 0).toFixed(2)}
                                  </div>
                                )}
                                {t.totalCommissionsUSD > 0 && (
                                  <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                    {(t.paidCommissionsUSD ?? 0) > 0 && (
                                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                        ✅ Pagado: ${(t.paidCommissionsUSD ?? 0).toFixed(2)}
                                      </span>
                                    )}
                                    {(t.pendingCommissionsUSD ?? 0) > 0 && (
                                      <span style={{ color: '#ea580c', fontWeight: 600 }}>
                                        ⏳ Por cobrar: ${(t.pendingCommissionsUSD ?? 0).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Columna: Acción Directa (Escribir WhatsApp) */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenContactModal(t)}
                                  style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <IonIcon icon={logoWhatsapp} style={{ fontSize: '16px' }} />
                                  <span>Escribir</span>
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                                  {cleanPhone && (
                                    <a
                                      href={`tel:${t.ownerPhone}`}
                                      title="Llamar al cliente"
                                      style={{
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <IonIcon icon={callOutline} style={{ fontSize: '13px' }} />
                                    </a>
                                  )}
                                  {t.ownerEmail && (
                                    <a
                                      href={`mailto:${t.ownerEmail}`}
                                      title="Enviar correo"
                                      style={{
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <IonIcon icon={mailOutline} style={{ fontSize: '13px' }} />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            {/* SECCIÓN DE HISTORIAL DE COMISIONES Y PAGOS RECIBIDOS */}
            <IonCard style={{ margin: '0 0 24px 0', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#ffffff', overflow: 'hidden' }}>
              <IonCardHeader style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 20px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={cashOutline} style={{ color: '#10b981' }} />
                      Historial de Comisiones y Pagos Recibidos
                    </IonCardTitle>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Detalle transparente de lo que has ganado este mes, lo que ya te fue liquidado (con referencia de pago) y lo que está pendiente por cobrar.
                    </p>
                  </div>

                  {/* Resumen rápido en píldoras */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                      📅 Ganado este mes: ${(stats.monthlyEarnedUSD ?? 0).toFixed(2)} USD
                    </span>
                    <span style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                      ✅ Ya Pagado: ${stats.totalPaidBalanceUSD.toFixed(2)} USD
                    </span>
                    <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800 }}>
                      ⏳ Por Cobrar: ${stats.totalPendingBalanceUSD.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Filtros de Historial de Pagos */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setCommissionFilter('ALL')}
                    style={{
                      background: commissionFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
                      color: commissionFilter === 'ALL' ? '#ffffff' : '#475569',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Todos ({stats.recentCommissions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionFilter('THIS_MONTH')}
                    style={{
                      background: commissionFilter === 'THIS_MONTH' ? '#0284c7' : '#e0f2fe',
                      color: commissionFilter === 'THIS_MONTH' ? '#ffffff' : '#0369a1',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📅 Ganado Este Mes
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionFilter('PAID')}
                    style={{
                      background: commissionFilter === 'PAID' ? '#10b981' : '#f0fdf4',
                      color: commissionFilter === 'PAID' ? '#ffffff' : '#15803d',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Ya Pagados ({stats.recentCommissions.filter((c) => c.status === 'PAID').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionFilter('PENDING')}
                    style={{
                      background: commissionFilter === 'PENDING' ? '#ea580c' : '#fff7ed',
                      color: commissionFilter === 'PENDING' ? '#ffffff' : '#c2410c',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⏳ Por Cobrar ({stats.recentCommissions.filter((c) => c.status === 'PENDING').length})
                  </button>
                </div>
              </IonCardHeader>

              <IonCardContent style={{ padding: 0 }}>
                {(() => {
                  const now = new Date();
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();

                  const filteredComms = (stats.recentCommissions || []).filter((c) => {
                    if (commissionFilter === 'PAID') return c.status === 'PAID';
                    if (commissionFilter === 'PENDING') return c.status === 'PENDING';
                    if (commissionFilter === 'THIS_MONTH') {
                      const d = new Date(c.createdAt);
                      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    }
                    return true;
                  });

                  if (filteredComms.length === 0) {
                    return (
                      <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
                        <IonIcon icon={cashOutline} style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '8px' }} />
                        <p style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', margin: 0 }}>
                          No hay movimientos registrados en este filtro
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ overflowX: 'auto', display: 'block' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 16px' }}>Fecha</th>
                            <th style={{ padding: '12px 16px' }}>Comercio Referido</th>
                            <th style={{ padding: '12px 16px' }}>Concepto</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Comisión Ganada</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estado de Pago</th>
                            <th style={{ padding: '12px 16px' }}>Liquidación / Referencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredComms.map((comm) => (
                            <tr key={comm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                                {new Date(comm.createdAt).toLocaleDateString('es-VE')}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                                <div>{comm.tenantName || 'Comercio Referido'}</div>
                                {comm.notes && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{comm.notes}</div>}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: '#334155' }}>
                                {comm.type === 'ACTIVATION' ? '⭐ 1ª Activación (50%)' : comm.type === 'BONUS' ? '🎁 Bono por Meta' : '🔄 Renovación de Suscripción'}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                                ${Number(comm.amountUSD).toFixed(2)} USD
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                {comm.status === 'PAID' ? (
                                  <span style={{
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '3px 10px',
                                    borderRadius: '10px',
                                    display: 'inline-block',
                                  }}>
                                    ✅ YA PAGADO
                                  </span>
                                ) : comm.status === 'PENDING' ? (
                                  <span style={{
                                    background: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #fed7aa',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '3px 10px',
                                    borderRadius: '10px',
                                    display: 'inline-block',
                                  }}>
                                    ⏳ POR COBRAR
                                  </span>
                                ) : (
                                  <span style={{
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 10px',
                                    borderRadius: '10px',
                                    display: 'inline-block',
                                  }}>
                                    Cancelado
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                                {comm.status === 'PAID' ? (
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#15803d' }}>
                                      Pagado el {comm.paidAt ? new Date(comm.paidAt).toLocaleDateString('es-VE') : '—'}
                                    </div>
                                    {comm.paymentReference && (
                                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                        Ref: {comm.paymentReference}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                    Pendiente de liquidación
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* MODAL OBLIGATORIO / CONSULTA: TÉRMINOS, CONDICIONES Y PRIVACIDAD */}
        <IonModal
          isOpen={isTermsModalOpen}
          backdropDismiss={stats?.termsAccepted ?? false}
          onDidDismiss={() => {
            if (stats?.termsAccepted) {
              setIsTermsModalOpen(false);
            }
          }}
        >
          <IonHeader>
            <IonToolbar style={{ '--background': '#0f172a', '--color': '#ffffff' } as any}>
              <IonTitle style={{ fontWeight: 800, fontSize: '16px' }}>
                {stats?.termsAccepted ? 'Términos y Condiciones del Promotor' : '⚠️ Aceptación Obligatoria de Términos'}
              </IonTitle>
              {stats?.termsAccepted && (
                <IonButtons slot="end">
                  <IonButton onClick={() => setIsTermsModalOpen(false)} style={{ color: '#ffffff' }}>
                    Cerrar
                  </IonButton>
                </IonButtons>
              )}
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
            <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '30px' }}>
              {!stats?.termsAccepted && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#92400e'
                }}>
                  <IonIcon icon={alertCircleOutline} style={{ fontSize: '28px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      Acceso Restringido: Firma Digital Requerida
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '2px' }}>
                      Como Promotor Oficial de FinoWork, para activar tu enlace de afiliados y comenzar a generar comisiones debes leer y aceptar formalmente los Términos y Condiciones y la Política de Privacidad.
                    </div>
                  </div>
                </div>
              )}

              <PromoterTermsContent />

              {/* BARRA INFERIOR DE ACEPTACIÓN */}
              {!stats?.termsAccepted ? (
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                  marginTop: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <IonCheckbox
                      checked={termsAcceptedCheckbox}
                      onIonChange={(e) => setTermsAcceptedCheckbox(e.detail.checked)}
                      style={{ marginTop: '2px' }}
                    />
                    <label
                      onClick={() => setTermsAcceptedCheckbox(!termsAcceptedCheckbox)}
                      style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', lineHeight: '1.4' }}
                    >
                      Declaro que he leído atentamente, comprendo y acepto expresamente los <strong>Términos y Condiciones del Programa de Promotores</strong> y la <strong>Política de Privacidad de FinoWork</strong>, comprometiéndome a actuar con honestidad comercial e independencia mercantil.
                    </label>
                  </div>

                  <IonButton
                    expand="block"
                    color="success"
                    disabled={!termsAcceptedCheckbox || isAcceptingTerms}
                    onClick={handleAcceptTerms}
                    style={{ fontWeight: 800, height: '44px' }}
                  >
                    {isAcceptingTerms ? <IonSpinner name="dots" /> : 'Aceptar Términos y Entrar al Tablero Oficial'}
                  </IonButton>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: '#ecfdf5',
                  borderRadius: '12px',
                  border: '1px solid #a7f3d0',
                  marginTop: '20px'
                }}>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '20px' }} />
                    Términos aceptados digitalmente {stats.termsAcceptedAt ? `el ${new Date(stats.termsAcceptedAt).toLocaleDateString()} a las ${new Date(stats.termsAcceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                  <IonButton
                    fill="outline"
                    color="dark"
                    size="small"
                    onClick={() => setIsTermsModalOpen(false)}
                    style={{ marginTop: '10px', fontWeight: 700 }}
                  >
                    Entendido, Cerrar
                  </IonButton>
                </div>
              )}
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: DATOS DE COBRO DEL PROMOTOR */}
        <IonModal isOpen={isPayoutModalOpen} onDidDismiss={() => setIsPayoutModalOpen(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle style={{ fontWeight: 700 }}>Configuración de Cuentas de Cobro</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsPayoutModalOpen(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <p style={{ color: '#475569', fontSize: '13px', marginBottom: '16px' }}>
                Ingresa tus datos donde el SuperAdmin de FinoWork liquidará tus comisiones por Pago Móvil o Binance Pay.
              </p>

              <IonCard style={{ margin: 0, borderRadius: '12px' }}>
                <IonCardContent>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    📱 Pago Móvil (Venezuela)
                  </h3>

                  <div style={{ marginBottom: '12px' }}>
                    <BankSelect
                      label="Banco Receptor"
                      value={pagoMovilBank}
                      onChange={(val) => setPagoMovilBank(val)}
                      placeholder="Selecciona tu banco..."
                    />
                  </div>

                  <IonItem lines="full" style={{ marginBottom: '10px' }}>
                    <IonLabel position="stacked">Número de Teléfono</IonLabel>
                    <IonInput
                      type="tel"
                      placeholder="Ej: 04141234567"
                      value={pagoMovilPhone}
                      onIonInput={(e) => setPagoMovilPhone(e.detail.value || '')}
                    />
                  </IonItem>

                  <IonItem lines="full" style={{ marginBottom: '18px' }}>
                    <IonLabel position="stacked">Cédula de Identidad</IonLabel>
                    <IonInput
                      placeholder="Ej: V-12345678"
                      value={pagoMovilCedula}
                      onIonInput={(e) => setPagoMovilCedula(e.detail.value || '')}
                    />
                  </IonItem>

                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    🪙 Binance Pay / USDT
                  </h3>

                  <IonItem lines="full" style={{ marginBottom: '20px' }}>
                    <IonLabel position="stacked">Binance Pay ID o Correo Binance</IonLabel>
                    <IonInput
                      placeholder="Ej: 123456789 o correo@binance.com"
                      value={binancePayId}
                      onIonInput={(e) => setBinancePayId(e.detail.value || '')}
                    />
                  </IonItem>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <IonButton
                      fill="outline"
                      color="medium"
                      style={{ flex: 1 }}
                      onClick={() => setIsPayoutModalOpen(false)}
                    >
                      Cancelar
                    </IonButton>
                    <IonButton
                      color="primary"
                      style={{ flex: 2, fontWeight: 700 }}
                      disabled={isSavingPayout}
                      onClick={handleSavePayoutDetails}
                    >
                      {isSavingPayout ? <IonSpinner name="dots" /> : 'Guardar Cuentas'}
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          </IonContent>
        </IonModal>

        {/* MODAL: ESCRIBIR Y CONTACTAR AL CLIENTE */}
        <IonModal
          isOpen={isContactModalOpen}
          onDidDismiss={() => {
            setIsContactModalOpen(false);
            setContactTenant(null);
          }}
        >
          <IonHeader>
            <IonToolbar style={{ '--background': '#0f172a', '--color': '#ffffff' } as any}>
              <IonTitle style={{ fontWeight: 800, fontSize: '16px' }}>
                {contactTenant ? `Escribir a ${contactTenant.tenantName}` : 'Contactar Referido'}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsContactModalOpen(false)} style={{ color: '#ffffff' }}>
                  Cerrar
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
            {contactTenant && (
              <div style={{ maxWidth: '650px', margin: '0 auto', paddingBottom: '30px' }}>
                {/* TARJETA RESUMEN DEL CLIENTE */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                        {contactTenant.tenantName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Plan: <strong style={{ color: '#334155' }}>{contactTenant.planType}</strong>
                      </div>
                    </div>

                    <div>
                      {contactTenant.subStatus === 'ACTIVE' && (
                        <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '10px' }}>
                          🟢 ACTIVO ({contactTenant.daysRemaining !== null ? `${contactTenant.daysRemaining} d restantes` : 'Al día'})
                        </span>
                      )}
                      {contactTenant.subStatus === 'PAST_DUE' && (
                        <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '10px' }}>
                          ⚠️ POR PAGAR ({contactTenant.daysOverdue !== null ? `Vencido hace ${contactTenant.daysOverdue} d` : 'Pendiente'})
                        </span>
                      )}
                      {contactTenant.subStatus === 'TRIAL' && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '10px' }}>
                          🔷 EN PRUEBA ({contactTenant.daysRemaining !== null ? `${contactTenant.daysRemaining} d restantes` : 'Prueba'})
                        </span>
                      )}
                      {contactTenant.subStatus === 'INACTIVE' && (
                        <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '10px' }}>
                          ⛔ DADO DE BAJA / INACTIVO
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '12px',
                  }}>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 600 }}>Dueño / Contacto:</div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {contactTenant.ownerName || 'No registrado'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 600 }}>Teléfono registrado:</div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {contactTenant.ownerPhone || 'Sin teléfono'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 600 }}>Correo electrónico:</div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {contactTenant.ownerEmail || 'Sin correo'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ALERTA CONTEXTUAL DE RECOMENDACIÓN */}
                {contactTenant.subStatus === 'PAST_DUE' && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#92400e',
                    fontSize: '13px',
                  }}>
                    <IonIcon icon={alertCircleOutline} style={{ fontSize: '24px', flexShrink: 0, color: '#f59e0b' }} />
                    <div>
                      <strong>Cuota de suscripción pendiente:</strong> Este cliente se encuentra en mora. Un mensaje empático ofreciéndole asistencia con Pago Móvil o Binance Pay suele agilizar el pago y mantener tu comisión activa.
                    </div>
                  </div>
                )}

                {contactTenant.subStatus === 'ACTIVE' && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#166534',
                    fontSize: '13px',
                  }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '24px', flexShrink: 0, color: '#10b981' }} />
                    <div>
                      <strong>Cliente Activo y al Día:</strong> Escribirle para consultar qué tal le va con el sistema demuestra atención profesional, resuelve dudas tempranas y previene bajas futuras.
                    </div>
                  </div>
                )}

                {contactTenant.subStatus === 'TRIAL' && (
                  <div style={{
                    background: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#075985',
                    fontSize: '13px',
                  }}>
                    <IonIcon icon={timeOutline} style={{ fontSize: '24px', flexShrink: 0, color: '#0284c7' }} />
                    <div>
                      <strong>En período de prueba:</strong> Ayudarle a cargar sus primeros productos o probar el punto de venta garantiza que complete su primera mensualidad para que cobres tu activación.
                    </div>
                  </div>
                )}

                {contactTenant.subStatus === 'INACTIVE' && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#991b1b',
                    fontSize: '13px',
                  }}>
                    <IonIcon icon={chatbubbleEllipsesOutline} style={{ fontSize: '24px', flexShrink: 0, color: '#ef4444' }} />
                    <div>
                      <strong>Cuenta Inactiva:</strong> Preguntar cordialmente qué dificultades tuvo o si necesita facilidades para reactivar permite recuperar clientes y feedback valioso.
                    </div>
                  </div>
                )}

                {/* SELECTOR DE PLANTILLAS */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Selecciona una plantilla rápida o edita el texto:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('SATISFACTION')}
                      style={{
                        background: selectedTemplateKey === 'SATISFACTION' ? '#10b981' : '#ffffff',
                        color: selectedTemplateKey === 'SATISFACTION' ? '#ffffff' : '#334155',
                        border: selectedTemplateKey === 'SATISFACTION' ? '1px solid #10b981' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🌟 Monitorear Satisfacción
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('PAYMENT')}
                      style={{
                        background: selectedTemplateKey === 'PAYMENT' ? '#f59e0b' : '#ffffff',
                        color: selectedTemplateKey === 'PAYMENT' ? '#ffffff' : '#334155',
                        border: selectedTemplateKey === 'PAYMENT' ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      💳 Apoyo de Pago
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('TRIAL')}
                      style={{
                        background: selectedTemplateKey === 'TRIAL' ? '#0284c7' : '#ffffff',
                        color: selectedTemplateKey === 'TRIAL' ? '#ffffff' : '#334155',
                        border: selectedTemplateKey === 'TRIAL' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🚀 Asesoría de Prueba
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('RECOVERY')}
                      style={{
                        background: selectedTemplateKey === 'RECOVERY' ? '#ef4444' : '#ffffff',
                        color: selectedTemplateKey === 'RECOVERY' ? '#ffffff' : '#334155',
                        border: selectedTemplateKey === 'RECOVERY' ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Recuperar Cliente
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTemplate('CUSTOM')}
                      style={{
                        background: selectedTemplateKey === 'CUSTOM' ? '#0f172a' : '#ffffff',
                        color: selectedTemplateKey === 'CUSTOM' ? '#ffffff' : '#334155',
                        border: selectedTemplateKey === 'CUSTOM' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Mensaje Libre
                    </button>
                  </div>
                </div>

                {/* TEXTAREA EDITABLE */}
                <div style={{ marginBottom: '18px' }}>
                  <textarea
                    rows={6}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#0f172a',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                    Puedes modificar el texto libremente antes de enviar.
                  </div>
                </div>

                {/* BOTONES DE ENVÍO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    style={{
                      background: cleanWhatsAppPhone(contactTenant.ownerPhone) ? '#10b981' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 20px',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: cleanWhatsAppPhone(contactTenant.ownerPhone) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: cleanWhatsAppPhone(contactTenant.ownerPhone) ? '0 4px 12px rgba(16,185,129,0.35)' : 'none',
                    }}
                  >
                    <IonIcon icon={logoWhatsapp} style={{ fontSize: '22px' }} />
                    <span>Abrir en WhatsApp</span>
                  </button>

                  {!cleanWhatsAppPhone(contactTenant.ownerPhone) && (
                    <div style={{ fontSize: '12px', color: '#ea580c', textAlign: 'center', fontWeight: 600 }}>
                      ⚠️ Este comercio no tiene un número de teléfono registrado. Puedes contactarlo usando el botón de correo a continuación.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {contactTenant.ownerEmail && (
                      <button
                        type="button"
                        onClick={handleSendEmail}
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          color: '#0284c7',
                          border: '1px solid #0284c7',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <IonIcon icon={mailOutline} style={{ fontSize: '16px' }} />
                        <span>Enviar por Correo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copyToClipboard(contactMessage, 'Mensaje')}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <IonIcon icon={copyOutline} style={{ fontSize: '16px' }} />
                      <span>Copiar Texto</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default PromoterDashboard;
