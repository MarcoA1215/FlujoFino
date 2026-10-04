import React, { useState, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  useIonToast,
  IonButtons,
} from '@ionic/react';
import {
  shieldCheckmarkOutline,
  logoWhatsapp,
  copyOutline,
  checkmarkCircleOutline,
  logOutOutline,
  businessOutline,
} from 'ionicons/icons';
import { SaaSPaymentMethod } from '@finowork/shared-types';
import { apiClient } from '../api/client';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BankSelect } from '../components/BankSelect';

const SubscriptionExpired: React.FC = () => {
  const [presentToast] = useIonToast();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const {
    subscription,
    platformConfig,
    exchangeRate,
    refreshSubscription,
  } = useContext(SubscriptionContext);

  const planFeeUsd = subscription?.finalFee || 20;
  const [reportAmountUsd, setReportAmountUsd] = useState<number>(planFeeUsd);
  const [reportAmountBs, setReportAmountBs] = useState<number>(
    Math.round(planFeeUsd * exchangeRate * 100) / 100
  );
  const [reportMethod, setReportMethod] = useState<SaaSPaymentMethod>(SaaSPaymentMethod.PAGO_MOVIL);
  const [reportReference, setReportReference] = useState<string>('');
  const [reportBank, setReportBank] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAmountUsdChange = (val: number) => {
    setReportAmountUsd(val);
    setReportAmountBs(Math.round(val * exchangeRate * 100) / 100);
  };

  const handleAmountBsChange = (val: number) => {
    setReportAmountBs(val);
    if (exchangeRate > 0) {
      setReportAmountUsd(Math.round((val / exchangeRate) * 100) / 100);
    }
  };

  const copyField = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    presentToast({
      message: `${label || 'Dato'} copiado al portapapeles`,
      duration: 1500,
      color: 'dark',
    });
  };

  const handleSubmitReport = async () => {
    if (!reportAmountUsd || reportAmountUsd <= 0) {
      return presentToast({ message: 'El monto debe ser mayor a 0', duration: 3000, color: 'warning' });
    }
    if (!reportReference || !reportReference.trim()) {
      return presentToast({
        message: 'Ingresa el número de referencia del pago',
        duration: 3000,
        color: 'warning',
      });
    }

    try {
      setIsSubmitting(true);
      const isBs = reportMethod === SaaSPaymentMethod.PAGO_MOVIL || reportMethod === SaaSPaymentMethod.CASH;
      const fullRef = reportBank
        ? `${reportReference.trim()} (${reportBank})`
        : reportReference.trim();
      await apiClient.post('/superadmin/payments/report', {
        amount: Number(reportAmountUsd),
        amount_bs: isBs ? Number(reportAmountBs) : undefined,
        exchange_rate: isBs ? Number(exchangeRate) : undefined,
        payment_method: reportMethod,
        reference: fullRef,
      });

      presentToast({
        message: '¡Reporte registrado exitosamente! En breve el Superadmin activará tu cuenta.',
        duration: 5000,
        color: 'success',
      });

      setReportReference('');
      setReportBank('');
      await refreshSubscription();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al enviar reporte de pago';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Support Link
  const rawSupportPhone = platformConfig?.companyPhone || '';
  const cleanPhone = rawSupportPhone.replace(/\D/g, '');
  const supportPhone = cleanPhone.startsWith('58')
    ? cleanPhone
    : cleanPhone.startsWith('0')
    ? `58${cleanPhone.slice(1)}`
    : cleanPhone || '584120000000';

  const waMessage = encodeURIComponent(
    `Hola Soporte FinoWork, me comunico respecto al vencimiento de suscripción de mi negocio: "${user?.tenantName || 'Mi Negocio'}". Deseo reactivar el servicio.`
  );
  const waUrl = `https://wa.me/${supportPhone}?text=${waMessage}`;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Suscripción Requerida - FinoWork
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => logout()} title="Cerrar sesión">
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 0 40px 0' }}>
          {/* Mensaje de Tranquilidad y Resguardo */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '32px',
              }}
            >
              🔒
            </div>

            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#1e293b',
                margin: '0 0 10px 0',
              }}
            >
              Tu período de prueba ha concluido
            </h1>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                margin: '8px 0 16px 0',
                lineHeight: 1.4,
              }}
            >
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '1.5rem', flexShrink: 0, color: '#059669' }} />
              <span>
                Todos tus productos, clientes y registros están <strong>100% seguros y respaldados</strong>.
              </span>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Para reactivar inmediatamente el punto de venta, inventario y tus portales públicos, realiza el pago de
              tu cuota mensual y regístralo a continuación.
            </p>
          </div>

          {/* Cuota Mensual y Tasa */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>
                Plan Mensual FinoWork
              </span>
              <span
                style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                💵 Tasa Oficial: Bs. {exchangeRate.toFixed(2)} / $
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: '#fff',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid #dbeafe',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                  MONTO EN BOLÍVARES (BS)
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a' }}>
                  Bs. {reportAmountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                  EQUIVALENTE EN USD
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
                  ${Number(reportAmountUsd).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Datos para Transferir */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3
              style={{
                margin: '0 0 14px 0',
                fontSize: '15px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🏦 Datos Oficiales para Transferir (Pago Móvil / Banco)
            </h3>

            {platformConfig ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {platformConfig.companyBank && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Banco</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{platformConfig.companyBank}</strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyBank, 'Banco')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}

                {platformConfig.companyCedula && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Cédula / RIF</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{platformConfig.companyCedula}</strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyCedula, 'Cédula')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}

                {platformConfig.companyPhone && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Teléfono Pago Móvil</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{platformConfig.companyPhone}</strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyPhone, 'Teléfono')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}

                {platformConfig.companyAccountHolder && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Titular</span>
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>{platformConfig.companyAccountHolder}</strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyAccountHolder, 'Titular')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}

                {platformConfig.companyAccountNumber && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Número de Cuenta</span>
                      <strong style={{ fontSize: '12px', color: '#1e293b', wordBreak: 'break-all' }}>
                        {platformConfig.companyAccountNumber}
                      </strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyAccountNumber, 'Cuenta')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}

                {platformConfig.binancePayId && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fefce8',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fef08a',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#854d0e', display: 'block' }}>Binance Pay ID</span>
                      <strong style={{ fontSize: '13px', color: '#713f12' }}>{platformConfig.binancePayId}</strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.binancePayId, 'Binance Pay ID')}>
                      <IonIcon icon={copyOutline} />
                    </IonButton>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#64748b' }}>Cargando datos bancarios...</p>
            )}
          </div>

          {/* Formulario Rápido de Reporte de Pago */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              📝 Registrar Reporte de Pago
            </h3>

            <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
              <IonLabel position="stacked" style={{ fontWeight: 700 }}>
                Método de Pago
              </IonLabel>
              <IonSelect
                value={reportMethod}
                onIonChange={(e) => setReportMethod(e.detail.value)}
                interface="popover"
                style={{ width: '100%', fontWeight: 600 }}
              >
                <IonSelectOption value={SaaSPaymentMethod.PAGO_MOVIL}>Pago Móvil (Bs)</IonSelectOption>
                <IonSelectOption value={SaaSPaymentMethod.BINANCE}>Binance Pay (USDT)</IonSelectOption>
                <IonSelectOption value={SaaSPaymentMethod.CASH}>Transferencia Bancaria / Efectivo</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Monto USD ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={reportAmountUsd}
                  onChange={(e) => handleAmountUsdChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Monto Bs
                </label>
                <input
                  type="number"
                  step="any"
                  value={reportAmountBs}
                  onChange={(e) => handleAmountBsChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {(reportMethod === SaaSPaymentMethod.PAGO_MOVIL || reportMethod === SaaSPaymentMethod.CASH) && (
              <div style={{ marginBottom: '14px' }}>
                <BankSelect
                  label="Banco Emisor / Origen (Desde donde pagaste)"
                  value={reportBank}
                  onChange={(val) => setReportBank(val)}
                  placeholder="Selecciona tu banco de origen..."
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Número de Referencia del Pago *
              </label>
              <input
                type="text"
                placeholder="Ej. 123456 (últimos dígitos o referencia)"
                value={reportReference}
                onChange={(e) => setReportReference(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <IonButton
              expand="block"
              color="primary"
              disabled={isSubmitting || !reportReference.trim() || reportAmountUsd <= 0}
              onClick={handleSubmitReport}
              style={{ fontWeight: 700 }}
            >
              {isSubmitting ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Registrando pago...
                </>
              ) : (
                <>
                  <IonIcon slot="start" icon={checkmarkCircleOutline} />
                  Enviar Reporte de Pago
                </>
              )}
            </IonButton>
          </div>

          {/* Botón Directo de Ayuda por WhatsApp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <IonButton
              expand="block"
              color="success"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 800, '--border-radius': '10px' }}
            >
              <IonIcon slot="start" icon={logoWhatsapp} style={{ fontSize: '1.3rem' }} />
              Contactar a soporte por WhatsApp
            </IonButton>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
              <IonButton
                fill="clear"
                size="small"
                color="medium"
                onClick={() => navigate('/select-workspace')}
              >
                <IonIcon slot="start" icon={businessOutline} />
                Cambiar de negocio
              </IonButton>

              <IonButton fill="clear" size="small" color="medium" onClick={() => logout()}>
                <IonIcon slot="start" icon={logOutOutline} />
                Cerrar sesión
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SubscriptionExpired;
