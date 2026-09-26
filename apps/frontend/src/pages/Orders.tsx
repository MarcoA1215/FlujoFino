// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonBadge,
  useIonToast,
  useIonAlert,
  useIonRouter,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  refreshOutline,
  copyOutline,
  informationCircleOutline,
  trashOutline,
  createOutline,
  personOutline,
  imageOutline,
  logoWhatsapp,
  searchOutline,
  closeOutline,
  checkmarkCircleOutline,
  cardOutline,
  cashOutline,
  phonePortraitOutline,
  bicycleOutline,
  storefrontOutline,
  timeOutline,
  cartOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { OrderStatus, PaymentStatus, DeliveryMethod } from '@nutrideli/shared-types';
import type { DeliveryZone } from '../types';
import { useImageViewer } from '../context/ImageViewerContext';
import AppHeader from '../components/AppHeader';

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
  paymentMethod?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  amountBs?: number;
  notes?: string;
  tableNumber?: string;
  items: OrderItem[];
  createdAt: string;
  deliveryMethod?: DeliveryMethod;
  deliveryZone?: DeliveryZone;
  deliveryFee?: number;
  abonosTotal?: number;
  abonosHistory?: any[];
  employeeId?: string;
  employee?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    jobTitle?: string;
  };
};

const Orders: React.FC = () => {
  const router = useIonRouter();
  const { openImage } = useImageViewer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'activos' | 'por_cobrar' | 'historial'>('activos');
  const [searchText, setSearchText] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [selectedOrderForPartial, setSelectedOrderForPartial] = useState<any>(null);
  const [partialDeliveries, setPartialDeliveries] = useState<{ [key: string]: number }>({});
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoCurrency, setAbonoCurrency] = useState<'USD' | 'VES'>('USD');
  const [settings, setSettings] = useState<any>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('');

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get<Order[]>('/orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setOrders([]);
      presentToast({ message: 'Error cargando pedidos', duration: 3000, color: 'danger' });
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get<any>('/settings');
      setSettings(res.data || {});
      if (res.data?.exchangeRateBs && Number(res.data.exchangeRateBs) > 0) {
        setExchangeRate(Number(res.data.exchangeRateBs));
      }
    } catch (e) {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get<any[]>('/users/employees');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchSettings();
    fetchEmployees();
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status });
      setOrders(orders.map(o => (o.id === orderId ? { ...o, status } : o)));
      presentToast({ message: 'Estado actualizado', duration: 2000, color: 'success' });
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al cambiar estado', duration: 3000, color: 'danger' });
    }
  };

  const cloneOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    router.push('/pos', 'root', 'replace');
    window.location.href = `/pos?cloneId=${orderId}`;
  };

  const openPaymentAlert = (order: Order) => {
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    const remainingBs = (remaining * exchangeRate).toFixed(2);

    presentAlert({
      header: 'Cobrar Pedido',
      subHeader: `Saldo pendiente: $${remaining.toFixed(2)} (Bs. ${remainingBs})`,
      message: 'Selecciona cómo realizó el pago el cliente:',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: '📱 Pago Móvil',
          handler: () => openPagoMovilAlert(order)
        },
        {
          text: '💳 Punto de Venta',
          handler: () => openPuntoAlert(order)
        },
        {
          text: '💵 Divisas USD',
          handler: () => openUSDPaymentAlert(order)
        }
      ]
    });
  };

  const openPagoMovilAlert = (order: Order) => {
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    const totalBs = (remaining * exchangeRate).toFixed(2);
    presentAlert({
      header: 'Confirmar Pago Móvil',
      subHeader: `Monto a transferir: Bs. ${totalBs}`,
      inputs: [
        { name: 'pmRef', type: 'text', placeholder: 'N° de Referencia *' },
        { name: 'pmBank', type: 'text', placeholder: 'Banco emisor (ej. Banesco)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Pago',
          handler: async (data: any) => {
            if (!data.pmRef) {
              presentToast({ message: 'La referencia es obligatoria', duration: 3000, color: 'warning' });
              return false;
            }
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                paymentMethod: 'PAGO_MOVIL',
                pagoMovilRef: data.pmRef,
                pagoMovilBank: data.pmBank || 'Pago Móvil',
                amountBs: parseFloat(totalBs),
                exchangeRate
              });
              fetchOrders();
              presentToast({ message: 'Pago registrado con éxito', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error registrando pago', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openPuntoAlert = (order: Order) => {
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    const totalBs = (remaining * exchangeRate).toFixed(2);
    presentAlert({
      header: 'Confirmar Punto de Venta',
      subHeader: `Monto a cobrar: Bs. ${totalBs}`,
      inputs: [
        { name: 'puntoRef', type: 'text', placeholder: 'N° de Aprobación del Voucher *' },
        { name: 'puntoBank', type: 'text', placeholder: 'Banco del Punto (Opcional)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Pago',
          handler: async (data: any) => {
            if (!data.puntoRef) {
              presentToast({ message: 'El N° de Aprobación es obligatorio', duration: 3000, color: 'warning' });
              return false;
            }
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                paymentMethod: 'PUNTO',
                pagoMovilRef: data.puntoRef,
                pagoMovilBank: data.puntoBank || 'Punto de Venta',
                amountBs: parseFloat(totalBs),
                exchangeRate
              });
              fetchOrders();
              presentToast({ message: 'Pago registrado con éxito', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error registrando pago', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openUSDPaymentAlert = (order: Order) => {
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    presentAlert({
      header: 'Confirmar Efectivo USD',
      subHeader: `Restante por cobrar: $${remaining.toFixed(2)}`,
      inputs: [
        { name: 'usdReceived', type: 'number', placeholder: 'Monto recibido ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async (data: any) => {
            const received = parseFloat(data.usdReceived);
            if (!received || received < remaining) {
              presentToast({ message: 'El monto recibido debe ser mayor o igual al saldo', duration: 3000, color: 'warning' });
              return false;
            }
            const changeUsd = received - remaining;
            const changeBs = changeUsd * exchangeRate;
            try {
              await apiClient.patch(`/orders/${order.id}/payment`, {
                status: PaymentStatus.PAID,
                paymentMethod: 'USD',
                notes: (order.notes ? order.notes + '\n' : '') + `Pago USD: $${remaining.toFixed(2)} | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`
              });
              fetchOrders();
              presentToast({ message: 'Pago en USD registrado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error registrando pago', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const counts = useMemo(() => {
    if (!Array.isArray(orders)) return { activos: 0, porCobrar: 0, historial: 0 };
    const activos = orders.filter(o => o && (o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING)).length;
    const porCobrar = orders.filter(o => o && [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED).length;
    const historial = orders.filter(o => o && (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED)).length;
    return { activos, porCobrar, historial };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(o => {
      if (!o) return false;
      const isActivo = o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING;
      const isHistorial = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED;
      const isPorCobrar = [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED;

      if (tab === 'activos' && !isActivo) return false;
      if (tab === 'por_cobrar' && !isPorCobrar) return false;
      if (tab === 'historial' && !isHistorial) return false;

      if (selectedEmployeeFilter && o.employeeId !== selectedEmployeeFilter && o.employee?.id !== selectedEmployeeFilter) {
        return false;
      }

      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      const custName = String(o.customerName || '').toLowerCase();
      const orderId = String(o.id || '').toLowerCase();
      const notes = String(o.notes || '').toLowerCase();
      const empUser = String(o.employee?.username || '').toLowerCase();
      const empName = String(o.employee?.name || '').toLowerCase();
      return (
        custName.includes(q) ||
        orderId.includes(q) ||
        notes.includes(q) ||
        empUser.includes(q) ||
        empName.includes(q)
      );
    });
  }, [orders, tab, searchText, selectedEmployeeFilter]);

  return (
    <IonPage>
      <AppHeader title="Pedidos" onRefresh={() => { fetchOrders(); fetchSettings(); fetchEmployees(); }} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>

          {/* Search Pill */}
          <div className="ff-search-pill" style={{ marginBottom: '14px' }}>
            <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Buscar por cliente, empleado o pedido..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {searchText && (
              <IonIcon
                icon={closeOutline}
                style={{ fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
                onClick={() => setSearchText('')}
              />
            )}
          </div>

          {/* Segment Filter Chips & Employee Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <div className="ff-chips-container" style={{ padding: 0, margin: 0 }}>
              <button
                type="button"
                className={`ff-chip ${tab === 'activos' ? 'active' : ''}`}
                onClick={() => setTab('activos')}
              >
                Activos ({counts.activos})
              </button>
              <button
                type="button"
                className={`ff-chip ${tab === 'por_cobrar' ? 'active' : ''}`}
                onClick={() => setTab('por_cobrar')}
              >
                Por Cobrar ({counts.porCobrar})
              </button>
              <button
                type="button"
                className={`ff-chip ${tab === 'historial' ? 'active' : ''}`}
                onClick={() => setTab('historial')}
              >
                Historial ({counts.historial})
              </button>
            </div>

            {/* Employee Filter */}
            {employees.length > 0 && (
              <select
                value={selectedEmployeeFilter}
                onChange={e => setSelectedEmployeeFilter(e.target.value)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: 'var(--ff-shadow-sm)'
                }}
              >
                <option value="">Todos los empleados</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.username || emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Orders Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {filteredOrders.map(order => {
              if (!order) return null;
              const isDelivered = order.status === OrderStatus.DELIVERED;
              const isCanceled = order.status === OrderStatus.CANCELED;
              const isPreparing = order.status === OrderStatus.PREPARING;
              const isPending = order.status === OrderStatus.PENDING;

              const isPaid = order.paymentStatus === PaymentStatus.PAID;
              const isPartial = order.paymentStatus === PaymentStatus.PARTIAL;

              const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
              const shortId = String(order.id || '').slice(0, 8).toUpperCase();
              const formattedDate = (() => {
                if (!order.createdAt) return '';
                try {
                  const d = new Date(order.createdAt);
                  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                } catch {
                  return '';
                }
              })();

              const orderItems = Array.isArray(order.items) ? order.items : [];
              const totalUsd = Number(order.totalAmount || 0);
              const totalBs = (totalUsd * (Number(exchangeRate) || 40)).toFixed(2);

              return (
                <div
                  key={order.id || Math.random()}
                  className="ff-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                  }}
                >
                  <div>
                    {/* Top Row: Customer & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{order.customerName || 'Cliente General'}</span>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${order.customerName || 'Cliente'}, te escribimos respecto a tu pedido #${shortId}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#10B981', display: 'inline-flex' }}
                              title="Chat WhatsApp"
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '18px' }} />
                            </a>
                          )}
                        </div>
                        {formattedDate && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {formattedDate}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`ff-pill ${isDelivered ? 'ff-pill-online' : (isPreparing ? 'ff-pill-rate' : (isCanceled ? 'ff-pill-danger' : 'ff-pill-sync'))}`}
                        style={{ fontSize: '11px', padding: '3px 10px' }}
                      >
                        <span
                          className="ff-pill-dot"
                          style={{ background: isDelivered ? '#10B981' : (isPreparing ? '#3B82F6' : (isCanceled ? '#EF4444' : '#F59E0B')) }}
                        />
                        <span>{order.status || 'PENDING'}</span>
                      </div>
                    </div>

                    {/* Meta Pills (Table / Delivery / Employee) */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {order.tableNumber && (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#0F172A' }}>
                          Mesa {order.tableNumber}
                        </span>
                      )}
                      {order.deliveryMethod && (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={order.deliveryMethod === DeliveryMethod.DELIVERY ? bicycleOutline : storefrontOutline} />
                          {order.deliveryMethod}
                        </span>
                      )}
                      {order.employee && typeof order.employee === 'object' && (
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={personOutline} />
                          {order.employee.username || order.employee.name || 'Personal'}
                        </span>
                      )}
                    </div>

                    {/* Items List */}
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                      {orderItems.map((it, idx) => {
                        if (!it) return null;
                        const pName = it.productName || it.product?.name || 'Producto';
                        const qty = Number(it.quantity) || 1;
                        const uPrice = Number(it.unitPrice) || 0;
                        return (
                          <div key={it.id || idx} style={{ fontSize: '13px', color: '#334155', padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{qty}x {pName}</span>
                            <span style={{ fontWeight: '600', color: '#0F172A' }}>
                              ${(uPrice * qty).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                      {orderItems.length === 0 && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Sin desglose de items
                        </div>
                      )}
                    </div>

                    {/* Price & Payment Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>
                          ${totalUsd.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Bs. {totalBs}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: isPaid ? '#ECFDF5' : (isPartial ? '#FFFBEB' : '#FEF2F2'),
                          color: isPaid ? '#047857' : (isPartial ? '#92400E' : '#B91C1C')
                        }}
                      >
                        {isPaid ? '✓ Pagado' : (isPartial ? 'Abono Parcial' : '⏳ Por Cobrar')}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                    {!isPaid && !isCanceled && (
                      <button
                        type="button"
                        onClick={() => openPaymentAlert(order)}
                        className="ff-btn-primary"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                      >
                        <IonIcon icon={cashOutline} />
                        Cobrar
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order.id, OrderStatus.PREPARING)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #93C5FD',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Preparar
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order.id, OrderStatus.DELIVERED)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #A7F3D0',
                          background: '#ECFDF5',
                          color: '#065F46',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Completar ✓
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDetails(order)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        background: '#F1F5F9',
                        color: '#0F172A',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Detalles
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
              <IonIcon icon={cartOutline} style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '8px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                No hay pedidos en esta vista
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                Prueba cambiando de pestaña o buscando por otro cliente.
              </p>
            </div>
          )}

        </div>

        {/* Order Details Modal */}
        <IonModal isOpen={!!selectedOrderForDetails} onDidDismiss={() => setSelectedOrderForDetails(null)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                Detalles del Pedido
              </h2>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
              {selectedOrderForDetails && (
                <div style={{ padding: '20px' }}>
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                      {selectedOrderForDetails.customerName || 'Cliente General'}
                    </div>
                    {selectedOrderForDetails.customerPhone && (
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                        📞 {selectedOrderForDetails.customerPhone}
                      </div>
                    )}
                    {selectedOrderForDetails.customerAddress && (
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                        📍 {selectedOrderForDetails.customerAddress}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      Atendido por: <b>{selectedOrderForDetails.employee?.username || selectedOrderForDetails.employee?.name || 'Sin asignar'}</b>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                    Productos y Servicios
                  </h4>
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                    {Array.isArray(selectedOrderForDetails.items) && selectedOrderForDetails.items.map((it, idx) => {
                      if (!it) return null;
                      const pName = it.productName || it.product?.name || 'Producto';
                      const qty = Number(it.quantity) || 1;
                      const uPrice = Number(it.unitPrice) || 0;
                      return (
                        <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EEF2F6', fontSize: '13px' }}>
                          <span>{qty}x {pName}</span>
                          <span style={{ fontWeight: '700', color: '#0F172A' }}>
                            ${(uPrice * qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '2px dashed #E2E8F0', fontWeight: '800', fontSize: '16px', color: '#10B981' }}>
                      <span>Total:</span>
                      <span>${Number(selectedOrderForDetails.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedOrderForDetails.notes && (
                    <div style={{ background: '#F1F5F9', borderRadius: '12px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                      <b>Notas:</b> {selectedOrderForDetails.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedOrderForDetails.status !== OrderStatus.CANCELED && (
                      <button
                        type="button"
                        onClick={() => {
                          updateStatus(selectedOrderForDetails.id, OrderStatus.CANCELED);
                          setSelectedOrderForDetails(null);
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #FCA5A5',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar Pedido
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default Orders;
