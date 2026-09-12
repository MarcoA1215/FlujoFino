import React, { useState, useEffect } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonNote, useIonToast
} from '@ionic/react';
import { apiClient } from '../../api/client';
import { RawMaterial } from '../../types';

interface Props {
  material: RawMaterial | null;
  operationType: 'restock' | 'loss' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockOperationModal: React.FC<Props> = ({ material, operationType, onClose, onSuccess }) => {
  const [presentToast] = useIonToast();
  const [quantity, setQuantity] = useState<number | undefined>();
  const [unit, setUnit] = useState<string>('base');
  const [cost, setCost] = useState<number | undefined>();
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (material) {
      setQuantity(undefined);
      setUnit('base');
      setCost(undefined);
      setReason('');
    }
  }, [material]);

  const handleSave = async () => {
    if (!material || !quantity) return;
    
    // Si la unidad base es Kg y el usuario seleccionó gramos, dividimos por 1000
    // Si la unidad base es Litros y el usuario seleccionó mililitros, dividimos por 1000
    let finalQuantity = quantity;
    if (unit === 'g' || unit === 'ml') {
      finalQuantity = quantity / 1000;
    }

    try {
      if (operationType === 'restock') {
        if (!cost) {
          presentToast({ message: 'Ingresa el costo', duration: 2000, color: 'warning' });
          return;
        }
        await apiClient.post(`/raw-materials/${material.id}/restock`, {
          quantity: finalQuantity,
          totalCost: cost
        });
        presentToast({ message: 'Compra registrada', duration: 2000, color: 'success' });
      } else if (operationType === 'loss') {
        if (!reason) {
          presentToast({ message: 'Ingresa el motivo', duration: 2000, color: 'warning' });
          return;
        }
        await apiClient.post(`/raw-materials/${material.id}/loss`, {
          quantity: finalQuantity,
          reason
        });
        presentToast({ message: 'Ajuste registrado', duration: 2000, color: 'warning' });
      }
      onSuccess();
      onClose();
    } catch (e) {
      presentToast({ message: 'Error en la operación', duration: 3000, color: 'danger' });
    }
  };

  const getSubUnits = () => {
    if (!material) return null;
    if (material.unit.toLowerCase() === 'kg') return <IonSelectOption value="g">Gramos (g)</IonSelectOption>;
    if (material.unit.toLowerCase() === 'litros') return <IonSelectOption value="ml">Mililitros (ml)</IonSelectOption>;
    return null;
  };

  return (
    <IonModal isOpen={!!material && !!operationType} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color={operationType === 'restock' ? 'success' : 'danger'}>
          <IonTitle>
            {operationType === 'restock' ? 'Comprar Insumo' : 'Registrar Pérdida'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {material && (
          <>
            <h3 className="ion-text-center">{material.name}</h3>
            
            <IonItem>
              <IonLabel position="stacked">Cantidad a {operationType === 'restock' ? 'sumar' : 'descontar'}</IonLabel>
              <IonInput 
                type="number" 
                value={quantity} 
                onIonChange={e => setQuantity(parseFloat(e.detail.value!) || undefined)} 
                placeholder="Ej. 500" 
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Unidad de medida</IonLabel>
              <IonSelect value={unit} onIonChange={e => setUnit(e.detail.value)}>
                <IonSelectOption value="base">{material.unit} (Original)</IonSelectOption>
                {getSubUnits()}
              </IonSelect>
            </IonItem>

            {operationType === 'restock' && (
              <IonItem>
                <IonLabel position="stacked">Costo Total de la Compra ($)</IonLabel>
                <IonInput 
                  type="number" 
                  value={cost} 
                  onIonChange={e => setCost(parseFloat(e.detail.value!) || undefined)} 
                  placeholder="0.00" 
                />
              </IonItem>
            )}

            {operationType === 'loss' && (
              <IonItem>
                <IonLabel position="stacked">Motivo / Razón</IonLabel>
                <IonInput 
                  type="text" 
                  value={reason} 
                  onIonChange={e => setReason(e.detail.value!)} 
                  placeholder="Ej. Vencido, derramado, ajuste de inventario" 
                />
              </IonItem>
            )}

            {quantity && (unit === 'g' || unit === 'ml') && (
              <IonNote color="medium" className="ion-margin-top ion-padding-horizontal" style={{display: 'block'}}>
                Nota: El sistema registrará {quantity / 1000} {material.unit} en el inventario.
              </IonNote>
            )}

            <IonButton expand="block" color={operationType === 'restock' ? 'success' : 'danger'} className="ion-margin-top" onClick={handleSave}>
              Confirmar
            </IonButton>
          </>
        )}
      </IonContent>
    </IonModal>
  );
};
