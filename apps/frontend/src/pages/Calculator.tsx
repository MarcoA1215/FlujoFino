import React, { useEffect, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonSearchbar, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonButton, IonIcon, IonList, IonInput, useIonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { calculatorOutline, addOutline, removeOutline, trashOutline, copyOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { Product, DeliveryZone } from '../types';

type Settings = {
  exchangeRateBs: number;
  companyBank?: string;
  companyCedula?: string;
  companyPhone?: string;
};

interface CartItem {
  product: Product;
  quantity: number;
}

const Calculator: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  
  const [presentToast] = useIonToast();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, rateRes, zonesRes] = await Promise.all([
          apiClient.get<Product[]>('/products'),
          apiClient.get<Settings>('/settings'),
          apiClient.get<DeliveryZone[]>('/delivery-zones')
        ]);
        setProducts(productsRes.data);
        setExchangeRate(rateRes.data.exchangeRateBs);
          setSettings(rateRes.data);
        setDeliveryZones(zonesRes.data);
      } catch (e) {
        presentToast({ message: 'Error cargando datos', duration: 3000, color: 'danger' });
      }
    };
    fetchData();
  }, [presentToast]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedZoneId('');
  };

  
  const handleCopyTicket = () => {
    if (cart.length === 0) {
      return presentToast({ message: 'El carrito está vacío', duration: 2000, color: 'warning' });
    }
    let text = '*NutriDeli - Resumen de Pedido*\n--------------------------\n';
    cart.forEach(item => { text += `- ${item.quantity}x ${item.product.name} (${item.product.salePrice.toFixed(2)})\n`; });
    text += '--------------------------\n';
    text += `Subtotal: ${cartSubtotal.toFixed(2)}\n`;
    const deliveryFee = selectedZoneId ? (deliveryZones.find(z => z.id === selectedZoneId)?.feePrice || 0) : 0;
    if (deliveryFee > 0) text += `Delivery: ${deliveryFee.toFixed(2)}\n`;
    const totalUSD = cartSubtotal + deliveryFee;
    const totalBs = totalUSD * exchangeRate;
    text += `*TOTAL: ${totalUSD.toFixed(2)}* (aprox Bs. ${totalBs.toFixed(2)})\n\n`;
    if (settings && (settings.companyBank || settings.companyPhone || settings.companyCedula)) {
      text += '*Nuestros Datos de Pago (Pago Móvil):*\n';
      if (settings.companyBank) text += `Banco: ${settings.companyBank}\n`;
      if (settings.companyCedula) text += `Cédula: ${settings.companyCedula}\n`;
      if (settings.companyPhone) text += `Teléfono: ${settings.companyPhone}\n`;
    }
    navigator.clipboard.writeText(text).then(() => {
      presentToast({ message: 'Ticket copiado al portapapeles', duration: 2000, color: 'success' });
    });
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  const deliveryFee = selectedZoneId ? (deliveryZones.find(z => z.id === selectedZoneId)?.feePrice || 0) : 0;
  const totalUSD = cartSubtotal + deliveryFee;
  const totalBs = totalUSD * exchangeRate;


  const filteredData = products.filter(item => {
    if (searchText.trim() === '') return true;
    return item.name?.toLowerCase().includes(searchText.toLowerCase());
  });
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="tertiary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Calculadora de Presupuestos</IonTitle>
        </IonToolbar>

        <IonToolbar color="light">
          <IonSearchbar value={searchText} debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} placeholder="Buscar..." animated />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {/* Lista de Productos */}
            <IonCol size="12" sizeLg="6">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Productos Disponibles</IonCardTitle>
                </IonCardHeader>
                <IonCardContent style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <IonList>
                    {filteredData.map(p => (
                      <IonItem key={p.id}>
                        <IonLabel>
                          <h2 style={{ fontWeight: 'bold' }}>{p.name}</h2>
                          <p>{p.salePrice.toFixed(2)}</p>
                        </IonLabel>
                        <IonButton slot="end" onClick={() => addToCart(p)}>
                          <IonIcon icon={addOutline} slot="icon-only" />
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Ticket / Presupuesto */}
            <IonCol size="12" sizeLg="6">
              <IonCard color="light">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={calculatorOutline} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Presupuesto RÃ¡pido
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    color: 'black',
                    fontFamily: 'monospace',
                    fontSize: '1rem'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <h2 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.5rem' }}>NUTRI DELI</h2>
                      <p style={{ margin: 0, color: '#666' }}>CotizaciÃ³n de Pedido</p>
                    </div>
                    
                    <div style={{ borderBottom: '2px dashed #ccc', paddingBottom: '10px', marginBottom: '10px' }}>
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          <IonCol size="6"><strong>Producto</strong></IonCol>
                          <IonCol size="2" className="ion-text-center"><strong>Cant</strong></IonCol>
                          <IonCol size="4" className="ion-text-right"><strong>Subtotal</strong></IonCol>
                        </IonRow>
                      </IonGrid>
                    </div>

                    {cart.length === 0 ? (
                      <p className="ion-text-center" style={{ color: '#999', margin: '20px 0' }}>Agrega productos para cotizar...</p>
                    ) : (
                      <div style={{ minHeight: '150px' }}>
                        {cart.map(item => (
                          <IonGrid key={item.product.id} className="ion-no-padding" style={{ marginBottom: '10px' }}>
                            <IonRow className="ion-align-items-center">
                              <IonCol size="6">
                                <div>{item.product.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>$ {item.product.salePrice.toFixed(2)} c/u</div>
                              </IonCol>
                              <IonCol size="2" className="ion-text-center">
                                {item.quantity}
                              </IonCol>
                              <IonCol size="4" className="ion-text-right">
                                $ {(item.product.salePrice * item.quantity).toFixed(2)}
                              </IonCol>
                            </IonRow>
                            {/* Controles ocultos en la captura idealmente, pero Ãºtiles para editar */}
                            <IonRow className="ion-margin-top">
                              <IonCol size="12" className="ion-text-right">
                                <IonButton fill="clear" size="small" onClick={() => updateQuantity(item.product.id, -1)}><IonIcon icon={removeOutline}/></IonButton>
                                <IonButton fill="clear" size="small" onClick={() => updateQuantity(item.product.id, 1)}><IonIcon icon={addOutline}/></IonButton>
                                <IonButton fill="clear" color="danger" size="small" onClick={() => removeItem(item.product.id)}><IonIcon icon={trashOutline}/></IonButton>
                              </IonCol>
                            </IonRow>
                          </IonGrid>
                        ))}
                      </div>
                    )}

                    <div style={{ borderTop: '2px dashed #ccc', paddingTop: '10px', marginTop: '10px' }}>
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          <IonCol size="6"><h4 style={{ margin: 0, color: '#666' }}>Subtotal:</h4></IonCol>
                          <IonCol size="6" className="ion-text-right">
                            <h4 style={{ margin: 0, color: '#666' }}>$ {cartSubtotal.toFixed(2)}</h4>
                          </IonCol>
                        </IonRow>
                        {deliveryFee > 0 && (
                          <IonRow className="ion-margin-top">
                            <IonCol size="6"><h4 style={{ margin: 0, color: '#666' }}>Delivery:</h4></IonCol>
                            <IonCol size="6" className="ion-text-right">
                              <h4 style={{ margin: 0, color: '#666' }}>+ $ {deliveryFee.toFixed(2)}</h4>
                            </IonCol>
                          </IonRow>
                        )}
                        <IonRow className="ion-margin-top">
                          <IonCol size="6"><h3 style={{ margin: 0, fontWeight: 'bold' }}>TOTAL USD:</h3></IonCol>
                          <IonCol size="6" className="ion-text-right">
                            <h3 style={{ margin: 0, fontWeight: 'bold', color: '#2dd36f' }}>$ {totalUSD.toFixed(2)}</h3>
                          </IonCol>
                        </IonRow>
                        <IonRow className="ion-margin-top ion-align-items-center">
                          <IonCol size="6">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>Tasa (Bs):</span>
                              <IonInput 
                                type="number" 
                                value={exchangeRate} 
                                readonly
                                style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '0 5px', width: '80px', background: '#f9f9f9', opacity: 0.8 }}
                              />
                            </div>
                          </IonCol>
                          <IonCol size="6" className="ion-text-right">
                            <h4 style={{ margin: 0, fontWeight: 'bold' }}>Bs {totalBs.toFixed(2)}</h4>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                    </div>

                    <p style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem', marginTop: '20px' }}>
                      * Este presupuesto es referencial y no reserva inventario.
                    </p>
                  </div>
                  
                  <div className="ion-margin-top" style={{ padding: '0 20px' }}>
                    <IonItem lines="none" style={{ '--background': '#f9f9f9', borderRadius: '8px' }}>
                      <IonLabel position="stacked">Incluir Delivery (Opcional)</IonLabel>
                      <IonSelect 
                        value={selectedZoneId} 
                        onIonChange={e => setSelectedZoneId(e.detail.value)}
                        placeholder="Retiro en local (Sin costo)"
                      >
                        <IonSelectOption value="">Retiro en Local (Gratis)</IonSelectOption>
                        {deliveryZones.map(z => (
                          <IonSelectOption key={z.id} value={z.id}>{z.name} (+ $ {z.feePrice.toFixed(2)})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </div>

                  <div className="ion-margin-top ion-text-center">
                    <IonButton color="medium" fill="outline" onClick={clearCart} disabled={cart.length === 0}>
                      <IonIcon icon={trashOutline} slot="start" />
                      Limpiar
                    </IonButton>
                  </div>
                  <IonButton expand="block" color="secondary" className="ion-margin-top" onClick={handleCopyTicket}>
                            <IonIcon slot="start" icon={copyOutline} />
                            Copiar para WhatsApp
                          </IonButton>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonContent>
    </IonPage>
  );
};
export default Calculator;

