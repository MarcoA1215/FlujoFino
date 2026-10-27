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
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import { closeOutline, saveOutline, alertCircleOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { TreasurySummary } from '../types';

interface InitialTreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  treasury: TreasurySummary | null;
  onSuccess: () => void;
}

export const InitialTreasuryModal: React.FC<InitialTreasuryModalProps> = ({
  isOpen,
  onClose,
  treasury,
  onSuccess,
}) => {
  const [initialCashUSD, setInitialCashUSD] = useState('');
  const [initialCashBs, setInitialCashBs] = useState('');
  const [initialBankBs, setInitialBankBs] = useState('');
  const [initialDigitalUSD, setInitialDigitalUSD] = useState('');
  const [initialCashCop, setInitialCashCop] = useState('');
  const [initialBankCop, setInitialBankCop] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presentToast] = useIonToast();

  const currencySymbol = treasury?.currencySymbol || 'Bs.';

  useEffect(() => {
    if (treasury) {
      setInitialCashUSD(treasury.initialCashUSD ? String(treasury.initialCashUSD) : '0');
      setInitialCashBs(treasury.initialCashBs ? String(treasury.initialCashBs) : '0');
      setInitialBankBs(treasury.initialBankBs ? String(treasury.initialBankBs) : '0');
      setInitialDigitalUSD(treasury.initialDigitalUSD ? String(treasury.initialDigitalUSD) : '0');
      setInitialCashCop(treasury.initialCashCop ? String(treasury.initialCashCop) : '0');
      setInitialBankCop(treasury.initialBankCop ? String(treasury.initialBankCop) : '0');
    }
  }, [treasury, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(initialCashUSD) || 0;
    const cashBs = parseFloat(initialCashBs) || 0;
    const bank = parseFloat(initialBankBs) || 0;
    const digital = parseFloat(initialDigitalUSD) || 0;
    const copCash = parseFloat(initialCashCop) || 0;
    const copBank = parseFloat(initialBankCop) || 0;

    if (cash < 0 || cashBs < 0 || bank < 0 || digital < 0 || copCash < 0 || copBank < 0) {
      presentToast({
        message: 'Los saldos iniciales no pueden ser negativos',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/dashboard/initial-treasury', {
        initialCashUSD: cash,
        initialCashBs: cashBs,
        initialBankBs: bank,
        initialDigitalUSD: digital,
        initialCashCop: copCash,
        initialBankCop: copBank,
      });

      presentToast({
        message: '✓ Saldos iniciales de tesorería guardados correctamente',
        duration: 3500,
        color: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar los saldos iniciales';
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
            ⚙️ Saldo Inicial de Tesorería
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
          
          {/* Explicación amigable */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <IonIcon icon={alertCircleOutline} style={{ color: '#2563EB', fontSize: '22px', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
              <b>Punto de partida de tu negocio:</b> Registra el dinero que tu comercio ya tenía antes de usar FinoWork en gaveta física, cuentas bancarias y billeteras digitales. Así los balances en pantalla coincidirán con tus cuentas reales.
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '20px 16px',
              boxShadow: 'var(--ff-shadow-sm)',
            }}
          >
            {/* 1. Efectivo Físico USD */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                💵 Efectivo Inicial en Gaveta Física (USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '16px', fontWeight: '800', color: '#64748B' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialCashUSD}
                  onChange={(e) => setInitialCashUSD(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 12px 0 30px',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#047857',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Billetes iniciales en dólares que tenías en caja o gaveta al empezar.
              </span>
            </div>

            {/* 2. Efectivo Físico Bolívares (Gaveta Bs.) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                💵 Efectivo Inicial en Gaveta Física (Bolívares - Bs.)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', fontWeight: '800', color: '#64748B' }}>{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCashBs}
                  onChange={(e) => setInitialCashBs(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: `0 12px 0 ${currencySymbol.length * 10 + 20}px`,
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#047857',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Billetes físicos en bolívares en gaveta para dar vuelto al abrir el negocio.
              </span>
            </div>

            {/* 3. Bancos en Bolívares */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                🏦 Saldo Inicial en Bancos Venezuela ({currencySymbol})
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', fontWeight: '800', color: '#64748B' }}>{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialBankBs}
                  onChange={(e) => setInitialBankBs(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: `0 12px 0 ${currencySymbol.length * 10 + 20}px`,
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0F172A',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Saldo en cuentas de banco venezolanas (Mercantil, Banesco, BDV, etc.) al empezar.
              </span>
            </div>

            {/* 4. Billetera Digital USDT / Binance */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                🟡 Saldo Inicial Digital / Binance Pay (USDT / $)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '16px', fontWeight: '800', color: '#64748B' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialDigitalUSD}
                  onChange={(e) => setInitialDigitalUSD(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '0 12px 0 30px',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#D97706',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Saldo en USDT o divisas digitales que tenías disponibles.
              </span>
            </div>

            {/* 5 y 6. Pesos Colombianos (COP) */}
            {treasury?.enableCopCurrency && (
              <>
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🇨🇴 Saldos Iniciales en Pesos Colombianos (COP)
                  </div>

                  {/* Efectivo Pesos */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#78350F', marginBottom: '4px' }}>
                      💵 Efectivo Inicial en Gaveta (Billetes COP)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', fontWeight: '800', color: '#92400E' }}>$ COP</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={initialCashCop}
                        onChange={(e) => setInitialCashCop(e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          padding: '0 12px 0 65px',
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#B45309',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#92400E', marginTop: '3px', display: 'block' }}>
                      Billetes de pesos físicos en caja para vuelto.
                    </span>
                  </div>

                  {/* Bancos Colombia */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#78350F', marginBottom: '4px' }}>
                      📲 Saldo Inicial en Bancos Colombia (Nequi / Bancolombia / Daviplata)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', fontWeight: '800', color: '#92400E' }}>$ COP</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={initialBankCop}
                        onChange={(e) => setInitialBankCop(e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          padding: '0 12px 0 65px',
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#B45309',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#92400E', marginTop: '3px', display: 'block' }}>
                      Saldo disponible en tus cuentas colombianas (Nequi, Bancolombia, etc.).
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Botón de Guardar */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'var(--theme-primary, #10B981)',
                color: 'var(--theme-primary-contrast, #ffffff)',
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
                  <IonIcon icon={saveOutline} style={{ fontSize: '18px' }} />
                  Guardar Saldos Iniciales
                </>
              )}
            </button>
          </form>
        </div>
      </IonContent>
    </IonModal>
  );
};
