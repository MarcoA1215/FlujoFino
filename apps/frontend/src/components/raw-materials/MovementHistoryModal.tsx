import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonBadge, useIonAlert, useIonToast
} from '@ionic/react';
import { apiClient } from '../../api/client';
import type { RawMaterial, Movement } from '../../types';

const movementTypeTranslations: Record<string, string> = {
  IN_PURCHASE: 'Compra',
  IN_PRODUCTION: 'Entrada (Producción)',
  OUT_PRODUCTION: 'Salida (Producción)',
  OUT_SALE: 'Venta',
  LOSS: 'Pérdida / Ajuste',
  IN_INITIAL: 'Inv. Inicial',
  IN_RESTOCK: 'Compra',
  IN: 'Entrada',
  OUT: 'Salida'
};

interface MovementHistoryModalProps {
  material: RawMaterial | null;
  onClose: () => void;
  onCorrected: () => void;
}

export const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({ material, onClose, onCorrected }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  useEffect(() => {
    if (material) fetchMovements(material.id);
    else setMovements([]);
  }, [material]);

  const fetchMovements = async (id: string) => {
    try {
      const res = await apiClient.get<Movement[]>('/raw-materials/' + id + '/movements');
      setMovements(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al cargar historial', duration: 3000, color: 'danger' });
    }
  };

  const openEditMovementAlert = (mov: Movement) => {
    if (!material) return;
    const isLoss = mov.type === 'LOSS';
    const inputs: any[] = [{ name: 'qty', type: 'number', value: mov.quantity, placeholder: 'Cantidad correcta' }];
    if (!isLoss) inputs.push({ name: 'cost', type: 'number', value: mov.totalCost, placeholder: 'Costo total correcto ($)' });

    presentAlert({
      header: isLoss ? 'Corregir Pérdida' : 'Corregir Compra',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.qty) return false;
            if (!isLoss && !data.cost) return false;
            try {
              await apiClient.put('/stock-movements/' + mov.id, {
                quantity: parseFloat(data.qty),
                totalCost: isLoss ? 0 : parseFloat(data.cost)
              });
              fetchMovements(material.id);
              onCorrected(); 
              presentToast({ message: 'Movimiento corregido', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al corregir', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  return (
    <IonModal isOpen={!!material} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="light">
          <IonTitle>Historial: {material?.name}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Costo</th><th>Notas</th><th>Acci�n</th></tr>
            </thead>
            <tbody>
              {movements.map(mov => (
                <tr key={mov.id}>
                  <td>{new Date(mov.createdAt).toLocaleString()}</td>
                  <td>
                    <IonBadge color={mov.type.startsWith('IN') ? 'success' : 'danger'} style={{ padding: '6px', fontSize: '0.85rem' }}>
                      {movementTypeTranslations[mov.type] || mov.type}
                    </IonBadge>
                  </td>
                  <td>{mov.quantity}</td>
                  <td>$ {(mov.totalCost || 0).toFixed(2)}</td>
                  <td>{mov.description}</td>
                  <td>
                    {(mov.type === 'IN_PURCHASE' || mov.type === 'LOSS') && (
                      <IonButton fill="clear" color="primary" size="small" onClick={() => openEditMovementAlert(mov)}>Corregir</IonButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IonContent>
    </IonModal>
  );
};

