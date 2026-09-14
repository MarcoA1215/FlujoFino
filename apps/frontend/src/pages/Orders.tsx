import { refreshOutline } from 'ionicons/icons';
ï»¿import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonButton, IonList, IonLabel, IonBadge, useIonToast, useIonAlert, IonText, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSearchbar, IonIcon } from '@ionic/react';
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
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"activos" | "por_cobrar" | "historial">("activos");
  const [searchText, setSearchText] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

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
    const totalBs = (order.totalAmount * exchangeRate).toFixed(2);
    presentAlert({
      header: "Confirmar Pago MÃ³vil",
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
    presentAlert({
      header: "Confirmar Pago Divisas",
      subHeader: `Total del pedido: $${order.totalAmount.toFixed(2)}`,
      inputs: [
        { name: "usdReceived", type: "number", placeholder: "Monto entregado por el cliente ($)", min: order.totalAmount }
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Calcular y Confirmar",
          handler: async (data: any) => {
            const received = parseFloat(data.usdReceived);
            if (!received || received < order.totalAmount) {
              presentToast({ message: "El monto recibido debe ser mayor o igual al total", duration: 3000, color: "warning" });
              return false;
            }
            const changeUsd = received - order.totalAmount;
            const changeBs = changeUsd * exchangeRate;
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                notes: `MÃ‰TODO: Divisas (USD) | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`
              });
              fetchOrders();
              presentAlert({
                header: "Pago Confirmado",
                message: `Dar Vuelto: <br><br><b>$${changeUsd.toFixed(2)}</b> Ã³ <br><b>Bs. ${changeBs.toFixed(2)}</b>`,
                buttons: ["OK"]
              });
            } catch (e) {
              presentToast({ message: "Error al actualizar pago", duration: 3000, color: "danger" });
            }
          }
        }
      ]
    });
  };

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
    const isPorCobrar = o.paymentStatus === PaymentStatus.PENDING && o.status !== OrderStatus.CANCELED;

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
          <IonButtons slot="end"><IonButton onClick={fetchOrders}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
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
            {paginatedOrders.map(order => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={order.id}>
                <IonCard color={order.status === OrderStatus.DELIVERED ? "light" : (order.status === OrderStatus.CANCELED ? "medium" : "white")}>
                  <IonCardHeader>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <IonCardTitle>{order.customerName}</IonCardTitle>
                      <IonBadge color={getStatusColor(order.status)}>{order.status}</IonBadge>
                    </div>
                    <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem", color: order.status === OrderStatus.CANCELED ? "white" : "gray" }}>
                      Hora: {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                    {order.deliveryMethod && (
                      <div style={{ marginTop: "10px" }}>
                        <IonBadge color={order.deliveryMethod === DeliveryMethod.DELIVERY ? "tertiary" : "medium"}>
                          {order.deliveryMethod === DeliveryMethod.DELIVERY ? "Delivery" : (order.deliveryMethod === DeliveryMethod.PICKUP ? "Pickup" : "Local")}
                        </IonBadge>
                        {order.deliveryMethod === DeliveryMethod.DELIVERY && order.deliveryZone && (
                          <IonBadge color="primary" style={{ marginLeft: "5px" }}>{order.deliveryZone.name}</IonBadge>
                        )}
                      </div>
                    )}
                    {(order.deliveryMethod === DeliveryMethod.DELIVERY || order.deliveryMethod === DeliveryMethod.PICKUP) && order.customerAddress && (
                      <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem" }}><strong>Dir/Ref:</strong> {order.customerAddress}</p>
                    )}
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
                      
                      {order.paymentStatus === PaymentStatus.PAID ? (
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

                    {order.status !== OrderStatus.CANCELED && (
                      <IonItem className="ion-margin-top" lines="none" style={{ "--background": "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
                        <IonLabel position="stacked">Estado</IonLabel>
                        <IonSelect value={order.status} onIonChange={e => updateStatus(order.id, e.detail.value)}>
                          <IonSelectOption value={OrderStatus.PENDING}>Pendiente</IonSelectOption>
                          <IonSelectOption value={OrderStatus.PREPARING}>Preparando</IonSelectOption>
                          <IonSelectOption value={OrderStatus.DELIVERED}>Entregado</IonSelectOption>
                          <IonSelectOption value={OrderStatus.CANCELED}>Cancelar Pedido</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    )}

                    {(order.status === OrderStatus.CANCELED || order.status === OrderStatus.DELIVERED) && (
                      <IonButton expand="block" color="primary" fill="outline" className="ion-margin-top" onClick={() => cloneOrder(order.id)}>
                        Clonar / Repetir Pedido
                      </IonButton>
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

        <IonInfiniteScroll onIonInfinite={loadMore} disabled={displayCount >= filteredOrders.length}>
          <IonInfiniteScrollContent loadingText="Cargando más..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

      </IonContent>
    </IonPage>
  );
};
export default Orders;


