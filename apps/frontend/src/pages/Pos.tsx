// @ts-nocheck
﻿import { refreshOutline } from 'ionicons/icons';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonButton, IonList, IonLabel, IonBadge, useIonToast, useIonAlert, IonInput, IonSelect, IonSelectOption, IonText, IonIcon, IonSearchbar } from '@ionic/react';
import { cartOutline, cashOutline, trashOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import type { DeliveryZone } from '../types';
import { DeliveryMethod } from '@nutrideli/shared-types';
import { apiClient } from '../api/client';
import { PaymentStatus } from '@nutrideli/shared-types';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod = 'PENDING' | 'PAGO_MOVIL' | 'USD';

const Pos: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAGO_MOVIL');
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [allowPartialPayments, setAllowPartialPayments] = useState<boolean>(false);
  const [initialAbono, setInitialAbono] = useState<string>('');
  
  // Pago Movil Fields
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilCedula, setPagoMovilCedula] = useState('');
  const [pagoMovilBank, setPagoMovilBank] = useState('');

  // USD Fields
  const [usdReceived, setUsdReceived] = useState<number | ''>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.IN_STORE);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando productos', duration: 3000, color: 'danger' });
    }
  };

  const fetchRate = async () => {
    try {
      const res = await apiClient.get<any>('/settings');
      setExchangeRate(res.data.exchangeRateBs || 40.0);
      setAllowPartialPayments(res.data.allowPartialPayments || false);
    } catch (e) {}
  };

  const fetchZones = async () => {
    try {
      const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
      setDeliveryZones(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchRate();
    fetchZones();
    const calcCart = localStorage.getItem('calculator_cart');
    if (calcCart) {
      try {
        setCart(JSON.parse(calcCart));
        localStorage.removeItem('calculator_cart');
        const calcZone = localStorage.getItem('calculator_zone');
        if (calcZone) {
          setDeliveryMethod(DeliveryMethod.DELIVERY);
          setDeliveryZoneId(calcZone);
          localStorage.removeItem('calculator_zone');
        }
      } catch (e) {}
    }
  }, []);

  const openRateAlert = () => {
    presentAlert({
      header: 'Tasa BCV',
      inputs: [{ name: 'rate', type: 'number', value: exchangeRate }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: async (data: any) => {
            const newRate = parseFloat(data.rate);
            if (newRate > 0) {
              setExchangeRate(newRate);
              await apiClient.put('/settings/exchange-rate', { rate: newRate });
              presentToast({ message: 'Tasa actualizada', duration: 2000, color: 'success' });
            }
          }
        }
      ]
    });
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  const deliveryFee = (deliveryMethod === DeliveryMethod.DELIVERY && deliveryZoneId) 
    ? (deliveryZones.find(z => z.id === deliveryZoneId)?.feePrice || 0) 
    : 0;
  const totalCart = cartSubtotal + deliveryFee;

  const placeOrder = async () => {
    if (cart.length === 0) return presentToast({ message: 'Carrito vacío', duration: 2000, color: 'warning' });
    if (!customerName.trim()) return presentToast({ message: 'Ingresa el nombre', duration: 2000, color: 'warning' });

    if (paymentMethod === 'PAGO_MOVIL') {
      if (!pagoMovilRef || !pagoMovilBank) {
        return presentToast({ message: 'Referencia y Banco son obligatorios', duration: 3000, color: 'warning' });
      }
    }

    let notes = '';
    if (paymentMethod === 'USD') {
      const received = typeof usdReceived === 'number' ? usdReceived : totalCart;
      const changeUsd = received - totalCart;
      const changeBs = changeUsd * exchangeRate;
      notes = `MÉTODO: Divisas (USD) | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`;
    }

    try {
      await apiClient.post('/orders', {
        customerName,
        customerPhone,
        paymentStatus: paymentMethod === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.PAID,
        notes,
        pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : undefined,
        pagoMovilPhone: paymentMethod === 'PAGO_MOVIL' ? pagoMovilPhone : undefined,
        pagoMovilCedula: paymentMethod === 'PAGO_MOVIL' ? pagoMovilCedula : undefined,
        pagoMovilBank: paymentMethod === 'PAGO_MOVIL' ? pagoMovilBank : undefined,
        amountBs: paymentMethod === 'PAGO_MOVIL' ? (totalCart * exchangeRate) : undefined,
        exchangeRate: exchangeRate,
        initialAbono: initialAbono ? Number(initialAbono) : undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
        }))
      });
      presentToast({ message: 'Pedido creado exitosamente', duration: 2000, color: 'success' });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setInitialAbono('');
      setPagoMovilRef('');
      setPagoMovilPhone('');
      setPagoMovilCedula('');
      setPagoMovilBank('');
      setDeliveryMethod(DeliveryMethod.IN_STORE);
      setDeliveryZoneId('');
      setUsdReceived('');
      setSearchTerm('');
      setPaymentMethod('PAGO_MOVIL');
      fetchProducts();
    } catch (e: any) {
      presentToast({ message: 'Error al crear pedido', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>POS / Caja</IonTitle>
          <IonButtons slot="end"><IonButton onClick={fetchProducts}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={openRateAlert}>
              <IonBadge color="light" style={{ padding: '8px', fontSize: '1rem', color: '#000' }}>
                Tasa: Bs. {exchangeRate.toFixed(2)}
              </IonBadge>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {/* Products Catalog */}
            <IonCol size="12" sizeMd="7">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Catálogo de Productos</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonSearchbar placeholder="Buscar producto..." value={searchTerm} onIonInput={e => setSearchTerm(e.detail.value!)}></IonSearchbar>

                  <IonGrid>
                    <IonRow>
                      {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                        <IonCol size="6" sizeMd="4" key={p.id}>
                          <IonCard button onClick={() => addToCart(p)} color={p.stockQuantity <= 0 ? 'light' : 'white'} style={{ margin: 0, height: '100%' }}>
                            <IonCardHeader>
                              <IonCardTitle style={{ fontSize: '1.1rem' }}>{p.name}</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                              <IonText color="primary"><h2>${p.salePrice.toFixed(2)}</h2></IonText>
                              <IonBadge color={p.stockQuantity <= 0 ? 'danger' : 'success'}>
                                Stock: {p.stockQuantity}
                              </IonBadge>
                            </IonCardContent>
                          </IonCard>
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Cart & Checkout */}
            <IonCol size="12" sizeMd="5">
              <IonCard color="light">
                <IonCardHeader>
                  <IonCardTitle>
                    <IonIcon icon={cartOutline} /> Pedido Actual
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Cliente / Mesa</IonLabel>
                    <IonInput 
                      value={customerName} 
                      onIonInput={e => setCustomerName(e.detail.value!)} 
                      placeholder="Ej. Juan Pérez" 
                    />
                  </IonItem>
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Teléfono del Cliente (Opcional)</IonLabel>
                    <IonInput 
                      value={customerPhone} 
                      onIonInput={e => setCustomerPhone(e.detail.value!)} 
                      placeholder="0414-0000000" 
                    />
                  </IonItem>

                  
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Método de Entrega</IonLabel>
                    <IonSelect value={deliveryMethod} onIonChange={e => setDeliveryMethod(e.detail.value)}>
                      <IonSelectOption value={DeliveryMethod.IN_STORE}>Consumo en Local / Retiro Inmediato</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.PICKUP}>Pickup (Para LLevar / Encargo)</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.DELIVERY}>Delivery (Envío)</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {deliveryMethod !== DeliveryMethod.IN_STORE && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Dirección / Referencia Exacta</IonLabel>
                      <IonInput 
                        value={customerAddress} 
                        onIonInput={e => setCustomerAddress(e.detail.value!)} 
                        placeholder="Ej. Calle 1, Casa 2..." 
                      />
                    </IonItem>
                  )}

                  {deliveryMethod === DeliveryMethod.DELIVERY && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Zona de Envío</IonLabel>
                      <IonSelect value={deliveryZoneId} onIonChange={e => setDeliveryZoneId(e.detail.value)}>
                        {deliveryZones.map(z => (
                          <IonSelectOption key={z.id} value={z.id}>{z.name} (+ $ {z.feePrice.toFixed(2)})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  )}

                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Método de Pago</IonLabel>
                    <IonSelect value={paymentMethod} onIonChange={e => setPaymentMethod(e.detail.value)}>
                      <IonSelectOption value="PAGO_MOVIL">Pago Móvil Confirmado</IonSelectOption>
                      <IonSelectOption value="USD">Divisas (USD Efectivo)</IonSelectOption>
                      <IonSelectOption value="PENDING">Por Pagar</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {paymentMethod === 'PAGO_MOVIL' && (
                    <div style={{ background: '#f4f5f8', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Datos del Pago Móvil (Total: Bs. {(totalCart * exchangeRate).toFixed(2)})</h4>
                      <IonItem color="light">
                        <IonLabel position="stacked">Ref.</IonLabel>
                        <IonInput value={pagoMovilRef} onIonInput={e => setPagoMovilRef(e.detail.value!)} placeholder="Ej. 123456" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Teléfono Origen (Opcional)</IonLabel>
                        <IonInput value={pagoMovilPhone} onIonInput={e => setPagoMovilPhone(e.detail.value!)} placeholder="0414-XXXXXXX" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Cédula (Opcional)</IonLabel>
                        <IonInput value={pagoMovilCedula} onIonInput={e => setPagoMovilCedula(e.detail.value!)} placeholder="V-12345678" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Banco</IonLabel>
                        <IonInput value={pagoMovilBank} onIonInput={e => setPagoMovilBank(e.detail.value!)} placeholder="Banesco" />
                      </IonItem>
                    </div>
                  )}

                  {paymentMethod === 'USD' && (
                    <div style={{ background: '#f4f5f8', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Pago en Divisas</h4>
                      <IonItem color="light">
                        <IonLabel position="stacked">Monto Recibido ($)</IonLabel>
                        <IonInput type="number" value={usdReceived} onIonInput={e => setUsdReceived(parseFloat(e.detail.value!) || '')} placeholder={`Mínimo: $${totalCart.toFixed(2)}`} />
                      </IonItem>
                      
                      {typeof usdReceived === 'number' && usdReceived >= totalCart && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#d1e7dd', borderRadius: '8px' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#0f5132' }}>Vuelto en Divisas: ${(usdReceived - totalCart).toFixed(2)}</p>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#0f5132' }}>Vuelto en Bs: {((usdReceived - totalCart) * exchangeRate).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <IonList>
                    {cart.map(item => (
                      <IonItem key={item.product.id}>
                        <IonLabel>
                          <h3>{item.product.name}</h3>
                          <p>${item.product.salePrice.toFixed(2)} c/u</p>
                        </IonLabel>
                        <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</IonButton>
                          <IonText><b>{item.quantity}</b></IonText>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</IonButton>
                          <IonButton color="danger" fill="clear" onClick={() => removeFromCart(item.product.id)}>
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>

                  {cart.length > 0 && (
                    <>
                      <hr className="ion-margin-vertical" />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Subtotal:</h4>
                        <h4>${cartSubtotal.toFixed(2)}</h4>
                      </div>
                      {deliveryMethod === DeliveryMethod.DELIVERY && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'gray' }}>
                          <h4>Delivery:</h4>
                          <h4>+ ${deliveryFee.toFixed(2)}</h4>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <h2>Total a Pagar:</h2>
                        <h2 style={{ fontWeight: 'bold', color: '#2dd36f' }}>${totalCart.toFixed(2)}</h2>
                      </div>
                      
                      <IonButton 
                        expand="block" 
                        color="success" 
                        className="ion-margin-top" 
                        size="large"
                        onClick={placeOrder}
                      >
                        <IonIcon icon={cashOutline} slot="start" />
                        Confirmar Pedido
                      </IonButton>
                    </>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Pos;

