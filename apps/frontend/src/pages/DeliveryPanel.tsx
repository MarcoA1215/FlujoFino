import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonButton,
  IonIcon,
  useIonToast,
} from '@ionic/react';
import { refreshOutline, callOutline, mapOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AppHeader } from '../components/AppHeader';
import { apiClient } from '../api/client';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryZone: string;
  deliveryFeeUSD: number;
  deliveryFeeBS: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  deliveredAt: string;
}

interface ActiveDeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryZone: string;
  deliveryFeeUSD: number;
  deliveryFeeBS: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  items?: { name: string; quantity: number }[];
  createdAt: string;
}

interface MyDeliveryHistory {
  completedCount: number;
  activeCount?: number;
  totalFletesUSD: number;
  totalFletesBS: number;
  exchangeRate: number;
  activeOrders?: ActiveDeliveryOrder[];
  orders: DeliveryOrder[];
}

const DeliveryPanel: React.FC = () => {
  const [history, setHistory] = useState<MyDeliveryHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [presentToast] = useIonToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<MyDeliveryHistory>('/deliveries/my-history');
      setHistory(res.data);
    } catch (e: any) {
      presentToast({
        message: 'Error al cargar historial: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <IonPage>
      <AppHeader title="Panel de Repartidor" />
      <IonContent className="ion-padding ff-has-bottom-nav" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '90px' }}>
          {/* Tarjetas de Resumen */}
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              <IonCol size="12" sizeMd="6">
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    color: 'white',
                    marginBottom: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>
                      Ganancia en Fletes
                    </span>
                    <IonButton fill="clear" size="small" onClick={fetchHistory} disabled={loading} style={{ color: '#38BDF8' }}>
                      <IonIcon icon={refreshOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '8px', color: '#38BDF8' }}>
                    ${history?.totalFletesUSD?.toFixed(2) || '0.00'} USD
                  </div>
                  <div style={{ fontSize: '15px', color: '#CBD5E1', marginTop: '4px', fontWeight: 600 }}>
                    Bs. {history?.totalFletesBS?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#94A3B8' }}>
                    Tasa activa: Bs. {history?.exchangeRate?.toFixed(2) || '40.00'} / USD
                  </div>
                </div>
              </IonCol>

              <IonCol size="12" sizeMd="6">
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '136px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ color: '#10B981', fontSize: '20px' }} />
                    Entregas Realizadas
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
                    {history?.completedCount || 0}
                  </div>
                  <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 600, marginTop: '4px' }}>
                    {history?.completedCount ? '¡Excelente trabajo en ruta!' : 'Listo para recibir entregas'}
                  </div>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* Pedidos Asignados Activos (PREPARING / IN_TRANSIT) */}
          <div style={{ marginTop: '10px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛵 Pedidos Activos Asignados</span>
                <IonBadge color={history?.activeOrders && history.activeOrders.length > 0 ? 'warning' : 'medium'}>
                  {history?.activeOrders?.length || 0}
                </IonBadge>
              </h3>
            </div>

            {!history?.activeOrders || history.activeOrders.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  No tienes pedidos pendientes de entrega asignados en este momento.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.activeOrders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: 'white',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '2px solid #38BDF8',
                      boxShadow: '0 2px 8px rgba(56, 189, 248, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                            Orden #{order.orderNumber}
                          </span>
                          <IonBadge color={order.status === 'IN_TRANSIT' ? 'tertiary' : 'warning'}>
                            {order.status === 'IN_TRANSIT' ? 'EN RUTA' : 'EN PREPARACIÓN'}
                          </IonBadge>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                          👤 {order.customerName}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: '#0284C7', fontSize: '15px' }}>
                          Flete: +${order.deliveryFeeUSD.toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                          Bs. {order.deliveryFeeBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {order.customerAddress && (
                      <div style={{ fontSize: '13px', color: '#334155', margin: '8px 0', padding: '8px 10px', background: '#F0F9FF', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <IonIcon icon={mapOutline} style={{ color: '#0284C7', fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong>Dirección de Entrega:</strong> {order.customerAddress} ({order.deliveryZone})
                        </div>
                      </div>
                    )}

                    {order.items && order.items.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                        📦 <strong>Contenido:</strong> {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <IonBadge color={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                          {order.paymentStatus === 'PAID' ? 'PAGADO' : 'COBRAR AL ENTREGAR'}
                        </IonBadge>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          Total: ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {order.customerPhone && (
                          <a
                            href={`tel:${order.customerPhone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <IonIcon icon={callOutline} />
                            Llamar ({order.customerPhone})
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Envíos */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Entregas Realizadas ({history?.orders?.length || 0})
              </h3>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Cargando entregas...</div>
            ) : !history?.orders || history.orders.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <IonIcon icon={mapOutline} style={{ fontSize: '48px', color: '#94A3B8' }} />
                <h4 style={{ margin: '12px 0 6px', fontWeight: 700, color: '#334155' }}>Sin entregas completadas</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Cuando el cajero te asigne un pedido y se marque como ENTREGADO, aparecerá aquí con su flete correspondiente.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.orders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: 'white',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                          Orden #{order.orderNumber}
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                          {order.customerName}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: '#0284C7', fontSize: '15px' }}>
                          +${order.deliveryFeeUSD.toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                          Bs. {order.deliveryFeeBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {order.customerAddress && (
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={mapOutline} style={{ color: '#0284C7', flexShrink: 0 }} />
                        <span>{order.customerAddress} ({order.deliveryZone})</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <IonBadge color={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                          {order.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                        </IonBadge>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          Total Orden: ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>

                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <IonIcon icon={callOutline} />
                          Llamar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DeliveryPanel;
