import React, { useState, useEffect } from 'react';
import {
  IonPage, IonHeader, IonContent, IonButtons, IonMenuButton, IonTitle,
  IonSearchbar,
  IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption, IonButton,
  IonLabel, useIonAlert, useIonToast,
} from '@ionic/react';
import { apiClient } from '../api/client';
import type { RawMaterial } from '../types';
import { RawMaterialCard } from '../components/raw-materials/RawMaterialCard';
import { MovementHistoryModal } from '../components/raw-materials/MovementHistoryModal';
import { StockOperationModal } from '../components/raw-materials/StockOperationModal';

const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [costPerUnit, setCostPerUnit] = useState<number>();
  const [initialStock, setInitialStock] = useState<number>();
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [presentToast] = useIonToast();
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<RawMaterial | null>(null);

  const [operationMaterial, setOperationMaterial] = useState<RawMaterial | null>(null);
  const [operationType, setOperationType] = useState<'restock' | 'loss' | null>(null);
  
  const archiveRawMaterial = async (m: RawMaterial) => {
    presentAlert({
      header: 'Archivar Insumo',
      message: '¿Estás seguro de archivar este insumo? Desaparecerá de la lista, pero su historial se mantendrá intacto.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Archivar', 
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.patch('/raw-materials/' + m.id + '/archive');
              fetchMaterials();
              presentToast({ message: 'Insumo archivado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al archivar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const fetchMaterials = async () => {
    try {
      const res = await apiClient.get<RawMaterial[]>('/raw-materials');
      setMaterials(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleCreate = async () => {
    try {
      await apiClient.post('/raw-materials', { name, unit, costPerUnit: costPerUnit || 0, initialStock: initialStock || 0, minStockAlert: 5 });
      setName(''); setCostPerUnit(undefined); setInitialStock(undefined);
      fetchMaterials();
      presentToast({ message: 'Insumo creado', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error', duration: 3000, color: 'danger' });
    }
  };

  const openRestockAlert = (m: RawMaterial) => {
    setOperationMaterial(m);
    setOperationType('restock');
  };

  const openLossAlert = (m: RawMaterial) => {
    setOperationMaterial(m);
    setOperationType('loss');
  };

  const openEditNameAlert = (m: RawMaterial) => {
    presentAlert({
      header: 'Editar Nombre',
      inputs: [{ name: 'newName', type: 'text', value: m.name, placeholder: 'Nuevo nombre' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.newName || data.newName === m.name) return true;
            try {
              await apiClient.put('/raw-materials/' + m.id, { name: data.newName });
              fetchMaterials();
              presentToast({ message: 'Actualizado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };


  const filteredData = materials.filter(item => {
    if (searchText.trim() === '') return true;
    return item.name.toLowerCase().includes(searchText.toLowerCase());
  });
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success"><IonButtons slot="start"><IonMenuButton /></IonButtons><IonTitle>Insumos (Materia Prima)</IonTitle></IonToolbar>
        <IonToolbar color="success">
          <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="4">
              <IonCard>
                <IonCardHeader><IonCardTitle>Agregar Insumo</IonCardTitle></IonCardHeader>
                <IonCardContent>
                  <IonItem><IonLabel position="stacked">Nombre</IonLabel><IonInput value={name} onIonChange={e => setName(e.detail.value!)} placeholder="Ej. Harina" /></IonItem>
                  <IonItem><IonLabel position="stacked">Unidad</IonLabel><IonSelect value={unit} onIonChange={e => setUnit(e.detail.value)}><IonSelectOption value="Kg">Kg</IonSelectOption><IonSelectOption value="Litros">Litros</IonSelectOption><IonSelectOption value="Unidades">Unidades</IonSelectOption></IonSelect></IonItem>
                  <IonItem><IonLabel position="stacked">Costo Estimado x Unidad</IonLabel><IonInput type="number" value={costPerUnit} onIonChange={e => setCostPerUnit(parseFloat(e.detail.value!))} placeholder="0.00" /></IonItem>
                  <IonItem><IonLabel position="stacked">Cantidad Inicial</IonLabel><IonInput type="number" value={initialStock} onIonChange={e => setInitialStock(parseFloat(e.detail.value!))} placeholder="0" /></IonItem>
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleCreate}>Guardar</IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" sizeMd="8">
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {filteredData.map(m => (
                    <RawMaterialCard key={m.id} material={m} onEditName={openEditNameAlert} onRestock={openRestockAlert} onRegisterLoss={openLossAlert} onViewHistory={() => setSelectedMaterialForHistory(m)} onArchive={archiveRawMaterial} />
                  ))}
                </IonRow>
              </IonGrid>
            </IonCol>
          </IonRow>
        </IonGrid>
        <MovementHistoryModal material={selectedMaterialForHistory} onClose={() => setSelectedMaterialForHistory(null)} onCorrected={fetchMaterials} />
        
        <StockOperationModal 
          material={operationMaterial} 
          operationType={operationType} 
          onClose={() => { setOperationMaterial(null); setOperationType(null); }} 
          onSuccess={fetchMaterials} 
        />
      </IonContent>
    </IonPage>
  );
};
export default RawMaterials;
