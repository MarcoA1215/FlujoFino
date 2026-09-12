import React, { useEffect, useState } from 'react';
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
  IonButton,
  useIonAlert,
  useIonToast
} from '@ionic/react';
import { apiClient } from '../api/client';
import type { Product } from '../types';
import { ProductCard } from '../components/products/ProductCard';
import { RecipeModal } from '../components/products/RecipeModal';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando productos', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateAlert = (isCombo: boolean) => {
    presentAlert({
      header: isCombo ? 'Nuevo Combo' : 'Nuevo Producto Base',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre' },
        { name: 'category', type: 'text', placeholder: 'Categor�a' },
        { name: 'salePrice', type: 'number', placeholder: 'Precio Venta' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            if (!data.name || !data.salePrice) return false;
            try {
              await apiClient.post('/products', {
                name: data.name, category: data.category, salePrice: parseFloat(data.salePrice), isCombo
              });
              fetchData();
              presentToast({ message: 'Creado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openAdjustStockAlert = (p: Product) => {
    presentAlert({
      header: 'Stock Inicial de ' + p.name,
      inputs: [{ name: 'quantity', type: 'number', placeholder: 'Cantidad a sumar', min: 1 }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'A�adir Stock', 
          handler: async (data) => {
            if (!data.quantity) return false;
            try {
              await apiClient.post('/products/' + p.id + '/adjust-stock', { quantity: parseFloat(data.quantity) });
              fetchData();
              presentToast({ message: 'Stock actualizado', duration: 2000, color: 'success' });
            } catch(e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const openLossAlert = (p: Product) => {
    presentAlert({
      header: 'P�rdida: ' + p.name,
      inputs: [
        { name: 'quantity', type: 'number', placeholder: 'Cantidad perdida', min: 1 },
        { name: 'reason', type: 'text', placeholder: 'Motivo' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Registrar', 
          cssClass: 'alert-button-danger',
          handler: async (data) => {
            if (!data.quantity || !data.reason) return false;
            try {
              await apiClient.post('/products/' + p.id + '/loss', { quantity: parseFloat(data.quantity), reason: data.reason });
              fetchData();
              presentToast({ message: 'P�rdida registrada', duration: 2000, color: 'warning' });
            } catch(e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const openEditProductAlert = (p: Product) => {
    presentAlert({
      header: 'Editar Producto',
      inputs: [
        { name: 'name', type: 'text', value: p.name, placeholder: 'Nombre' },
        { name: 'category', type: 'text', value: p.category, placeholder: 'Categor�a' },
        { name: 'salePrice', type: 'number', value: p.salePrice, placeholder: 'Precio Venta ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.name || !data.salePrice) return false;
            try {
              await apiClient.put('/products/' + p.id, { name: data.name, category: data.category, salePrice: parseFloat(data.salePrice) });
              fetchData();
              presentToast({ message: 'Actualizado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const handleDeleteProduct = (p: Product) => {
    presentAlert({
      header: 'Confirmar Eliminaci�n',
      message: '�Est�s seguro de eliminar este producto? Datos hist�ricos se mantendr�n.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete('/products/' + p.id);
              fetchData();
              presentToast({ message: 'Eliminado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
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
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Cat�logo de Productos</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow className="ion-margin-bottom">
            <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick={() => openCreateAlert(false)}>+ Crear Producto Base</IonButton></IonCol>
            <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick={() => openCreateAlert(true)}>+ Crear Combo</IonButton></IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {products.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onEdit={openEditProductAlert}
                      onDelete={handleDeleteProduct}
                      onConfigure={() => setSelectedProductForRecipe(p)}
                      onAdjustStock={openAdjustStockAlert}
                      onRegisterLoss={openLossAlert}
                    />
                  ))}
                </IonRow>
              </IonGrid>
            </IonCol>
          </IonRow>
        </IonGrid>
        <RecipeModal product={selectedProductForRecipe} onClose={() => setSelectedProductForRecipe(null)} onSaved={() => { setSelectedProductForRecipe(null); fetchData(); }} />
      </IonContent>
    </IonPage>
  );
};
export default Products;

