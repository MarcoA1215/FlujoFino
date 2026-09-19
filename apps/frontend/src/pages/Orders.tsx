// @ts-nocheck
﻿import { refreshOutline, copyOutline, informationCircleOutline, trashOutline } from 'ionicons/icons';
import { IonModal, IonInput } from '@ionic/react';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonButton, IonList, IonLabel, IonBadge, useIonToast, useIonAlert, IonText, IonSegment, IonSegmentButton, IonSearchbar, IonIcon } from '@ionic/react';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { OrderStatus, PaymentStatus, DeliveryMethod } from '@nutrideli/shared-types';
import type { DeliveryZone } from '../types';

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  deliveryMethod?: DeliveryMethod;
  deliveryZone?: DeliveryZone;
  deliveryFee?: number;
  abonosTotal?: number;
  abonosHistory?: any[];
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"activos" | "por_cobrar" | "historial">("activos");
  const [searchText, setSearchText] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoCurrency, setAbonoCurrency] = useState<'USD' | 'VES'>('USD');

  const handleAddAbono = async () => {
    if (!selectedOrderForDetails || !abonoAmount || isNaN(Number(abonoAmount))) return;
    try {
      let finalAmount = Number(abonoAmount);
      if (abonoCurrency === 'VES') {
        finalAmount = finalAmount / exchangeRate;
      }
      await apiClient.post('/orders/' + selectedOrderForDetails.id + '/abono', { amount: finalAmount });
      presentToast({ message: 'Abono registrado', duration: 2000, color: 'success' });
      setAbonoAmount('');
      fetchOrders();
      setSelectedOrderForDetails(null);
    } catch (e) {
      presentToast({ message: 'Error registrando abono', duration: 2000, color: 'danger' });
    }
  };

  const handleRevertAbono = async (index: number) => {
    if (!selectedOrderForDetails) return;
    try {
      await apiClient.delete('/orders/' + selectedOrderForDetails.id + '/abono/' + index);
      presentToast({ message: 'Abono revertido', duration: 2000, color: 'success' });
      fetchOrders();
      setSelectedOrderForDetails(null);
    } catch (e) {
      presentToast({ message: 'Error revirtiendo abono', duration: 2000, color: 'danger' });
    }
  };

  const showOrderInfo = (order: any) => {
    setSelectedOrderForDetails(order);
  };

  const handleCopyOrder = (order: any) => {
    let text = '*NutriDeli - Pedido ' + order.customerName + '*\n';
    if (order.customerPhone) text += 'Tel: ' + order.customerPhone + '\n';
    text += 'Tipo: ' + (order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Delivery' : (order.deliveryMethod === DeliveryMethod.PICKUP ? 'Pickup' : 'Local')) + '\n';
    if (order.deliveryMethod === DeliveryMethod.DELIVERY && order.deliveryZone) {
      text += 'Zona: ' + order.deliveryZone.name + '\n';
    }
    if (order.customerAddress) text += 'Dir: ' + order.customerAddress + '\n';
    text += '-----------------------\n';
    
    let subtotal = 0;
    order.items.forEach((item: any) => {
      subtotal += item.subtotal || 0;
      const price = item.subtotal ? ' ($' + item.subtotal.toFixed(2) + ')' : '';
      text += '- ' + parseFloat(Number(item.quantity).toFixed(4)) + 'x ' + (item.productName || item.product?.name) + price + '\n';
    });
    text += '-----------------------\n';
    
    if (order.discountAmount && order.discountAmount > 0) {
      text += 'Subtotal: $' + subtotal.toFixed(2) + '\n';
      text += 'Descuento: -$' + order.discountAmount.toFixed(2) + '\n';
    }
    
    if (order.deliveryFee && order.deliveryFee > 0) {
      text += '*Costo Delivery: $' + order.deliveryFee.toFixed(2) + '*\n';
    }
    const abonosTotal = order.abonosTotal || 0;
    text += '*TOTAL: $' + order.totalAmount.toFixed(2) + '*\n';
    if (abonosTotal > 0) {
      text += '*ABONOS: $' + abonosTotal.toFixed(2) + '*\n';
      text += '*RESTANTE: $' + (order.totalAmount - abonosTotal).toFixed(2) + '*\n';
    }
    if (order.notes) text += '\nNotas: ' + order.notes + '\n';
    
    navigator.clipboard.writeText(text);
    presentToast({ message: 'Pedido copiado al portapapeles', duration: 2000, color: 'success' });
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data);
    } catch(e) {}
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchOrders = async () => {
    try {
      const res = await apiClient.get<Order[]>("/orders");
      setOrders(res.data);
    } catch (e) {
      presentToast({ message: "Error cargando pedidos", duration: 3000, color: "danger" });
    }
  };

  const fetchRate = async () => {
    try {
      const res = await apiClient.get<{ exchangeRateBs: number }>("/settings/exchange-rate");
      setExchangeRate(res.data.exchangeRateBs);
    } catch (e) {}
  };

  useEffect(() => { fetchOrders(); fetchRate(); const interval = setInterval(() => { fetchOrders(); }, 15000); return () => clearInterval(interval); }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await apiClient.patch(`/orders/${id}/status`, { status });
      fetchOrders();
      presentToast({ message: "Estado actualizado", duration: 2000, color: "success" });
    } catch (e: any) {
      const msg = e.response?.data?.message || "Error al actualizar";
      presentToast({ message: msg, duration: 4000, color: "danger" });
      fetchOrders(); 
    }
  };

  const cloneOrder = async (id: string) => {
    try {
      await apiClient.post(`/orders/${id}/clone`);
      fetchOrders();
      setTab("activos");
      presentToast({ message: "Pedido clonado exitosamente", duration: 2000, color: "success" });
    } catch (e: any) {
      presentToast({ message: "Error al clonar", duration: 3000, color: "danger" });
    }
  };

  const openPaymentAlert = (order: Order) => {
    if (order.status === OrderStatus.CANCELED) return;
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    const totalBs = (remaining * exchangeRate).toFixed(2);
    presentAlert({
      header: "Confirmar Pago Móvil",
      subHeader: `Monto a cobrar: Bs. ${totalBs}`,
      inputs: [
        { name: "pagoMovilRef", type: "text", placeholder: "Referencia (Ej. 123456)" },
        { name: "pagoMovilPhone", type: "text", placeholder: "Teléfono Origen (Opcional)" },
        { name: "pagoMovilCedula", type: "text", placeholder: "Cédula (Opcional)" },
        { name: "pagoMovilBank", type: "text", placeholder: "Banco" },
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Confirmar Pago",
          handler: async (data: any) => {
            if (!data.pagoMovilRef || !data.pagoMovilBank) {
              presentToast({ message: "Referencia y Banco son obligatorios", duration: 3000, color: "warning" });
              return false;
            }
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                pagoMovilRef: data.pagoMovilRef,
                pagoMovilPhone: data.pagoMovilPhone,
                pagoMovilCedula: data.pagoMovilCedula,
                pagoMovilBank: data.pagoMovilBank,
                amountBs: parseFloat(totalBs),
                exchangeRate: exchangeRate
              });
              fetchOrders();
              presentToast({ message: "Pago registrado exitosamente", duration: 2000, color: "success" });
            } catch (e) {
              presentToast({ message: "Error al actualizar pago", duration: 3000, color: "danger" });
            }
          }
        }
      ]
    });
  };

  const openUSDPaymentAlert = (order: Order) => {
    if (order.status === OrderStatus.CANCELED) return;
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    presentAlert({
      header: "Confirmar Pago Divisas",
      subHeader: `Restante por cobrar: $${remaining.toFixed(2)}`,
      inputs: [
        { name: "usdReceived", type: "number", placeholder: "Monto entregado por el cliente ($)", min: remaining }
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Calcular y Confirmar",
          handler: async (data: any) => {
            const received = parseFloat(data.usdReceived);
            if (!received || received < remaining) {
              presentToast({ message: "El monto recibido debe ser mayor o igual al total", duration: 3000, color: "warning" });
              return false;
            }
            const changeUsd = received - remaining;
            const changeBs = changeUsd * exchangeRate;
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                notes: (order.notes ? order.notes + '\n' : '') + `Pago USD (Restante): $${remaining.toFixed(2)} | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`
              });
              fetchOrders();
              presentToast({ message: "Pago en USD registrado", duration: 2000, color: "success" });
            } catch (e: any) {
              presentToast({ message: "Error al registrar el pago", duration: 3000, color: "danger" });
            }
          }
        }
      ]
    });
  };

  
  // @ts-ignore
