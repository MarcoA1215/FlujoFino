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
import { closeOutline, cubeOutline, checkmarkCircleOutline, addOutline, removeOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

interface Props {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PartialDeliveryModal: React.FC<Props> = ({ order, isOpen, onClose, onSuccess }) => {
  const [deliveries, setDeliveries] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presentToast] = useIonToast();

  useEffect(() => {
    if (order && isOpen) {
      setDeliveries({});
    }
  }, [order, isOpen]);

  if (!order) return null;

  const handleDeliveryChange = (itemId: string, value: number, maxAllowed: number) => {
    let num = value;
    if (isNaN(num) || num < 0) num = 0;
    if (num > maxAllowed) num = maxAllowed;
    setDeliveries(prev => ({ ...prev, [itemId]: num }));
  };

  const handleSetMax = (itemId: string, maxAllowed: number) => {
    setDeliveries(prev => ({ ...prev, [itemId]: maxAllowed }));
  };

  const totalToDeliver = Object.values(deliveries).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  const submitPartialDelivery = async () => {
    const payload = Object.entries(deliveries)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([orderItemId, quantityToDeliver]) => ({ orderItemId, quantityToDeliver: Number(quantityToDeliver) }));

    if (payload.length === 0) {
      presentToast({
        message: 'Ingresa al menos 1 unidad para despachar en este momento',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post(`/orders/${order.id}/deliver-partial`, { deliveries: payload });
      presentToast({
        message: '¡Entrega parcial registrada exitosamente!',
        duration: 2500,
        color: 'success',
      });
      setDeliveries({});
      onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al registrar entrega parcial';
      presentToast({
        message: msg,
        duration: 4000,
        color: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shortCode = `#ORD-${String(order.orderNumber || order.id || '').slice(0, 6).toUpperCase()}`;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{
        '--max-width': '520px',
        '--border-radius': '20px',
      } as any}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#ffffff', '--border-color': '#E2E8F0' } as any}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              <IonIcon icon={cubeOutline} />
            </div>
            <IonTitle style={{ color: '#0F172A', fontWeight: 800, fontSize: '16px', padding: 0 }}>
              Entrega Parcial • {shortCode}
            </IonTitle>
          </div>
          <IonButtons slot="end">
            <IonButton onClick={onClose} style={{ color: '#64748B' }}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ padding: '8px 4px 20px 4px' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              Cliente: {order.customerName || 'Cliente Mostrador'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Indica la cantidad física de cada producto que estás entregando o despachando en este momento. El sistema descontará el stock y mantendrá el pedido como parcialmente entregado hasta completarlo.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {Array.isArray(order.items) && order.items.map((item: any) => {
              const pName = item.productName || item.product?.name || 'Producto';
              const totalQty = Number(item.quantity) || 1;
              const delivered = Number(item.deliveredQuantity) || 0;
              const remaining = Math.max(0, totalQty - delivered);
              const isFullyDelivered = remaining <= 0;
              const currentInput = deliveries[item.id] || 0;

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    border: isFullyDelivered ? '1px solid #E2E8F0' : '1px solid #CBD5E1',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    opacity: isFullyDelivered ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        {pName}
                        {item.variantName && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginLeft: '6px' }}>
                            ({item.variantName})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                        <span style={{ color: '#64748B' }}>Pedido: <b>{totalQty}</b></span>
                        <span style={{ color: '#059669' }}>Entregado: <b>{delivered}</b></span>
                        <span style={{ color: isFullyDelivered ? '#64748B' : '#D97706', fontWeight: 700 }}>
                          Pendiente: {remaining}
                        </span>
                      </div>
                    </div>

                    {isFullyDelivered ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#ECFDF5',
                          color: '#059669',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <IonIcon icon={checkmarkCircleOutline} /> 100% Entregado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMax(item.id, remaining)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          background: currentInput === remaining ? '#ECFDF5' : '#F1F5F9',
                          border: currentInput === remaining ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                          color: currentInput === remaining ? '#065F46' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        Todo ({remaining})
                      </button>
                    )}
                  </div>

                  {!isFullyDelivered && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginRight: 'auto' }}>
                        A entregar ahora:
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeliveryChange(item.id, currentInput - 1, remaining)}
                        disabled={currentInput <= 0}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: currentInput <= 0 ? '#F8FAFC' : '#FFFFFF',
                          color: currentInput <= 0 ? '#94A3B8' : '#0F172A',
                          cursor: currentInput <= 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IonIcon icon={removeOutline} />
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={currentInput || ''}
                        onChange={(e) => handleDeliveryChange(item.id, parseInt(e.target.value, 10) || 0, remaining)}
                        placeholder="0"
                        style={{
                          width: '60px',
                          height: '34px',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: currentInput > 0 ? '2px solid var(--theme-primary, #10B981)' : '1px solid #CBD5E1',
                          background: currentInput > 0 ? '#ECFDF5' : '#FFFFFF',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleDeliveryChange(item.id, currentInput + 1, remaining)}
                        disabled={currentInput >= remaining}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: currentInput >= remaining ? '#F8FAFC' : '#FFFFFF',
                          color: currentInput >= remaining ? '#94A3B8' : '#0F172A',
                          cursor: currentInput >= remaining ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IonIcon icon={addOutline} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <IonButton
            expand="block"
            disabled={totalToDeliver <= 0 || isSubmitting}
            onClick={submitPartialDelivery}
            style={{
              '--background': 'var(--theme-primary, #10b981)',
              '--color': 'var(--theme-primary-contrast, #ffffff)',
              '--border-radius': '12px',
              fontWeight: 800,
              fontSize: '14px',
              height: '46px',
              margin: 0,
            } as any}
          >
            {isSubmitting ? (
              <IonSpinner name="dots" />
            ) : (
              `Confirmar Entrega Parcial (${totalToDeliver} uds)`
            )}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
