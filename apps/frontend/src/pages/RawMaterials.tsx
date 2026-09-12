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
  IonLabel,
  IonBadge,
  useIonAlert,
  useIonToast,
  IonModal,
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

type Movement = {
  id: string;
  type: string;
  quantity: number;
  totalCost: number;
  createdAt: string;
  description: string;
};

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

const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [costPerUnit, setCostPerUnit] = useState<number>();
  const [initialStock, setInitialStock] = useState<number>();

  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const [showKardex, setShowKardex] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const fetchMaterials = async () => {
    try {
      const res = await apiClient.get<RawMaterial[]>('/raw-materials');
      setMaterials(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMovements = async (id: string) => {
    try {
      const res = await apiClient.get<Movement[]>(`/raw-materials/${id}/movements`);
      setMovements(res.data);
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
      presentToast({ message: 'Insumo creado', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error al crear insumo', duration: 3000, color: 'danger' });
    }
  };

  const openRestockAlert = (m: RawMaterial) => {
    presentAlert({
      header: `Comprar ${m.name}`,
      inputs: [
        { name: 'qty', type: 'number', placeholder: `Cantidad (${m.unit})` },
        { name: 'cost', type: 'number', placeholder: 'Costo Total ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar Compra',
          handler: async (data) => {
            if (!data.qty || !data.cost) return false;
            try {
              await apiClient.post(`/raw-materials/${m.id}/restock`, {
                quantity: parseFloat(data.qty),
                totalCost: parseFloat(data.cost),
              });
              fetchMaterials();
              presentToast({ message: 'Compra registrada', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al registrar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openLossAlert = (m: RawMaterial) => {
    presentAlert({
      header: `Pérdida / Ajuste: ${m.name}`,
      inputs: [
        { name: 'qty', type: 'number', placeholder: `Cantidad a descontar (${m.unit})` },
        { name: 'reason', type: 'text', placeholder: 'Motivo (ej. Daño, Error)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Registrar',
          handler: async (data) => {
            if (!data.qty || !data.reason) return false;
            try {
              await apiClient.post(`/raw-materials/${m.id}/loss`, {
                quantity: parseFloat(data.qty),
                reason: data.reason
              });
              fetchMaterials();
              presentToast({ message: 'Ajuste registrado', duration: 2000, color: 'warning' });
            } catch (e) {
              presentToast({ message: 'Error al ajustar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openEditNameAlert = (m: RawMaterial) => {
    presentAlert({
      header: 'Editar Nombre',
      inputs: [
        { name: 'newName', type: 'text', value: m.name, placeholder: 'Nuevo nombre' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.newName || data.newName === m.name) return true;
            try {
              await apiClient.put(`/raw-materials/${m.id}`, { name: data.newName });
              fetchMaterials();
              presentToast({ message: 'Nombre actualizado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al actualizar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openHistory = (m: RawMaterial) => {
    setSelectedMaterial(m);
    fetchMovements(m.id);
    setShowKardex(true);
  };

  const openEditMovementAlert = (mov: Movement) => {
    const isLoss = mov.type === 'LOSS';
    const inputs: any[] = [
      { name: 'qty', type: 'number', value: mov.quantity, placeholder: 'Cantidad correcta' }
    ];
    if (!isLoss) {
      inputs.push({ name: 'cost', type: 'number', value: mov.totalCost, placeholder: 'Costo total correcto ($)' });
    }

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
              await apiClient.put(`/stock-movements/${mov.id}`, {
                quantity: parseFloat(data.qty),
                totalCost: isLoss ? 0 : parseFloat(data.cost)
              });
              if (selectedMaterial) fetchMovements(selectedMaterial.id);
              fetchMaterials();
              presentToast({ message: 'Movimiento corregido exitosamente', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al corregir', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
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
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {materials.map(m => (
                    <IonCol size="12" sizeSm="6" sizeLg="6" key={m.id}>
                      <IonCard style={{ margin: '5px' }}>
                        <IonCardContent>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' }}>{m.name}</h2>
                              <p style={{ margin: 0, color: 'gray', fontSize: '0.9rem' }}>Costo prom: ${m.costPerUnit.toFixed(2)} / {m.unit}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '8px' }}>
                              <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                {m.stockQuantity.toFixed(2)} {m.unit}
                              </IonBadge>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <IonButton fill="clear" size="small" onClick={() => openEditNameAlert(m)} style={{ margin: 0, width: '30px', height: '30px' }}>✏️</IonButton>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                            <IonButton size="small" fill="outline" color="primary" onClick={() => openRestockAlert(m)}>
                              Comprar
                            </IonButton>
                            <IonButton size="small" fill="outline" color="warning" onClick={() => openLossAlert(m)}>
                              Registrar Pérdida
                            </IonButton>
                            <IonButton size="small" fill="outline" color="tertiary" onClick={() => openHistory(m)}>
                              Historial
                            </IonButton>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonModal isOpen={showKardex} onDidDismiss={() => setShowKardex(false)}>
          <IonHeader>
            <IonToolbar color="light">
              <IonTitle>Historial: {selectedMaterial?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowKardex(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Costo</th>
                    <th>Notas</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(mov => (
                    <tr key={mov.id}>
                      <td>{new Date(mov.createdAt).toLocaleString()}</td>
                      <td>
                        <IonBadge color={mov.type.startsWith('IN') ? 'success' : 'danger'} style={{ padding: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {movementTypeTranslations[mov.type] || mov.type}
                        </IonBadge>
                      </td>
                      <td>{mov.quantity}</td>
                      <td>${(mov.totalCost || 0).toFixed(2)}</td>
                      <td>{mov.description}</td>
                      <td>
                        {(mov.type === 'IN_PURCHASE' || mov.type === 'LOSS') && (
                          <IonButton fill="clear" color="primary" size="small" onClick={() => openEditMovementAlert(mov)}>
                            Corregir
                          </IonButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="ion-text-center">No hay movimientos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RawMaterials;

