import React, { useState } from 'react';
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
import { closeOutline, cashOutline, saveOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

interface FondoCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  onSuccess: () => void;
}

export const FondoCajaModal: React.FC<FondoCajaModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = 'Bs.',
  onSuccess,
}) => {
  const [currency, setCurrency] = useState<'USD' | 'BS'>('USD');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presentToast] = useIonToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);

    if (isNaN(val) || val <= 0) {
      presentToast({
        message: 'Ingresa un monto mayor a 0 para el fondo de caja',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/orders/fondo-caja', {
        amount: val,
        description: description.trim() || undefined,
        currency,
      });

      presentToast({
        message: `✓ Fondo de caja registrado: ${currency === 'USD' ? '$' : currencySymbol} ${val.toFixed(2)} listos en gaveta para dar vuelto`,
        duration: 3500,
        color: 'success',
      });

      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al registrar fondo de caja';
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
            💵 Base Inicial / Fondo de Gaveta
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} color="medium">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
          
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <IonIcon icon={cashOutline} style={{ color: '#047857', fontSize: '24px', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#065F46', lineHeight: 1.4 }}>
              <b>Apertura de turno:</b> Registra el sencillo o menudo que colocas en la gaveta para dar vuelto a los clientes. Se sumará al arqueo del día.
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
            {/* Selección de Moneda */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
                Moneda de la base física:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: currency === 'USD' ? '2px solid #10B981' : '1px solid #CBD5E1',
                    backgroundColor: currency === 'USD' ? '#ECFDF5' : '#ffffff',
                    color: currency === 'USD' ? '#047857' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  💵 Dólares ($ USD)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('BS')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: currency === 'BS' ? '2px solid #10B981' : '1px solid #CBD5E1',
                    backgroundColor: currency === 'BS' ? '#ECFDF5' : '#ffffff',
                    color: currency === 'BS' ? '#047857' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🇻🇪 Bolívares ({currencySymbol})
                </button>
              </div>
            </div>

            {/* Monto */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                Monto en efectivo en gaveta ({currency === 'USD' ? '$ USD' : currencySymbol}):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === 'USD' ? 'Ej: 20.00' : 'Ej: 500.00'}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#0F172A',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Descripción opcional */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                Observación / Desglose (Opcional):
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Billetes de $1 y $5 para dar vuelto"
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
                height: '44px',
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
                  <IonIcon icon={saveOutline} style={{ fontSize: '18px' }} />
                  Guardar Fondo de Gaveta
                </>
              )}
            </button>
          </form>
        </div>
      </IonContent>
    </IonModal>
  );
};
