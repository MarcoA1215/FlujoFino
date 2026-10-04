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
  IonSpinner,
} from '@ionic/react';
import { closeOutline, addCircleOutline, alertCircleOutline, trendingUpOutline, walletOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { InvestmentType } from '@finowork/shared-types';

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
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [type, setType] = useState<InvestmentType>(InvestmentType.INVERSION_EXTERNA);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountUSD || parseFloat(amountUSD) <= 0) {
      return presentToast({ message: 'Ingresa un monto válido mayor a 0', duration: 2500, color: 'warning' });
    }
    if (!description.trim()) {
      return presentToast({ message: 'Ingresa un concepto o descripción', duration: 2500, color: 'warning' });
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/investments', {
        type,
        amountUSD: parseFloat(amountUSD),
        amountBS: amountBS ? parseFloat(amountBS) : undefined,
        exchangeRate,
        description: description.trim(),
        date,
      });

      presentToast({
        message: 'Inversión registrada con éxito',
        duration: 2500,
        color: 'success',
      });

      // Limpiar formulario y recargar datos
      setAmountUSD('');
      setAmountBS('');
      setDescription('');
      fetchSummary();
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Encabezado con Totales Desglosados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>
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
                Capital inicial, maquinaria, obras
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#10B981' }}>
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
              border: '1px solid #FCD34D',
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                  Tipo de Registro *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setType(InvestmentType.INVERSION_EXTERNA)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: type === InvestmentType.INVERSION_EXTERNA ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                      background: type === InvestmentType.INVERSION_EXTERNA ? '#EFF6FF' : '#FFFFFF',
                      color: type === InvestmentType.INVERSION_EXTERNA ? '#1D4ED8' : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    💼 Inversión Externa
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(InvestmentType.REINVERSION_GANANCIA)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: type === InvestmentType.REINVERSION_GANANCIA ? '2px solid #10B981' : '1px solid #CBD5E1',
                      background: type === InvestmentType.REINVERSION_GANANCIA ? '#ECFDF5' : '#FFFFFF',
                      color: type === InvestmentType.REINVERSION_GANANCIA ? '#047857' : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Reinversión Ganancia
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
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
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
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
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </div>
              </div>

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
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  required
                />
              </div>

              <IonButton
                type="submit"
                expand="block"
                color="primary"
                disabled={isSubmitting}
                style={{ marginTop: '6px', fontWeight: 700 }}
              >
                <IonIcon icon={addCircleOutline} slot="start" />
                {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
              </IonButton>
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
                      <th style={{ padding: '8px' }}>Tipo</th>
                      <th style={{ padding: '8px' }}>Concepto</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Monto USD</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Monto Bs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentInvestments.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {inv.date}
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          <IonBadge
                            color={inv.type === InvestmentType.INVERSION_EXTERNA ? 'primary' : 'success'}
                            style={{ fontSize: '10px' }}
                          >
                            {inv.type === InvestmentType.INVERSION_EXTERNA ? 'Inversión Ext.' : 'Reinversión'}
                          </IonBadge>
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>
                          {inv.description}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                          ${Number(inv.amountUSD).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#64748B' }}>
                          Bs. {Number(inv.amountBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
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
