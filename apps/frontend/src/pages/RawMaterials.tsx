import { refreshOutline } from 'ionicons/icons';
﻿import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonContent, IonButtons, IonMenuButton, IonTitle, IonSearchbar, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonLabel, useIonAlert, useIonToast, IonNote, IonIcon, IonModal } from '@ionic/react';
import { apiClient } from '../api/client';
import type { RawMaterial } from '../types';
import { RawMaterialCard } from '../components/raw-materials/RawMaterialCard';
import { MovementHistoryModal } from '../components/raw-materials/MovementHistoryModal';
import { StockOperationModal } from '../components/raw-materials/StockOperationModal';

const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('Kg');
  const [inputUnit, setInputUnit] = useState('Kg');
  const [inputQty, setInputQty] = useState<number>();
  const [inputCost, setInputCost] = useState<number>();
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [presentToast] = useIonToast();
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<RawMaterial | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [operationMaterial, setOperationMaterial] = useState<RawMaterial | null>(null);
  const [operationType, setOperationType] = useState<'restock' | 'loss' | null>(null);
  
  useEffect(() => {
    setInputUnit(baseUnit);
  }, [baseUnit]);

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
      const [matRes, setRes] = await Promise.all([
        apiClient.get<RawMaterial[]>('/raw-materials'),
        apiClient.get('/settings')
      ]);
      setMaterials(matRes.data);
      if (setRes.data && setRes.data.exchangeRateBs) {
        setExchangeRate(setRes.data.exchangeRateBs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleCreate = async () => {
    if (!name || !inputQty || !inputCost) {
      presentToast({ message: 'Llena todos los campos', duration: 2000, color: 'warning' });
      return;
    }

    let finalStock = inputQty;
    if (inputUnit === 'g' || inputUnit === 'ml') {
      finalStock = inputQty / 1000;
    }

    const costPerBaseUnit = inputCost / finalStock;

    try {
      await apiClient.post('/raw-materials', { 
        name, 
        unit: baseUnit, 
        costPerUnit: costPerBaseUnit, 
        initialStock: finalStock, 
        minStockAlert: 5 
      });
      setName(''); 
      setInputQty(undefined); 
      setInputCost(undefined);
      fetchMaterials();
      presentToast({ message: 'Insumo creado', duration: 2000, color: 'success' });
      setShowCreateModal(false);
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
      header: 'Editar Insumo',
      inputs: [
        { name: 'newName', type: 'text', value: m.name, placeholder: 'Nuevo nombre' },
        { name: 'newMinStock', type: 'number', value: m.minStockAlert?.toString() || '5', placeholder: 'Alerta minima de stock' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.newName) return;
            try {
              await apiClient.put('/raw-materials/' + m.id, { 
                name: data.newName, 
                minStockAlert: parseFloat(data.newMinStock) || 0
              });
              presentToast({ message: 'Insumo actualizado', duration: 2000, color: 'success' });
              fetchMaterials();
            } catch (e) {
              presentToast({ message: 'Error al actualizar', duration: 2000, color: 'danger' });
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
        <IonToolbar color="success"><IonButtons slot="start"><IonMenuButton /></IonButtons><IonTitle>Insumos (Materia Prima)</IonTitle>
          <IonButtons slot="end"><IonButton onClick={fetchMaterials}><IonIcon icon={refreshOutline} /></IonButton></IonButtons></IonToolbar>
        <IonToolbar color="success">
          <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        
    <IonRow className="ion-margin-bottom">
      <IonCol size="12" sizeSm="6" sizeMd="4">
        <IonButton expand="block" color="primary" onClick={() => setShowCreateModal(true)}>+ Agregar Insumo</IonButton>
      </IonCol>
    </IonRow>

    <IonGrid className="ion-no-padding">
      <IonRow>
        {filteredData.map(m => (
          <RawMaterialCard key={m.id} material={m} onEditName={openEditNameAlert} onRestock={openRestockAlert} onRegisterLoss={openLossAlert} onViewHistory={() => setSelectedMaterialForHistory(m)} onArchive={archiveRawMaterial} />
        ))}
      </IonRow>
    </IonGrid>

    <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)}>
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Agregar Insumo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCreateModal(false)}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        
              <IonCard>
                
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={name} onIonInput={e => setName(e.detail.value!)} placeholder="Ej. Orégano" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Unidad Base (Inventario)</IonLabel>
                    <IonSelect value={baseUnit} onIonChange={e => setBaseUnit(e.detail.value)}>
                      <IonSelectOption value="Kg">Kg</IonSelectOption>
                      <IonSelectOption value="Litros">Litros</IonSelectOption>
                      <IonSelectOption value="Unidades">Unidades</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Cantidad a Cargar</IonLabel>
                    <IonInput type="number" step="any" value={inputQty} onIonInput={e => setInputQty(parseFloat(e.detail.value!) || undefined)} placeholder="Ej. 100" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Unidad de Carga</IonLabel>
                    <IonSelect value={inputUnit} onIonChange={e => setInputUnit(e.detail.value)}>
                      <IonSelectOption value={baseUnit}>{baseUnit}</IonSelectOption>
                      {baseUnit === 'Kg' && <IonSelectOption value="g">Gramos (g)</IonSelectOption>}
                      {baseUnit === 'Litros' && <IonSelectOption value="ml">Mililitros (ml)</IonSelectOption>}
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span>Costo Total de esta compra</span>
  <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
    <IonSelectOption value="USD">$ USD</IonSelectOption>
    <IonSelectOption value="VES">Bs. VES</IonSelectOption>
  </IonSelect>
</IonLabel>
                    <IonInput type="number" step="any" value={inputCost} onIonInput={e => setInputCost(parseFloat(e.detail.value!) || undefined)} placeholder="Ej. 2.00" />
                  </IonItem>
                  {inputQty && (inputUnit === 'g' || inputUnit === 'ml') && (
                    <IonNote color="medium" className="ion-margin-top ion-padding-horizontal" style={{display: 'block', fontSize: '12px'}}>
                      Nota: Se registrarán {inputQty / 1000} {baseUnit} en el inventario. Costo: ${(inputCost || 0) / (inputQty / 1000)} x {baseUnit}.
                    </IonNote>
                  )}
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleCreate}>Guardar</IonButton>
                </IonCardContent>
              </IonCard>
            
      </IonContent>
    </IonModal>
  
        <MovementHistoryModal material={selectedMaterialForHistory} onClose={() => setSelectedMaterialForHistory(null)} onCorrected={fetchMaterials} />
        
        <StockOperationModal 
          material={operationMaterial} 
          operationType={operationType} 
          onClose={() => { setOperationMaterial(null); setOperationType(null); }} 
          onSuccess={fetchMaterials} 
         exchangeRate={exchangeRate} />
      </IonContent>
    </IonPage>
  );
};
export default RawMaterials;
