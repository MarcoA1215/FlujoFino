import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonLabel, IonInput, IonText, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSearchbar, IonBadge, useIonToast } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

type Props = {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
};

type CartItem = {
  productId: string;
  name: string;
  salePrice: number;
  quantity: number;
  deliveredQuantity: number;
};

export const EditOrderModal: React.FC<Props> = ({ order, isOpen, onClose, onSuccess }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  
  const [presentToast] = useIonToast();

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (order) {
        setCustomerName(order.customerName || '');
        setCustomerPhone(order.customerPhone || '');
        setCustomerAddress(order.customerAddress || '');
        setNotes(order.notes || '');
        setTableNumber(order.tableNumber || '');
        
        const initialCart = order.items.map((item: any) => ({
          productId: item.productId,
          name: item.productName || item.product?.name,
          salePrice: item.unitPrice,
          quantity: item.quantity,
          deliveredQuantity: item.deliveredQuantity || 0
        }));
        setCart(initialCart);
      }
    }
  }, [isOpen, order]);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
    } catch (e) {}
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        return prev.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: p.id, name: p.name, salePrice: p.salePrice, quantity: 1, deliveredQuantity: 0 }];
    });
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(c => c.productId === productId);
    if (item && item.deliveredQuantity > 0) {
      presentToast({ message: `No puedes eliminar ${item.name} porque ya tiene entregas parciales.`, duration: 3000, color: 'warning' });
      return;
    }
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    const item = cart.find(c => c.productId === productId);
    if (!item) return;

    if (qty < item.deliveredQuantity) {
      presentToast({ message: `No puedes bajar la cantidad de ${item.name} a menos de lo ya entregado (${item.deliveredQuantity}).`, duration: 3000, color: 'warning' });
      return;
    }

    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
  const deliveryFee = order?.deliveryFee || 0;
  const totalCart = cartSubtotal + deliveryFee;

  const handleSave = async () => {
    if (cart.length === 0) return presentToast({ message: 'El pedido no puede quedar vacío', duration: 2000, color: 'warning' });
    if (!customerName.trim()) return presentToast({ message: 'Ingresa el nombre del cliente', duration: 2000, color: 'warning' });

    try {
      await apiClient.put(`/orders/${order.id}`, {
        customerName,
        customerPhone,
        customerAddress,
        notes,
        tableNumber,
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: c.salePrice
        }))
      });
      presentToast({ message: 'Pedido actualizado exitosamente', duration: 2000, color: 'success' });
      onSuccess();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al actualizar pedido';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    }
  };

  if (!order) return null;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Editar Pedido</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow>
            {/* Products Search */}
            <IonCol size="12" sizeMd="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Agregar Productos</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonSearchbar placeholder="Buscar producto..." value={searchTerm} onIonInput={e => setSearchTerm(e.detail.value!)}></IonSearchbar>
                  <IonList style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <IonItem button key={p.id} onClick={() => addToCart(p)} disabled={p.stockQuantity <= 0}>
                        <IonLabel>
                          <h2>{p.name}</h2>
                          <p>${p.salePrice.toFixed(2)}</p>
                        </IonLabel>
                        <IonBadge color={p.stockQuantity <= 0 ? 'danger' : 'success'}>Stock: {p.stockQuantity}</IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Datos del Cliente</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={customerName} onIonInput={e => setCustomerName(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Teléfono</IonLabel>
                    <IonInput value={customerPhone} onIonInput={e => setCustomerPhone(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Mesa / Taburete</IonLabel>
                    <IonInput value={tableNumber} onIonInput={e => setTableNumber(e.detail.value!)} />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Dirección / Notas</IonLabel>
                    <IonInput value={notes} onIonInput={e => setNotes(e.detail.value!)} />
                  </IonItem>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Cart Editor */}
            <IonCol size="12" sizeMd="6">
              <IonCard color="light">
                <IonCardHeader>
                  <IonCardTitle>Contenido del Pedido</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    {cart.map(item => (
                      <IonItem key={item.productId}>
                        <IonLabel>
                          <h3>{item.name}</h3>
                          <p>${item.salePrice.toFixed(2)} c/u</p>
                          {item.deliveredQuantity > 0 && (
                            <IonText color="success"><small>Entregados: {item.deliveredQuantity}</small></IonText>
                          )}
                        </IonLabel>
                        <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</IonButton>
                          <IonText><b>{item.quantity}</b></IonText>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</IonButton>
                          <IonButton color="danger" fill="clear" onClick={() => removeFromCart(item.productId)}>
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>

                  <hr className="ion-margin-vertical" />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4>Subtotal:</h4>
                    <h4>${cartSubtotal.toFixed(2)}</h4>
                  </div>
                  {deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}>
                      <h4>Delivery:</h4>
                      <h4>+ ${deliveryFee.toFixed(2)}</h4>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <h2>Total Actualizado:</h2>
                    <h2 style={{ fontWeight: 'bold', color: '#2dd36f' }}>${totalCart.toFixed(2)}</h2>
                  </div>

                  <IonButton expand="block" color="primary" className="ion-margin-top" size="large" onClick={handleSave}>
                    Guardar Cambios
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonModal>
  );
};

