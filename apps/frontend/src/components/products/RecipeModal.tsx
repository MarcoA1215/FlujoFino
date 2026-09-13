import React, { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonList, IonItem,
  IonLabel, IonText, IonSelect, IonSelectOption, IonInput, IonFooter,
  useIonToast
} from '@ionic/react';
import { apiClient } from '../../api/client';
import type { Product, RawMaterial, RecipeItem } from '../../types';

interface RecipeModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ product, onClose, onSaved }) => {
  const [presentToast] = useIonToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [comboItems, setComboItems] = useState<any[]>([]);
  const [totalRecipeCost, setTotalRecipeCost] = useState(0);
  const [newRmId, setNewRmId] = useState('');
  const [newRmQty, setNewRmQty] = useState<number>();
  const [inputUnit, setInputUnit] = useState<string>('');
  const [newComboProdId, setNewComboProdId] = useState('');
  const [newComboQty, setNewComboQty] = useState<number>();

  const selectedMaterial = materials.find(m => m.id === newRmId);

  useEffect(() => {
    if (selectedMaterial) setInputUnit(selectedMaterial.unit);
  }, [newRmId, selectedMaterial]);

  useEffect(() => {
    if (product) loadData(product);
    else {
      setRecipeItems([]); setComboItems([]); setTotalRecipeCost(0);
      setNewRmId(''); setNewRmQty(undefined);
      setNewComboProdId(''); setNewComboQty(undefined);
    }
  }, [product]);

  const loadData = async (p: Product) => {
    try {
      const [matRes, prodRes, recRes] = await Promise.all([
        apiClient.get<RawMaterial[]>('/raw-materials'),
        apiClient.get<Product[]>('/products'),
        apiClient.get('/products/' + p.id + '/recipe')
      ]);
      setMaterials(matRes.data);
      setProducts(prodRes.data);
      setRecipeItems(recRes.data.items || []);
      setComboItems(recRes.data.comboItems || []);
      setTotalRecipeCost(recRes.data.totalRecipeCost || 0);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando datos de la receta', duration: 3000, color: 'danger' });
    }
  };

