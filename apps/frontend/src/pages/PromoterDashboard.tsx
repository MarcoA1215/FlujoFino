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
} from '@ionic/react';
import {
  copyOutline,
  logoWhatsapp,
  refreshOutline,
  businessOutline,
  ribbonOutline,
  settingsOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import {
  type PromoterStatsDTO,
  PromoterRank,
  TenantStatus,
} from '@finowork/shared-types';
import { BankSelect } from '../components/BankSelect';
import { getPublicBaseUrl } from '../utils/public-url';

const PromoterDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<PromoterStatsDTO | null>(null);

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

  // Cálculo de progreso hacia el siguiente rango
  const monthlyActivations = stats?.monthlyActivations || 0;
  const currentRank = stats?.currentRank || PromoterRank.MADERA;
  const nextRank = stats?.nextRank;

  let progressValue = 1;
  let progressText = '¡Has alcanzado el rango máximo Oro!';

  if (nextRank) {
    const totalRequiredForNext = monthlyActivations + nextRank.activationsNeeded;
    progressValue = Math.min(1, Math.max(0, monthlyActivations / totalRequiredForNext));
    progressText = `Te faltan ${nextRank.activationsNeeded} ${nextRank.activationsNeeded === 1 ? 'activación' : 'activaciones'} para subir a ${nextRank.rankEmoji} ${nextRank.rank} y desbloquear el bono de $${nextRank.bonusUSD} USD.`;
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
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 4px 0' }}>
                  ¡Hola, {user?.username}! 👋
                </h1>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
                  Gana <strong>$10 USD</strong> por cada nueva activación de tienda y el <strong>10% recurrente</strong> mensual de por vida.
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

            {/* SECCIÓN SUPERIOR CON KPI CARDS */}
            <IonGrid style={{ padding: 0, marginBottom: '20px' }}>
              <IonRow>
                {/* KPI 1: Rango Actual */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #f59e0b', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Rango Actual (Mes)
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{stats.rankEmoji}</span>
                        <span>{stats.currentRank}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        <strong>{stats.monthlyActivations}</strong> nuevas activaciones este mes
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 2: Saldo Pendiente por Cobrar */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #ea580c', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Saldo Pendiente
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#ea580c', marginTop: '6px' }}>
                        ${stats.totalPendingBalanceUSD.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#ea580c', marginTop: '4px', fontWeight: 600 }}>
                        ⏳ Listo para liquidación SuperAdmin
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 3: Comisiones Recurrentes Generadas */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #10b981', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Recurrente Generado
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                        ${stats.totalRecurringCommissionsUSD.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        🔄 10% mensual continuo
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>

                {/* KPI 4: Total Histórico Cobrado */}
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonCard style={{ margin: 0, borderRadius: '12px', borderLeft: '4px solid #3b82f6', height: '100%' }}>
                    <IonCardContent style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Cobrado
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6', marginTop: '6px' }}>
                        ${stats.totalPaidBalanceUSD.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 500 }}>USD</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        🎉 Pagos liquidados con éxito
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* BARRA DE PROGRESO DINÁMICA: ESCALERA DE RANGOS */}
            <IonCard style={{ margin: '0 0 20px 0', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <IonCardContent style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={ribbonOutline} style={{ color: '#d97706', fontSize: '20px' }} />
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                      Escalera Mensual de Rangos y Bonos Extra
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                    {monthlyActivations} activaciones este mes
                  </span>
                </div>

                <IonProgressBar
                  value={progressValue}
                  color={progressValue >= 1 ? 'success' : 'primary'}
                  style={{ height: '10px', borderRadius: '6px', marginBottom: '10px' }}
                />

                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                  {progressText}
                </div>

                {/* Explicación de los 4 escalones */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ background: currentRank === PromoterRank.MADERA ? '#fef3c7' : '#f8fafc', padding: '10px', borderRadius: '8px', border: currentRank === PromoterRank.MADERA ? '1px solid #f59e0b' : '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#78350f' }}>🪵 Madera (&lt;5)</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>$10 por tienda</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>Bono: $0 USD</div>
                  </div>

                  <div style={{ background: currentRank === PromoterRank.BRONCE ? '#fef3c7' : '#f8fafc', padding: '10px', borderRadius: '8px', border: currentRank === PromoterRank.BRONCE ? '1px solid #f59e0b' : '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#b45309' }}>🥉 Bronce (5-9)</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>$10 por tienda</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>+ Bono $10 USD</div>
                  </div>

                  <div style={{ background: currentRank === PromoterRank.PLATA ? '#fef3c7' : '#f8fafc', padding: '10px', borderRadius: '8px', border: currentRank === PromoterRank.PLATA ? '1px solid #f59e0b' : '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569' }}>🥈 Plata (10-19)</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>$10 por tienda</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>+ Bono $25 USD</div>
                  </div>

                  <div style={{ background: currentRank === PromoterRank.ORO ? '#fef3c7' : '#f8fafc', padding: '10px', borderRadius: '8px', border: currentRank === PromoterRank.ORO ? '1px solid #f59e0b' : '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#d97706' }}>🥇 Oro (20+)</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>$10 por tienda</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>+ Bono $50 USD</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* TABLA DE COMERCIOS AFILIADOS */}
            <IonCard style={{ margin: '0 0 24px 0', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <IonCardHeader style={{ borderBottom: '1px solid #f1f5f9' }}>
                <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={businessOutline} color="primary" />
                  Comercios Afiliados con tu Código ({stats.affiliatedTenants.length})
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ padding: 0 }}>
                {stats.affiliatedTenants.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <IonIcon icon={businessOutline} style={{ fontSize: '42px', color: '#cbd5e1', marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Aún no has registrado ningún comercio</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>
                      Comparte tu enlace de promotor para que tus primeros comercios aparezcan listados aquí.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 16px' }}>Nombre del Negocio</th>
                          <th style={{ padding: '12px 16px' }}>Fecha de Ingreso</th>
                          <th style={{ padding: '12px 16px' }}>Estado de Suscripción</th>
                          <th style={{ padding: '12px 16px' }}>Comisión Inicial ($10)</th>
                          <th style={{ padding: '12px 16px' }}>Recurrente Mensual (10%)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Generado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.affiliatedTenants.map((t) => (
                          <tr key={t.tenantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                                {t.tenantName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Plan: {t.planType}
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                              {new Date(t.createdAt).toLocaleDateString('es-VE')}
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              {t.status === TenantStatus.ACTIVE ? (
                                <IonBadge color="success">ACTIVO</IonBadge>
                              ) : t.status === TenantStatus.TRIAL ? (
                                <IonBadge color="warning">PRUEBA</IonBadge>
                              ) : t.status === TenantStatus.PAST_DUE ? (
                                <IonBadge color="danger">VENCIDO</IonBadge>
                              ) : (
                                <IonBadge color="medium">{t.status}</IonBadge>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              {t.activationCommission ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '13px' }}>
                                    ✓ $10.00 USD
                                  </span>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    Estado: {t.activationCommission.status}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                  ⏳ Pendiente 1er Pago
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              {t.recurringCommissionsCount > 0 ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '13px' }}>
                                    ${t.recurringCommissionsUSD.toFixed(2)} USD
                                  </span>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {t.recurringCommissionsCount} {t.recurringCommissionsCount === 1 ? 'cuota cobrada' : 'cuotas cobradas'}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                  A partir del mes 2
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: t.totalCommissionsUSD > 0 ? '#0f172a' : '#94a3b8' }}>
                                ${t.totalCommissionsUSD.toFixed(2)} USD
                              </span>
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
      </IonContent>
    </IonPage>
  );
};

export default PromoterDashboard;
