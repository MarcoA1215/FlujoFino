import React, { useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
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
  IonIcon,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonBadge,
} from '@ionic/react';
import {
  saveOutline,
  refreshOutline,
  giftOutline,
  copyOutline,
  logoWhatsapp,
  cashOutline,
  checkmarkCircleOutline,
  warningOutline,
  checkmarkOutline,
  colorPaletteOutline,
  sparklesOutline,
  notificationsOutline,
  volumeHighOutline,
  cloudDownloadOutline,
} from 'ionicons/icons';
import {
  getNotificationPermission,
  registerPushNotifications,
  testPushNotification,
  playNotificationSound,
  type NotificationPermissionState,
} from '../services/push-notification.service';
import { apiClient } from '../api/client';
import { getContrastColor, isColorTooLight, ensureReadableColor, PRESET_THEME_COLORS } from '../utils/colors';
import { getPublicBaseUrl } from '../utils/public-url';
import { AuthContext } from '../context/AuthContext';
import { ReportPaymentModal } from '../components/ReportPaymentModal';
import {
  UserRole,
  TenantPlanType,
  TenantStatus,
  DEFAULT_SUPERADMIN_EMAIL,
  type MySubscriptionDTO,
} from '@finowork/shared-types';
import { BookingSettings } from '../components/BookingSettings';
import { AppHeader } from '../components/AppHeader';
import { BankSelect } from '../components/BankSelect';

interface Settings {
  exchangeRateBs?: number;
  exchangeRateMode?: 'BCV' | 'PARALELO' | 'USDT' | 'EUR' | 'MANUAL' | 'COP';
  manualExchangeRate?: number | null;
  currencySymbol?: string;
  availableRates?: {
    bcv?: number;
    parallel?: number;
    usdt?: number;
    eur?: number;
    updatedAt?: string;
  } | null;
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
  companyAccountNumber?: string;
  companyAccountHolder?: string;
  binancePayId?: string;
  binanceEmail?: string;
  binancePhone?: string;
  allowPartialPayments?: boolean;
  minDepositPercentage?: number;
  allowCashierBypassDeposit?: boolean;
  acceptCashUsd?: boolean;
  acceptPagoMovil?: boolean;
  acceptCardPos?: boolean;
  acceptBinance?: boolean;
  acceptTransfer?: boolean;
  requireApprovalAlways?: boolean;
  featureCustomerSchedules?: boolean;
  featureRecipes?: boolean;
  featureBuySell?: boolean;
  featureProduction?: boolean;
  featureDelivery?: boolean;
  featureShowCatalog?: boolean;
  bookingRequireService?: boolean;
  bookingAllowStaffSelection?: boolean;
  publicToken?: string;
  businessHours?: any;
  services?: any[];
  slotInterval?: number;
  themePrimaryColor?: string;
  themeHeaderColor?: string;
  allowNegativeStock?: boolean;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [subscription, setSubscription] = useState<MySubscriptionDTO | null>(null);
  const [presentToast] = useIonToast();
  const { user } = useContext(AuthContext);

  const isAdmin =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'ADMIN' ||
    (user?.role as string) === 'SUPERADMIN';

  // Subscription Payment Reporting Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [isActivatingNotifications, setIsActivatingNotifications] = useState<boolean>(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState<boolean>(false);

  useEffect(() => {
    const updatePerm = () => setNotificationStatus(getNotificationPermission());
    window.addEventListener('focus', updatePerm);
    return () => window.removeEventListener('focus', updatePerm);
  }, []);