  const addRecipeItem = () => {
    if (!newRmId || !newRmQty || !selectedMaterial) return;
    let finalQty = newRmQty;
    if (selectedMaterial.unit === 'Kg' && inputUnit === 'Gramos') finalQty = newRmQty / 1000;
    else if (selectedMaterial.unit === 'Litros' && inputUnit === 'Mililitros') finalQty = newRmQty / 1000;
    
    const newItem: RecipeItem = {
      rawMaterialId: selectedMaterial.id, rawMaterialName: selectedMaterial.name, unit: selectedMaterial.unit,
      quantity: finalQty, costPerUnit: selectedMaterial.costPerUnit, totalItemCost: finalQty * selectedMaterial.costPerUnit
    };
    setRecipeItems([...recipeItems, newItem]);
    setTotalRecipeCost(prev => prev + newItem.totalItemCost);
    setNewRmId(''); setNewRmQty(undefined);
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
      const res = await apiClient.get('/products/' + component.id + '/recipe');
      componentCost = res.data.totalRecipeCost || 0;
    } catch (e) {
      console.error(e);
    }
    const itemTotalCost = componentCost * newComboQty;
    setComboItems([...comboItems, { componentId: component.id, componentName: component.name, quantity: newComboQty, unitCost: componentCost, totalItemCost: itemTotalCost }]);
    setTotalRecipeCost(prev => prev + itemTotalCost);
    setNewComboProdId(''); setNewComboQty(undefined);
  };

  const removeComboItem = (index: number) => {
    const item = comboItems[index];
    if (item.totalItemCost) setTotalRecipeCost(prev => prev - item.totalItemCost);
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const saveRecipe = async () => {
    if (!product) return;
    try {
      await apiClient.put('/products/' + product.id + '/recipe', {
        items: recipeItems.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity }))
      });
      await apiClient.put('/products/' + product.id + '/combo', {
        comboItems: comboItems.map(i => ({ componentId: i.componentId, quantity: i.quantity }))
      });
      presentToast({ message: 'Composición guardada exitosamente', duration: 2000, color: 'success' });
      onSaved();
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al guardar la composición', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonModal isOpen={!!product} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="light">
          <IonTitle>{product?.isCombo ? 'Configurar Combo:' : 'Receta:'} {product?.name}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Cerrar</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeLg="8">
              <IonCard style={{ margin: '0 0 20px 0' }}>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '1.1rem' }}>Insumos y Empaques</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {recipeItems.map((item, idx) => (
                      <IonItem key={idx}>
                        <IonLabel>
                          <h3>{item.rawMaterialName}</h3>
                          <p>{item.quantity} {item.unit} x $ {item.costPerUnit.toFixed(2)} c/u</p>
                        </IonLabel>
                        <IonText slot="end" color="medium">$ {item.totalItemCost.toFixed(2)}</IonText>
                        <IonButton slot="end" color="danger" fill="clear" onClick={() => removeRecipeItem(idx)}>X</IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                  <IonGrid className="ion-no-padding ion-margin-top">
                    <IonRow className="ion-align-items-end">
                      <IonCol size="12" sizeMd="5">
                        <IonLabel position="stacked">Insumo</IonLabel>
                        <IonSelect value={newRmId} onIonChange={e => setNewRmId(e.detail.value)} interface="popover" placeholder="Seleccione...">
                          {materials.map(m => <IonSelectOption key={m.id} value={m.id}>{m.name}</IonSelectOption>)}
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
                        <IonInput type="number" step="any" value={newRmQty} onIonInput={e => setNewRmQty(parseFloat(e.detail.value!))} placeholder="0" />
                      </IonCol>
                      <IonCol size="4" sizeMd="2"><IonButton expand="block" onClick={addRecipeItem}>Agregar</IonButton></IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>

              {product?.isCombo && (
                <IonCard style={{ margin: '0 0 20px 0' }}>
                  <IonCardHeader><IonCardTitle style={{ fontSize: '1.1rem' }}>Productos del Combo</IonCardTitle></IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      {comboItems.map((item, idx) => (
                        <IonItem key={'combo-' + idx}>
                          <IonLabel>
                            <h3>{item.componentName}</h3>
                            <p>{item.quantity} Unidades x $ {(item.unitCost || 0).toFixed(2)} c/u</p>
                          </IonLabel>
                          <IonText slot="end" color="medium">$ {(item.totalItemCost || 0).toFixed(2)}</IonText>
                          <IonButton slot="end" color="danger" fill="clear" onClick={() => removeComboItem(idx)}>X</IonButton>
                        </IonItem>
                      ))}
                    </IonList>
                    <IonGrid className="ion-no-padding ion-margin-top">
                      <IonRow className="ion-align-items-end">
                        <IonCol size="12" sizeMd="7">
                          <IonLabel position="stacked">Sub-Producto a incluir</IonLabel>
                          <IonSelect value={newComboProdId} onIonChange={e => setNewComboProdId(e.detail.value)} interface="popover" placeholder="Seleccione un producto...">
                            {products.filter(p => p.id !== product.id && !p.isCombo).map(p => <IonSelectOption key={p.id} value={p.id}>{p.name}</IonSelectOption>)}
                          </IonSelect>
                        </IonCol>
                        <IonCol size="8" sizeMd="2">
                          <IonLabel position="stacked">Cant.</IonLabel>
                          <IonInput type="number" step="any" value={newComboQty} onIonInput={e => setNewComboQty(parseFloat(e.detail.value!))} placeholder="1" />
                        </IonCol>
                        <IonCol size="4" sizeMd="3"><IonButton expand="block" onClick={addComboItem}>Agregar</IonButton></IonCol>
                      </IonRow>
                    </IonGrid>
                  </IonCardContent>
                </IonCard>
              )}
            </IonCol>
            <IonCol size="12" sizeLg="4">
              <IonCard color="light" style={{ margin: '0 0 20px 0' }}>
                <IonCardHeader><IonCardTitle>Rentabilidad</IonCardTitle></IonCardHeader>
                <IonCardContent>
                  <p><strong>Costo Receta:</strong> $ {totalRecipeCost.toFixed(2)}</p>
                  <p><strong>Precio de Venta:</strong> $ {product?.salePrice.toFixed(2)}</p>
                  <hr className="ion-margin-vertical" />
                  {product && (
                    <>
                      <p><strong>Ganancia Neta:</strong> $ {(product.salePrice - totalRecipeCost).toFixed(2)}</p>
                      <p><strong>Margen:</strong> {product.salePrice > 0 ? ` ${(((product.salePrice - totalRecipeCost) / product.salePrice) * 100).toFixed(1)}%` : ' N/A'}</p>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
      <IonFooter>
        <IonToolbar><IonButton expand="block" color="success" style={{ margin: '10px' }} onClick={saveRecipe}>Guardar</IonButton></IonToolbar>
      </IonFooter>
    </IonModal>
  );
};