const translateStatus = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return "Pendiente";
      case OrderStatus.PREPARING: return "Preparando";
      case OrderStatus.DELIVERED: return "Entregado";
      case OrderStatus.CANCELED: return "Cancelado";
      default: return status;
    }
  };

  // @ts-ignore
const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return "warning";
      case OrderStatus.PREPARING: return "tertiary";
      case OrderStatus.DELIVERED: return "success";
      case OrderStatus.CANCELED: return "danger";
      default: return "medium";
    }
  };

  const filteredOrders = orders.filter(o => {
    const isActivo = o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING;
    const isHistorial = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED;
    const isPorCobrar = [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED;

    if (tab === "activos" && !isActivo) return false;
    if (tab === "por_cobrar" && !isPorCobrar) return false;
    if (tab === "historial" && !isHistorial) return false;

    if (searchText.trim() === "") return true;
    const search = searchText.toLowerCase();
    return (
      o.customerName.toLowerCase().includes(search) || 
      (o.id && o.id.toLowerCase().includes(search)) || 
      (o.notes && o.notes.toLowerCase().includes(search))
    );
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tablero de Pedidos</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => { fetchOrders(); fetchSettings(); }}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar color="success">
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="activos">
              <IonLabel>Activos</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="por_cobrar">
              <IonLabel>Por Cobrar</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="historial">
              <IonLabel>Historial</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
        <IonToolbar color="success">
          <IonSearchbar 
            value={searchText} 
            debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')} 
            placeholder="Buscar por cliente o ref..."
            animated 
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {filteredOrders.map(order => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={order.id}>
                <IonCard color={order.status === OrderStatus.DELIVERED ? "light" : (order.status === OrderStatus.CANCELED ? "medium" : "white")}>
                  <IonCardHeader style={{ position: 'relative', paddingRight: '70px' }}>
  <div>
    <IonCardTitle>{order.customerName}</IonCardTitle>
    <IonCardSubtitle>{new Date(order.createdAt).toLocaleString()}</IonCardSubtitle>
    {order.tableNumber && (<IonBadge color="primary" style={{ marginTop: '5px' }}>{order.tableNumber}</IonBadge>)}
  </div>
  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
    <IonButton fill="clear" size="small" onClick={() => handleCopyOrder(order)}>
      <IonIcon icon={copyOutline} slot="icon-only" />
    </IonButton>
    <IonButton fill="clear" size="small" onClick={() => showOrderInfo(order)}>
      <IonIcon icon={informationCircleOutline} slot="icon-only" />
    </IonButton>
  </div>
</IonCardHeader>

                  <IonCardContent>
                    <IonList lines="none" style={{ background: "transparent" }}>
                      {order.items.map((item: any) => (
                        <IonItem key={item.id} style={{ "--background": "transparent" }}>
                          <IonLabel>
                            <IonText color={order.status === OrderStatus.CANCELED ? "light" : "dark"}><b>{parseFloat(Number(item.quantity).toFixed(4))}x</b> {item.productName || item.product?.name || "Producto Desconocido"}</IonText>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>

                    {order.notes && (
                      <div style={{ background: order.status === OrderStatus.CANCELED ? "#666" : "#fff3cd", padding: "8px", borderRadius: "5px", fontSize: "0.85rem", color: order.status === OrderStatus.CANCELED ? "white" : "#856404", marginBottom: "10px" }}>
                        {order.notes}
                      </div>
                    )}

                    <hr />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
                      <div>
                        {(order.deliveryFee || 0) > 0 && <div style={{ fontSize: "0.8rem", color: order.status === OrderStatus.CANCELED ? "white" : "gray" }}>+ $ {(order.deliveryFee || 0).toFixed(2)} Delivery</div>}
                        <h3 style={{ margin: 0, fontWeight: "bold" }}>Total: ${order.totalAmount.toFixed(2)}</h3>
                      </div>
                      
                      {order.paymentStatus === PaymentStatus.PARTIAL ? (
                          <IonBadge color="warning">Abono Parcial</IonBadge>
                        ) : order.paymentStatus === PaymentStatus.PAID ? (
                        <IonBadge color="success">Pagado</IonBadge>
                      ) : order.paymentStatus === PaymentStatus.REFUNDED ? (
                        <IonBadge color="dark">Reembolsado</IonBadge>
                      ) : order.status !== OrderStatus.CANCELED ? (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <IonButton size="small" color="tertiary" onClick={() => openUSDPaymentAlert(order)}>
                            Cobrar (USD)
                          </IonButton>
                          <IonButton size="small" color="danger" onClick={() => openPaymentAlert(order)}>
                            Cobrar (PM)
                          </IonButton>
                        </div>
                      ) : null}
                    </div>

                    {order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.DELIVERED && (
                      <div className="ion-margin-top" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        
                        
                        <IonButton style={{ flex: 1 }} color="success" onClick={() => updateStatus(order.id, OrderStatus.DELIVERED)}>
                          Entregar Pedido
                        </IonButton>
                        <div style={{ width: '100%', textAlign: 'center', marginTop: '5px' }}>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => updateStatus(order.id, OrderStatus.CANCELED)}>
                            Cancelar Pedido
                          </IonButton>
                        </div>
                      </div>
                    )}

                    {(order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) && (
                      <IonButton expand="block" color="primary" fill="outline" className="ion-margin-top" onClick={() => cloneOrder(order.id)}>
                        Clonar / Repetir Pedido
                      </IonButton>
                    )}
                  
  {(order.abonosTotal || 0) > 0 && (
    <div style={{ marginTop: '10px' }}>
      <IonBadge color="primary">Abonos: $ {(order.abonosTotal || 0).toFixed(2)}</IonBadge>
      <IonBadge color="warning" style={{ marginLeft: '5px' }}>Restante: $ {(order.totalAmount - (order.abonosTotal || 0)).toFixed(2)}</IonBadge>
    </div>
  )}
</IonCardContent>
                </IonCard>
              </IonCol>
            ))}
            
            {filteredOrders.length === 0 && (
              <IonCol size="12" className="ion-text-center">
                <p>No hay pedidos en esta vista.</p>
              </IonCol>
            )}
          </IonRow>
        </IonGrid>

        

      
      <IonModal isOpen={!!selectedOrderForDetails} onDidDismiss={() => setSelectedOrderForDetails(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Detalles del Pedido</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSelectedOrderForDetails(null)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedOrderForDetails && (
            <>
              <h3>Cliente: {selectedOrderForDetails.customerName}</h3>
              <p>Total del Pedido: <strong>${selectedOrderForDetails.totalAmount.toFixed(2)}</strong></p>
              
              <IonList>
                {selectedOrderForDetails.items.map((item: any, idxx: number) => (
                  <IonItem key={item.id || idxx}>
                    <IonLabel>
                      {parseFloat(Number(item.quantity).toFixed(4))}x {item.productName || item.product?.name}
                    </IonLabel>
                    <IonText color="primary">{item.subtotal ? "$"+item.subtotal.toFixed(2) : ''}</IonText>
                  </IonItem>
                ))}
              </IonList>

              <div style={{ marginTop: '20px' }}>
                <h4>Abonos Realizados:</h4>
                <IonList>
                  {(selectedOrderForDetails.abonosHistory || []).map((abono: any, idx: number) => (
                    <IonItem key={abono.id || idx}>
                      <IonLabel>
                        Abono de <strong>${abono.amount.toFixed(2)}</strong>
                        <p>{new Date(abono.date).toLocaleString()}</p>
                      </IonLabel>
                      <IonButton color="danger" fill="clear" onClick={() => handleRevertAbono(idx)}>
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonButton>
                    </IonItem>
                  ))}
                  {(!selectedOrderForDetails.abonosHistory || selectedOrderForDetails.abonosHistory.length === 0) && (
                    <p style={{ color: 'gray' }}>No hay abonos registrados.</p>
                  )}
                </IonList>
              </div>

              {[PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(selectedOrderForDetails.paymentStatus) && settings?.allowPartialPayments && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                  <h4>Registrar Nuevo Abono</h4>
                  <IonItem>
                    <IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>Monto del Abono</span>
                        <IonSelect value={abonoCurrency} onIonChange={e => setAbonoCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
                          <IonSelectOption value="USD">$ USD</IonSelectOption>
                          <IonSelectOption value="VES">Bs. VES</IonSelectOption>
                        </IonSelect>
                      </IonLabel>
                      <IonInput type="number" value={abonoAmount} onIonInput={e => setAbonoAmount(e.detail.value!)} placeholder={abonoCurrency === 'USD' ? "Ej. 5.00" : "Ej. 200.00"} />
                  </IonItem>
                  <IonButton expand="block" onClick={handleAddAbono} disabled={!abonoAmount} className="ion-margin-top">
                    Agregar Abono
                  </IonButton>
                </div>
              )}
            </>
          )}
        </IonContent>
      </IonModal>
  
      </IonContent>
    </IonPage>
  );
};
export default Orders;



