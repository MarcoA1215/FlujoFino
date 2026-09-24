import { refreshOutline } from 'ionicons/icons';
import { IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { IonToggle, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonButton, useIonAlert, useIonToast, IonIcon } from '@ionic/react';
import { apiClient } from '../api/client';
import type { Product } from '../types';
import { ProductCard } from '../components/products/ProductCard';
import { RecipeModal } from '../components/products/RecipeModal';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [isClientMode, setIsClientMode] = useState(false);
  const [presentToast] = useIonToast();
  const [settings, setSettings] = useState<any>({});

  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
      const setRes = await apiClient.get<any>('/settings');
      setSettings(setRes.data);
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
        { name: 'category', type: 'text', placeholder: 'Categoría' },
        { name: 'salePrice', type: 'number', placeholder: 'Precio Venta ($)' },
        { name: 'estimatedCost', type: 'number', placeholder: 'Costo Estimado Insumos ($) (Opcional)' },
        { name: 'durationMinutes', type: 'number', placeholder: 'Duración estimada en minutos (Ej. 45)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            if (!data.name || !data.salePrice) return false;
            try {
              await apiClient.post('/products', {
                name: data.name,
                category: data.category,
                salePrice: parseFloat(data.salePrice),
                estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : 0,
                durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : 30,
                isCombo,
                isPreAssembled: false
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
          text: 'Añadir Stock', 
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
      header: 'Pérdida: ' + p.name,
      inputs: [
        { name: 'quantity', type: 'number', placeholder: 'Cantidad pérdida', min: 1 },
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
              presentToast({ message: 'Pérdida registrada', duration: 2000, color: 'warning' });
            } catch(e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  
  const handleUnpackKit = async (p: Product) => {
    if (!window.confirm(`¿Estás seguro de desarmar 1 ${p.name}? Los componentes regresarán al inventario.`)) return;
    try {
      await apiClient.post(`/products/${p.id}/unpack`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al desarmar el kit');
    }
  };
  
  const handleToggleKitting = async (p: Product) => {
    try {
      await apiClient.put('/products/' + p.id, { isPreAssembled: !p.isPreAssembled });
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al cambiar modo');
    }
  };
  
  const openEditProductAlert = (p: Product) => {
    presentAlert({
      header: 'Editar Producto',
      inputs: [
        { name: 'name', type: 'text', value: p.name, placeholder: 'Nombre' },
        { name: 'category', type: 'text', value: p.category, placeholder: 'Categoría' },
        { name: 'salePrice', type: 'number', value: p.salePrice, placeholder: 'Precio Venta ($)' },
        { name: 'estimatedCost', type: 'number', value: p.estimatedCost ?? 0, placeholder: 'Costo Estimado Insumos ($)' },
        { name: 'durationMinutes', type: 'number', value: p.durationMinutes ?? 30, placeholder: 'Duración estimada en minutos (Ej. 45)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.name || !data.salePrice) return false;
            try {
              await apiClient.put('/products/' + p.id, {
                name: data.name,
                category: data.category,
                salePrice: parseFloat(data.salePrice),
                estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : 0,
                durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null
              });
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
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de eliminar este producto? Datos históricos se mantendrán.',
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


  const filteredData = products.filter(item => {
    if (isClientMode && item.stockQuantity <= 0) return false;
    if (searchText.trim() === '') return true;
    return item.name.toLowerCase().includes(searchText.toLowerCase());
  });
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Catálogo de Productos</IonTitle>
          <IonButtons slot="end">
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
              <span style={{ fontSize: '0.8rem', marginRight: '5px', color: 'white' }}>Modo Cliente</span>
              <IonToggle checked={isClientMode} onIonChange={e => setIsClientMode(e.detail.checked)} color="light" />
            </div>
            <IonButton onClick={fetchData}><IonIcon icon={refreshOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar color="success">
          <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          {!isClientMode && (
  <IonRow className="ion-margin-bottom">
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick={() => openCreateAlert(false)}>+ Crear Producto Base</IonButton></IonCol>
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick={() => openCreateAlert(true)}>+ Crear Combo</IonButton></IonCol>
  </IonRow>
)}

          <IonRow>
            <IonCol size="12">
              
              {isClientMode ? (
                <IonList>
                  {filteredData.map(p => (
                    <IonItem key={p.id}>
                      <IonLabel>
                        <h2><strong>{p.name}</strong></h2>
                        <p>Precio: ${p.salePrice.toFixed(2)}</p>
                      </IonLabel>
                      <IonBadge slot="end" color={p.stockQuantity > 0 ? 'success' : 'danger'}>
                        Disponible: {p.stockQuantity}
                      </IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <IonGrid className="ion-no-padding">
                  <IonRow>
                    {filteredData.map(p => (
                      <ProductCard isClientMode={isClientMode}
                        featureRecipes={settings?.featureRecipes}
                        featureProduction={settings?.featureProduction !== false}
                        key={p.id}
                        product={p}
                        onEdit={openEditProductAlert}
                        onDelete={handleDeleteProduct}
                        onConfigure={() => setSelectedProductForRecipe(p)}
                        onAdjustStock={openAdjustStockAlert}
                        onRegisterLoss={openLossAlert}
                        onToggleKitting={handleToggleKitting}
                        onUnpackKit={handleUnpackKit}
                      />
                    ))}
                  </IonRow>
                </IonGrid>
              )}

            </IonCol>
          </IonRow>
        </IonGrid>
        <RecipeModal product={selectedProductForRecipe} onClose={() => setSelectedProductForRecipe(null)} onSaved={() => { setSelectedProductForRecipe(null); fetchData(); }} />
      </IonContent>
    </IonPage>
  );
};
export default Products;