  const handleActivatePush = async () => {
    if (!user) return;
    setIsActivatingNotifications(true);
    const identifier = user.email || user.username || user.id;
    if (!identifier) {
      setIsActivatingNotifications(false);
      return;
    }
    const isSuperAdmin =
      user.role === UserRole.SUPERADMIN ||
      (user.role as string) === 'SUPERADMIN' ||
      user.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
    const role = isSuperAdmin ? 'SUPERADMIN' : (user.role || 'ADMIN');

    try {
      const res = await registerPushNotifications(identifier, user.tenantId, role, true);
      const perm = getNotificationPermission();
      setNotificationStatus(perm);
      if (perm === 'granted' || res.success) {
        presentToast({
          message: '¡Notificaciones activadas con éxito!',
          duration: 3000,
          color: 'success',
          icon: checkmarkCircleOutline,
        });
      } else if (perm === 'denied') {
        presentToast({
          message: 'El navegador tiene las notificaciones bloqueadas. Habilítalas en el candado de la URL.',
          duration: 4500,
          color: 'warning',
          icon: warningOutline,
        });
      }
    } finally {
      setIsActivatingNotifications(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingNotifications(true);
    try {
      const identifier = user?.email || user?.username || user?.id;
      const res = await testPushNotification(identifier, user?.tenantId);
      presentToast({
        message: res.message,
        duration: 3500,
        color: 'success',
        icon: checkmarkCircleOutline,
      });
    } catch {
      presentToast({
        message: 'Alerta sonora y local reproducida con éxito.',
        duration: 3000,
        color: 'success',
      });
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const setRes = await apiClient.get<Settings>('/settings');
      setSettings(setRes.data);
      if (setRes.data?.exchangeRateBs) {
        setExchangeRate(Number(setRes.data.exchangeRateBs));
      }
    } catch (e) {
      presentToast({ message: 'Error cargando ajustes', duration: 3000, color: 'danger' });
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await apiClient.get<MySubscriptionDTO>('/superadmin/my-subscription');
      setSubscription(res.data);
    } catch (e) {
      console.log('Error cargando suscripción:', e);
    }
  };

  const fetchExchangeRate = async (): Promise<number> => {
    try {
      const res = await apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate');
      if (res.data?.exchangeRateBs) {
        const rate = Number(res.data.exchangeRateBs);
        setExchangeRate(rate);
        return rate;
      }
    } catch (e) {
      console.log('Error cargando tasa cambiaria:', e);
    }
    return exchangeRate;
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchExchangeRate();
      fetchSubscription();
    }
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    const isCashUsd = settings.acceptCashUsd !== false;
    const isPagoMovil = settings.acceptPagoMovil !== false;
    const isCardPos = settings.acceptCardPos === true;
    const isBinance = settings.acceptBinance === true;
    const isTransfer = settings.acceptTransfer === true;

    if (!isCashUsd && !isPagoMovil && !isCardPos && !isBinance && !isTransfer) {
      return presentToast({
        message: '⚠️ Debes mantener al menos un método de pago activo (Efectivo USD, Pago Móvil, Punto, Binance o Transferencia).',
        duration: 4500,
        color: 'warning'
      });
    }

    try {
      const payload: Partial<Settings> = { 
        exchangeRateMode: settings.exchangeRateMode || 'BCV',
        exchangeRateBs: Number(settings.exchangeRateBs) || undefined,
        manualExchangeRate: settings.manualExchangeRate !== undefined && settings.manualExchangeRate !== null ? Number(settings.manualExchangeRate) : null,
        currencySymbol: settings.currencySymbol || (settings.exchangeRateMode === 'COP' ? 'COP' : (settings.exchangeRateMode === 'EUR' ? '€' : 'Bs.')),
        companyBank: settings.companyBank, 
        companyCedula: settings.companyCedula, 
        companyPhone: settings.companyPhone,
        companyAccountNumber: settings.companyAccountNumber,
        companyAccountHolder: settings.companyAccountHolder,
        binancePayId: settings.binancePayId,
        binanceEmail: settings.binanceEmail,
        binancePhone: settings.binancePhone,
        allowPartialPayments: settings.allowPartialPayments,
        minDepositPercentage: Number(settings.minDepositPercentage) || 0,
        allowCashierBypassDeposit: settings.allowCashierBypassDeposit !== false,
        acceptCashUsd: settings.acceptCashUsd !== false,
        acceptPagoMovil: settings.acceptPagoMovil !== false,
        acceptCardPos: settings.acceptCardPos === true,
        acceptBinance: settings.acceptBinance === true,
        acceptTransfer: settings.acceptTransfer === true,
        requireApprovalAlways: settings.requireApprovalAlways,
        featureCustomerSchedules: settings.featureCustomerSchedules,
        featureRecipes: settings.featureRecipes,
        featureBuySell: settings.featureBuySell,
        featureProduction: settings.featureProduction !== false,
        featureDelivery: settings.featureDelivery !== false,
        featureShowCatalog: settings.featureShowCatalog,
        allowNegativeStock: settings.allowNegativeStock === true,
        bookingRequireService: settings.bookingRequireService,
        bookingAllowStaffSelection: settings.bookingAllowStaffSelection,
        businessHours: settings.businessHours,
        services: settings.services,
        slotInterval: settings.slotInterval,
        themePrimaryColor: settings.themePrimaryColor,
        themeHeaderColor: settings.themeHeaderColor
      };

      const res = await apiClient.put<Settings>('/settings', payload);
      const updatedSettings: Settings = res.data || { ...settings, ...payload };

      setSettings(updatedSettings);
      localStorage.setItem('flujofino_cached_settings', JSON.stringify(updatedSettings));
      localStorage.setItem('tenant_settings', JSON.stringify(updatedSettings));
      window.dispatchEvent(new CustomEvent('settings_updated', { detail: updatedSettings }));

      const primary = updatedSettings.themePrimaryColor || '#10b981';
      const header = updatedSettings.themeHeaderColor || '#ffffff';
      const contrastText = getContrastColor(primary);
      const headerContrastText = getContrastColor(header);
      const readablePrimary = ensureReadableColor(primary);

      document.documentElement.style.setProperty('--theme-primary', primary);
      document.documentElement.style.setProperty('--theme-primary-contrast', contrastText);
      document.documentElement.style.setProperty('--theme-primary-readable', readablePrimary);
      document.documentElement.style.setProperty('--theme-header', header);
      document.documentElement.style.setProperty('--theme-header-contrast', headerContrastText);
      document.documentElement.style.setProperty('--ion-color-primary', primary);
      document.documentElement.style.setProperty('--ion-color-primary-contrast', contrastText);

      presentToast({
        message: 'Configuración guardada',
        duration: 1500,
        color: 'success'
      });

      window.location.reload();
    } catch(e: any) {
      const msg = e.response?.data?.message || 'Error guardando ajustes';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    }
  };

  if (!isAdmin) {


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
      <AppHeader title="Configuración" />
      <IonContent className="ion-padding ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <IonGrid style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <IonRow>
            {/* Tarjeta Programa de Referidos • Invita y Ahorra */}
            {subscription && (
              <IonCol size="12">
                <IonCard style={{
                  margin: '0 0 16px 0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: subscription.planType === TenantPlanType.PIONEER ? '2px solid #f59e0b' : '2px solid #3b82f6',
                  background: '#ffffff'
                }}>
                  <IonCardHeader style={{
                    paddingBottom: '10px',
                    background: subscription.planType === TenantPlanType.PIONEER 
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(29, 78, 216, 0.03) 100%)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <IonCardTitle style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={giftOutline} style={{ color: subscription.planType === TenantPlanType.PIONEER ? '#f59e0b' : '#3b82f6', fontSize: '22px' }} />
                        Programa de Referidos • Invita y Ahorra
                      </IonCardTitle>
                      {subscription.planType === TenantPlanType.PIONEER ? (
                        <span style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '11px',
                          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                        }}>
                          ⭐ CUENTA PIONERA
                        </span>
                      ) : (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '11px'
                        }}>
                          PLAN REGULAR
                        </span>
                      )}
                    </div>
                  </IonCardHeader>

                  <IonCardContent style={{ paddingTop: '14px' }}>
                    <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                      {subscription.planType === TenantPlanType.PIONEER ? (
                        <>
                          ¡Tu negocio forma parte de las cuentas <strong>Pioneras</strong> de FinoWork! Mantén al menos <strong>2 negocios referidos activos</strong> con suscripción y tu cuota mensual será <strong>100% BONIFICADA ($0/mes)</strong>. Si alguno no renueva y bajas de 2 referidos activos al final de mes, el sistema volverá a tu cuota regular.
                        </>
                      ) : (
                        <>
                          Comparte FinoWork con otros negocios amigos. Obtén un <strong>10% de descuento mensual</strong> por cada referido activo que mantengas (¡hasta un <strong>50% de descuento</strong> recurrente!).
                        </>
                      )}
                    </p>

                    {/* Métricas y Progreso */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Referidos Activos</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                          {subscription.activeReferrals}
                          {subscription.planType === TenantPlanType.PIONEER && (
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}> / 2</span>
                          )}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Descuento Obtenido</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: subscription.discountPercentage > 0 ? '#10b981' : '#64748b', marginTop: '2px' }}>
                          {subscription.discountPercentage}% OFF
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tu Cuota Mensual</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: subscription.finalFee === 0 ? '#10b981' : '#0f172a', marginTop: '2px' }}>
                          ${subscription.finalFee.toFixed(2)}
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}> / mes</span>
                        </div>
                      </div>
                    </div>

                    {/* Código y Enlace de Invitación */}
                    <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Tu Código de Referido:</div>
                          <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', letterSpacing: '1px', marginTop: '2px' }}>
                            {subscription.referralCode}
                          </div>
                        </div>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="dark"
                          onClick={() => {
                            navigator.clipboard?.writeText(subscription.referralCode);
                            presentToast({ message: 'Código de referido copiado', duration: 1500, color: 'dark' });
                          }}
                        >
                          <IonIcon icon={copyOutline} slot="start" /> Copiar Código
                        </IonButton>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton
                          color="primary"
                          style={{ flex: 1, minWidth: '160px', fontWeight: 700 }}
                          onClick={() => {
                            const link = `${getPublicBaseUrl()}/register?ref=${subscription.referralCode}`;
                            navigator.clipboard?.writeText(link);
                            presentToast({ message: 'Enlace de registro copiado al portapapeles', duration: 2000, color: 'success' });
                          }}
                        >
                          <IonIcon icon={copyOutline} slot="start" />
                          Copiar Enlace de Invitación
                        </IonButton>

                        <IonButton
                          fill="outline"
                          style={{
                            flex: 1,
                            minWidth: '160px',
                            fontWeight: 700,
                            '--border-color': '#cbd5e1',
                            '--color': '#334155',
                            color: '#334155'
                          }}
                          onClick={() => {
                            const link = `${getPublicBaseUrl()}/register?ref=${subscription.referralCode}`;
                            const msg = `¡Hola! Te recomiendo FinoWork para administrar tu negocio (punto de venta, pedidos, inventario y delivery). Regístrate gratis con mi enlace de invitación: ${link}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                        >
                          <IonIcon icon={logoWhatsapp} slot="start" style={{ color: '#25D366' }} />
                          Compartir por WhatsApp
                        </IonButton>
                      </div>
                    </div>

                    {/* Banner Informativo de Planes Disponibles */}
                    <div
                      style={{
                        marginTop: '14px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px' }}>💎</span>
                        <span>
                          Planes disponibles: <strong>1 Mes</strong> (${subscription.finalFee.toFixed(2)}) • <strong>3 Meses</strong> (${(subscription.finalFee * 3).toFixed(2)}) • <strong>1 Año</strong> (${(subscription.finalFee * 10).toFixed(2)})
                        </span>
                      </div>
                      <span style={{ background: '#fef08a', color: '#854d0e', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                        🎁 Plan Anual: ¡2 Meses Gratis!
                      </span>
                    </div>

                    {/* Estado de Suscripción & Botón Reportar Pago */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Estado actual:</span>
                        {subscription.status === TenantStatus.ACTIVE && (
                          <IonBadge color="success" style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700 }}>
                            ✅ ACTIVO
                          </IonBadge>
                        )}
                        {subscription.status === TenantStatus.TRIAL && (
                          <IonBadge color="warning" style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700 }}>
                            ⏳ EN PRUEBA ({subscription.trialDaysLeft} días restantes)
                          </IonBadge>
                        )}
                        {subscription.status === TenantStatus.PAST_DUE && (
                          <IonBadge color="danger" style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700 }}>
                            ⚠️ PAGO VENCIDO
                          </IonBadge>
                        )}
                        {subscription.status === TenantStatus.SUSPENDED && (
                          <IonBadge color="dark" style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700 }}>
                            ⛔ SUSPENDIDO
                          </IonBadge>
                        )}

                        {subscription.currentPeriodEndsAt && subscription.status === TenantStatus.ACTIVE && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            • Vence: {new Date(subscription.currentPeriodEndsAt).toLocaleDateString('es-VE')}
                          </span>
                        )}
                      </div>

                      {subscription.finalFee === 0 ? (
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🎉 ¡Cuota 100% Bonificada! No necesitas pagar mensualidad.
                        </div>
                      ) : (
                        <IonButton
                          color="primary"
                          fill="solid"
                          onClick={() => setIsReportModalOpen(true)}
                          style={{ fontWeight: 800 }}
                        >
                          <IonIcon icon={cashOutline} slot="start" />
                          Reportar Pago (Mensual o Anual)
                        </IonButton>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            )}

            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Datos de la Empresa</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Estos datos se usarán para autocompletar recibos y textos copiados para WhatsApp.</p>
                  <IonItem lines="none" style={{ '--background': 'transparent', marginBottom: '8px' }}>
                    <BankSelect
                      label="Banco Receptor"
                      value={settings.companyBank || ''}
                      onChange={val => setSettings({...settings, companyBank: val})}
                      placeholder="Selecciona banco receptor..."
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Cédula / RIF</IonLabel>
                    <IonInput value={settings.companyCedula || ''} onIonInput={e => setSettings({...settings, companyCedula: e.detail.value!})} placeholder="Ej. J-12345678-0" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Teléfono (Pago Móvil / WhatsApp)</IonLabel>
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
                    <IonLabel className="ion-text-wrap">
                      <h2>Permitir Pagos Parciales en Caja (Abonos / Cuentas Abiertas)</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Permite a los cajeros en el punto de venta registrar pedidos con inicial o cuenta por cobrar. (La seña para citas online se configura de forma independiente en Reservaciones).
                      </p>
                    </IonLabel>
                    <IonToggle checked={settings.allowPartialPayments !== false} onIonChange={e => setSettings({...settings, allowPartialPayments: e.detail.checked})} />
                  </IonItem>

                  {settings.allowPartialPayments !== false && (
                    <>
                      <IonItem style={{ marginTop: '8px', background: '#f8fafc', borderRadius: '8px' }}>
                        <IonLabel position="stacked">
                          Porcentaje Mínimo de Abono Inicial (%)
                          <small style={{ display: 'block', color: '#64748b' }}>
                            0% = No exige mínimo. (Ej. 30% o 50% para apartados o créditos).
                          </small>
                        </IonLabel>
                        <IonInput 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={settings.minDepositPercentage !== undefined ? settings.minDepositPercentage : 0} 
                          onIonInput={e => setSettings({...settings, minDepositPercentage: parseFloat(e.detail.value!) || 0})} 
                          placeholder="0" 
                        />
                      </IonItem>

                      <IonItem style={{ marginTop: '8px', background: '#f8fafc', borderRadius: '8px' }}>
                        <IonLabel className="ion-text-wrap">
                          <h2>Permitir en Caja exonerar abono mínimo</h2>
                          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                            Muestra el interruptor al cajero para abrir cuentas en $0.00 (ideal para consumo en mesas o clientes de confianza). Si lo desactivas, los cajeros estarán obligados a cobrar el mínimo configurado.
                          </p>
                        </IonLabel>
                        <IonToggle 
                          checked={settings.allowCashierBypassDeposit !== false} 
                          onIonChange={e => setSettings({...settings, allowCashierBypassDeposit: e.detail.checked})} 
                        />
                      </IonItem>
                    </>
                  )}

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

          {/* Tarjeta de Notificaciones Push y Alertas */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: 'var(--ff-shadow-sm, 0 1px 3px rgba(0,0,0,0.05))', background: '#FFFFFF' }}>
                <IonCardHeader style={{ paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#ECFDF5',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IonIcon icon={notificationsOutline} style={{ fontSize: '20px' }} />
                      </div>
                      <div>
                        <IonCardTitle style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                          Notificaciones Push y Alertas en Tiempo Real
                        </IonCardTitle>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                          Recibe avisos y sonidos cuando clientes hagan pedidos o reserven citas.
                        </p>
                      </div>
                    </div>

                    <div>
                      {Capacitor.isNativePlatform() ? (
                        <IonBadge style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                          ✓ App Móvil: Alertas y Timbre Activos
                        </IonBadge>
                      ) : (
                        <>
                          {notificationStatus === 'granted' && (
                            <IonBadge style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                              ✓ Notificaciones Activas
                            </IonBadge>
                          )}
                          {notificationStatus === 'denied' && (
                            <IonBadge style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                              ✕ Bloqueadas por el navegador
                            </IonBadge>
                          )}
                          {notificationStatus === 'default' && (
                            <IonBadge style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                              ⚠ Requiere Permiso
                            </IonBadge>
                          )}
                          {notificationStatus === 'unsupported' && (
                            <IonBadge style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                              No soportado en este navegador
                            </IonBadge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </IonCardHeader>

                <IonCardContent style={{ paddingTop: '12px' }}>
                  {Capacitor.isNativePlatform() && (
                    <div style={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#166534',
                      lineHeight: '1.5'
                    }}>
                      <strong>💡 Alertas móviles activas:</strong> El timbre de caja y las alertas visuales se emiten en vivo mientras utilizas la aplicación cada vez que un cliente realiza un pedido o reserva una cita.
                    </div>
                  )}

                  {notificationStatus === 'denied' && !Capacitor.isNativePlatform() && (
                    <div style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #F87171',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#991B1B',
                      lineHeight: '1.5'
                    }}>
                      <strong>Atención:</strong> Las notificaciones están bloqueadas en tu navegador. Para recibirlas:
                      <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                        <li>Haz clic en el ícono del candado o configuración al lado izquierdo de la URL (barra de direcciones).</li>
                        <li>Busca la opción <strong>Notificaciones</strong> y cámbiala a <strong>Permitir</strong>.</li>
                        <li>Recarga la página para aplicar los cambios.</li>
                      </ol>
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '12px',
                    marginTop: '8px'
                  }}>
                    {!Capacitor.isNativePlatform() && notificationStatus !== 'granted' && (
                      <button
                        onClick={handleActivatePush}
                        disabled={isActivatingNotifications || notificationStatus === 'denied'}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px 18px',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: notificationStatus === 'denied' ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: notificationStatus === 'denied' ? 0.6 : 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <IonIcon icon={notificationsOutline} style={{ fontSize: '18px' }} />
                        {isActivatingNotifications ? 'Activando...' : 'Activar Notificaciones'}
                      </button>
                    )}

                    <button
                      onClick={handleTestPush}
                      disabled={isTestingNotifications}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '12px 18px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <IonIcon icon={notificationsOutline} style={{ fontSize: '18px', color: '#10B981' }} />
                      {isTestingNotifications ? 'Enviando...' : 'Enviar Alerta de Prueba'}
                    </button>

                    <button
                      onClick={() => playNotificationSound()}
                      style={{
                        backgroundColor: '#F8FAFC',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px 18px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <IonIcon icon={volumeHighOutline} style={{ fontSize: '18px', color: '#059669' }} />
                      Probar Sonido de Timbre
                    </button>

                    {!Capacitor.isNativePlatform() && (
                      <a
                        href="/FinoWork.apk"
                        download="FinoWork.apk"
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                          borderRadius: '10px',
                          padding: '12px 18px',
                          fontSize: '14px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.05)'
                        }}
                      >
                        <IonIcon icon={cloudDownloadOutline} style={{ fontSize: '18px', color: '#10B981' }} />
                        Descargar App Android (APK)
                      </a>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Tarjeta Destacada: Tasa de Facturación y Conversión */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{
                borderRadius: '16px',
                border: '2px solid #10b981',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
                background: '#ffffff',
                marginBottom: '16px'
              }}>
                <IonCardHeader style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)',
                  paddingBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <IonCardTitle style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      💱 Tasa de Facturación y Conversión
                    </IonCardTitle>
                    <span style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 800,
                      fontSize: '12px'
                    }}>
                      TASA ACTIVA: {settings.currencySymbol || (settings.exchangeRateMode === 'EUR' ? '€' : 'Bs.')} {Number(settings.exchangeRateBs || exchangeRate || 40).toFixed(2)}
                    </span>
                  </div>
                </IonCardHeader>

                <IonCardContent style={{ paddingTop: '16px' }}>
                  <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                    Selecciona qué tasa de cambio utiliza tu negocio para calcular el equivalente en moneda local para tus ventas, cobros y punto de venta. Las órdenes anteriores mantendrán su tasa histórica de forma inmutable.
                  </p>

                  <IonGrid style={{ padding: 0 }}>
                    <IonRow>
                      <IonCol size="12" sizeMd="6">
                        <IonItem style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <IonLabel position="stacked" style={{ fontWeight: 700, color: '#1e293b' }}>
                            Modo de Tasa Cambiaria *
                          </IonLabel>
                          <IonSelect
                            interface="popover"
                            value={settings.exchangeRateMode || 'BCV'}
                            onIonChange={e => {
                              const newMode = e.detail.value;
                              let newSymbol = newMode === 'EUR' ? '€' : 'Bs.';
                              
                              let nextRate = settings.exchangeRateBs;
                              if (newMode === 'BCV') nextRate = settings.availableRates?.bcv || nextRate;
                              else if (newMode === 'PARALELO') nextRate = settings.availableRates?.parallel || nextRate;
                              else if (newMode === 'USDT') nextRate = settings.availableRates?.usdt || nextRate;
                              else if (newMode === 'EUR') nextRate = settings.availableRates?.eur || nextRate;
                              else if (newMode === 'MANUAL') nextRate = settings.manualExchangeRate || nextRate;

                              setSettings({
                                ...settings,
                                exchangeRateMode: newMode,
                                currencySymbol: newSymbol,
                                exchangeRateBs: nextRate
                              });
                            }}
                            style={{ minHeight: '44px', fontWeight: 600 }}
                          >
                            <IonSelectOption value="BCV">🏛️ Dólar Oficial BCV (USD)</IonSelectOption>
                            <IonSelectOption value="PARALELO">📈 Dólar Paralelo / Promedio (USD)</IonSelectOption>
                            <IonSelectOption value="USDT">🟡 Binance P2P USDT (USD)</IonSelectOption>
                            <IonSelectOption value="EUR">💶 Euro Oficial BCV (EUR)</IonSelectOption>
                            <IonSelectOption value="MANUAL">✏️ Tasa Personalizada (Manual)</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                      </IonCol>

                      <IonCol size="12" sizeMd="6">
                        <IonItem style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <IonLabel position="stacked" style={{ fontWeight: 700, color: '#1e293b' }}>
                            Símbolo de Moneda Secundaria
                          </IonLabel>
                          <IonSelect
                            interface="popover"
                            value={settings.currencySymbol || (settings.exchangeRateMode === 'EUR' ? '€' : 'Bs.')}
                            onIonChange={e => setSettings({ ...settings, currencySymbol: e.detail.value })}
                            style={{ minHeight: '44px', fontWeight: 600 }}
                          >
                            <IonSelectOption value="Bs.">Bs. (Bolívares)</IonSelectOption>
                            <IonSelectOption value="€">€ (Euros)</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                      </IonCol>

                      {/* Información en tiempo real si es modo automático */}
                      {(settings.exchangeRateMode || 'BCV') !== 'MANUAL' && (
                        <IonCol size="12">
                          <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginTop: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🔄</span> Sincronización Automática de Tasas
                              </div>
                              {settings.availableRates?.updatedAt && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Última actualización: {new Date(settings.availableRates.updatedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} ({new Date(settings.availableRates.updatedAt).toLocaleDateString('es-VE')})
                                </div>
                              )}
                            </div>

                            <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
                              Las tasas del mercado se actualizan automáticamente 2 veces al día (<strong>09:15 AM</strong> y <strong>05:45 PM</strong> tras el cierre de mesas de cambio del BCV). Si necesitas una cotización distinta y fija para tu negocio, puedes seleccionar el modo <strong>Manual</strong>.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                              <div
                                onClick={() => {
                                  const rate = Number(settings.availableRates?.bcv || settings.exchangeRateBs || 40);
                                  setSettings({ ...settings, exchangeRateMode: 'BCV', currencySymbol: 'Bs.', exchangeRateBs: rate });
                                }}
                                style={{
                                  background: settings.exchangeRateMode === 'BCV' || !settings.exchangeRateMode ? '#dbeafe' : '#ffffff',
                                  border: settings.exchangeRateMode === 'BCV' || !settings.exchangeRateMode ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  boxShadow: settings.exchangeRateMode === 'BCV' || !settings.exchangeRateMode ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                title="Seleccionar Dólar Oficial BCV"
                              >
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>🏛️ BCV Oficial</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                  Bs. {Number(settings.availableRates?.bcv || settings.exchangeRateBs || 40).toFixed(2)}
                                </div>
                              </div>

                              <div
                                onClick={() => {
                                  const rate = Number(settings.availableRates?.parallel || settings.availableRates?.bcv || settings.exchangeRateBs || 40);
                                  setSettings({ ...settings, exchangeRateMode: 'PARALELO', currencySymbol: 'Bs.', exchangeRateBs: rate });
                                }}
                                style={{
                                  background: settings.exchangeRateMode === 'PARALELO' ? '#dbeafe' : '#ffffff',
                                  border: settings.exchangeRateMode === 'PARALELO' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  boxShadow: settings.exchangeRateMode === 'PARALELO' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                title="Seleccionar Dólar Paralelo"
                              >
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>📈 Paralelo</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                  Bs. {Number(settings.availableRates?.parallel || settings.availableRates?.bcv || settings.exchangeRateBs || 40).toFixed(2)}
                                </div>
                              </div>

                              <div
                                onClick={() => {
                                  const rate = Number(settings.availableRates?.usdt || settings.availableRates?.parallel || settings.exchangeRateBs || 40);
                                  setSettings({ ...settings, exchangeRateMode: 'USDT', currencySymbol: 'Bs.', exchangeRateBs: rate });
                                }}
                                style={{
                                  background: settings.exchangeRateMode === 'USDT' ? '#dbeafe' : '#ffffff',
                                  border: settings.exchangeRateMode === 'USDT' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  boxShadow: settings.exchangeRateMode === 'USDT' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                title="Seleccionar Binance USDT"
                              >
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>🟡 Binance USDT</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                  Bs. {Number(settings.availableRates?.usdt || settings.availableRates?.parallel || settings.exchangeRateBs || 40).toFixed(2)}
                                </div>
                              </div>

                              <div
                                onClick={() => {
                                  const rate = Number(settings.availableRates?.eur || 40);
                                  setSettings({ ...settings, exchangeRateMode: 'EUR', currencySymbol: '€', exchangeRateBs: rate });
                                }}
                                style={{
                                  background: settings.exchangeRateMode === 'EUR' ? '#dbeafe' : '#ffffff',
                                  border: settings.exchangeRateMode === 'EUR' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  boxShadow: settings.exchangeRateMode === 'EUR' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                title="Seleccionar Euro Oficial BCV"
                              >
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>💶 Euro Oficial</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                  Bs. {Number(settings.availableRates?.eur || 40).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </IonCol>
                      )}

                      {/* Input si es modo MANUAL */}
                      {settings.exchangeRateMode === 'MANUAL' && (
                        <IonCol size="12">
                          <div style={{
                            background: '#fefce8',
                            border: '1px solid #fde047',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginTop: '8px'
                          }}>
                            <IonItem color="light" style={{ borderRadius: '8px' }}>
                              <IonLabel position="stacked" style={{ fontWeight: 800, color: '#854d0e' }}>
                                ✏️ Tasa Personalizada Manual ({settings.currencySymbol || 'Bs.'} por 1 USD) *
                              </IonLabel>
                              <IonInput
                                type="number"
                                step="0.01"
                                min="0.0001"
                                value={settings.manualExchangeRate !== undefined && settings.manualExchangeRate !== null ? settings.manualExchangeRate : (settings.exchangeRateBs || 40.0)}
                                onIonInput={e => {
                                  const val = parseFloat(e.detail.value!);
                                  setSettings({
                                    ...settings,
                                    manualExchangeRate: isNaN(val) ? null : val,
                                    exchangeRateBs: isNaN(val) ? 40 : val
                                  });
                                }}
                                placeholder="Ej. 55.00"
                                style={{ fontSize: '16px', fontWeight: 700 }}
                              />
                            </IonItem>
                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#713f12' }}>
                              💡 Esta tasa personalizada se usará de forma prioritaria para facturar todas las nuevas ventas.
                            </p>
                          </div>
                        </IonCol>
                      )}
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Métodos de Pago Aceptados */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>💳 Métodos de Pago Aceptados</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ marginBottom: '15px', color: '#64748b' }}>
                    Selecciona qué formas de pago acepta tu sucursal. Los métodos inactivos no aparecerán en la caja POS ni en la tienda online.
                  </p>

                  {settings.acceptCashUsd === false &&
                   settings.acceptPagoMovil === false &&
                   !settings.acceptCardPos &&
                   !settings.acceptBinance &&
                   !settings.acceptTransfer && (
                    <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚠️ No puedes desactivar todos los métodos de pago. Activa al menos uno para poder guardar tu configuración.
                    </div>
                  )}

                  <IonGrid style={{ padding: 0 }}>
                    <IonRow>
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel className="ion-text-wrap">
                            <h2>💵 Efectivo Divisas (USD)</h2>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Billetes físicos en dólares en caja y contra entrega.</p>
                          </IonLabel>
                          <IonToggle 
                            checked={settings.acceptCashUsd !== false} 
                            onIonChange={e => setSettings({...settings, acceptCashUsd: e.detail.checked})} 
                          />
                        </IonItem>
                      </IonCol>

                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel className="ion-text-wrap">
                            <h2>📱 Pago Móvil (Bs.)</h2>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Transferencias instantáneas interbancarias P2P/C2P.</p>
                          </IonLabel>
                          <IonToggle 
                            checked={settings.acceptPagoMovil !== false} 
                            onIonChange={e => setSettings({...settings, acceptPagoMovil: e.detail.checked})} 
                          />
                        </IonItem>
                      </IonCol>

                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel className="ion-text-wrap">
                            <h2>💳 Punto de Venta Bancario (Tarjeta de Débito)</h2>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Cobro físico por datáfono / terminal con reporte de lote.</p>
                          </IonLabel>
                          <IonToggle 
                            checked={settings.acceptCardPos === true} 
                            onIonChange={e => setSettings({...settings, acceptCardPos: e.detail.checked})} 
                          />
                        </IonItem>
                      </IonCol>

                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel className="ion-text-wrap">
                            <h2>🟡 Binance Pay / USDT</h2>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Pagos digitales en criptoactivos estables.</p>
                          </IonLabel>
                          <IonToggle 
                            checked={settings.acceptBinance === true} 
                            onIonChange={e => setSettings({...settings, acceptBinance: e.detail.checked})} 
                          />
                        </IonItem>
                      </IonCol>

                      {settings.acceptBinance === true && (
                        <IonCol size="12">
                          <div style={{ background: '#fefce8', padding: '14px', borderRadius: '10px', border: '1px solid #fde047', marginTop: '4px', marginBottom: '8px' }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🟡 Datos de tu Cuenta Binance Pay (Para recibir fondos)
                            </h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#713f12' }}>
                              Estos datos se mostrarán a tus clientes en la tienda online y en el POS para que puedan enviarte los USDT.
                            </p>
                            <IonGrid style={{ padding: 0 }}>
                              <IonRow>
                                <IonCol size="12" sizeMd="4">
                                  <IonItem color="light" style={{ borderRadius: '8px' }}>
                                    <IonLabel position="stacked">Binance Pay ID / UID *</IonLabel>
                                    <IonInput 
                                      value={settings.binancePayId || ''} 
                                      onIonInput={e => setSettings({...settings, binancePayId: e.detail.value!})} 
                                      placeholder="Ej. 284719283" 
                                    />
                                  </IonItem>
                                </IonCol>
                                <IonCol size="12" sizeMd="4">
                                  <IonItem color="light" style={{ borderRadius: '8px' }}>
                                    <IonLabel position="stacked">Correo en Binance (Opcional)</IonLabel>
                                    <IonInput 
                                      value={settings.binanceEmail || ''} 
                                      onIonInput={e => setSettings({...settings, binanceEmail: e.detail.value!})} 
                                      placeholder="Ej. pagos@minegocio.com" 
                                    />
                                  </IonItem>
                                </IonCol>
                                <IonCol size="12" sizeMd="4">
                                  <IonItem color="light" style={{ borderRadius: '8px' }}>
                                    <IonLabel position="stacked">Teléfono en Binance (Opcional)</IonLabel>
                                    <IonInput 
                                      value={settings.binancePhone || ''} 
                                      onIonInput={e => setSettings({...settings, binancePhone: e.detail.value!})} 
                                      placeholder="Ej. +58414..." 
                                    />
                                  </IonItem>
                                </IonCol>
                              </IonRow>
                            </IonGrid>
                          </div>
                        </IonCol>
                      )}

                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel className="ion-text-wrap">
                            <h2>🏦 Transferencia Bancaria en Bs.</h2>
                            <p style={{ color: '#64748b', fontSize: '13px' }}>Transferencias bancarias tradicionales diferidas o del mismo banco.</p>
                          </IonLabel>
                          <IonToggle 
                            checked={settings.acceptTransfer === true} 
                            onIonChange={e => setSettings({...settings, acceptTransfer: e.detail.checked})} 
                          />
                        </IonItem>
                      </IonCol>

                      {settings.acceptTransfer === true && (
                        <IonCol size="12">
                          <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '10px', border: '1px solid #bfdbfe', marginTop: '4px', marginBottom: '8px' }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🏦 Cuenta Bancaria para Transferencias
                            </h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e3a8a' }}>
                              Asegúrate de ingresar el número de cuenta de 20 dígitos y el titular para que tus clientes puedan transferir con facilidad.
                            </p>
                            <IonGrid style={{ padding: 0 }}>
                              <IonRow>
                                <IonCol size="12" sizeMd="6">
                                  <IonItem color="light" style={{ borderRadius: '8px' }}>
                                    <IonLabel position="stacked">N° de Cuenta (20 Dígitos) *</IonLabel>
                                    <IonInput 
                                      value={settings.companyAccountNumber || ''} 
                                      onIonInput={e => setSettings({...settings, companyAccountNumber: e.detail.value!})} 
                                      placeholder="Ej. 0134-0000-00-0000000000" 
                                    />
                                  </IonItem>
                                </IonCol>
                                <IonCol size="12" sizeMd="6">
                                  <IonItem color="light" style={{ borderRadius: '8px' }}>
                                    <IonLabel position="stacked">Titular / Razón Social *</IonLabel>
                                    <IonInput 
                                      value={settings.companyAccountHolder || ''} 
                                      onIonInput={e => setSettings({...settings, companyAccountHolder: e.detail.value!})} 
                                      placeholder="Ej. Inversiones Mi Negocio C.A." 
                                    />
                                  </IonItem>
                                </IonCol>
                              </IonRow>
                            </IonGrid>
                          </div>
                        </IonCol>
                      )}
                    </IonRow>
                  </IonGrid>
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
                    <IonLabel className="ion-text-wrap">
                      <h2>Módulo de Producción y Ensamblaje por Lotes</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Permite fabricar productos y preparar lotes antes de la venta. Desactívalo si tu negocio es 100% de servicios (Spas, Salones, Consultorios) para simplificar la interfaz.
                      </p>
                    </IonLabel>
                    <IonToggle checked={settings.featureProduction !== false} onIonChange={e => setSettings({...settings, featureProduction: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">
                      <h2>Repartidores y Servicio de Delivery (Envíos a domicilio)</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Permite asignar pedidos a repartidores y cobrar costo de flete. Desactívalo si tu negocio es exclusivamente de citas, servicios presenciales o venta en mostrador.
                      </p>
                    </IonLabel>
                    <IonToggle checked={settings.featureDelivery !== false} onIonChange={e => setSettings({...settings, featureDelivery: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">
                      <h2>Catálogo Digital / Tienda Online y Portafolio</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Permite a tus clientes consultar productos y comprar por la tienda online. Si lo desactivas, los enlaces públicos quedarán deshabilitados.
                      </p>
                    </IonLabel>
                    <IonToggle checked={settings.featureShowCatalog !== false} onIonChange={e => setSettings({...settings, featureShowCatalog: e.detail.checked})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel className="ion-text-wrap">
                      <h2>Permitir Pedidos sin Stock (Bajo Encargo / Demanda)</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Ideal para negocios que fabrican o surten bajo pedido (pastelerías, carpinterías, imprentas o cocina bajo demanda). En lugar de bloquear la venta, permite facturar y muestra el saldo faltante como "Por producir" en lugar de stock negativo.
                      </p>
                    </IonLabel>
                    <IonToggle checked={settings.allowNegativeStock === true} onIonChange={e => setSettings({...settings, allowNegativeStock: e.detail.checked})} />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
 
          {/* Enlaces Públicos para Clientes */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>🌐 Enlaces Públicos para Clientes</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ marginBottom: '15px', color: '#64748b' }}>
                    Enlaces directos para compartir con tus clientes por WhatsApp o redes sociales para que compren o reserven sin necesidad de iniciar sesión.
                  </p>

                  {/* Enlace Tienda Online (Compra-Venta) */}
                  {settings.featureBuySell && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: settings.featureShowCatalog === false ? '#f8fafc' : '#f0fdf4', 
                      borderRadius: '10px', 
                      border: `1px solid ${settings.featureShowCatalog === false ? '#cbd5e1' : '#86efac'}`, 
                      marginBottom: '16px',
                      opacity: settings.featureShowCatalog === false ? 0.7 : 1
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <h3 style={{ margin: 0, color: settings.featureShowCatalog === false ? '#64748b' : '#166534', fontWeight: 'bold' }}>🛍️ Enlace de tu Tienda Online / Catálogo Digital</h3>
                        {settings.featureShowCatalog === false ? (
                          <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                            🚫 Enlace Deshabilitado
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#bbf7d0', color: '#14532d', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                            Módulo Activo
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: settings.featureShowCatalog === false ? '#64748b' : '#15803d' }}>
                        {settings.featureShowCatalog === false 
                          ? 'El catálogo se encuentra desactivado en "Módulos Activos". Tus clientes no podrán acceder ni realizar compras hasta que lo actives nuevamente.'
                          : 'Tus clientes verán tus productos con fotos, precios en $ y Bs., control de stock, carrito de compras, opciones de delivery y podrán enviarte sus pedidos directo a Caja y WhatsApp.'
                        }
                      </p>
                      <IonInput 
                        readonly 
                        disabled={settings.featureShowCatalog === false}
                        value={`${getPublicBaseUrl()}/store/${settings.publicToken || user?.tenantId}`} 
                        style={{ backgroundColor: settings.featureShowCatalog === false ? '#f1f5f9' : 'white', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #cbd5e1' }} 
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton 
                          size="small" 
                          color="success" 
                          disabled={settings.featureShowCatalog === false}
                          onClick={() => {
                            navigator.clipboard?.writeText(`${getPublicBaseUrl()}/store/${settings.publicToken || user?.tenantId}`);
                            presentToast({ message: '¡Enlace de tienda copiado!', duration: 2000, color: 'success' });
                          }}
                        >
                          Copiar Enlace Tienda
                        </IonButton>
                        <IonButton 
                          size="small" 
                          fill="outline" 
                          color="success" 
                          disabled={settings.featureShowCatalog === false}
                          onClick={() => {
                            window.open(`${getPublicBaseUrl()}/store/${settings.publicToken || user?.tenantId}`, '_blank');
                          }}
                        >
                          Abrir Tienda
                        </IonButton>
                      </div>
                    </div>
                  )}

                  {/* Enlace Reservaciones (Citas) */}
                  {settings.featureCustomerSchedules && (
                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>📅 Enlace de Citas y Reservaciones</h3>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                          Módulo Citas Activo
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>
                        Tus clientes podrán agendar sus citas, seleccionar especialistas, servicios, fecha y turnos disponibles.
                      </p>
                      <IonInput 
                        readonly 
                        value={`${getPublicBaseUrl()}/book/${settings.publicToken || user?.tenantId}`} 
                        style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #cbd5e1' }} 
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton 
                          size="small" 
                          color="secondary" 
                          onClick={() => {
                            navigator.clipboard?.writeText(`${getPublicBaseUrl()}/book/${settings.publicToken || user?.tenantId}`);
                            presentToast({ message: '¡Enlace copiado!', duration: 2000, color: 'success' });
                          }}
                        >
                          Copiar Enlace Citas
                        </IonButton>
                        <IonButton 
                          size="small" 
                          fill="outline" 
                          color="secondary" 
                          onClick={() => {
                            window.open(`${getPublicBaseUrl()}/book/${settings.publicToken || user?.tenantId}`, '_blank');
                          }}
                        >
                          Abrir Reservaciones
                        </IonButton>
                      </div>
                    </div>
                  )}

                  {!settings.featureBuySell && !settings.featureCustomerSchedules && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px' }}>
                      ⚠️ No tienes activo el módulo de <b>Compra-Venta Directa</b> ni el de <b>Citas y Reservaciones</b>. Activa al menos uno en "Módulos Activos" arriba para ver los enlaces públicos de tu negocio.
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={colorPaletteOutline} style={{ color: '#10b981', fontSize: '22px' }} />
                    <IonCardTitle>Personalización de Marca y Colores</IonCardTitle>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                    Personaliza los colores de tu sucursal. Estos tonos se aplican al menú lateral, encabezados, botones y enlaces.
                  </p>

                  {/* Paleta rápida de colores recomendados */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#334155',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <IonIcon icon={sparklesOutline} style={{ color: '#f59e0b', fontSize: '15px' }} />
                      <span>Colores Recomendados (Alto Contraste)</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {PRESET_THEME_COLORS.map(c => {
                        const isSelected = (settings.themePrimaryColor || '').toUpperCase() === c.hex.toUpperCase();
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setSettings({ ...settings, themePrimaryColor: c.hex })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: isSelected ? '#0f172a' : '#475569',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '12px',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: c.hex,
                                display: 'inline-block',
                                border: '1px solid rgba(0,0,0,0.1)',
                                flexShrink: 0
                              }}
                            />
                            <span>{c.name}</span>
                            {isSelected && <IonIcon icon={checkmarkOutline} style={{ fontSize: '14px', color: '#0f172a', marginLeft: '2px' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    paddingTop: '4px'
                  }}>
                    {/* Selectores de color */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#334155',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '8px'
                        }}>
                          Color Principal (Menú, Botones y Acciones)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(settings.themePrimaryColor || '') ? settings.themePrimaryColor : '#10b981'}
                            onChange={e => setSettings({ ...settings, themePrimaryColor: e.target.value.toUpperCase() })}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              padding: 0,
                              cursor: 'pointer',
                              backgroundColor: 'transparent',
                              flexShrink: 0
                            }}
                          />
                          <input
                            type="text"
                            maxLength={7}
                            value={settings.themePrimaryColor || ''}
                            placeholder="#10B981"
                            onChange={e => setSettings({ ...settings, themePrimaryColor: e.target.value.toUpperCase() })}
                            style={{
                              width: '130px',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '10px',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                              textTransform: 'uppercase',
                              outline: 'none'
                            }}
                          />
                        </div>

                        {/* Advertencia de contraste si el color es muy claro */}
                        {isColorTooLight(settings.themePrimaryColor || '') && (
                          <div style={{
                            marginTop: '10px',
                            padding: '12px',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fcd34d',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            color: '#92400e',
                            fontSize: '12px'
                          }}>
                            <IonIcon icon={warningOutline} style={{ color: '#d97706', fontSize: '18px', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: '#78350f' }}>Advertencia: Color muy claro sobre fondos blancos</p>
                              <p style={{ margin: '4px 0 0 0', color: '#92400e', lineHeight: 1.4 }}>
                                Este color tiene poco contraste contra fondos blancos. Los botones de texto, modales y enlaces podrían verse difíciles de leer. FinoWork protegerá automáticamente los diálogos críticos, pero te recomendamos elegir un tono más oscuro o saturado para una experiencia óptima.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#334155',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '8px'
                        }}>
                          Color Encabezados (Barra Superior)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(settings.themeHeaderColor || '') ? settings.themeHeaderColor : '#ffffff'}
                            onChange={e => setSettings({ ...settings, themeHeaderColor: e.target.value.toUpperCase() })}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              padding: 0,
                              cursor: 'pointer',
                              backgroundColor: 'transparent',
                              flexShrink: 0
                            }}
                          />
                          <input
                            type="text"
                            maxLength={7}
                            value={settings.themeHeaderColor || ''}
                            placeholder="#FFFFFF"
                            onChange={e => setSettings({ ...settings, themeHeaderColor: e.target.value.toUpperCase() })}
                            style={{
                              width: '130px',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '10px',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#0f172a',
                              textTransform: 'uppercase',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, themeHeaderColor: '#FFFFFF' })}
                            style={{
                              fontSize: '12px',
                              color: '#475569',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Blanco Limpio (#FFFFFF)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, themeHeaderColor: settings.themePrimaryColor || '#10B981' })}
                            style={{
                              fontSize: '12px',
                              color: '#475569',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Mismo que Principal
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Simulador y Vista Previa en Vivo */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Vista Previa en Tiempo Real
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
                            Simulación de Interfaz
                          </span>
                        </div>

                        {/* Barra Superior Simulada */}
                        <div
                          style={{
                            borderRadius: '10px',
                            padding: '10px 14px',
                            border: '1px solid #cbd5e1',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: settings.themeHeaderColor || '#ffffff',
                            color: getContrastColor(settings.themeHeaderColor || '#ffffff'),
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800 }}>☰</span>
                            <span style={{ fontSize: '13px', fontWeight: 800 }}>FinoWork POS</span>
                          </div>
                          <span style={{ fontSize: '12px', opacity: 0.85, fontWeight: 600 }}>Negocio</span>
                        </div>

                        {/* Superficie de Diálogo / Tarjeta Blanca */}
                        <div style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          padding: '14px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Prueba de Elementos</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: (settings.themePrimaryColor || '#10b981') + '20',
                                color: ensureReadableColor(settings.themePrimaryColor || '#10b981')
                              }}
                            >
                              Insignia
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Botón Sólido */}
                            <div
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textAlign: 'center',
                                backgroundColor: settings.themePrimaryColor || '#10b981',
                                color: getContrastColor(settings.themePrimaryColor || '#10b981'),
                                cursor: 'default'
                              }}
                            >
                              Botón Sólido
                            </div>

                            {/* Botón Contorno */}
                            <div
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textAlign: 'center',
                                border: `1px solid ${settings.themePrimaryColor || '#10b981'}`,
                                color: ensureReadableColor(settings.themePrimaryColor || '#10b981'),
                                backgroundColor: '#ffffff',
                                cursor: 'default'
                              }}
                            >
                              Botón Borde
                            </div>
                          </div>

                          {/* Diálogo de Confirmación Simulado */}
                          <div style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}>
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>Cerrar Sesión (Diálogo)</p>
                            <p style={{ margin: '2px 0 6px 0', fontSize: '11px', color: '#64748b' }}>¿Estás seguro de que quieres salir?</p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
                              <span style={{ color: '#64748b' }}>CANCELAR</span>
                              <span style={{ color: '#ef4444' }}>SALIR</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                        Los cambios se aplicarán en todos tus dispositivos al guardar.
                      </div>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {settings.featureCustomerSchedules && (
            <BookingSettings settings={settings} setSettings={setSettings} />
          )}

        </IonGrid>
        
        <div style={{ padding: '0 10px 100px 10px' }}>
          <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{ margin: 0, height: '52px', fontWeight: 800, borderRadius: '12px', fontSize: '15px' }}>
            <IonIcon slot="start" icon={saveOutline} />
            Guardar Todos los Ajustes
          </IonButton>
        </div>

        {/* MODAL: REPORTAR PAGO DE SUSCRIPCIÓN SAAS */}
        <ReportPaymentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          initialAmountUsd={subscription?.finalFee}
          onSuccess={() => {
            fetchSubscription();
          }}
        />
      </IonContent>
    </IonPage>
  );
};
export default SettingsPage;
