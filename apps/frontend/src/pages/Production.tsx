import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonBadge, useIonAlert, useIonToast, IonToolbar, IonTitle } from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
  isCombo?: boolean;
};

const Production: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [presentToast] = useIonToast();
  const fetchProducts = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando productos', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
              fetchProducts();
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


  const filteredData = products.filter(p => {
    if (p.isCombo) return false;
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
        </IonToolbar>

        <IonToolbar color="light">
          <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
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
                      {filteredData.map(p => (
                        <IonCol size="12" sizeSm="6" sizeMd="4" key={p.id}>
                          <IonCard style={{ margin: '5px' }}>
                            <IonCardContent>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                <h2 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>{p.name}</h2>
                                <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px', fontSize: '0.95rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  Stock: {p.stockQuantity}
                                </IonBadge>
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
      </IonContent>
    </IonPage>
  );
};

export default Production;
