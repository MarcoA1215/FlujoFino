import React, { useState, useMemo } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast
} from '@ionic/react';
import { closeOutline, swapHorizontalOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { TreasurySummary } from '../types';

interface BuyUsdModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasury: TreasurySummary | null;
  onSuccess: () => void;
}

export const BuyUsdModal: React.FC<BuyUsdModalProps> = ({
  isOpen,
  onClose,
  treasury,
  onSuccess,
}) => {
  const [amountBs, setAmountBs] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [destination, setDestination] = useState<'CASH_USD' | 'BINANCE_USDT'>('CASH_USD');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [presentToast] = useIonToast();

  const currencySymbol = treasury?.currencySymbol || 'Bs.';
  const currentBankBs = treasury?.bankBs || 0;
  const activeRate = treasury?.exchangeRate || 40.0;

  // Cálculo en vivo de la tasa implícita / efectiva
  const effectiveRate = useMemo(() => {
    const bs = parseFloat(amountBs);
    const usd = parseFloat(amountUSD);
    if (!isNaN(bs) && !isNaN(usd) && usd > 0) {
      return Number((bs / usd).toFixed(2));
    }
    return null;
  }, [amountBs, amountUSD]);

  const handleUseMaxBs = () => {
    if (currentBankBs > 0) {
      setAmountBs(currentBankBs.toFixed(2));
      // Sugerir USD según la tasa activa
      if (activeRate > 0) {
        const estUSD = Math.floor((currentBankBs / activeRate) * 100) / 100;
        setAmountUSD(estUSD.toFixed(2));
      }
    }
  };

  const handleAmountBsChange = (val: string) => {
    setAmountBs(val);
    const bsNum = parseFloat(val);
    if (!isNaN(bsNum) && bsNum > 0 && activeRate > 0 && !amountUSD) {
      const estUSD = Math.floor((bsNum / activeRate) * 100) / 100;
      setAmountUSD(estUSD.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bs = parseFloat(amountBs);
    const usd = parseFloat(amountUSD);

    if (isNaN(bs) || bs <= 0) {
      presentToast({ message: 'Ingresa un monto en bolívares mayor a 0', duration: 2500, color: 'warning' });
      return;
    }
    if (isNaN(usd) || usd <= 0) {
      presentToast({ message: 'Ingresa los dólares recibidos mayor a 0', duration: 2500, color: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/dashboard/buy-usd', {
        amountBs: bs,
        amountUSD: usd,
        destination,
        notes: notes.trim() || undefined,
      });

      presentToast({
        message: `✓ ¡Registrado! Salieron ${currencySymbol} ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} y entraron $${usd.toFixed(2)} USD a tu caja`,
        duration: 4000,
        color: 'success',
      });

      setAmountBs('');
      setAmountUSD('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al registrar la compra de divisas';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} style={{ '--border-radius': '20px' } as any}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '4px 8px' } as any}>
          <IonTitle style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
            💱 Comprar USD / Proteger en Divisas
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} color="medium">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ padding: '16px', maxWidth: '520px', margin: '0 auto' }}>
          
          {/* Tarjeta de Saldos Actuales en Tesorería */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: 'var(--ff-shadow-sm)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              🏛️ Saldo Disponible en Bolívares
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A' }}>
                  {currencySymbol} {Number(currentBankBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Punto de Venta + Pago Móvil acumulado
                </div>
              </div>
              {currentBankBs > 0 && (
                <button
                  type="button"
                  onClick={handleUseMaxBs}
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Usar todo
                </button>
              )}
            </div>
          </div>

          {/* Formulario de Compra de USD */}
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '20px 16px',
              boxShadow: 'var(--ff-shadow-sm)',
              marginBottom: '16px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                1. ¿Cuántos Bolívares vas a entregar/transferir? ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountBs}
                onChange={(e) => handleAmountBsChange(e.target.value)}
                placeholder="Ejemplo: 4500.00"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#0F172A',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Este monto se descontará de tu saldo bancario en Bolívares.
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                2. ¿Cuántos Dólares ($ USD) recibiste en mano/cuenta?
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                placeholder="Ejemplo: 100.00"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#047857',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Este monto se sumará a tu gaveta física de dólares.
              </span>
            </div>

            {/* Tasa Real Calculada */}
            {effectiveRate !== null && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                    Tasa Real de Compra
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803D' }}>
                    {currencySymbol} {effectiveRate.toFixed(2)} / $
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#166534' }}>
                  Tasa activa del día: <br /><b>{currencySymbol} {Number(activeRate).toFixed(2)}</b>
                </div>
              </div>
            )}

            {/* Destino de los Dólares */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                Destino de las divisas recibidas:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDestination('CASH_USD')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: destination === 'CASH_USD' ? '2px solid #10B981' : '1px solid #E2E8F0',
                    backgroundColor: destination === 'CASH_USD' ? '#ECFDF5' : '#ffffff',
                    color: destination === 'CASH_USD' ? '#047857' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>💵</span> Gaveta Efectivo USD
                </button>
                <button
                  type="button"
                  onClick={() => setDestination('BINANCE_USDT')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: destination === 'BINANCE_USDT' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                    backgroundColor: destination === 'BINANCE_USDT' ? '#FFFBEB' : '#ffffff',
                    color: destination === 'BINANCE_USDT' ? '#B45309' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🟡</span> Binance / USDT
                </button>
              </div>
            </div>

            {/* Nota opcional */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                Nota / Observación (Opcional):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Mesa de cambio Banesco, proveedor X, etc."
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0F172A',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#10B981',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              }}
            >
              {isSubmitting ? (
                <IonSpinner name="crescent" color="light" style={{ width: '22px', height: '22px' }} />
              ) : (
                <>
                  <IonIcon icon={swapHorizontalOutline} style={{ fontSize: '18px' }} />
                  Confirmar Cambio de Moneda
                </>
              )}
            </button>
          </form>

          {/* Historial de Compras de Divisas */}
          {treasury?.exchangeHistory && treasury.exchangeHistory.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: 'var(--ff-shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setShowHistory(!showHistory)}
              >
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📜</span> Historial de Compras de USD ({treasury.exchangeHistory.length})
                </div>
                <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>
                  {showHistory ? 'Ocultar ▲' : 'Ver todos ▼'}
                </span>
              </div>

              {showHistory && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                  {treasury.exchangeHistory.map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                          +${ex.amountUSD.toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Pagado: {currencySymbol} {ex.amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} • Tasa: {ex.exchangeRate.toFixed(2)}
                        </div>
                        {ex.notes && (
                          <div style={{ fontSize: '11px', color: '#334155', fontStyle: 'italic', marginTop: '2px' }}>
                            {ex.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#94A3B8' }}>
                        {new Date(ex.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
