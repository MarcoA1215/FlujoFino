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
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type Product = {
  id: string;
  name: string;
  category?: string;
  salePrice: number;
  stockQuantity: number;
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
  
  // Create Product Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [salePrice, setSalePrice] = useState<number>();
  
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  // Recipe Modal
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [totalRecipeCost, setTotalRecipeCost] = useState(0);

  // Add Recipe Item Form
  const [newRmId, setNewRmId] = useState('');
  const [newRmQty, setNewRmQty] = useState<number>();
  const [inputUnit, setInputUnit] = useState<string>(''); // Para alternar entre Kg y Gramos si aplica

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

  const handleCreate = async () => {
    try {
      await apiClient.post('/products', {
        name,
        category,
        salePrice: salePrice || 0,
      });
      setName('');
      setCategory('');
      setSalePrice(undefined);
      fetchData();
      presentToast({ message: 'Producto creado', duration: 2000, color: 'success' });
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al crear', duration: 3000, color: 'danger' });
    }
  };

  const openRecipe = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const res = await apiClient.get(`/products/${product.id}/recipe`);
      setRecipeItems(res.data.items);
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

  const saveRecipe = async () => {
    if (!selectedProduct) return;
    try {
      const payload = {
        items: recipeItems.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity }))
      };
      await apiClient.put(`/products/${selectedProduct.id}/recipe`, payload);
      presentToast({ message: 'Receta guardada exitosamente', duration: 2000, color: 'success' });
      setShowRecipeModal(false);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error guardando receta', duration: 3000, color: 'danger' });
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
      header: `Merma de ${p.name}`,
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
          <IonRow>
            <IonCol size="12" sizeMd="4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Crear Producto</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={name} onIonChange={e => setName(e.detail.value!)} placeholder="Ej. Pastel de Cochino" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Categoría</IonLabel>
                    <IonInput value={category} onIonChange={e => setCategory(e.detail.value!)} placeholder="Ej. Pasteles" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Precio de Venta ($)</IonLabel>
                    <IonInput type="number" value={salePrice} onIonChange={e => setSalePrice(parseFloat(e.detail.value!))} placeholder="0.00" />
                  </IonItem>
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleCreate}>
                    Guardar
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="8">
              <IonList>
                {products.map(p => (
                  <IonItem key={p.id}>
                    <IonLabel>
                      <h2>{p.name} {p.category && `(${p.category})`}</h2>
                      <p>Precio Venta: ${p.salePrice.toFixed(2)}</p>
                    </IonLabel>
                    <IonBadge color={p.stockQuantity <= 0 ? 'danger' : 'primary'} slot="end" className="ion-margin-end">
                      Stock: {p.stockQuantity}
                    </IonBadge>
                    <IonButton fill="outline" color="primary" slot="end" onClick={() => openRecipe(p)}>
                      Ver Receta / Costos
                    </IonButton>
                    <IonButton fill="outline" color="tertiary" slot="end" onClick={() => openAdjustStockAlert(p)}>
                      Stock Inicial
                    </IonButton>
                    <IonButton fill="outline" color="danger" slot="end" onClick={() => openLossAlert(p)}>
                      Merma
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Modal de Receta */}
        <IonModal isOpen={showRecipeModal} onDidDismiss={() => setShowRecipeModal(false)}>
          <IonHeader>
            <IonToolbar color="light">
              <IonTitle>Receta: {selectedProduct?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowRecipeModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="8">
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
                  </IonList>

                  <div className="ion-margin-top" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <IonLabel position="stacked">Insumo</IonLabel>
                      <IonSelect value={newRmId} onIonChange={e => setNewRmId(e.detail.value)}>
                        {materials.map(m => (
                          <IonSelectOption key={m.id} value={m.id}>{m.name}</IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>
                    
                    {selectedMaterial && (
                      <div style={{ width: '120px' }}>
                        <IonLabel position="stacked">Unidad</IonLabel>
                        <IonSelect value={inputUnit} onIonChange={e => setInputUnit(e.detail.value)}>
                          <IonSelectOption value={selectedMaterial.unit}>{selectedMaterial.unit}</IonSelectOption>
                          {selectedMaterial.unit === 'Kg' && <IonSelectOption value="Gramos">Gramos</IonSelectOption>}
                          {selectedMaterial.unit === 'Litros' && <IonSelectOption value="Mililitros">Mililitros</IonSelectOption>}
                        </IonSelect>
                      </div>
                    )}

                    <div style={{ width: '100px' }}>
                      <IonLabel position="stacked">Cantidad</IonLabel>
                      <IonInput type="number" value={newRmQty} onIonChange={e => setNewRmQty(parseFloat(e.detail.value!))} />
                    </div>
                    <IonButton onClick={addRecipeItem}>Agregar</IonButton>
                  </div>
                </IonCol>

                <IonCol size="12" sizeMd="4">
                  <IonCard color="light">
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
                  
                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={saveRecipe}>
                    Guardar Receta Definitiva
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Products;
