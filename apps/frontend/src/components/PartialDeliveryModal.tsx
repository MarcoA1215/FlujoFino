import React, { useState } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel, IonInput, IonText, useIonToast } from '@ionic/react';
import { apiClient } from '../api/client';

type Props = {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const PartialDeliveryModal: React.FC<Props> = ({ order, isOpen, onClose, onSuccess }) => {
  const [deliveries, setDeliveries] = useState<Record<string, number>>({});
  const [presentToast] = useIonToast();

  const handleDeliveryChange = (itemId: string, value: string, maxAllowed: number) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxAllowed) num = maxAllowed;
    setDeliveries(prev => ({ ...prev, [itemId]: num }));
  };

  const submitPartialDelivery = async () => {
    const payload = Object.entries(deliveries)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantityToDeliver]) => ({ orderItemId, quantityToDeliver }));

    if (payload.length === 0) {
      presentToast({ message: "No has ingresado ninguna cantidad a entregar", duration: 2000, color: "warning" });
      return;
    }

    try {
      await apiClient.post(`/orders/${order.id}/deliver-partial`, { deliveries: payload });
      presentToast({ message: "Entrega parcial registrada exitosamente", duration: 2000, color: "success" });
      setDeliveries({});
      onSuccess();
    } catch (e: any) {
      const msg = e.response?.data?.message || "Error al registrar entrega parcial";
      presentToast({ message: msg, duration: 4000, color: "danger" });
    }
  };

  if (!order) return null;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Entrega Parcial</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Selecciona la cantidad que vas a despachar físicamente en este momento:</p>
        <IonList>
          {order.items.map((item: any) => {
            const delivered = item.deliveredQuantity || 0;
            const remaining = item.quantity - delivered;
            const isFullyDelivered = remaining <= 0;

            return (
              <IonItem key={item.id}>
                <IonLabel>
                  <h2>{item.productName || item.product?.name}</h2>
                  <p>
                    Pedido: {item.quantity} | Entregado: {delivered}
                  </p>
                  {isFullyDelivered && (
                    <IonText color="success"><small>100% Entregado</small></IonText>
                  )}
                </IonLabel>
                {!isFullyDelivered && (
                  <IonInput 
                    type="number" 
                    placeholder="0"
                    min="0"
                    max={remaining.toString()}
                    value={deliveries[item.id] || ''}
                    onIonInput={e => handleDeliveryChange(item.id, e.detail.value!, remaining)}
                    style={{ textAlign: 'right', maxWidth: '100px', border: '1px solid #ccc', borderRadius: '4px', padding: '5px' }}
                  />
                )}
              </IonItem>
            );
          })}
        </IonList>

        <IonButton expand="block" color="primary" className="ion-margin-top" onClick={submitPartialDelivery}>
          Confirmar Entrega
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

