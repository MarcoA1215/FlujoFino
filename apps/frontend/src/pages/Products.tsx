import { refreshOutline } from 'ionicons/icons';
import { IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { IonToggle, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonButton, useIonAlert, useIonToast, IonIcon } from '@ionic/react';
import { apiClient } from '../api/client';
import type { Product } from '../types';
import { ProductCard } from '../components/products/ProductCard';
import { RecipeModal } from '../components/products/RecipeModal';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { useImageViewer } from '../context/ImageViewerContext';

const Products: React.FC = () => {
  const { openImage } = useImageViewer();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [isClientMode, setIsClientMode] = useState(false);
  const [presentToast] = useIonToast();
  const [settings, setSettings] = useState<any>({});

  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isCreatingCombo, setIsCreatingCombo] = useState(false);

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

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<any[]>('/users');
      setUsers(res.data || []);
    } catch (e) {
      console.error('Error cargando usuarios', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  const openCreateModal = (isCombo: boolean) => {
    setProductToEdit(null);
    setIsCreatingCombo(isCombo);
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setProductToEdit(p);
    setIsCreatingCombo(!!p.isCombo);
    setShowProductModal(true);
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


  const isServiceOrNoProduction = (p: Product) => {
    return settings?.featureProduction === false || p.category === 'Servicios';
  };

  const filteredData = products.filter(item => {
    if (isClientMode && !isServiceOrNoProduction(item) && item.stockQuantity <= 0) return false;
    if (searchText.trim() === '') return true;
    return item.name.toLowerCase().includes(searchText.toLowerCase()) || 
      (item.category && item.category.toLowerCase().includes(searchText.toLowerCase()));
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
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick={() => openCreateModal(false)}>+ Crear Producto / Servicio</IonButton></IonCol>
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick={() => openCreateModal(true)}>+ Crear Combo</IonButton></IonCol>
  </IonRow>
)}

          <IonRow>
            <IonCol size="12">
              
              {isClientMode ? (
                <IonList>
                  {filteredData.map(p => {
                    const img = Array.isArray(p.images) && p.images.length > 0 
                      ? p.images[p.images.length - 1] 
                      : (typeof p.images === 'string' && p.images ? (p.images as string).split(',').pop()?.trim() : null);
                    const isService = isServiceOrNoProduction(p);
                    return (
                      <IonItem key={p.id} style={{ '--padding-top': '10px', '--padding-bottom': '10px' }}>
                        {img && (
                          <img 
                            src={img} 
                            alt={p.name} 
                            slot="start" 
                            onClick={(e) => { e.stopPropagation(); openImage(img, p.name); }}
                            title="Toca para ver en grande"
                            style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', marginRight: '14px', cursor: 'zoom-in' }} 
                          />
                        )}
                        <IonLabel>
                          <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{p.name}</h2>
                          <p style={{ fontSize: '0.95rem', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
                            ${p.salePrice.toFixed(2)}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {p.category ? <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.category}</span> : null}
                            {p.durationMinutes ? <span style={{ fontSize: '0.8rem', color: '#64748b' }}>&bull; ⏱️ {p.durationMinutes} min</span> : null}
                          </div>
                        </IonLabel>
                        {isService ? (
                          <IonBadge slot="end" color="success" style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                            Disponible
                          </IonBadge>
                        ) : (
                          <IonBadge slot="end" color={p.stockQuantity > 0 ? 'success' : 'danger'} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                            {p.stockQuantity > 0 ? `Stock: ${p.stockQuantity}` : 'Agotado'}
                          </IonBadge>
                        )}
                      </IonItem>
                    );
                  })}
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
                        onEdit={openEditModal}
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
        <ProductFormModal 
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setProductToEdit(null);
          }}
          onSaved={() => {
            fetchData();
          }}
          product={productToEdit}
          isCombo={isCreatingCombo}
          users={users}
        />
      </IonContent>
    </IonPage>
  );
};
export default Products;



