import React, { useState, useEffect, useContext } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonButtons, IonMenuButton, useIonToast, IonIcon, IonToggle } from '@ionic/react';
import { saveOutline, refreshOutline, giftOutline, copyOutline, logoWhatsapp } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole, TenantPlanType, type MySubscriptionDTO } from '@nutrideli/shared-types';
import { BookingSettings } from '../components/BookingSettings';

interface Settings {
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
  featureShowCatalog?: boolean;
  bookingRequireService?: boolean;
  bookingAllowStaffSelection?: boolean;
  publicToken?: string;
  businessHours?: any;
  services?: any[];
  slotInterval?: number;
  themePrimaryColor?: string;
  themeHeaderColor?: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [subscription, setSubscription] = useState<MySubscriptionDTO | null>(null);
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

  const fetchSubscription = async () => {
    try {
      const res = await apiClient.get<MySubscriptionDTO>('/superadmin/my-subscription');
      setSubscription(res.data);
    } catch (e) {
      console.log('Error cargando suscripción:', e);
    }
  };

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchSettings();
      fetchSubscription();
    }
  }, [user]);

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
      await apiClient.put('/settings', { 
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
          featureShowCatalog: settings.featureShowCatalog,
          bookingRequireService: settings.bookingRequireService,
          bookingAllowStaffSelection: settings.bookingAllowStaffSelection,
          businessHours: settings.businessHours,
          services: settings.services,
          slotInterval: settings.slotInterval,
          themePrimaryColor: settings.themePrimaryColor,
          themeHeaderColor: settings.themeHeaderColor
        });
        presentToast({
          message: 'Configuración guardada', duration: 2000, color: 'success' });
      fetchSettings();
    } catch(e: any) {
      const msg = e.response?.data?.message || 'Error guardando ajustes';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
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
                          ¡Tu negocio forma parte de las cuentas <strong>Pioneras</strong> de Flujo Fino! Invita a <strong>2 negocios</strong> que activen su suscripción y tendrás el sistema <strong>100% GRATIS de por vida ($0/mes)</strong>.
                        </>
                      ) : (
                        <>
                          Comparte Flujo Fino con otros negocios amigos. Obtén un <strong>10% de descuento mensual</strong> por cada referido activo que mantengas (¡hasta un <strong>50% de descuento</strong> recurrente!).
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
                            const link = `${window.location.origin}/register?ref=${subscription.referralCode}`;
                            navigator.clipboard?.writeText(link);
                            presentToast({ message: 'Enlace de registro copiado al portapapeles', duration: 2000, color: 'success' });
                          }}
                        >
                          <IonIcon icon={copyOutline} slot="start" />
                          Copiar Enlace de Invitación
                        </IonButton>

                        <IonButton
                          color="success"
                          style={{ flex: 1, minWidth: '160px', fontWeight: 700 }}
                          onClick={() => {
                            const link = `${window.location.origin}/register?ref=${subscription.referralCode}`;
                            const msg = `¡Hola! Te recomiendo Flujo Fino para administrar tu negocio (punto de venta, pedidos, inventario y delivery). Regístrate gratis con mi enlace de invitación: ${link}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                        >
                          <IonIcon icon={logoWhatsapp} slot="start" />
                          Compartir por WhatsApp
                        </IonButton>
                      </div>
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
                  <IonItem>
                    <IonLabel position="stacked">Banco Receptor</IonLabel>
                    <IonInput value={settings.companyBank || ''} onIonInput={e => setSettings({...settings, companyBank: e.detail.value!})} placeholder="Ej. Banesco" />
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
                      <h2>Permitir Pagos Parciales (Abonos / Cuentas Abiertas)</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Permite a los cajeros registrar pedidos con inicial o cuenta por cobrar.
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
                    <IonLabel className="ion-text-wrap">Portafolio / Catálogo Público de Trabajos</IonLabel>
                    <IonToggle checked={settings.featureShowCatalog || false} onIonChange={e => setSettings({...settings, featureShowCatalog: e.detail.checked})} />
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
                    <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #86efac', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <h3 style={{ margin: 0, color: '#166534', fontWeight: 'bold' }}>🛍️ Enlace de tu Tienda Online / Catálogo Digital</h3>
                        <span style={{ fontSize: '11px', background: '#bbf7d0', color: '#14532d', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                          Módulo Compra-Venta Activo
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#15803d' }}>
                        Tus clientes verán tus productos con fotos, precios en $ y Bs., control de stock, carrito de compras, opciones de delivery y podrán enviarte sus pedidos directo a Caja y WhatsApp.
                      </p>
                      <IonInput 
                        readonly 
                        value={`${window.location.origin}/store/${settings.publicToken || user?.tenantId}`} 
                        style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #cbd5e1' }} 
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton 
                          size="small" 
                          color="success" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/store/${settings.publicToken || user?.tenantId}`);
                            presentToast({ message: '¡Enlace de tienda copiado!', duration: 2000, color: 'success' });
                          }}
                        >
                          Copiar Enlace Tienda
                        </IonButton>
                        <IonButton 
                          size="small" 
                          fill="outline" 
                          color="success" 
                          onClick={() => {
                            window.open(`${window.location.origin}/store/${settings.publicToken || user?.tenantId}`, '_blank');
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
                        value={`${window.location.origin}/book/${settings.publicToken || user?.tenantId}`} 
                        style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #cbd5e1' }} 
                      />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton 
                          size="small" 
                          color="secondary" 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/book/${settings.publicToken || user?.tenantId}`);
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
                            window.open(`${window.location.origin}/book/${settings.publicToken || user?.tenantId}`, '_blank');
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
                  <IonCardTitle>Personalización de Interfaz</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{marginBottom: '15px'}}>Cambia los colores base de tu sucursal para que coincidan con tu marca.</p>
                  
                  <IonItem>
                    <IonLabel position="stacked">Color Principal (Menú y Botones)</IonLabel>
                    <IonInput type="text" placeholder="#1E293B" value={settings.themePrimaryColor || ''} onIonChange={e => setSettings({...settings, themePrimaryColor: e.detail.value!})} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Color Encabezados (Superior)</IonLabel>
                    <IonInput type="text" placeholder="#334155" value={settings.themeHeaderColor || ''} onIonChange={e => setSettings({...settings, themeHeaderColor: e.detail.value!})} />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {settings.featureCustomerSchedules && (
            <BookingSettings settings={settings} setSettings={setSettings} />
          )}

        </IonGrid>
        
        <div style={{ padding: '0 10px 20px 10px' }}>
          <IonButton expand="block" color="primary" onClick={handleSaveSettings} style={{ margin: 0, height: '50px' }}>
            <IonIcon slot="start" icon={saveOutline} />
            Guardar Todos los Ajustes
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default SettingsPage;
