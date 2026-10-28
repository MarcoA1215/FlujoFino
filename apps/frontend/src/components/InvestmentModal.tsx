import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonBadge,
  useIonToast,
  useIonAlert,
  IonSpinner,
} from '@ionic/react';
import {
  closeOutline,
  addCircleOutline,
  alertCircleOutline,
  trendingUpOutline,
  walletOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { InvestmentType } from '@finowork/shared-types';
import { FinoDatePicker } from './ui';

export type InvestmentPaymentMethod = 'CASH_USD' | 'PAGO_MOVIL' | 'BINANCE';

interface InvestmentSummary {
  totalExternalUSD: number;
  totalExternalBS: number;
  totalReinvestmentUSD: number;
  totalReinvestmentBS: number;
  totalConsolidatedUSD: number;
  totalConsolidatedBS: number;
  recentInvestments: {
    id: string;
    type: InvestmentType;
    amountUSD: number;
    amountBS: number;
    exchangeRate: number;
    description: string;
    paymentMethod?: InvestmentPaymentMethod | string | null;
    date: string;
    createdAt: string;
  }[];
}

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultExchangeRate?: number;
}

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultExchangeRate,
}) => {
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [treasury, setTreasury] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [type, setType] = useState<InvestmentType>(InvestmentType.INVERSION_EXTERNA);
  const [paymentMethod, setPaymentMethod] = useState<InvestmentPaymentMethod>('CASH_USD');
  const [amountUSD, setAmountUSD] = useState('');
  const [amountBS, setAmountBS] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch (e) {}
    if (defaultExchangeRate && defaultExchangeRate > 0) {
      return defaultExchangeRate;
    }
    return 0;
  });

  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<InvestmentSummary>('/investments/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Error cargando inversiones', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasury = async () => {
    try {
      const res = await apiClient.get('/dashboard/treasury');
      if (res.data) setTreasury(res.data);
    } catch (e) {
      console.log('Error obteniendo tesorería', e);
    }
  };

  const fetchSettingsRate = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data?.exchangeRateBs) {
        setExchangeRate(Number(res.data.exchangeRateBs));
      }
    } catch (e) {
      console.log('Error obteniendo tasa', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      fetchTreasury();
      fetchSettingsRate();
    }
  }, [isOpen]);

  const handleUSDChange = (val: string) => {
    setAmountUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountBS((num * exchangeRate).toFixed(2));
    } else {
      setAmountBS('');
    }
  };

  const handleBSChange = (val: string) => {
    setAmountBS(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && exchangeRate > 0) {
      setAmountUSD((num / exchangeRate).toFixed(2));
    } else {
      setAmountUSD('');
    }
  };

  const getPaymentMethodMeta = (method?: string | null) => {
    switch (method) {
      case 'PAGO_MOVIL':
      case 'TRANSFER':
      case 'BANCO':
        return {
          label: '🏦 Banco Bs',
          fullName: 'Banco / Pago Móvil (Bs.)',
          bg: '#F5F3FF',
          color: '#6D28D9',
          border: '#DDD6FE',
        };
      case 'BINANCE':
      case 'DIGITAL_USD':
        return {
          label: '💎 Digital USD',
          fullName: 'Digital / Binance ($ USD)',
          bg: '#FFFBEB',
          color: '#B45309',
          border: '#FDE68A',
        };
      case 'CASH':
      case 'CASH_USD':
      default:
        return {
          label: '💵 Efectivo USD',
          fullName: 'Efectivo en Gaveta ($ USD)',
          bg: '#ECFDF5',
          color: '#047857',
          border: '#A7F3D0',
        };
    }
  };

  const executeSubmit = async (usdNum: number, bsNum: number) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/investments', {
        type,
        amountUSD: usdNum,
        amountBS: bsNum > 0 ? bsNum : undefined,
        exchangeRate,
        description: description.trim(),
        date,
        paymentMethod: type === InvestmentType.REINVERSION_GANANCIA ? paymentMethod : undefined,
      });

      const methodMeta = getPaymentMethodMeta(paymentMethod);
      presentToast({
        message:
          type === InvestmentType.REINVERSION_GANANCIA
            ? `✅ Reinversión registrada y descontada de ${methodMeta.fullName}`
            : '✅ Inversión externa registrada con éxito',
        duration: 3000,
        color: 'success',
      });

      // Limpiar formulario y recargar datos
      setAmountUSD('');
      setAmountBS('');
      setDescription('');
      fetchSummary();
      fetchTreasury();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      presentToast({
        message: 'Error al registrar: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUSDNum = parseFloat(amountUSD) || 0;
  const currentBSNum = parseFloat(amountBS) || currentUSDNum * exchangeRate;

  const checkInsufficiency = () => {
    if (type !== InvestmentType.REINVERSION_GANANCIA || !treasury || currentUSDNum <= 0) {
      return { isInsufficient: false, availableStr: '', missingStr: '', accountLabel: '' };
    }
    if (paymentMethod === 'PAGO_MOVIL') {
      const availBs = Number(treasury.bankBs || 0);
      const isInsuf = currentBSNum > availBs + 0.05;
      const missingBs = Math.max(0, currentBSNum - availBs);
      return {
        isInsufficient: isInsuf,
        availableStr: `Bs. ${availBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        missingStr: `Bs. ${missingBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        accountLabel: 'Banco / Pago Móvil (Bs.)',
      };
    }
    if (paymentMethod === 'BINANCE') {
      const availDig = Number(treasury.digitalUSD ?? 0);
      const hasDigitalField = treasury.digitalUSD !== undefined && treasury.digitalUSD !== null;
      const isInsuf = hasDigitalField && currentUSDNum > availDig + 0.05;
      const missingUsd = Math.max(0, currentUSDNum - availDig);
      return {
        isInsufficient: isInsuf,
        availableStr: `$${availDig.toFixed(2)} USD`,
        missingStr: `$${missingUsd.toFixed(2)} USD`,
        accountLabel: 'Digital / Binance ($ USD)',
      };
    }
    // Default CASH_USD
    const availCash = Number(treasury.cashUSD || 0);
    const isInsuf = currentUSDNum > availCash + 0.05;
    const missingUsd = Math.max(0, currentUSDNum - availCash);
    return {
      isInsufficient: isInsuf,
      availableStr: `$${availCash.toFixed(2)} USD`,
      missingStr: `$${missingUsd.toFixed(2)} USD`,
      accountLabel: 'Efectivo en Gaveta ($ USD)',
    };
  };

  const insufficiency = checkInsufficiency();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdNum = parseFloat(amountUSD);
    if (!amountUSD || isNaN(usdNum) || usdNum <= 0) {
      return presentToast({ message: 'Ingresa un monto válido mayor a 0', duration: 2500, color: 'warning' });
    }
    if (!description.trim()) {
      return presentToast({ message: 'Ingresa un concepto o descripción', duration: 2500, color: 'warning' });
    }

    const bsNum = amountBS ? parseFloat(amountBS) : Number((usdNum * exchangeRate).toFixed(2));

    if (type === InvestmentType.REINVERSION_GANANCIA && insufficiency.isInsufficient) {
      presentAlert({
        header: '⚠️ Saldo Insuficiente',
        subHeader: `Cuenta: ${insufficiency.accountLabel}`,
        message: `El monto a reinvertir supera los fondos disponibles en ${insufficiency.accountLabel} (Disponible: ${insufficiency.availableStr} • Faltan: ${insufficiency.missingStr}).\n\nSi continúas, esta cuenta quedará con saldo negativo en la tesorería.\n\n¿Deseas registrar esta reinversión de todas formas?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Sí, descontar y registrar',
            handler: () => executeSubmit(usdNum, bsNum),
          },
        ],
      });
      return;
    }

    await executeSubmit(usdNum, bsNum);
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{ ['--max-width' as any]: '640px', ['--border-radius' as any]: '16px' }}
    >
      <IonHeader>
        <IonToolbar style={{ ['--background' as any]: '#0F172A', color: '#ffffff' }}>
          <IonTitle style={{ fontSize: '1.1rem', fontWeight: 800 }}>Inversión vs. Reinversión</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" color="light" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
          {/* 1. Encabezado con Totales Desglosados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0284C7' }}>
                <IonIcon icon={walletOutline} />
                Inversión Externa
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
                ${(summary?.totalExternalUSD || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                Bs. {(summary?.totalExternalBS || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                Capital externo, maquinaria, obras
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--theme-primary-readable, #065F46)',
                }}
              >
                <IonIcon icon={trendingUpOutline} />
                Reinversión
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
                ${(summary?.totalReinvestmentUSD || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                Bs. {(summary?.totalReinvestmentBS || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                Dinero propio extraído de ganancia
              </div>
            </div>
          </div>

          {/* 2. Banner de Advertencia Visible y Destacado */}
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <IonIcon icon={alertCircleOutline} style={{ fontSize: '24px', color: '#B45309', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: '1.45' }}>
              <strong>⚠️ Atención:</strong> Si compraste insumos que ya registraste en el módulo de Inventario/Insumos,{' '}
              <strong>no los registres aquí</strong>. El sistema ya deduce ese costo automáticamente. Registra únicamente
              compras de equipamiento, adecuaciones o gastos extras no cargados como insumos para evitar duplicar
              deducciones.
            </div>
          </div>

          {/* 3. Formulario de Registro */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Registrar Movimiento de Capital
            </h4>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Selector de Tipo de Registro */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Tipo de Registro *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setType(InvestmentType.INVERSION_EXTERNA)}
                    style={{
                      minHeight: '44px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: type === InvestmentType.INVERSION_EXTERNA ? '2px solid #0284C7' : '1px solid #CBD5E1',
                      background: type === InvestmentType.INVERSION_EXTERNA ? '#E0F2FE' : '#FFFFFF',
                      color: type === InvestmentType.INVERSION_EXTERNA ? '#0369A1' : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💼 Inversión Externa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(InvestmentType.REINVERSION_GANANCIA)}
                    style={{
                      minHeight: '44px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border:
                        type === InvestmentType.REINVERSION_GANANCIA
                          ? '2px solid var(--theme-primary, #10B981)'
                          : '1px solid #CBD5E1',
                      background:
                        type === InvestmentType.REINVERSION_GANANCIA
                          ? 'var(--theme-primary-soft, #ECFDF5)'
                          : '#FFFFFF',
                      color:
                        type === InvestmentType.REINVERSION_GANANCIA
                          ? 'var(--theme-primary-readable, #065F46)'
                          : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔄 Reinversión de Ganancia</span>
                  </button>
                </div>
              </div>

              {/* Selector de Método de Pago / Cuenta a Descontar (Solo en Reinversión) */}
              {type === InvestmentType.REINVERSION_GANANCIA && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                      ¿De qué cuenta o método de pago se descontará el dinero? *
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Selecciona la caja o cuenta de donde salió el dinero para esta reinversión:
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    {/* Opción 1: Efectivo en Gaveta ($ USD) */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH_USD')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border:
                          paymentMethod === 'CASH_USD'
                            ? '2px solid var(--theme-primary, #10B981)'
                            : '1px solid #CBD5E1',
                        background:
                          paymentMethod === 'CASH_USD'
                            ? 'var(--theme-primary-soft, #ECFDF5)'
                            : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                        minHeight: '64px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color:
                              paymentMethod === 'CASH_USD'
                                ? 'var(--theme-primary-readable, #065F46)'
                                : '#0F172A',
                          }}
                        >
                          💵 Efectivo Gaveta ($ USD)
                        </span>
                        {paymentMethod === 'CASH_USD' && (
                          <IonIcon
                            icon={checkmarkCircle}
                            style={{ color: 'var(--theme-primary, #10B981)', fontSize: '16px', flexShrink: 0 }}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        Disponible:{' '}
                        <span style={{ color: Number(treasury?.cashUSD || 0) < 0 ? '#DC2626' : '#0F172A', fontWeight: 800 }}>
                          ${Number(treasury?.cashUSD || 0).toFixed(2)}
                        </span>
                      </div>
                    </button>

                    {/* Opción 2: Banco / Pago Móvil (Bs.) */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAGO_MOVIL')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: paymentMethod === 'PAGO_MOVIL' ? '2px solid #8B5CF6' : '1px solid #CBD5E1',
                        background: paymentMethod === 'PAGO_MOVIL' ? '#F5F3FF' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                        minHeight: '64px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: paymentMethod === 'PAGO_MOVIL' ? '#6D28D9' : '#0F172A',
                          }}
                        >
                          🏦 Banco / Pago Móvil (Bs.)
                        </span>
                        {paymentMethod === 'PAGO_MOVIL' && (
                          <IonIcon icon={checkmarkCircle} style={{ color: '#8B5CF6', fontSize: '16px', flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        Disponible:{' '}
                        <span style={{ color: Number(treasury?.bankBs || 0) < 0 ? '#DC2626' : '#0F172A', fontWeight: 800 }}>
                          Bs. {Number(treasury?.bankBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </button>

                    {/* Opción 3: Digital / Binance ($ USD) */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BINANCE')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: paymentMethod === 'BINANCE' ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                        background: paymentMethod === 'BINANCE' ? '#FFFBEB' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                        minHeight: '64px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: paymentMethod === 'BINANCE' ? '#B45309' : '#0F172A',
                          }}
                        >
                          💎 Digital / Binance ($ USD)
                        </span>
                        {paymentMethod === 'BINANCE' && (
                          <IonIcon icon={checkmarkCircle} style={{ color: '#F59E0B', fontSize: '16px', flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        {treasury?.digitalUSD !== undefined && treasury?.digitalUSD !== null ? (
                          <>
                            Disponible:{' '}
                            <span style={{ color: Number(treasury.digitalUSD) < 0 ? '#DC2626' : '#0F172A', fontWeight: 800 }}>
                              ${Number(treasury.digitalUSD).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span>Billetera Digital / USDT</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Alerta en vivo si el monto supera el saldo disponible */}
                  {insufficiency.isInsufficient && currentUSDNum > 0 && (
                    <div
                      style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#B91C1C',
                        fontSize: '11px',
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      ⚠️ <b>Saldo insuficiente en {insufficiency.accountLabel}:</b> Disponible {insufficiency.availableStr} y
                      estás intentando reinvertir{' '}
                      {paymentMethod === 'PAGO_MOVIL'
                        ? `Bs. ${currentBSNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${currentUSDNum.toFixed(2)} USD`}{' '}
                      (Faltan {insufficiency.missingStr}). Si confirmas, el saldo quedará en negativo.
                    </div>
                  )}
                </div>
              )}

              {/* Montos USD y Bs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                    Monto USD ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={amountUSD}
                    onChange={(e) => handleUSDChange(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                    Monto Bs. (Tasa: {exchangeRate.toFixed(2)})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={amountBS}
                    onChange={(e) => handleBSChange(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Fecha (FinoDatePicker) y Tasa de Cambio */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                    Fecha
                  </label>
                  <FinoDatePicker value={date} onChange={(newDate) => setDate(newDate)} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                    Tasa de Cambio (Bs / USD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value) || 1;
                      setExchangeRate(r);
                      if (amountUSD) setAmountBS((parseFloat(amountUSD) * r).toFixed(2));
                    }}
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Concepto / Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                  Concepto / Descripción breve *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Compra de freidora industrial, remodelación eléctrica, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '42px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              {/* Botón Principal con Variables Dinámicas de Marca */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="ff-btn-primary"
                style={{
                  width: '100%',
                  minHeight: '46px',
                  marginTop: '4px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'var(--theme-primary, #10B981)',
                  color: 'var(--theme-primary-contrast, #ffffff)',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
              >
                <IonIcon icon={addCircleOutline} style={{ fontSize: '18px' }} />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : type === InvestmentType.REINVERSION_GANANCIA
                    ? 'Registrar Reinversión y Descontar'
                    : 'Guardar Inversión Externa'}
                </span>
              </button>
            </form>
          </div>

          {/* 4. Historial Reciente */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Historial Reciente de Registros
            </h4>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : !summary?.recentInvestments || summary.recentInvestments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '13px' }}>
                No hay inversiones o reinversiones manuales registradas.
              </div>
            ) : (
              <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', display: 'block' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '8px' }}>Fecha</th>
                      <th style={{ padding: '8px' }}>Tipo / Origen</th>
                      <th style={{ padding: '8px' }}>Concepto</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Monto USD</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Monto Bs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentInvestments.map((inv) => {
                      const isReinvestment = inv.type === InvestmentType.REINVERSION_GANANCIA;
                      const methodMeta = isReinvestment ? getPaymentMethodMeta(inv.paymentMethod) : null;

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#475569' }}>{inv.date}</td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <IonBadge
                                color={inv.type === InvestmentType.INVERSION_EXTERNA ? 'primary' : 'success'}
                                style={{ fontSize: '10px' }}
                              >
                                {inv.type === InvestmentType.INVERSION_EXTERNA ? 'Inversión Ext.' : 'Reinversión'}
                              </IonBadge>
                              {isReinvestment && methodMeta && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 7px',
                                    borderRadius: '9999px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    backgroundColor: methodMeta.bg,
                                    color: methodMeta.color,
                                    border: `1px solid ${methodMeta.border}`,
                                  }}
                                >
                                  {methodMeta.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>{inv.description}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            ${Number(inv.amountUSD).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748B' }}>
                            Bs. {Number(inv.amountBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default InvestmentModal;
