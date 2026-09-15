import { refreshOutline, trashOutline } from 'ionicons/icons';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonBadge, useIonAlert, useIonToast, IonToolbar, IonTitle, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, } from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
  isCombo?: boolean;
  physicalStock?: number;
  reservedQuantity?: number;
};

type Batch = {
  id: string;
  quantity: number;
  createdAt: string;
  product: Product;
};

const Production: React.FC = () => {
  const [tab, setTab] = useState<'fabricar' | 'historial'>('fabricar');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  
  const [presentToast] = useIonToast();

  const fetchData = async () => {
    try {
      if (tab === 'fabricar') {
        const res = await apiClient.get<Product[]>('/products');
        setProducts(res.data);
      } else {
        const res = await apiClient.get<Batch[]>('/production');
        setBatches(res.data);
      }
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando datos', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const openProduceAlert = (p: Product) => {
    presentAlert({
      header: `Producir ${p.name}`,
      subHeader: `Se descontarán insumos automáticamente`,
      inputs: [
        { name: 'quantity', type: 'number', placeholder: 'Cantidad a fabricar', min: 1 },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Fabricar Lote', 
          cssClass: 'alert-button-success',
          handler: async (data) => {
            if (!data.quantity || parseFloat(data.quantity) <= 0) return false;
            try {
              await apiClient.post(`/production`, { 
                productId: p.id,
                quantity: parseFloat(data.quantity)
              });
              fetchData();
              presentToast({ message: 'Lote fabricado exitosamente', duration: 2000, color: 'success' });
            } catch(e: any) {
              const msg = e.response?.data?.message || 'Error al fabricar lote';
              presentToast({ message: msg, duration: 4000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const openRevertAlert = (b: Batch) => {
    presentAlert({
      header: `¿Revertir Lote?`,
      message: `Esto eliminará el lote de ${b.quantity}x ${b.product.name} y restaurará los insumos. No se puede revertir si ya se ha vendido el producto.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Revertir', 
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/production/${b.id}`);
              fetchData();
              presentToast({ message: 'Lote revertido correctamente', duration: 2000, color: 'success' });
            } catch(e: any) {
              const msg = e.response?.data?.message || 'Error al revertir lote';
              presentToast({ message: msg, duration: 4000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const filteredProducts = products.filter(p => {
    if (p.isCombo && (!p.isPreAssembled || !p.comboItems || p.comboItems.length === 0)) return false;
    if (searchText.trim() === '') return true;
    return p.name?.toLowerCase().includes(searchText.toLowerCase());
  });

  

  

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Producción de Lotes</IonTitle>
          <IonButtons slot="end"><IonButton onClick={fetchData}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
        </IonToolbar>
        
        <IonToolbar color="light">
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="fabricar">
              <IonLabel>Fabricar</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="historial">
              <IonLabel>Historial</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>

        {tab === 'fabricar' && (
          <IonToolbar color="light">
            <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {tab === 'fabricar' ? (
          <IonGrid>
            <IonRow>
              <IonCol size="12">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Fábrica / Cocina</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>Selecciona un producto y la cantidad a fabricar. El sistema descontará automáticamente los insumos requeridos según la receta.</p>
                    
                    <IonGrid className="ion-no-padding ion-margin-top">
                      <IonRow>
                        {filteredProducts.map(p => (
                          <IonCol size="12" sizeSm="6" sizeMd="4" key={p.id}>
                            <IonCard style={{ margin: '5px' }}>
                              <IonCardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0', whiteSpace: 'normal', lineHeight: '1.4' }}>{p.name}</h2>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                      <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px', fontSize: '0.95rem' }}>
                                        Físico: {p.physicalStock}
                                      </IonBadge>
                                      <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px', fontSize: '0.95rem' }}>
                                        Disp: {p.stockQuantity}
                                      </IonBadge>
                                    </div>
                                  </div>
                                <IonButton size="small" fill="solid" color="primary" onClick={() => openProduceAlert(p)} expand="block">
                                  Producir Lote
                                </IonButton>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        ))}
                      </IonRow>
                    </IonGrid>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        ) : (
          <>
          <IonList>
            {batches.map(b => (
              <IonItem key={b.id}>
                <IonLabel>
                  <h2>{b.product?.name}</h2>
                  <p>Cantidad: <strong>{b.quantity}</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'gray' }}>{new Date(b.createdAt).toLocaleString()}</p>
                </IonLabel>
                <IonButton slot="end" color="danger" fill="clear" onClick={() => openRevertAlert(b)}>
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </IonItem>
            ))}
            {batches.length === 0 && (
              <IonItem>
                <IonLabel className="ion-text-center">No hay lotes fabricados recientemente</IonLabel>
              </IonItem>
            )}
          </IonList>
          
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Production;


