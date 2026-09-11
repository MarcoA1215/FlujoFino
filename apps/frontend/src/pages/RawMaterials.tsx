import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonList,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStockAlert: number;
};

const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [costPerUnit, setCostPerUnit] = useState<number>();
  const [initialStock, setInitialStock] = useState<number>();

  const fetchMaterials = async () => {
    try {
      const res = await apiClient.get<RawMaterial[]>('/raw-materials');
      setMaterials(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleCreate = async () => {
    try {
      await apiClient.post('/raw-materials', {
        name,
        unit,
        costPerUnit: costPerUnit || 0,
        initialStock: initialStock || 0,
        minStockAlert: 5,
      });
      setName('');
      setCostPerUnit(undefined);
      setInitialStock(undefined);
      fetchMaterials();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestock = async (id: string) => {
    const qty = prompt("¿Cantidad ingresada?");
    if (!qty) return;
    const cost = prompt("¿Costo total de esta compra?");
    if (!cost) return;

    try {
      await apiClient.post(`/raw-materials/${id}/restock`, {
        quantity: parseFloat(qty),
        totalCost: parseFloat(cost),
      });
      fetchMaterials();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Insumos (Materia Prima)</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Agregar Insumo</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={name} onIonChange={e => setName(e.detail.value!)} placeholder="Ej. Harina" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Unidad</IonLabel>
                    <IonSelect value={unit} onIonChange={e => setUnit(e.detail.value)}>
                      <IonSelectOption value="Kg">Kg</IonSelectOption>
                      <IonSelectOption value="Litros">Litros</IonSelectOption>
                      <IonSelectOption value="Unidades">Unidades</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Costo Estimado x Unidad</IonLabel>
                    <IonInput type="number" value={costPerUnit} onIonChange={e => setCostPerUnit(parseFloat(e.detail.value!))} placeholder="0.00" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Cantidad Inicial</IonLabel>
                    <IonInput type="number" value={initialStock} onIonChange={e => setInitialStock(parseFloat(e.detail.value!))} placeholder="0" />
                  </IonItem>
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleCreate}>
                    Guardar
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="8">
              <IonList>
                {materials.map(m => (
                  <IonItem key={m.id}>
                    <IonLabel>
                      <h2>{m.name}</h2>
                      <p>Costo prom: ${m.costPerUnit.toFixed(2)} / {m.unit}</p>
                    </IonLabel>
                    <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} slot="end">
                      {m.stockQuantity} {m.unit}
                    </IonBadge>
                    <IonButton fill="outline" slot="end" onClick={() => handleRestock(m.id)}>
                      Comprar
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default RawMaterials;

