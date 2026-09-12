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
  IonButton,
  IonList,
  IonLabel,
  IonBadge,
  useIonToast,
  useIonAlert,
  IonText,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
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
  const [presentToast] = useIonToast();

  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [presentAlert] = useIonAlert();

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get<Order[]>('/orders');
      setOrders(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando pedidos', duration: 3000, color: 'danger' });
    }
  };

  const fetchRate = async () => {
    try {
      const res = await apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate');
      setExchangeRate(res.data.exchangeRateBs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRate();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      await apiClient.patch(`/orders/${id}/status`, { status: newStatus });
      fetchOrders();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al actualizar estado';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    }
  };

  const openPaymentAlert = (order: Order) => {
    const totalBs = (order.totalAmount * exchangeRate).toFixed(2);
    
    presentAlert({
      header: 'Confirmar Pago Móvil',
      subHeader: `Monto a cobrar: Bs. ${totalBs}`,
      inputs: [
        { name: 'pagoMovilRef', type: 'text', placeholder: 'Referencia (Ej. 123456)' },
        { name: 'pagoMovilPhone', type: 'text', placeholder: 'Teléfono Origen' },
        { name: 'pagoMovilCedula', type: 'text', placeholder: 'Cédula' },
        { name: 'pagoMovilBank', type: 'text', placeholder: 'Banco' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Pago',
          handler: async (data: any) => {
            if (!data.pagoMovilRef || !data.pagoMovilPhone || !data.pagoMovilCedula || !data.pagoMovilBank) {
              presentToast({ message: 'Todos los datos son obligatorios', duration: 3000, color: 'warning' });
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
              presentToast({ message: 'Pago registrado exitosamente', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al actualizar pago', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openUSDPaymentAlert = (order: Order) => {
    presentAlert({
      header: 'Confirmar Pago Divisas',
      subHeader: `Total del pedido: $${order.totalAmount.toFixed(2)}`,
      inputs: [
        { name: 'usdReceived', type: 'number', placeholder: 'Monto entregado por el cliente ($)', min: order.totalAmount }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Calcular y Confirmar',
          handler: async (data: any) => {
            const received = parseFloat(data.usdReceived);
            if (!received || received < order.totalAmount) {
              presentToast({ message: 'El monto recibido debe ser mayor o igual al total', duration: 3000, color: 'warning' });
              return false;
            }
            const changeUsd = received - order.totalAmount;
            const changeBs = changeUsd * exchangeRate;
            
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                notes: `MÉTODO: Divisas (USD) | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`
              });
              fetchOrders();
              presentAlert({
                header: 'Pago Confirmado',
                message: `Dar Vuelto: <br><br><b>$${changeUsd.toFixed(2)}</b> ó <br><b>Bs. ${changeBs.toFixed(2)}</b>`,
                buttons: ['OK']
              });
            } catch (e) {
              presentToast({ message: 'Error al actualizar pago', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return 'warning';
      case OrderStatus.PREPARING: return 'tertiary';
      case OrderStatus.DELIVERED: return 'success';
      case OrderStatus.CANCELED: return 'danger';
      default: return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tablero de Pedidos (Cocina / Despacho)</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {orders.map(order => (
              <IonCol size="12" sizeMd="6" sizeLg="4" key={order.id}>
                <IonCard color={order.status === OrderStatus.DELIVERED ? 'light' : 'white'}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <IonCardTitle>{order.customerName}</IonCardTitle>
                      <IonBadge color={getStatusColor(order.status)}>{order.status}</IonBadge>
                    </div>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'gray' }}>
                      Hora: {new Date(order.createdAt).toLocaleTimeString()}
                    </p>

                    {order.deliveryMethod && (
                      <div style={{ marginTop: '10px' }}>
                        <IonBadge color={order.deliveryMethod === DeliveryMethod.DELIVERY ? 'tertiary' : 'medium'}>
                          {order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Delivery' : (order.deliveryMethod === DeliveryMethod.PICKUP ? 'Pickup' : 'Local')}
                        </IonBadge>
                        {order.deliveryMethod === DeliveryMethod.DELIVERY && order.deliveryZone && (
                          <IonBadge color="primary" style={{ marginLeft: '5px' }}>{order.deliveryZone.name}</IonBadge>
                        )}
                      </div>
                    )}
                    {(order.deliveryMethod === DeliveryMethod.DELIVERY || order.deliveryMethod === DeliveryMethod.PICKUP) && order.customerAddress && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}><strong>Dir/Ref:</strong> {order.customerAddress}</p>
                    )}

                  </IonCardHeader>

                  <IonCardContent>
                    <IonList lines="none" style={{ background: 'transparent' }}>
                      {order.items.map((item: any) => (
                        <IonItem key={item.id} style={{ '--background': 'transparent' }}>
                          <IonLabel>
                            <IonText color="dark"><b>{item.quantity}x</b> {item.productName || item.product?.name || 'Producto Desconocido'}</IonText>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>

                    {order.notes && (
                      <div style={{ background: '#fff3cd', padding: '8px', borderRadius: '5px', fontSize: '0.85rem', color: '#856404', marginBottom: '10px' }}>
                        {order.notes}
                      </div>
                    )}

                    <hr />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                      
                      <div>
                        {(order.deliveryFee || 0) > 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>+ $ {(order.deliveryFee || 0).toFixed(2)} Delivery</div>}
                        <h3 style={{ margin: 0, fontWeight: 'bold' }}>Total: ${order.totalAmount.toFixed(2)}</h3>
                      </div>

                      {order.paymentStatus === PaymentStatus.PAID ? (
                        <IonBadge color="success">Pagado</IonBadge>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <IonButton size="small" color="tertiary" onClick={() => openUSDPaymentAlert(order)}>
                            Cobrar (USD)
                          </IonButton>
                          <IonButton size="small" color="danger" onClick={() => openPaymentAlert(order)}>
                            Cobrar (PM)
                          </IonButton>
                        </div>
                      )}
                    </div>

                    <IonItem className="ion-margin-top" lines="none" style={{ '--background': 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <IonLabel position="stacked">Fase (Cocina)</IonLabel>
                      <IonSelect value={order.status} onIonChange={e => updateStatus(order.id, e.detail.value)}>
                        <IonSelectOption value={OrderStatus.PENDING}>Pendiente</IonSelectOption>
                        <IonSelectOption value={OrderStatus.PREPARING}>Preparando</IonSelectOption>
                        <IonSelectOption value={OrderStatus.DELIVERED}>Entregado</IonSelectOption>
                        <IonSelectOption value={OrderStatus.CANCELED}>Cancelado</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
            
            {orders.length === 0 && (
              <IonCol size="12" className="ion-text-center">
                <p>No hay pedidos activos.</p>
              </IonCol>
            )}
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Orders;
