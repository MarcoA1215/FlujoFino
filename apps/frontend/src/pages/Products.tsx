import { refreshOutline, cubeOutline, buildOutline, cutOutline, closeOutline, searchOutline, archiveOutline } from 'ionicons/icons';
import { IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import React, { useEffect, useState, useMemo } from 'react';
import { IonToggle, IonContent, IonPage, IonGrid, IonRow, IonCol, IonButton, useIonAlert, useIonActionSheet, useIonToast, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { apiClient } from '../api/client';
import type { Product } from '../types';
import { ProductCard } from '../components/products/ProductCard';
import { RecipeModal } from '../components/products/RecipeModal';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { useImageViewer } from '../context/ImageViewerContext';
import AppHeader from '../components/AppHeader';

const Products: React.FC = () => {
  const { openImage } = useImageViewer();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();
  const [searchText, setSearchText] = useState('');
  const [isClientMode, setIsClientMode] = useState(false);
  const [presentToast] = useIonToast();
  const [settings, setSettings] = useState<any>({});
  const [showArchivedPanel, setShowArchivedPanel] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const fetchArchivedProducts = async () => {
    setLoadingArchived(true);
    try {
      const res = await apiClient.get<Product[]>('/products/archived');
      setArchivedProducts(res.data || []);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando productos archivados', duration: 3000, color: 'danger' });
    } finally {
      setLoadingArchived(false);
    }
  };

  const restoreProduct = async (p: Product) => {
    try {
      await apiClient.patch(`/products/${p.id}/restore`);
      presentToast({ message: `Producto "${p.name}" restaurado con éxito`, duration: 2500, color: 'success' });
      fetchData();
      fetchArchivedProducts();
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error al restaurar producto', duration: 3000, color: 'danger' });
    }
  };

  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isCreatingCombo, setIsCreatingCombo] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<'REVENTA' | 'FORMULA' | 'SERVICIO'>('REVENTA');

  const activeArchetypes = useMemo(() => {
    const list: { type: 'REVENTA' | 'FORMULA' | 'SERVICIO'; label: string; icon: any; buttonLabel: string }[] = [];
    if (settings?.featureBuySell) {
      list.push({ 
        type: 'REVENTA', 
        label: 'Producto para Reventa Directa', 
        icon: cubeOutline,
        buttonLabel: 'Nuevo Producto'
      });
    }
    if (settings?.featureRecipes) {
      list.push({ 
        type: 'FORMULA', 
        label: 'Producto Armable / Con Fórmula', 
        icon: buildOutline,
        buttonLabel: 'Nuevo Producto Armable'
      });
    }
    if (settings?.featureCustomerSchedules) {
      list.push({ 
        type: 'SERVICIO', 
        label: 'Servicio / Cita', 
        icon: cutOutline,
        buttonLabel: 'Nuevo Servicio'
      });
    }
    if (list.length === 0) {
      list.push({ 
        type: 'REVENTA', 
        label: 'Producto', 
        icon: cubeOutline,
        buttonLabel: 'Nuevo Producto'
      });
    }
    return list;
  }, [settings]);

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

    const handleUsersUpdated = () => {
      fetchUsers();
    };
    window.addEventListener('users_updated', handleUsersUpdated);
    window.addEventListener('focus', handleUsersUpdated);

    return () => {
      window.removeEventListener('users_updated', handleUsersUpdated);
      window.removeEventListener('focus', handleUsersUpdated);
    };
  }, []);

  useIonViewWillEnter(() => {
    fetchData();
    fetchUsers();
  });

  const openCreateModal = (isCombo: boolean, archetype: 'REVENTA' | 'FORMULA' | 'SERVICIO' = 'REVENTA') => {
    fetchUsers();
    setProductToEdit(null);
    setIsCreatingCombo(isCombo);
    setSelectedArchetype(archetype);
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    fetchUsers();
    setProductToEdit(p);
    setIsCreatingCombo(!!p.isCombo);
    const pType: 'REVENTA' | 'FORMULA' | 'SERVICIO' = 
      p.product_type || 
      (p.is_service === true || p.category === 'Servicios' ? 'SERVICIO' : 
      ((p.recipe && p.recipe.length > 0) || p.isCombo ? 'FORMULA' : 'REVENTA'));
    setSelectedArchetype(pType);
    setShowProductModal(true);
  };

  const handleNewProductClick = () => {
    if (activeArchetypes.length <= 1) {
      openCreateModal(false, activeArchetypes[0].type);
      return;
    }

    presentActionSheet({
      header: '¿Qué tipo deseas registrar?',
      subHeader: 'Selecciona según el modelo de negocio',
      buttons: [
        ...activeArchetypes.map(item => ({
          text: item.label,
          icon: item.icon,
          handler: () => {
            openCreateModal(false, item.type);
          }
        })),
        {
          text: 'Cancelar',
          icon: closeOutline,
          role: 'cancel'
        }
      ]
    });
  };

  const openAddStockAlert = (p: Product) => {
    const curStock = p.stock !== undefined && p.stock !== null ? p.stock : p.stockQuantity;
    presentAlert({
      header: 'Cargar Stock: ' + p.name,
      subHeader: `Stock actual: ${curStock} unidades`,
      inputs: [
        { name: 'additionalStock', type: 'number', placeholder: 'Cantidad a sumar (ej. 10)', min: 1 },
        { name: 'newCost', type: 'number', placeholder: 'Nuevo costo unitario $ (opcional)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Cargar Stock', 
          handler: async (data) => {
            const qty = parseFloat(data.additionalStock);
            if (!qty || isNaN(qty) || qty <= 0) {
              presentToast({ message: 'Ingresa una cantidad válida', duration: 2500, color: 'warning' });
              return false;
            }
            const cost = data.newCost ? parseFloat(data.newCost) : undefined;
            try {
              await apiClient.patch('/products/' + p.id + '/add-stock', { 
                additionalStock: qty,
                newCost: cost
              });
              fetchData();
              presentToast({ message: `Se añadieron ${qty} unidades a ${p.name}`, duration: 2500, color: 'success' });
            } catch(e: any) {
              presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const handleConvertProductType = async (p: Product, targetType: 'REVENTA' | 'FORMULA' | 'SERVICIO') => {
    let targetName = 'Reventa Directa';
    let warningMsg = '';
    if (targetType === 'SERVICIO') {
      targetName = 'Servicio / Cita';
      warningMsg = 'El stock físico se ajustará a 0 para proteger tus reportes financieros de inventario. Si tiene receta, se mantendrá guardada para el futuro.';
    } else if (targetType === 'FORMULA') {
      targetName = 'Producto Armable / Con Fórmula';
      warningMsg = 'Podrás configurar su receta de insumos y fabricarlo o venderlo descontando materia prima.';
    } else if (targetType === 'REVENTA') {
      targetName = 'Producto de Reventa Directa';
      warningMsg = 'Se gestionará con stock directo y costo unitario. Si tenía receta, quedará pausada sin borrarse.';
    }

    presentAlert({
      header: `Convertir a ${targetName}`,
      message: `¿Deseas cambiar "${p.name}" a ${targetName}? ${warningMsg}`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Sí, Convertir', 
          handler: async () => {
            try {
              await apiClient.patch(`/products/${p.id}/convert-type`, { targetType });
              fetchData();
              presentToast({ message: `"${p.name}" convertido a ${targetName} con éxito`, duration: 2500, color: 'success' });
            } catch(e: any) {
              presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3500, color: 'danger' });
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
              if (showArchivedPanel) fetchArchivedProducts();
              presentToast({ message: 'Eliminado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };


  const isProductService = (p: Product) => {
    if (p.product_type === 'SERVICIO') return true;
    if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
    return p.is_service === true || p.category?.toLowerCase() === 'servicios';
  };

  const getProductStock = (p: Product) => {
    if (p.stock !== undefined && p.stock !== null) return Number(p.stock);
    if (p.physicalStock !== undefined && p.physicalStock !== null) return Number(p.physicalStock);
    return Number(p.stockQuantity || 0);
  };

  const filteredData = products.filter(item => {
    if (isClientMode && !isProductService(item) && getProductStock(item) <= 0) return false;
    if (searchText.trim() === '') return true;
    return item.name.toLowerCase().includes(searchText.toLowerCase()) || 
      (item.category && item.category.toLowerCase().includes(searchText.toLowerCase()));
  });
  
  return (
    <IonPage>
      <AppHeader title="Catálogo" subtitle="Productos y Servicios" onRefresh={fetchData} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>
          
          {/* Search & Mode Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div className="ff-search-pill" style={{ flex: 1, minWidth: '240px' }}>
              <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B' }} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nombre o categoría..."
              />
              {searchText && (
                <IonIcon
                  icon={closeOutline}
                  style={{ fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
                  onClick={() => setSearchText('')}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!showArchivedPanel) fetchArchivedProducts();
                setShowArchivedPanel(!showArchivedPanel);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: showArchivedPanel ? '#0F172A' : '#ffffff',
                color: showArchivedPanel ? '#ffffff' : '#334155',
                padding: '8px 14px',
                borderRadius: '999px',
                border: '1px solid #CBD5E1',
                boxShadow: 'var(--ff-shadow-sm)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <IonIcon icon={archiveOutline} style={{ fontSize: '15px' }} />
              <span>Archivados {archivedProducts.length > 0 ? `(${archivedProducts.length})` : ''}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '999px', border: '1px solid #E2E8F0', boxShadow: 'var(--ff-shadow-sm)' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>Modo Cliente</span>
              <IonToggle checked={isClientMode} onIonChange={e => setIsClientMode(e.detail.checked)} color="success" />
            </div>
          </div>

          {/* Cajón / Panel Retráctil de Productos Archivados */}
          {showArchivedPanel && (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #CBD5E1',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={archiveOutline} style={{ fontSize: '1.25rem', color: '#94A3B8' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    Productos Archivados / Eliminados ({archivedProducts.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchivedPanel(false)}
                  style={{
                    background: '#334155',
                    border: 'none',
                    color: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IonIcon icon={closeOutline} />
                  <span>Cerrar</span>
                </button>
              </div>

              <div style={{ padding: '16px' }}>
                {loadingArchived ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                    Cargando productos archivados...
                  </div>
                ) : archivedProducts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                    No hay productos archivados en este momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {archivedProducts.map((archived) => (
                      <div
                        key={archived.id}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#F8FAFC',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                            {archived.name}
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span>
                              Precio: <strong style={{ color: '#334155' }}>${Number(archived.salePrice || 0).toFixed(2)}</strong>
                            </span>
                            {archived.category && (
                              <span>
                                Categoría: <strong style={{ color: '#334155' }}>{archived.category}</strong>
                              </span>
                            )}
                            <span>
                              Stock al archivar: <strong style={{ color: '#334155' }}>{archived.stockQuantity ?? 0}</strong>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="ff-btn-primary"
                            onClick={() => restoreProduct(archived)}
                            style={{
                              fontSize: '12px',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              background: 'var(--theme-primary)',
                              color: 'var(--theme-primary-contrast, #ffffff)',
                              border: 'none',
                            }}
                          >
                            <IonIcon icon={refreshOutline} />
                            <span>Restaurar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        <IonGrid>
          {!isClientMode && (
            <IonRow className="ion-margin-bottom">
              <IonCol size="12" sizeSm={settings?.featureRecipes || settings?.featureProduction !== false ? "8" : "12"} sizeMd={settings?.featureRecipes || settings?.featureProduction !== false ? "6" : "4"}>
                <IonButton expand="block" color="primary" onClick={handleNewProductClick}>
                  {activeArchetypes.length <= 1 ? `+ ${activeArchetypes[0].buttonLabel}` : '+ Nuevo Producto / Servicio'}
                </IonButton>
              </IonCol>
              {(settings?.featureRecipes || settings?.featureProduction !== false) && (
                <IonCol size="12" sizeSm="4" sizeMd="3">
                  <IonButton expand="block" fill="outline" color="tertiary" onClick={() => openCreateModal(true, 'FORMULA')}>
                    + Crear Combo
                  </IonButton>
                </IonCol>
              )}
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
                    const isService = isProductService(p);
                    const currentStock = getProductStock(p);
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
                          <IonBadge slot="end" color={currentStock > 0 ? 'success' : (currentStock < 0 ? 'warning' : 'danger')} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                            {currentStock > 0 ? `Stock: ${currentStock}` : (currentStock < 0 ? `Por producir: ${Math.abs(currentStock)}` : 'Agotado')}
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
                        featureBuySell={settings?.featureBuySell}
                        featureCustomerSchedules={settings?.featureCustomerSchedules}
                        key={p.id}
                        product={p}
                        onEdit={openEditModal}
                        onDelete={handleDeleteProduct}
                        onConfigure={() => setSelectedProductForRecipe(p)}
                        onAdjustStock={openAdjustStockAlert}
                        onAddStock={openAddStockAlert}
                        onConvertType={handleConvertProductType}
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
          archetype={selectedArchetype}
          isResaleOnly={selectedArchetype === 'REVENTA'}
          users={users}
        />
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Products;



