import React, { useEffect, useState } from 'react';
import {
  IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle,
  IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonButton, IonIcon, IonList,
  IonInput, useIonToast, IonText, IonFab, IonFabButton, IonModal
} from '@ionic/react';
import { addOutline, trashOutline, pencilOutline, mapOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { DeliveryZone } from '../types';

const DeliveryZones: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  
  const [name, setName] = useState('');
  const [feePrice, setFeePrice] = useState<number>(0);
  
  const [presentToast] = useIonToast();

  const fetchZones = async () => {
    try {
      const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
      setZones(res.data);
    } catch (e) {
      presentToast({ message: 'Error cargando zonas', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setName(zone.name);
      setFeePrice(zone.feePrice);
    } else {
      setEditingZone(null);
      setName('');
      setFeePrice(0);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const saveZone = async () => {
    if (!name.trim()) return;
    try {
      if (editingZone && editingZone.id) {
        await apiClient.put(`/delivery-zones/${editingZone.id}`, { name, feePrice });
      } else {
        await apiClient.post('/delivery-zones', { name, feePrice });
      }
      fetchZones();
      closeModal();
      presentToast({ message: 'Zona guardada', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error al guardar la zona', duration: 3000, color: 'danger' });
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await apiClient.delete(`/delivery-zones/${id}`);
      fetchZones();
      presentToast({ message: 'Zona eliminada', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error al eliminar', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Zonas de Delivery</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="8" offsetMd="2">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>
                    <IonIcon icon={mapOutline} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    Configuración de Zonas y Tarifas
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {zones.length === 0 ? (
                    <p className="ion-text-center">No hay zonas configuradas. Agrega una nueva.</p>
                  ) : (
                    <IonList>
                      {zones.map(z => (
                        <IonItem key={z.id}>
                          <IonLabel>
                            <h2><strong>{z.name}</strong></h2>
                            <p>Tarifa de envío: <IonText color="success"><strong>$ {z.feePrice.toFixed(2)}</strong></IonText></p>
                          </IonLabel>
                          <IonButton fill="clear" onClick={() => openModal(z)}>
                            <IonIcon icon={pencilOutline} slot="icon-only" />
                          </IonButton>
                          <IonButton fill="clear" color="danger" onClick={() => deleteZone(z.id)}>
                            <IonIcon icon={trashOutline} slot="icon-only" />
                          </IonButton>
                        </IonItem>
                      ))}
                    </IonList>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => openModal()}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={closeModal} initialBreakpoint={0.5} breakpoints={[0, 0.5, 0.8]}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingZone ? 'Editar Zona' : 'Nueva Zona'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Nombre de la Zona (Ej. Centro)</IonLabel>
              <IonInput value={name} onIonChange={e => setName(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Tarifa de Envío (USD)</IonLabel>
              <IonInput type="number" value={feePrice} onIonChange={e => setFeePrice(parseFloat(e.detail.value!) || 0)} />
            </IonItem>
            <IonButton expand="block" className="ion-margin-top" onClick={saveZone}>
              Guardar Zona
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};
export default DeliveryZones;
