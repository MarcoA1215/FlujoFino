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
  IonButton,
  IonList,
  IonLabel,
  IonBadge,
  useIonAlert,
  useIonToast,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
};

const Production: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [presentAlert] = useIonAlert();
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Producción de Lotes</IonTitle>
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
                  
                  <IonList className="ion-margin-top">
                    {products.map(p => (
                      <IonItem key={p.id}>
                        <IonLabel>
                          <h2>{p.name}</h2>
                        </IonLabel>
                        <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} slot="end" className="ion-margin-end">
                          Stock Actual: {p.stockQuantity}
                        </IonBadge>
                        <IonButton fill="solid" color="primary" slot="end" onClick={() => openProduceAlert(p)}>
                          Producir
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
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
