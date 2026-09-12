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
  IonButton,
  IonList,
  IonLabel,
  IonBadge,
  useIonAlert,
  useIonToast,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonText,
  IonCardSubtitle,
  IonFooter,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type Product = {
  id: string;
  name: string;
  category?: string;
  salePrice: number;
  stockQuantity: number;
  isCombo?: boolean;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
};

type RecipeItem = {
  id?: string;
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  totalItemCost: number;
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  // Recipe Modal
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [comboItems, setComboItems] = useState<any[]>([]);
  const [totalRecipeCost, setTotalRecipeCost] = useState(0);

  // Add Recipe Item Form
  const [newRmId, setNewRmId] = useState('');
  const [newRmQty, setNewRmQty] = useState<number>();
  const [inputUnit, setInputUnit] = useState<string>(''); // Para alternar entre Kg y Gramos si aplica

  // Add Combo Item Form
  const [newComboProdId, setNewComboProdId] = useState('');
  const [newComboQty, setNewComboQty] = useState<number>();

  const selectedMaterial = materials.find(m => m.id === newRmId);

  // Cuando cambie el material seleccionado, resetear la unidad de entrada
  useEffect(() => {
    if (selectedMaterial) {
      setInputUnit(selectedMaterial.unit);
    }
  }, [newRmId, selectedMaterial]);

  const fetchData = async () => {
    try {
      const [prodRes, matRes] = await Promise.all([
        apiClient.get<Product[]>('/products'),
        apiClient.get<RawMaterial[]>('/raw-materials')
      ]);
      setProducts(prodRes.data);
      setMaterials(matRes.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando datos', duration: 3000, color: 'danger' });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateAlert = (isCombo: boolean) => {
    presentAlert({
      header: isCombo ? 'Nuevo Combo' : 'Nuevo Producto Base',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre (Ej. Pastel Queso)' },
        { name: 'category', type: 'text', placeholder: 'Categoría (Ej. Pasteles)' },
        { name: 'salePrice', type: 'number', placeholder: 'Precio de Venta ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            if (!data.name || !data.salePrice) {
              presentToast({ message: 'Nombre y precio son obligatorios', duration: 2000, color: 'warning' });
              return false;
            }
            try {
              await apiClient.post('/products', {
                name: data.name,
                category: data.category,
                salePrice: parseFloat(data.salePrice),
                isCombo: isCombo
              });
              fetchData();
              presentToast({ message: isCombo ? 'Combo creado' : 'Producto creado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al crear', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openRecipe = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const res = await apiClient.get(`/products/${product.id}/recipe`);
      setRecipeItems(res.data.items);
      setComboItems(res.data.comboItems || []);
      setTotalRecipeCost(res.data.totalRecipeCost);
      setShowRecipeModal(true);
    } catch(e) {
      console.error(e);
      presentToast({ message: 'Error cargando receta', duration: 3000, color: 'danger' });
    }
  };

  const addRecipeItem = () => {
    if (!newRmId || !newRmQty || !selectedMaterial) return;

    let finalQty = newRmQty;

    // Conversión automática de UI
    if (selectedMaterial.unit === 'Kg' && inputUnit === 'Gramos') {
      finalQty = newRmQty / 1000;
    } else if (selectedMaterial.unit === 'Litros' && inputUnit === 'Mililitros') {
      finalQty = newRmQty / 1000;
    }

    const newItem: RecipeItem = {
      rawMaterialId: selectedMaterial.id,
      rawMaterialName: selectedMaterial.name,
      unit: selectedMaterial.unit,
      quantity: finalQty,
      costPerUnit: selectedMaterial.costPerUnit,
      totalItemCost: finalQty * selectedMaterial.costPerUnit
    };

    setRecipeItems([...recipeItems, newItem]);
    setTotalRecipeCost(prev => prev + newItem.totalItemCost);
    setNewRmId('');
    setNewRmQty(undefined);
  };

  const removeRecipeItem = (index: number) => {
    const item = recipeItems[index];
    setTotalRecipeCost(prev => prev - item.totalItemCost);
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const addComboItem = async () => {
    if (!newComboProdId || !newComboQty) return;
    const component = products.find(p => p.id === newComboProdId);
    if (!component) return;

    let componentCost = 0;
    try {
      const res = await apiClient.get(`/products/${component.id}/recipe`);
      componentCost = res.data.totalRecipeCost || 0;
    } catch (e) {
      console.error("No se pudo obtener el costo del subproducto", e);
    }

    const itemTotalCost = componentCost * newComboQty;

    setComboItems([...comboItems, {
      componentId: component.id,
      componentName: component.name,
      quantity: newComboQty,
      unitCost: componentCost,
      totalItemCost: itemTotalCost
    }]);

    setTotalRecipeCost(prev => prev + itemTotalCost);

    setNewComboProdId('');
    setNewComboQty(undefined);
  };

  const removeComboItem = (index: number) => {
    const item = comboItems[index];
    if (item.totalItemCost) {
      setTotalRecipeCost(prev => prev - item.totalItemCost);
    }
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const saveRecipe = async () => {
    if (!selectedProduct) return;
    try {
      const payloadRecipe = {
        items: recipeItems.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity }))
      };
      await apiClient.put(`/products/${selectedProduct.id}/recipe`, payloadRecipe);
      
      const payloadCombo = {
        comboItems: comboItems.map(i => ({ componentId: i.componentId, quantity: i.quantity }))
      };
      await apiClient.put(`/products/${selectedProduct.id}/combo`, payloadCombo);

      fetchData(); // Refresh list to get updated virtual stock
      presentToast({ message: 'Composición guardada exitosamente', duration: 2000, color: 'success' });
      setShowRecipeModal(false);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al guardar la composición', duration: 3000, color: 'danger' });
    }
  };

  const openAdjustStockAlert = (p: Product) => {
    presentAlert({
      header: `Stock Inicial de ${p.name}`,
      subHeader: `Stock actual: ${p.stockQuantity}`,
      inputs: [
        { name: 'quantity', type: 'number', placeholder: 'Cantidad a sumar', min: 1 },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Añadir Stock', 
          handler: async (data) => {
            if (!data.quantity) return false;
            try {
              await apiClient.post(`/products/${p.id}/adjust-stock`, { 
                quantity: parseFloat(data.quantity)
              });
              fetchData();
              presentToast({ message: 'Stock actualizado', duration: 2000, color: 'success' });
            } catch(e) {
              presentToast({ message: 'Error al actualizar stock', duration: 3000, color: 'danger' });
            }
          } 
        }
      ]
    });
  };

  const openLossAlert = (p: Product) => {
    presentAlert({
      header: `Pérdida / Ajuste: ${p.name}`,
      subHeader: `Stock actual: ${p.stockQuantity}`,
      inputs: [
        { name: 'quantity', type: 'number', placeholder: 'Cantidad perdida', min: 1 },
        { name: 'reason', type: 'text', placeholder: 'Motivo' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Registrar Pérdida', 
          cssClass: 'alert-button-danger',
          handler: async (data) => {
            if (!data.quantity || !data.reason) return false;
            try {
              await apiClient.post(`/products/${p.id}/loss`, { 
                quantity: parseFloat(data.quantity), 
                reason: data.reason 
              });
              fetchData();
              presentToast({ message: 'Pérdida registrada', duration: 2000, color: 'warning' });
            } catch(e) {
              presentToast({ message: 'Error al registrar pérdida', duration: 3000, color: 'danger' });
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
        { name: 'category', type: 'text', value: p.category, placeholder: 'Categoría' },
        { name: 'salePrice', type: 'number', value: p.salePrice, placeholder: 'Precio Venta ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.name || !data.salePrice) return false;
            try {
              await apiClient.put(`/products/${p.id}`, { 
                name: data.name, 
                category: data.category,
                salePrice: parseFloat(data.salePrice)
              });
              fetchData();
              presentToast({ message: 'Producto actualizado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al actualizar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const handleDeleteProduct = (p: Product) => {
    presentAlert({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar "${p.name}"? Los datos históricos (pedidos, caja) no se verán afectados.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/products/${p.id}`);
              fetchData();
              presentToast({ message: 'Producto eliminado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al eliminar', duration: 3000, color: 'danger' });
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
          <IonTitle>Catálogo de Productos</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow className="ion-margin-bottom">
            <IonCol size="12" sizeSm="6" sizeMd="4">
              <IonButton expand="block" color="primary" onClick={() => openCreateAlert(false)}>
                + Crear Producto Base
              </IonButton>
            </IonCol>
            <IonCol size="12" sizeSm="6" sizeMd="4">
              <IonButton expand="block" color="tertiary" onClick={() => openCreateAlert(true)}>
                + Crear Combo
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {products.map(p => (
                    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" key={p.id}>
                      <IonCard style={{ margin: '5px' }}>
                        <IonCardContent>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' }}>{p.name}</h2>
                                <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>
                                  {p.category || 'Sin categoría'} • {p.isCombo ? 'Combo' : 'Base'}
                                </p>
                                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Precio: ${p.salePrice.toFixed(2)}</p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '8px' }}>
                                <IonBadge color={p.stockQuantity <= 0 ? 'danger' : 'primary'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                  Stock: {p.stockQuantity}
                                </IonBadge>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <IonButton fill="clear" size="small" onClick={() => openEditProductAlert(p)} style={{ margin: 0, width: '30px', height: '30px' }}>✏️</IonButton>
                                  <IonButton fill="clear" size="small" color="danger" onClick={() => handleDeleteProduct(p)} style={{ margin: 0, width: '30px', height: '30px' }}>🗑️</IonButton>
                                </div>
                              </div>
                            </div>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                            <IonButton size="small" fill="outline" color={p.isCombo ? "tertiary" : "primary"} onClick={() => openRecipe(p)}>
                              {p.isCombo ? "Configurar Combo" : "Configurar Receta"}
                            </IonButton>
                            <IonButton size="small" fill="outline" color="medium" onClick={() => openAdjustStockAlert(p)}>
                              Stock Inicial
                            </IonButton>
                            <IonButton size="small" fill="outline" color="danger" onClick={() => openLossAlert(p)}>
                              Pérdida
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

        {/* Modal de Receta */}
        <IonModal isOpen={showRecipeModal} onDidDismiss={() => setShowRecipeModal(false)}>
          <IonHeader>
            <IonToolbar color="light">
              <IonTitle>{selectedProduct?.isCombo ? 'Configurar Combo:' : 'Receta:'} {selectedProduct?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowRecipeModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeLg="8">
                  {/* Tarjeta de Insumos */}
                  <IonCard style={{ margin: '0 0 20px 0' }}>
                    <IonCardHeader>
                      <IonCardTitle style={{ fontSize: '1.1rem' }}>Insumos y Empaques</IonCardTitle>
                      <IonCardSubtitle>Materias primas directas usadas para este producto</IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonList>
                        {recipeItems.map((item, idx) => (
                          <IonItem key={idx}>
                            <IonLabel>
                              <h3>{item.rawMaterialName}</h3>
                              <p>{item.quantity} {item.unit} x ${item.costPerUnit.toFixed(2)} c/u</p>
                            </IonLabel>
                            <IonText slot="end" color="medium">${item.totalItemCost.toFixed(2)}</IonText>
                            <IonButton slot="end" color="danger" fill="clear" onClick={() => removeRecipeItem(idx)}>X</IonButton>
                          </IonItem>
                        ))}
                        {recipeItems.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic' }}>No hay insumos asignados.</p>}
                      </IonList>

                      <IonGrid className="ion-no-padding ion-margin-top">
                        <IonRow className="ion-align-items-end">
                          <IonCol size="12" sizeMd="5">
                            <IonLabel position="stacked">Insumo</IonLabel>
                            <IonSelect value={newRmId} onIonChange={e => setNewRmId(e.detail.value)} interface="popover" placeholder="Seleccione...">
                              {materials.map(m => (
                                <IonSelectOption key={m.id} value={m.id}>{m.name}</IonSelectOption>
                              ))}
                            </IonSelect>
                          </IonCol>
                          
                          {selectedMaterial && (
                            <IonCol size="12" sizeMd="3">
                              <IonLabel position="stacked">Unidad</IonLabel>
                              <IonSelect value={inputUnit} onIonChange={e => setInputUnit(e.detail.value)} interface="popover">
                                <IonSelectOption value={selectedMaterial.unit}>{selectedMaterial.unit}</IonSelectOption>
                                {selectedMaterial.unit === 'Kg' && <IonSelectOption value="Gramos">Gramos</IonSelectOption>}
                                {selectedMaterial.unit === 'Litros' && <IonSelectOption value="Mililitros">Mililitros</IonSelectOption>}
                              </IonSelect>
                            </IonCol>
                          )}

                          <IonCol size="8" sizeMd="2">
                            <IonLabel position="stacked">Cantidad</IonLabel>
                            <IonInput type="number" value={newRmQty} onIonChange={e => setNewRmQty(parseFloat(e.detail.value!))} placeholder="0" />
                          </IonCol>
                          <IonCol size="4" sizeMd="2">
                            <IonButton expand="block" onClick={addRecipeItem}>Agregar</IonButton>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCardContent>
                  </IonCard>

                  {selectedProduct?.isCombo && (
                    <IonCard style={{ margin: '0 0 20px 0' }}>
                      <IonCardHeader>
                        <IonCardTitle style={{ fontSize: '1.1rem' }}>Productos del Combo</IonCardTitle>
                        <IonCardSubtitle>Agrega aquí los sabores y variantes que componen el combo</IonCardSubtitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonList>
                          {comboItems.map((item, idx) => (
                            <IonItem key={`combo-${idx}`}>
                              <IonLabel>
                                <h3>{item.componentName}</h3>
                                <p>{item.quantity} Unidades x ${(item.unitCost || 0).toFixed(2)} c/u (Fabricación)</p>
                              </IonLabel>
                              <IonText slot="end" color="medium">${(item.totalItemCost || 0).toFixed(2)}</IonText>
                              <IonButton slot="end" color="danger" fill="clear" onClick={() => removeComboItem(idx)}>X</IonButton>
                            </IonItem>
                          ))}
                          {comboItems.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic' }}>Este combo aún no tiene productos.</p>}
                        </IonList>

                        <IonGrid className="ion-no-padding ion-margin-top">
                          <IonRow className="ion-align-items-end">
                            <IonCol size="12" sizeMd="7">
                              <IonLabel position="stacked">Sub-Producto a incluir</IonLabel>
                              <IonSelect value={newComboProdId} onIonChange={e => setNewComboProdId(e.detail.value)} interface="popover" placeholder="Seleccione un producto...">
                                {products.filter(p => p.id !== selectedProduct?.id && !p.isCombo).map(p => (
                                  <IonSelectOption key={p.id} value={p.id}>{p.name}</IonSelectOption>
                                ))}
                              </IonSelect>
                            </IonCol>

                            <IonCol size="8" sizeMd="2">
                              <IonLabel position="stacked">Cant.</IonLabel>
                              <IonInput type="number" value={newComboQty} onIonChange={e => setNewComboQty(parseFloat(e.detail.value!))} placeholder="1" />
                            </IonCol>
                            <IonCol size="4" sizeMd="3">
                              <IonButton expand="block" onClick={addComboItem}>Agregar</IonButton>
                            </IonCol>
                          </IonRow>
                        </IonGrid>
                      </IonCardContent>
                    </IonCard>
                  )}
                </IonCol>

                <IonCol size="12" sizeLg="4">
                  <IonCard color="light" style={{ margin: '0 0 20px 0' }}>
                    <IonCardHeader>
                      <IonCardTitle>Rentabilidad</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p><strong>Costo Receta (Fabricación):</strong> ${totalRecipeCost.toFixed(2)}</p>
                      <p><strong>Precio de Venta:</strong> ${selectedProduct?.salePrice.toFixed(2)}</p>
                      <hr className="ion-margin-vertical" />
                      {selectedProduct && (
                        <>
                          <p><strong>Ganancia Neta:</strong> ${(selectedProduct.salePrice - totalRecipeCost).toFixed(2)}</p>
                          <p>
                            <strong>Margen:</strong> 
                            {selectedProduct.salePrice > 0 
                              ? ` ${(((selectedProduct.salePrice - totalRecipeCost) / selectedProduct.salePrice) * 100).toFixed(1)}%` 
                              : ' N/A'}
                          </p>
                        </>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonContent>
          <IonFooter>
            <IonToolbar>
              <IonButton expand="block" color="success" style={{ margin: '10px' }} onClick={saveRecipe}>
                Guardar Receta y Combo
              </IonButton>
            </IonToolbar>
          </IonFooter>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Products;
