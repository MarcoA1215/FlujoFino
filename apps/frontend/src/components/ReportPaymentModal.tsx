import React, { useState, useEffect, useContext } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  useIonToast,
  IonIcon,
} from '@ionic/react';
import { copyOutline, checkmarkCircleOutline, closeOutline } from 'ionicons/icons';
import { SaaSPaymentMethod } from '@nutrideli/shared-types';
import { apiClient } from '../api/client';
import { SubscriptionContext } from '../context/SubscriptionContext';

interface ReportPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialAmountUsd?: number;
}

export const ReportPaymentModal: React.FC<ReportPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAmountUsd,
}) => {
  const [presentToast] = useIonToast();
  const { platformConfig, exchangeRate, subscription, refreshSubscription } =
    useContext(SubscriptionContext);

  const defaultFee = initialAmountUsd || subscription?.finalFee || 20;

  const [reportAmountUsd, setReportAmountUsd] = useState<number>(defaultFee);
  const [reportAmountBs, setReportAmountBs] = useState<number>(
    Math.round(defaultFee * exchangeRate * 100) / 100
  );
  const [reportMethod, setReportMethod] = useState<SaaSPaymentMethod>(SaaSPaymentMethod.PAGO_MOVIL);
  const [reportReference, setReportReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const fee = initialAmountUsd || subscription?.finalFee || 20;
      setReportAmountUsd(fee);
      setReportAmountBs(Math.round(fee * exchangeRate * 100) / 100);
      setReportReference('');
    }
  }, [isOpen, initialAmountUsd, subscription?.finalFee, exchangeRate]);

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
    presentToast({ message: `${label || 'Dato'} copiado al portapapeles`, duration: 1500, color: 'dark' });
  };

  const handleSubmit = async () => {
    if (!reportAmountUsd || reportAmountUsd <= 0) {
      return presentToast({ message: 'El monto debe ser mayor a 0', duration: 3000, color: 'warning' });
    }
    if (!reportReference || !reportReference.trim()) {
      return presentToast({
        message: 'Ingresa el número de referencia del comprobante',
        duration: 3000,
        color: 'warning',
      });
    }

    try {
      setIsSubmitting(true);
      const isBs = reportMethod === SaaSPaymentMethod.PAGO_MOVIL || reportMethod === SaaSPaymentMethod.CASH;
      await apiClient.post('/superadmin/payments/report', {
        amount: Number(reportAmountUsd),
        amount_bs: isBs ? Number(reportAmountBs) : undefined,
        exchange_rate: isBs ? Number(exchangeRate) : undefined,
        payment_method: reportMethod,
        reference: reportReference.trim(),
      });

      presentToast({
        message: '¡Reporte de pago enviado con éxito! El administrador verificará tu pago.',
        duration: 4000,
        color: 'success',
      });

      await refreshSubscription();
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al enviar reporte de pago';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Reportar Pago de Suscripción
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          {/* Header Info con Tasa Cambiaria Oficial */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '14px',
              padding: '16px',
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
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 700 }}>
                Cuota Mensual Flujo Fino:
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                background: '#fff',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  MONTO EN BOLÍVARES (BS)
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e3a8a' }}>
                  Bs. {reportAmountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  EQUIVALENTE EN USD
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a' }}>
                  ${Number(reportAmountUsd).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Cuentas Oficiales de Recepción del Superadmin */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🏦 Datos Bancarios Oficiales para Transferir
            </h4>

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
                      border: '1px solid #f1f5f9',
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
                      border: '1px solid #f1f5f9',
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
                      border: '1px solid #f1f5f9',
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
                      border: '1px solid #f1f5f9',
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
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Número de Cuenta</span>
                      <strong style={{ fontSize: '12px', color: '#1e293b', wordBreak: 'break-all' }}>
                        {platformConfig.companyAccountNumber}
                      </strong>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => copyField(platformConfig.companyAccountNumber, 'Número de Cuenta')}>
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
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Cargando datos bancarios...</p>
            )}
          </div>

          {/* Formulario de Reporte */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              📝 Registrar Comprobante de Pago
            </h4>

            <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
              <IonLabel position="stacked" style={{ fontWeight: 700 }}>
                Método de Pago Utilizado
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
              <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px' }}>
                <IonLabel position="stacked" style={{ fontWeight: 700 }}>
                  Monto USD ($)
                </IonLabel>
                <IonInput
                  type="number"
                  value={reportAmountUsd}
                  onIonInput={(e) => handleAmountUsdChange(Number(e.detail.value))}
                  style={{ fontWeight: 700 }}
                />
              </IonItem>

              <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px' }}>
                <IonLabel position="stacked" style={{ fontWeight: 700 }}>
                  Monto Bs
                </IonLabel>
                <IonInput
                  type="number"
                  value={reportAmountBs}
                  onIonInput={(e) => handleAmountBsChange(Number(e.detail.value))}
                  style={{ fontWeight: 700 }}
                />
              </IonItem>
            </div>

            <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
              <IonLabel position="stacked" style={{ fontWeight: 700 }}>
                Número de Referencia del Pago *
              </IonLabel>
              <IonInput
                type="text"
                placeholder="Ej. 123456 (últimos dígitos o referencia)"
                value={reportReference}
                onIonInput={(e) => setReportReference(e.detail.value || '')}
                style={{ fontWeight: 600 }}
              />
            </IonItem>

            <IonButton
              expand="block"
              color="primary"
              disabled={isSubmitting || !reportReference.trim() || reportAmountUsd <= 0}
              onClick={handleSubmit}
              style={{ fontWeight: 700, margin: '8px 0 0 0' }}
            >
              {isSubmitting ? (
                <>
                  <IonSpinner name="crescent" slot="start" />
                  Enviando reporte...
                </>
              ) : (
                <>
                  <IonIcon slot="start" icon={checkmarkCircleOutline} />
                  Enviar Reporte de Pago
                </>
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};
