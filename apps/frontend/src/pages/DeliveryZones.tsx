// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonButton, IonIcon, IonList, IonInput, useIonToast, IonText, IonFab, IonFabButton, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/react';
import { addOutline, trashOutline, pencilOutline, mapOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { DeliveryZone } from '../types';
import { AppHeader } from '../components/AppHeader';

const DeliveryZones: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  
  const [name, setName] = useState('');
  const [feePrice, setFeePrice] = useState<number>(0);
  
  const [presentToast] = useIonToast();
  const [searchText, setSearchText] = useState('');

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

  const filteredData = zones.filter(item => {
    if (searchText.trim() === '') return true;
    return item.name?.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <IonPage>
      <AppHeader title="Zonas de Delivery" />
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#F8FAFC' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <div className="ff-search-pill" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar zonas..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button
              className="ff-btn-primary"
              onClick={() => openModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <IonIcon icon={addOutline} style={{ fontSize: '1.2rem' }} />
              <span>Nueva Zona</span>
            </button>
          </div>

          <div className="ff-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <IonIcon icon={mapOutline} style={{ fontSize: '20px', color: '#10B981' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Configuración de Tarifas de Envío
              </h3>
            </div>

            {zones.length === 0 ? (
              <p className="ion-text-center" style={{ color: '#64748b', padding: '20px 0' }}>
                No hay zonas configuradas. Agrega una nueva.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredData.map(z => (
                  <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{z.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Tarifa: <strong style={{ color: '#047857' }}>${z.feePrice.toFixed(2)}</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <IonButton fill="clear" size="small" onClick={() => openModal(z)}>
                        <IonIcon icon={pencilOutline} slot="icon-only" color="dark" />
                      </IonButton>
                      <IonButton fill="clear" size="small" color="danger" onClick={() => deleteZone(z.id)}>
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
              <IonInput value={name} onIonInput={e => setName(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Tarifa de Envío (USD)</IonLabel>
              <IonInput type="number" step="any" value={feePrice} onIonInput={e => setFeePrice(parseFloat(e.detail.value!) || 0)} />
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
