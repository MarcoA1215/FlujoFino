import React, { useEffect, useState, useMemo, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  useIonToast,
  useIonAlert,
  useIonRouter,
  IonModal,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import {
  personOutline,
  logoWhatsapp,
  searchOutline,
  closeOutline,
  cashOutline,
  bicycleOutline,
  storefrontOutline,
  cartOutline,
  cubeOutline,
  trashOutline,
  copyOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { OrderStatus, PaymentStatus, DeliveryMethod, UserRole } from '@finowork/shared-types';
import { normalizeBankName } from '../constants/banks';
import { BankSelect } from '../components/BankSelect';
import type { DeliveryZone } from '../types';
import { AuthContext } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import { formatWhatsAppUrl } from '../utils/whatsapp';
import { formatTime12h } from '../utils/time';
import { FiscalReceiptModal } from '../components/FiscalReceiptModal';
import { PartialDeliveryModal } from '../components/PartialDeliveryModal';

type OrderItem = {
  id: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  product?: {
    id?: string;
    name?: string;
  };
  unitPrice?: number;
  employeeId?: string;
  hasModifications?: boolean;
  removedIngredients?: string[];
  addedExtras?: Array<{
    name: string;
    quantity?: number;
    priceUSD?: number;
  }>;
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
  usdReceived?: number;
  changeAmount?: number;
  changeAmountBs?: number;
  changeMethod?: string;
  changeRef?: string;
  pagoMovilRef?: string;
  pagoMovilPhone?: string;
  pagoMovilCedula?: string;
  pagoMovilBank?: string;
  puntoRef?: string;
  puntoBank?: string;
  binanceRef?: string;
  transferRef?: string;
  transferBank?: string;
  amountBs?: number;
  exchangeRate?: number;
  notes?: string;
  tableNumber?: string;
  items: OrderItem[];
  createdAt: string;
  deliveryMethod?: DeliveryMethod;
  deliveryZone?: DeliveryZone;
  deliveryFee?: number;
  deliveryUserId?: string;
  deliveryUser?: {
    id: string;
    username: string;
    name?: string;
  };
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  abonosTotal?: number;
  abonosHistory?: any[];
  nextAbonoDueDate?: string | Date | null;
  requestedDeliveryDate?: string | Date;
  employeeId?: string;
  employee?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    jobTitle?: string;
  };
  paymentReported?: boolean;
  paymentProofUrl?: string;
  paymentRejectedReason?: string;
  linkedReservationId?: string;
  fiscalInvoiceId?: string;
  fiscalInvoiceNumber?: string;
  fiscalControlNumber?: string;
  fiscalStatus?: string;
  subtotalExempt?: number;
  taxableBase?: number;
  taxAmount?: number;
};

const Orders: React.FC = () => {
  const { user } = useContext(AuthContext);
  const isKitchen = user?.role === UserRole.KITCHEN;
  const router = useIonRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  const assignDeliveryDriver = async (orderId: string, deliveryUserId: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/assign-delivery`, { deliveryUserId });
      presentToast({ message: 'Repartidor asignado con éxito', duration: 2000, color: 'success' });
      fetchOrders();
      if (selectedOrderForDetails && selectedOrderForDetails.id === orderId) {
        const found = employees.find(e => e.id === deliveryUserId);
        setSelectedOrderForDetails((prev: any) => ({
          ...prev,
          deliveryUserId,
          deliveryUser: found ? { id: found.id, username: found.username, name: found.name } : null
        }));
      }
    } catch (e: any) {
      console.error(e);
      presentToast({
        message: 'Error al asignar repartidor: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    }
  };
  const [tab, setTab] = useState<'activos' | 'por_cobrar' | 'por_confirmar' | 'historial'>('activos');
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);
  const [currencySymbol, setCurrencySymbol] = useState<string>('Bs.');
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [selectedOrderForPartial, setSelectedOrderForPartial] = useState<any>(null);
  const [selectedOrderForAbono, setSelectedOrderForAbono] = useState<any>(null);
  const [selectedOrderForCobro, setSelectedOrderForCobro] = useState<Order | null>(null);
  const [cobroMethod, setCobroMethod] = useState<'USD' | 'PAGO_MOVIL' | 'PUNTO' | 'TRANSFER'>('USD');
  const [cobroUsdReceived, setCobroUsdReceived] = useState<string>('');
  const [cobroRef, setCobroRef] = useState<string>('');
  const [cobroBank, setCobroBank] = useState<string>('');
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoCurrency, setAbonoCurrency] = useState<'USD' | 'VES'>('USD');
  const [abonoMethod, setAbonoMethod] = useState<string>('USD');
  const [abonoRef, setAbonoRef] = useState<string>('');
  const [abonoBank, setAbonoBank] = useState<string>('');
  const [abonoNextDueDate, setAbonoNextDueDate] = useState<string>('');

  // Estados para Descuento en Abono
  const [abonoDiscountType, setAbonoDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [abonoDiscountValue, setAbonoDiscountValue] = useState<string>('');

  // Estados para Descuento en Cobro Directo
  const [cobroDiscountType, setCobroDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [cobroDiscountValue, setCobroDiscountValue] = useState<string>('');

  // Estados para Descuento en Detalle de Orden
  const [isEditingDetailsDiscount, setIsEditingDetailsDiscount] = useState<boolean>(false);
  const [detailsDiscountType, setDetailsDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [detailsDiscountValue, setDetailsDiscountValue] = useState<string>('');
  const [isSavingDetailsDiscount, setIsSavingDetailsDiscount] = useState<boolean>(false);

  const openAbonoModal = (order: Order | any) => {
    setSelectedOrderForAbono(order);
    setAbonoAmount('');
    setAbonoCurrency('USD');
    setAbonoMethod('USD');
    setAbonoRef('');
    setAbonoBank('');
    const nextD = new Date();
    nextD.setDate(nextD.getDate() + Math.max(1, Number(systemSettings?.abonoDefaultDueDays || 7)));
    const yyyy = nextD.getFullYear();
    const mm = String(nextD.getMonth() + 1).padStart(2, '0');
    const dd = String(nextD.getDate()).padStart(2, '0');
    setAbonoNextDueDate(`${yyyy}-${mm}-${dd}`);
    
    if (order.discountAmount && Number(order.discountAmount) > 0) {
      if (order.discountType && order.discountValue) {
        setAbonoDiscountType(order.discountType as any);
        setAbonoDiscountValue(Number(order.discountValue).toString());
      } else {
        setAbonoDiscountType('FIXED');
        setAbonoDiscountValue(Number(order.discountAmount).toString());
      }
    } else {
      setAbonoDiscountType('FIXED');
      setAbonoDiscountValue('');
    }
  };
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('');

  const employeesMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach(e => {
      const id = e.id || e.userId;
      if (id) {
        map[id] = e.name || e.username;
      }
    });
    return map;
  }, [employees]);

  const handleApprovePayment = async (orderId: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/approve-payment`);
      presentToast({ message: '✅ Pago verificado y aprobado con éxito', duration: 2500, color: 'success' });
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error aprobando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  // Estados y acciones para Facturación Fiscal SENIAT
  const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<any | null>(null);
  const [showFiscalReceiptModal, setShowFiscalReceiptModal] = useState<boolean>(false);
  const [isEmittingFiscal, setIsEmittingFiscal] = useState<boolean>(false);

  const handleViewFiscalReceipt = async (fiscalInvoiceId: string) => {
    try {
      const res = await apiClient.get(`/fiscal/invoices/${fiscalInvoiceId}`);
      if (res.data) {
        setActiveFiscalReceipt(res.data);
        setShowFiscalReceiptModal(true);
      }
    } catch (e: any) {
      console.error(e);
      presentToast({
        message: 'Error al consultar la factura fiscal: ' + (e.response?.data?.message || e.message),
        duration: 3500,
        color: 'danger'
      });
    }
  };

  const handleEmitFiscalInvoice = async (order: any) => {
    setIsEmittingFiscal(true);
    try {
      const res = await apiClient.post('/fiscal/invoices', {
        orderId: order.id,
        customerName: order.customerName,
        customerRif: order.pagoMovilCedula || 'V-00000000-0',
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
      });

      if (res.data) {
        presentToast({
          message: `✓ Comprobante con IVA #${res.data.invoiceNumber} generado con éxito`,
          duration: 3500,
          color: 'success'
        });

        // Actualizar orden en estado local
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, fiscalInvoiceId: res.data.id, fiscalStatus: res.data.status } : o));
        if (selectedOrderForDetails?.id === order.id) {
          setSelectedOrderForDetails((prev: any) => ({ ...prev, fiscalInvoiceId: res.data.id, fiscalStatus: res.data.status }));
        }

        setActiveFiscalReceipt(res.data);
        setShowFiscalReceiptModal(true);
      }
    } catch (e: any) {
      console.error(e);
      presentToast({
        message: 'Error al generar comprobante con IVA: ' + (e.response?.data?.message || e.message),
        duration: 4000,
        color: 'danger'
      });
    } finally {
      setIsEmittingFiscal(false);
    }
  };

  const handleCancelFiscalInvoice = async (fiscalInvoiceId: string) => {
    presentAlert({
      header: '¿Anular Comprobante con IVA?',
      message: 'Se generará una nota de ajuste/anulación en el control interno.',
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'Motivo de anulación (ej. Error en datos)',
          value: 'Devolución o anulación comercial'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Anulación',
          role: 'destructive',
          handler: async (data) => {
            try {
              await apiClient.post(`/fiscal/invoices/${fiscalInvoiceId}/cancel`, {
                reason: data.reason || 'Anulación solicitada por el cliente'
              });
              presentToast({
                message: `✓ Comprobante anulado en el control interno.`,
                duration: 3500,
                color: 'success'
              });
              if (selectedOrderForDetails) {
                setSelectedOrderForDetails((prev: any) => ({ ...prev, fiscalStatus: 'CANCELED' }));
              }
              setOrders(prev => prev.map(o => o.fiscalInvoiceId === fiscalInvoiceId ? { ...o, fiscalStatus: 'CANCELED' } : o));
            } catch (err: any) {
              console.error(err);
              presentToast({
                message: 'Error al anular factura: ' + (err.response?.data?.message || err.message),
                duration: 4000,
                color: 'danger'
              });
            }
          }
        }
      ]
    });
  };

  const handleOpenTicket = async (order: any) => {
    if (!order) return;
    if (order.fiscalInvoiceId) {
      await handleViewFiscalReceipt(order.fiscalInvoiceId);
      return;
    }

    const rate = Number(order.exchangeRate || systemSettings?.exchangeRateBs || 40.0);
    const total = Number(order.totalAmount || 0);
    const subExempt = Number(order.subtotalExempt || 0);
    const taxBase = Number(order.taxableBase || 0);
    const taxAmt = Number(order.taxAmount || 0);

    const items = (order.items || []).map((it: any) => ({
      productId: it.productId,
      name: it.productName || it.product?.name || 'Producto',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      isTaxExempt: Boolean(it.isTaxExempt || it.product?.isTaxExempt),
      taxRate: Number(it.taxRate !== undefined && it.taxRate !== null ? it.taxRate : 16.0),
      taxAmount: Number(it.taxAmount || 0),
      subtotal: Number(it.subtotal || (Number(it.unitPrice || 0) * (Number(it.quantity) || 1))),
    }));

    const syntheticInvoice: any = {
      id: order.id,
      tenantId: order.tenantId,
      orderId: order.id,
      documentType: 'INVOICE',
      provider: 'INTERNAL',
      status: 'ISSUED',
      invoiceNumber: `ORD-${(order.id || '').slice(0, 8).toUpperCase()}`,
      fiscalControlNumber: order.offlineId || null,
      series: 'T',
      customerName: order.customerName || 'Cliente General',
      customerRif: order.identification || order.pagoMovilCedula || 'V-00000000-0',
      customerAddress: order.customerAddress || '',
      customerPhone: order.customerPhone || '',
      subtotalExempt: subExempt,
      taxableBase: taxBase > 0 ? taxBase : (subExempt > 0 ? 0 : total),
      taxRate: 16.0,
      taxAmount: taxAmt,
      totalAmount: total,
      amountBs: Number(order.amountBs || (total * rate)),
      exchangeRate: rate,
      items,
      createdAt: order.createdAt || new Date().toISOString(),
    };

    setActiveFiscalReceipt(syntheticInvoice);
    setShowFiscalReceiptModal(true);
  };

  const handleRejectPayment = (orderId: string) => {
    presentAlert({
      header: 'Rechazar Comprobante',
      message: 'Indica el motivo por el cual no se validó el pago:',
      inputs: [
        { name: 'reason', type: 'text', placeholder: 'Ej. No se refleja en cuenta / Monto incorrecto' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar Pago',
          role: 'destructive',
          handler: async (data: any) => {
            const reason = data.reason?.trim() || 'Comprobante no válido o no recibido';
            try {
              await apiClient.patch(`/orders/${orderId}/reject-payment`, { reason });
              presentToast({ message: 'Comprobante marcado como rechazado', duration: 2500, color: 'warning' });
              fetchOrders();
            } catch (e: any) {
              console.error(e);
              presentToast({ message: 'Error rechazando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const isDeliveryDriver = (emp: any) => {
    if (!emp) return false;
    if (emp.role === UserRole.DELIVERY) return true;
    if (Array.isArray(emp.roles) && emp.roles.includes(UserRole.DELIVERY)) return true;
    return false;
  };

  const formatLocalAmount = (amount: number, symbol: string = currencySymbol) => {
    if (symbol === 'COP') {
      return `${Math.round(amount).toLocaleString('es-CO')} COP`;
    }
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  const [systemSettings, setSystemSettings] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get<any>('/settings');
      if (res.data) {
        setSystemSettings(res.data);
      }
      if (res.data?.exchangeRateBs && Number(res.data.exchangeRateBs) > 0) {
        setExchangeRate(Number(res.data.exchangeRateBs));
      }
      if (res.data?.currencySymbol) {
        setCurrencySymbol(res.data.currencySymbol);
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

    const onSettingsUpdated = () => {
      fetchSettings();
    };
    window.addEventListener('settings_updated', onSettingsUpdated);
    return () => {
      window.removeEventListener('settings_updated', onSettingsUpdated);
    };
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

  const confirmSupplierOrder = async (order: Order) => {
    try {
      await apiClient.patch(`/orders/${order.id}/confirm-supplier`, {});
      presentToast({ message: 'Disponibilidad confirmada con éxito', duration: 2500, color: 'success' });
      const shortId = String(order.id || '').slice(0, 8).toUpperCase();
      if (order.customerPhone) {
        const msg = `Hola ${order.customerName || 'Cliente'}, ¡confirmamos disponibilidad de tu encargo #${shortId} con el distribuidor! Ya puedes proceder a realizar el pago o abono para apartar tus prendas/artículos.`;
        window.open(formatWhatsAppUrl(order.customerPhone, msg), '_blank');
      }
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error confirmando pedido con proveedor', duration: 3000, color: 'danger' });
    }
  };

  const rejectSupplierOrder = (order: Order) => {
    const shortId = String(order.id || '').slice(0, 8).toUpperCase();
    presentAlert({
      header: 'Agotado en Proveedor',
      message: `¿Confirmas que el encargo #${shortId} de "${order.customerName || 'Cliente'}" está agotado? Se cancelará la orden sin cobro.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Marcar Agotado',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.patch(`/orders/${order.id}/reject-supplier`, {});
              presentToast({ message: 'Encargo cancelado por falta de stock en proveedor', duration: 2500, color: 'medium' });
              if (order.customerPhone) {
                const msg = `Hola ${order.customerName || 'Cliente'}, lamentamos informarte que los artículos de tu encargo #${shortId} están temporalmente agotados con el distribuidor.`;
                window.open(formatWhatsAppUrl(order.customerPhone, msg), '_blank');
              }
              fetchOrders();
            } catch (e) {
              console.error(e);
              presentToast({ message: 'Error al cancelar encargo', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const openPaymentAlert = (order: Order) => {
    setSelectedOrderForCobro(order);
    setCobroMethod('USD');
    setCobroUsdReceived('');
    setCobroRef('');
    setCobroBank('');
  };

  const getAbonoDueInfo = (order: Order) => {
    if (!order || order.paymentStatus === PaymentStatus.PAID || order.status === OrderStatus.CANCELED || order.status === OrderStatus.CANCELADO_PROVEEDOR) {
      return null;
    }
    const defaultDays = Math.max(1, Number(systemSettings?.abonoDefaultDueDays || 7));
    let dueDate: Date;
    if (order.nextAbonoDueDate) {
      dueDate = new Date(order.nextAbonoDueDate);
    } else {
      let baseDateStr = order.createdAt;
      if (Array.isArray(order.abonosHistory) && order.abonosHistory.length > 0) {
        const lastAbono = order.abonosHistory[order.abonosHistory.length - 1];
        if (lastAbono?.date) baseDateStr = lastAbono.date;
      }
      dueDate = new Date(baseDateStr || Date.now());
      dueDate.setDate(dueDate.getDate() + defaultDays);
    }
    if (isNaN(dueDate.getTime())) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    const diffDays = Math.round((dueStart - todayStart) / (1000 * 60 * 60 * 24));

    const formattedDue = dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const isoDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    if (diffDays < 0) {
      return {
        status: 'OVERDUE' as const,
        diffDays: Math.abs(diffDays),
        formattedDue,
        isoDate,
        label: `⚠️ Abono Vencido (hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}) • ${formattedDue}`,
        bg: '#FEF2F2',
        border: '#FECACA',
        color: '#B91C1C',
      };
    } else if (diffDays <= 1) {
      return {
        status: 'DUE_SOON' as const,
        diffDays,
        formattedDue,
        isoDate,
        label: `⏳ Vence ${diffDays === 0 ? 'HOY' : 'mañana'} (${formattedDue})`,
        bg: '#FFFBEB',
        border: '#FDE68A',
        color: '#92400E',
      };
    } else {
      return {
        status: 'ON_TIME' as const,
        diffDays,
        formattedDue,
        isoDate,
        label: `📅 Próximo abono: ${formattedDue} (en ${diffDays} días)`,
        bg: '#ECFDF5',
        border: '#A7F3D0',
        color: '#065F46',
      };
    }
  };

  const handleCopyOrderSummary = async (order: Order, onlyCode: boolean = false) => {
    if (!order) return;
    const shortCode = `#ORD-${String(order.id || '').slice(0, 6).toUpperCase()}`;
    if (onlyCode) {
      try {
        await navigator.clipboard.writeText(shortCode);
        presentToast({ message: `📋 Código ${shortCode} copiado al portapapeles`, duration: 2000, color: 'success' });
      } catch {
        presentToast({ message: `Código: ${shortCode}`, duration: 2500, color: 'primary' });
      }
      return;
    }

    const orderItems = Array.isArray(order.items) ? order.items : [];
    const itemsSum = orderItems.reduce((acc: number, it: any) => acc + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
    const orderRate = Number(order.exchangeRate) > 0 ? Number(order.exchangeRate) : (Number(exchangeRate) || 40);
    const totalUsd = Number(order.totalAmount || 0) > 0 ? Number(order.totalAmount) : itemsSum;
    const abonosTotal = Number(order.abonosTotal || 0);
    const remaining = Math.max(0, totalUsd - abonosTotal);

    const itemsLines = orderItems.map((it: any) => {
      const pName = it.productName || it.product?.name || 'Producto';
      const vName = it.variantName ? ` (${it.variantName})` : '';
      const qty = Number(it.quantity) || 1;
      const uPrice = Number(it.unitPrice) || 0;
      return `• ${qty}x ${pName}${vName} - $${(uPrice * qty).toFixed(2)}`;
    }).join('\n');

    const dueInfo = getAbonoDueInfo(order);
    const copEnabled = Boolean(systemSettings?.enableCopCurrency);
    const copRate = Number((order as any).exchangeRateCop || systemSettings?.exchangeRateCop || 4000);
    const copTotalStr = copEnabled ? ` | 🇨🇴 $${Math.round(totalUsd * copRate).toLocaleString('es-CO')} COP` : '';
    const copRemStr = copEnabled ? ` | 🇨🇴 $${Math.round(remaining * copRate).toLocaleString('es-CO')} COP` : '';
    const summaryLines = [
      `🧾 *Comprobante de Venta ${shortCode}*`,
      `👤 Cliente: ${order.customerName || 'Cliente General'}`,
      itemsLines ? `\n📦 *Detalle:*\n${itemsLines}` : '',
      `\n💵 *Total:* $${totalUsd.toFixed(2)} (${formatLocalAmount(totalUsd * orderRate)}${copTotalStr})`,
      abonosTotal > 0 ? `✅ *Abonado:* $${abonosTotal.toFixed(2)}` : '',
      order.paymentStatus !== PaymentStatus.PAID ? `⏳ *Saldo Pendiente:* $${remaining.toFixed(2)} (${formatLocalAmount(remaining * orderRate)}${copRemStr})` : '✅ *Estado:* PAGADO',
      dueInfo && order.paymentStatus !== PaymentStatus.PAID ? `📅 *Próximo abono:* ${dueInfo.formattedDue}` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(summaryLines);
      presentToast({ message: `📋 Resumen y código (${shortCode}) copiados al portapapeles`, duration: 2200, color: 'success' });
    } catch {
      presentToast({ message: 'No se pudo copiar automáticamente', duration: 2500, color: 'warning' });
    }
  };

  const counts = useMemo(() => {
    if (!Array.isArray(orders)) return { activos: 0, porCobrar: 0, vencidos: 0, porConfirmar: 0, historial: 0 };
    const activos = orders.filter(o => o && [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PARTIALLY_DELIVERED].includes(o.status)).length;
    const porCobrarList = orders.filter(o => o && [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.CANCELADO_PROVEEDOR && o.status !== OrderStatus.SOLICITUD_ENCARGO);
    const porCobrar = porCobrarList.length;
    const vencidos = porCobrarList.filter(o => {
      const info = getAbonoDueInfo(o);
      return info?.status === 'OVERDUE';
    }).length;
    const porConfirmar = orders.filter(o => o && (o.status === OrderStatus.SOLICITUD_ENCARGO || Boolean(o.paymentReported))).length;
    const historial = orders.filter(o => o && (o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED || o.status === OrderStatus.CANCELADO_PROVEEDOR)).length;
    return { activos, porCobrar, vencidos, porConfirmar, historial };
  }, [orders, systemSettings]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(o => {
      if (!o) return false;
      const isActivo = [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PARTIALLY_DELIVERED].includes(o.status);
      const isHistorial = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED || o.status === OrderStatus.CANCELADO_PROVEEDOR;
      const isPorCobrar = [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.CANCELADO_PROVEEDOR && o.status !== OrderStatus.SOLICITUD_ENCARGO;
      const isPorConfirmar = o.status === OrderStatus.SOLICITUD_ENCARGO || Boolean(o.paymentReported);

      if (tab === 'activos' && !isActivo) return false;
      if (tab === 'por_cobrar' && !isPorCobrar) return false;
      if (tab === 'por_cobrar' && onlyOverdueFilter) {
        const dueInfo = getAbonoDueInfo(o);
        if (dueInfo?.status !== 'OVERDUE') return false;
      }
      if (tab === 'por_confirmar' && !isPorConfirmar) return false;
      if (tab === 'historial' && !isHistorial) return false;

      if (selectedEmployeeFilter && 
          o.employeeId !== selectedEmployeeFilter && 
          o.employee?.id !== selectedEmployeeFilter &&
          !o.items?.some((it: any) => it.employeeId === selectedEmployeeFilter)
      ) {
        return false;
      }

      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      const custName = String(o.customerName || '').toLowerCase();
      const orderId = String(o.id || '').toLowerCase();
      const shortCode = `#ord-${String(o.id || '').slice(0, 6).toLowerCase()}`;
      const notes = String(o.notes || '').toLowerCase();
      const empUser = String(o.employee?.username || '').toLowerCase();
      const empName = String(o.employee?.name || '').toLowerCase();
      return (
        custName.includes(q) ||
        orderId.includes(q) ||
        shortCode.includes(q) ||
        notes.includes(q) ||
        empUser.includes(q) ||
        empName.includes(q)
      );
    });
  }, [orders, tab, onlyOverdueFilter, searchText, selectedEmployeeFilter, systemSettings]);

  return (
    <IonPage>
      <AppHeader title="Pedidos" onRefresh={() => Promise.all([fetchOrders(), fetchSettings(), fetchEmployees()])} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>

          {/* Search Pill */}
          <div className="ff-search-pill" style={{ marginBottom: '14px' }}>
            <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Buscar por cliente, código (#ORD-...), empleado o pedido..."
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
                className={`ff-chip ${tab === 'activos' ? 'active bg-theme-primary border-theme-primary' : ''}`}
                style={tab === 'activos' ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)', borderColor: 'var(--theme-primary)' } : {}}
                onClick={() => { setTab('activos'); setOnlyOverdueFilter(false); }}
              >
                Activos ({counts.activos})
              </button>
              {!isKitchen && (
                <button
                  type="button"
                  className={`ff-chip ${tab === 'por_cobrar' ? 'active' : ''}`}
                  onClick={() => setTab('por_cobrar')}
                >
                  Por Cobrar ({counts.porCobrar})
                  {counts.vencidos > 0 && (
                    <span style={{ marginLeft: '6px', background: '#EF4444', color: '#ffffff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px', fontWeight: '800' }}>
                      {counts.vencidos} venc.
                    </span>
                  )}
                </button>
              )}
              {!isKitchen && tab === 'por_cobrar' && (
                <button
                  type="button"
                  onClick={() => setOnlyOverdueFilter(prev => !prev)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: onlyOverdueFilter ? '1.5px solid #EF4444' : '1px solid #FECACA',
                    background: onlyOverdueFilter ? '#EF4444' : '#FEF2F2',
                    color: onlyOverdueFilter ? '#FFFFFF' : '#B91C1C',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⚠️ Vencidos ({counts.vencidos})
                </button>
              )}
              <button
                type="button"
                className={`ff-chip ${tab === 'por_confirmar' ? 'active' : ''}`}
                onClick={() => { setTab('por_confirmar'); setOnlyOverdueFilter(false); }}
                style={counts.porConfirmar > 0 ? { borderColor: '#A855F7', color: '#7E22CE', fontWeight: '800' } : {}}
              >
                {systemSettings?.featureBuySell === false ? 'Por Verificar' : 'Por Confirmar'} ({counts.porConfirmar})
              </button>
              <button
                type="button"
                className={`ff-chip ${tab === 'historial' ? 'active' : ''}`}
                onClick={() => { setTab('historial'); setOnlyOverdueFilter(false); }}
              >
                Historial ({counts.historial})
              </button>
            </div>

            {/* Employee Filter */}
            {employees.length > 0 && (
              <IonSelect
                interface="popover"
                value={selectedEmployeeFilter}
                placeholder="Todos los empleados"
                onIonChange={e => setSelectedEmployeeFilter(e.detail.value)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  padding: '2px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: 'var(--ff-shadow-sm)',
                  minHeight: '36px',
                  '--padding-start': '0px',
                  '--padding-end': '0px'
                } as any}
              >
                <IonSelectOption value="">Todos los empleados</IonSelectOption>
                {employees.map(emp => (
                  <IonSelectOption key={emp.id} value={emp.id}>
                    {emp.username || emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
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
              const isPreorderSolicitud = order.status === OrderStatus.SOLICITUD_ENCARGO;
              const isProveedorCancel = order.status === OrderStatus.CANCELADO_PROVEEDOR;

              const isPaid = order.paymentStatus === PaymentStatus.PAID;
              const isPartial = order.paymentStatus === PaymentStatus.PARTIAL;

              // En compraventa / retail o cuando no se manejan recetas de producción, el flujo es entrega directa
              const isRetailMode = Boolean(systemSettings?.featureBuySell) || (systemSettings && !systemSettings.featureRecipes && !systemSettings.featureProduction);
              const isRetailFlow = isRetailMode || (order.deliveryMethod === DeliveryMethod.IN_STORE && isPaid);

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
              const itemsSum = orderItems.reduce((acc: number, it: any) => acc + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
              const orderRate = Number(order.exchangeRate) > 0 ? Number(order.exchangeRate) : (Number(exchangeRate) || 40);
              const totalUsd = Number(order.totalAmount || 0) > 0 ? Number(order.totalAmount) : itemsSum;
              const orderAmountLocal = (order.amountBs !== undefined && order.amountBs !== null && Number(order.amountBs) > 0)
                ? Number(order.amountBs)
                : Number((totalUsd * orderRate).toFixed(2));
              const totalLocalFormatted = formatLocalAmount(orderAmountLocal);

              const abonosTotal = Number(order.abonosTotal || 0);
              const remaining = Math.max(0, totalUsd - abonosTotal);
              const remainingLocalFormatted = formatLocalAmount(remaining * orderRate);

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
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{order.customerName || 'Cliente General'}</span>
                          <span
                            onClick={() => handleCopyOrderSummary(order, true)}
                            title="Clic para copiar código de venta"
                            style={{ fontSize: '11px', fontWeight: '800', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #E2E8F0' }}
                          >
                            #ORD-{shortId.slice(0, 6)}
                          </span>
                          {order.customerPhone && (
                            <a
                              href={formatWhatsAppUrl(order.customerPhone, `Hola ${order.customerName || 'Cliente'}, te escribimos respecto a tu pedido #${shortId}.`)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#10B981', display: 'inline-flex' }}
                              title="Chat WhatsApp"
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '18px' }} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyOrderSummary(order, false)}
                            style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Copiar código y resumen de venta para enviar por SMS/Telegram/Instagram"
                          >
                            <IonIcon icon={copyOutline} style={{ fontSize: '13px' }} />
                            <span>Copiar</span>
                          </button>
                        </div>
                        {formattedDate && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {formattedDate}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      {isPreorderSolicitud ? (
                        <div
                          className="ff-pill"
                          style={{ fontSize: '11px', padding: '3px 10px', background: '#FAF5FF', color: '#7E22CE', border: '1px solid #D8B4FE' }}
                        >
                          <span className="ff-pill-dot" style={{ background: '#9333EA' }} />
                          <span>POR CONFIRMAR (PROVEEDOR)</span>
                        </div>
                      ) : isProveedorCancel ? (
                        <div
                          className="ff-pill ff-pill-danger"
                          style={{ fontSize: '11px', padding: '3px 10px' }}
                        >
                          <span className="ff-pill-dot" style={{ background: '#EF4444' }} />
                          <span>AGOTADO EN PROVEEDOR</span>
                        </div>
                      ) : order.status === OrderStatus.PARTIALLY_DELIVERED ? (
                        <div
                          className="ff-pill"
                          style={{ fontSize: '11px', padding: '3px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <span className="ff-pill-dot" style={{ background: '#3B82F6' }} />
                          <span>📦 PARCIAL</span>
                        </div>
                      ) : (
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
                      )}
                    </div>

                    {/* Meta Pills (Table / Delivery / Employee / Requested Date) */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {order.fiscalInvoiceId && (
                        <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #A7F3D0' }}>
                          🧾 {order.fiscalStatus === 'CANCELED' ? 'NC Anulada' : 'Comprobante con IVA'}
                        </span>
                      )}
                      {order.linkedReservationId && (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #A7F3D0' }}>
                          🗓️ Cita Agendada
                        </span>
                      )}
                      {order.requestedDeliveryDate && (() => {
                        const citaMatch = order.notes?.match(/\[Cita:\s*([^\s\]]+)(?:\s+([0-9:]+))?\]/);
                        let displayDate = '';
                        let isPast = false;

                        if (citaMatch && citaMatch[1]) {
                          const dateStr = citaMatch[1];
                          const timeStr = citaMatch[2] ? (citaMatch[2].length <= 5 ? `${citaMatch[2]}:00` : citaMatch[2]) : '12:00:00';
                          displayDate = citaMatch[2] ? `${dateStr} a las ${formatTime12h(citaMatch[2])}` : dateStr;
                          const citaEpoch = new Date(`${dateStr}T${timeStr}-04:00`).getTime();
                          isPast = !isNaN(citaEpoch) ? citaEpoch < Date.now() : new Date(order.requestedDeliveryDate).getTime() < Date.now();
                        } else {
                          const d = new Date(order.requestedDeliveryDate);
                          displayDate = isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short', hour12: true });
                          isPast = !isNaN(d.getTime()) ? d.getTime() < Date.now() : false;
                        }

                        return (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isPast && !isPaid ? '#FEE2E2' : '#FEF3C7',
                            color: isPast && !isPaid ? '#991B1B' : '#92400E',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: isPast && !isPaid ? '1px solid #FECACA' : 'none'
                          }}>
                            {isPast && !isPaid ? '⏰ Cita Cumplida:' : '📅 Requerido:'} {displayDate}
                          </span>
                        );
                      })()}
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

                    {order.deliveryMethod === DeliveryMethod.DELIVERY && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', background: '#F0F9FF', padding: '6px 10px', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284C7' }}>🛵 Repartidor:</span>
                        <IonSelect
                          interface="popover"
                          value={order.deliveryUserId || ''}
                          placeholder="(Sin asignar)"
                          onIonChange={(e) => assignDeliveryDriver(order.id, e.detail.value)}
                          disabled={isKitchen}
                          style={{
                            flex: 1,
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            border: '1px solid #38BDF8',
                            background: '#FFFFFF',
                            color: '#0369A1',
                            cursor: isKitchen ? 'default' : 'pointer',
                            outline: 'none',
                            minHeight: '32px',
                            '--padding-start': '0px',
                            '--padding-end': '0px'
                          } as any}
                        >
                          <IonSelectOption value="">(Sin asignar)</IonSelectOption>
                          {employees
                            .filter(driver => driver.id === order.deliveryUserId || isDeliveryDriver(driver))
                            .map(driver => {
                              const roleName = driver.jobTitle || (
                                isDeliveryDriver(driver) ? 'Repartidor' : (driver.role || 'Empleado')
                              );
                              return (
                                <IonSelectOption key={driver.id} value={driver.id}>
                                  🛵 {driver.username || driver.name} ({roleName})
                                </IonSelectOption>
                              );
                            })}
                        </IonSelect>
                      </div>
                    )}

                    {/* TAREA 2: Detalles de Delivery Visibles */}
                    {order.deliveryMethod === DeliveryMethod.DELIVERY && (
                      <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '8px 10px', margin: '6px 0 10px 0', fontSize: '12px', color: '#0369A1' }}>
                        <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={bicycleOutline} />
                          <span>Delivery: {order.deliveryZone?.name || 'Zona General'} (+${Number(order.deliveryFee || 0).toFixed(2)})</span>
                        </div>
                        {order.customerAddress && (
                          <div style={{ marginTop: '2px', color: '#0C4A6E' }}>
                            📍 <b>Dirección:</b> {order.customerAddress}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items List */}
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                      {orderItems.map((it, idx) => {
                        if (!it) return null;
                        const pName = it.productName || it.product?.name || 'Producto';
                        const qty = Number(it.quantity) || 1;
                        const uPrice = Number(it.unitPrice) || 0;
                        return (
                          <div key={it.id || idx} style={{ fontSize: '13px', color: '#334155', padding: '4px 0', borderBottom: idx < orderItems.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {qty}x {pName}
                                {it.variantName && (
                                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#1E293B', background: '#E2E8F0', padding: '1px 6px', borderRadius: '4px' }}>
                                    🎨 {it.variantName}
                                  </span>
                                )}
                                {it.employeeId && (
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#047857', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                                    👤 {employeesMap[it.employeeId] || 'Especialista'}
                                  </span>
                                )}
                              </span>
                              {!isKitchen && (
                                <span style={{ fontWeight: '700', color: '#0F172A' }}>
                                  ${(uPrice * qty).toFixed(2)}
                                </span>
                              )}
                            </div>

                            {it.hasModifications && (
                              <div style={{ marginTop: '2px', paddingLeft: '8px', borderLeft: '2px solid #F59E0B' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px' }}>
                                  ⚠️ Modificado
                                </span>
                                {Array.isArray(it.removedIngredients) && it.removedIngredients.length > 0 && (
                                  <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700', marginTop: '1px' }}>
                                    SIN: {it.removedIngredients.join(', ')}
                                  </div>
                                )}
                                {Array.isArray(it.addedExtras) && it.addedExtras.length > 0 && (
                                  <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700', marginTop: '1px' }}>
                                    {it.addedExtras.map((ex: any, eIdx: number) => (
                                      <div key={eIdx}>
                                        EXTRA: {ex.quantity > 1 ? `${ex.quantity}x ` : ''}{ex.name} {!isKitchen && `(+$${(Number(ex.priceUSD) * Number(ex.quantity || 1)).toFixed(2)})`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {orderItems.length === 0 && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Sin desglose de items
                        </div>
                      )}
                      {!isKitchen && Number(order.discountAmount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#DC2626', fontWeight: '700', padding: '4px 0', borderTop: '1px dashed #E2E8F0', marginTop: '4px' }}>
                          <span>🏷️ Descuento:</span>
                          <span>-${Number(order.discountAmount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Price & Payment Status */}
                    {isKitchen ? (
                      <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                          Estado de Preparación:
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isPreparing ? '#EFF6FF' : (isPending ? '#FEF3C7' : '#ECFDF5'),
                          color: isPreparing ? '#1D4ED8' : (isPending ? '#92400E' : '#047857')
                        }}>
                          {isPreparing ? '👨‍🍳 EN PREPARACIÓN' : (isPending ? '⏳ PENDIENTE' : '✓ LISTO / ENTREGADO')}
                        </span>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>
                              ${totalUsd.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {totalLocalFormatted}
                            </div>
                            {Boolean(systemSettings?.enableCopCurrency) && (
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#854D0E' }}>
                                🇨🇴 ${Math.round(totalUsd * Number((order as any).exchangeRateCop || systemSettings?.exchangeRateCop || 4000)).toLocaleString('es-CO')} COP
                              </div>
                            )}
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
                            {isPaid ? '✓ Pagado' : (isPartial ? '⏳ Abono Parcial' : '⏳ Por Cobrar')}
                          </div>
                        </div>

                        {/* Desglose de Abonos / Saldo Pendiente o Saldo a Favor */}
                        {!isCanceled && (
                          <>
                            {!isPaid && (
                              <div style={{ marginTop: '8px', padding: '8px 10px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: abonosTotal > 0 ? '4px' : '0' }}>
                                  <span style={{ color: '#64748B' }}>Abonado: <b style={{ color: '#059669' }}>${abonosTotal.toFixed(2)}</b></span>
                                  <span style={{ color: '#64748B' }}>Resta: <b style={{ color: '#D97706' }}>${remaining.toFixed(2)}</b> ({remainingLocalFormatted})</span>
                                </div>
                                {abonosTotal > 0 && (
                                  <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (abonosTotal / (totalUsd || 1)) * 100)}%`, height: '100%', background: '#10B981' }} />
                                  </div>
                                )}
                                {/* Alerta de Fecha de Vencimiento entre Abonos */}
                                {!isPreorderSolicitud && (() => {
                                  const dueInfo = getAbonoDueInfo(order);
                                  if (!dueInfo) return null;
                                  return (
                                    <div style={{
                                      marginTop: '6px',
                                      padding: '5px 8px',
                                      borderRadius: '8px',
                                      background: dueInfo.bg,
                                      border: `1px solid ${dueInfo.border}`,
                                      color: dueInfo.color,
                                      fontWeight: '800',
                                      fontSize: '11px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      <span>{dueInfo.label}</span>
                                      {dueInfo.status === 'OVERDUE' && order.customerPhone && (
                                        <a
                                          href={formatWhatsAppUrl(order.customerPhone, `Hola ${order.customerName || 'Cliente'}, te recordamos amablemente tu abono pendiente de $${remaining.toFixed(2)} (${remainingLocalFormatted}) para tu cuenta #ORD-${shortId.slice(0, 6)}. ¡Gracias!`)}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ color: '#B91C1C', textDecoration: 'underline', fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }}
                                        >
                                          Recordar 📲
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()}
                                {!order.paymentReported && (order.pagoMovilRef || order.transferRef || order.binanceRef) && (
                                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748B' }}>
                                    Ref confirmada: <b>{order.pagoMovilRef || order.transferRef || order.binanceRef}</b> ({order.pagoMovilBank || order.transferBank || 'Pago Móvil'})
                                  </div>
                                )}
                              </div>
                            )}
                            {abonosTotal > totalUsd && (
                              <div style={{ marginTop: '8px', padding: '8px 10px', background: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#065F46' }}>Abonado: <b>${abonosTotal.toFixed(2)}</b></span>
                                <span style={{ color: '#047857', fontWeight: '800' }}>Saldo a favor: +${(abonosTotal - totalUsd).toFixed(2)}</span>
                              </div>
                            )}

                            {/* TAREA 1: Pago Móvil / Electrónico Por Verificar */}
                            {!isPaid && (Boolean(order.paymentReported) || (Array.isArray(order.abonosHistory) && order.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) && (
                              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>📱 PAGO REPORTADO POR VERIFICAR</span>
                                  {order.paymentProofUrl && (
                                    <a
                                      href={order.paymentProofUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#B45309', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                                    >
                                      Ver Capture ↗
                                    </a>
                                  )}
                                </div>
                                <div style={{ fontSize: '13px', color: '#78350F', marginTop: '2px' }}>
                                  Ref: <b>{order.pagoMovilRef || order.transferRef || order.binanceRef}</b> | Banco: {order.pagoMovilBank || order.transferBank || (order.binanceRef ? 'Binance' : 'Pago Móvil')} | Monto: {order.amountBs ? `Bs. ${Number(order.amountBs).toFixed(2)}${order.abonosTotal && Number(order.abonosTotal) > 0 && Number(order.abonosTotal) < totalUsd ? ` ($${Number(order.abonosTotal).toFixed(2)} abono)` : ''}` : `$${Number(order.abonosTotal || totalUsd).toFixed(2)}`}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(order.id)}
                                    style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    ✅ Confirmar que cayó en Cuenta
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPayment(order.id)}
                                    style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    ❌ No Cayó / Inválido
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                    {isPreorderSolicitud && (
                      <>
                        <button
                          type="button"
                          onClick={() => confirmSupplierOrder(order)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #C084FC',
                            background: '#FAF5FF',
                            color: '#7E22CE',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Confirmar Disponibilidad
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectSupplierOrder(order)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #FCA5A5',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ❌ Agotado
                        </button>
                      </>
                    )}

                    {!isPaid && !isCanceled && !isProveedorCancel && (
                      <>
                        {!isPreorderSolicitud && (
                          <button
                            type="button"
                            onClick={() => router.push(`/pos?editOrderId=${order.id}`)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid #CBD5E1',
                              background: '#F8FAFC',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Agregar más productos o modificar la cuenta abierta"
                          >
                            <IonIcon icon={cartOutline} />
                            Agregar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAbonoModal(order)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #FCD34D',
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ➕ Abonar
                        </button>
                        {!isPreorderSolicitud && (
                          <button
                            type="button"
                            onClick={() => openPaymentAlert(order)}
                            className="ff-btn-primary"
                            style={{ flex: 1, padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <IonIcon icon={cashOutline} />
                            Cobrar
                          </button>
                        )}
                      </>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order.id, isRetailFlow ? OrderStatus.DELIVERED : OrderStatus.PREPARING)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: isRetailFlow ? '1px solid #A7F3D0' : '1px solid #93C5FD',
                          background: isRetailFlow ? '#ECFDF5' : '#EFF6FF',
                          color: isRetailFlow ? '#065F46' : '#1D4ED8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isRetailFlow ? (order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Despachar ✓' : 'Entregar ✓') : 'Preparar'}
                      </button>
                    )}

                    {(isPreparing || order.status === OrderStatus.READY || order.status === OrderStatus.PARTIALLY_DELIVERED) && (
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
                        {order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Despachado / Entregado ✓' : 'Completar ✓'}
                      </button>
                    )}

                    {/* Botón de Entrega Parcial */}
                    {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.CANCELADO_PROVEEDOR && !isPreorderSolicitud && (
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForPartial(order)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: order.status === OrderStatus.PARTIALLY_DELIVERED ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                          background: order.status === OrderStatus.PARTIALLY_DELIVERED ? '#EFF6FF' : '#F8FAFC',
                          color: order.status === OrderStatus.PARTIALLY_DELIVERED ? '#1D4ED8' : '#334155',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                        title="Despachar físicamente parte de los productos de este pedido"
                      >
                        <IonIcon icon={cubeOutline} />
                        Parcial
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenTicket(order)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #A7F3D0',
                        background: '#ECFDF5',
                        color: '#065F46',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Ver resumen y ticket de venta imprimible"
                    >
                      🧾 Ticket
                    </button>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                  Detalles del Pedido
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenTicket(selectedOrderForDetails)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7F3D0',
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Ver resumen y ticket imprimible"
                >
                  🧾 Ver Ticket
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
              {selectedOrderForDetails && (() => {
                const detailsItems = Array.isArray(selectedOrderForDetails.items) ? selectedOrderForDetails.items : [];
                const detailsItemsSum = detailsItems.reduce((acc: number, it: any) => acc + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
                const detailsTotal = Number(selectedOrderForDetails.totalAmount || 0) > 0 ? Number(selectedOrderForDetails.totalAmount) : detailsItemsSum;

                return (
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

                    {/* Selector de Repartidor en Modal si es DELIVERY */}
                    {selectedOrderForDetails.deliveryMethod === DeliveryMethod.DELIVERY && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🛵 Asignar Repartidor:
                        </label>
                        <IonSelect
                          interface="popover"
                          value={selectedOrderForDetails.deliveryUserId || ''}
                          placeholder="-- Sin repartidor asignado --"
                          onIonChange={(e) => {
                            const val = e.detail.value;
                            assignDeliveryDriver(selectedOrderForDetails.id, val);
                          }}
                          style={{
                            width: '100%',
                            padding: '4px 10px',
                            borderRadius: '10px',
                            border: '1.5px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0F172A',
                            outline: 'none',
                            cursor: 'pointer',
                            minHeight: '40px',
                            '--padding-start': '0px',
                            '--padding-end': '0px'
                          } as any}
                        >
                          <IonSelectOption value="">-- Sin repartidor asignado --</IonSelectOption>
                          {employees
                            .filter((driver: any) => driver.id === selectedOrderForDetails.deliveryUserId || isDeliveryDriver(driver))
                            .map((driver: any) => {
                              const roleName = driver.jobTitle || (
                                isDeliveryDriver(driver) ? 'Repartidor' : (driver.role || 'Empleado')
                              );
                              return (
                                <IonSelectOption key={driver.id} value={driver.id}>
                                  🛵 {driver.name || driver.username} ({roleName})
                                </IonSelectOption>
                              );
                            })}
                        </IonSelect>
                      </div>
                    )}
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                    Productos y Servicios
                  </h4>
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                    {Array.isArray(selectedOrderForDetails.items) && selectedOrderForDetails.items.map((it: any, idx: number) => {
                      if (!it) return null;
                      const pName = it.productName || it.product?.name || 'Producto';
                      const qty = Number(it.quantity) || 1;
                      const uPrice = Number(it.unitPrice) || 0;
                      return (
                        <div key={it.id || idx} style={{ padding: '8px 0', borderBottom: '1px solid #EEF2F6', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {qty}x {pName}
                              {it.employeeId && (
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                                  👤 {employeesMap[it.employeeId] || 'Especialista'}
                                </span>
                              )}
                              {Number(it.deliveredQuantity || 0) > 0 && (
                                <span style={{ fontSize: '10px', fontWeight: '800', color: Number(it.deliveredQuantity) >= qty ? '#047857' : '#D97706', background: Number(it.deliveredQuantity) >= qty ? '#ECFDF5' : '#FEF3C7', padding: '1px 6px', borderRadius: '4px' }}>
                                  📦 Entregados: {it.deliveredQuantity}/{qty}
                                </span>
                              )}
                              {it.hasModifications && (
                                <span style={{ fontSize: '10px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px' }}>
                                  ⚠️ Modificado
                                </span>
                              )}
                            </span>
                            {!isKitchen && (
                              <span style={{ fontWeight: '800', color: '#0F172A' }}>
                                ${(uPrice * qty).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {it.hasModifications && (
                            <div style={{ marginTop: '4px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#B45309', marginBottom: '2px' }}>
                                📝 COMANDA DE COCINA:
                              </div>
                              {Array.isArray(it.removedIngredients) && it.removedIngredients.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '800' }}>
                                  SIN: {it.removedIngredients.join(', ')}
                                </div>
                              )}
                              {Array.isArray(it.addedExtras) && it.addedExtras.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: '800', marginTop: '2px' }}>
                                  {it.addedExtras.map((ex: any, eIdx: number) => (
                                    <div key={eIdx}>
                                      EXTRA: {ex.quantity > 1 ? `${ex.quantity}x ` : ''}{ex.name} {!isKitchen && `(+${(Number(ex.priceUSD) * Number(ex.quantity || 1)).toFixed(2)})`}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!isKitchen && (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '12px', marginTop: '10px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                            🏷️ Descuento Especial:
                          </span>
                          {!isEditingDetailsDiscount && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {Number(selectedOrderForDetails.discountAmount || 0) > 0 ? (
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#DC2626' }}>
                                  -${Number(selectedOrderForDetails.discountAmount).toFixed(2)}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                                  Sin descuento
                                </span>
                              )}
                              {selectedOrderForDetails.status !== OrderStatus.CANCELED && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingDetailsDiscount(true);
                                    if (selectedOrderForDetails.discountAmount && Number(selectedOrderForDetails.discountAmount) > 0) {
                                      if (selectedOrderForDetails.discountType && selectedOrderForDetails.discountValue) {
                                        setDetailsDiscountType(selectedOrderForDetails.discountType as any);
                                        setDetailsDiscountValue(Number(selectedOrderForDetails.discountValue).toString());
                                      } else {
                                        setDetailsDiscountType('FIXED');
                                        setDetailsDiscountValue(Number(selectedOrderForDetails.discountAmount).toString());
                                      }
                                    } else {
                                      setDetailsDiscountType('FIXED');
                                      setDetailsDiscountValue('');
                                    }
                                  }}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#334155',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {Number(selectedOrderForDetails.discountAmount || 0) > 0 ? '✏️ Modificar' : '➕ Aplicar'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditingDetailsDiscount && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #CBD5E1', overflow: 'hidden', background: '#FFFFFF', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setDetailsDiscountType('FIXED')}
                                  style={{
                                    padding: '6px 10px',
                                    border: 'none',
                                    background: detailsDiscountType === 'FIXED' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                                    color: detailsDiscountType === 'FIXED' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  $ Fijo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetailsDiscountType('PERCENTAGE')}
                                  style={{
                                    padding: '6px 10px',
                                    border: 'none',
                                    background: detailsDiscountType === 'PERCENTAGE' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                                    color: detailsDiscountType === 'PERCENTAGE' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  % Porc.
                                </button>
                              </div>
                              <input
                                type="number"
                                min="0"
                                max={detailsDiscountType === 'PERCENTAGE' ? '100' : undefined}
                                step="any"
                                value={detailsDiscountValue}
                                onChange={e => {
                                  const v = e.target.value;
                                  if (detailsDiscountType === 'PERCENTAGE' && Number(v) > 100) {
                                    setDetailsDiscountValue('100');
                                  } else {
                                    setDetailsDiscountValue(v);
                                  }
                                }}
                                placeholder={detailsDiscountType === 'FIXED' ? 'Monto ($)' : 'Porcentaje (%)'}
                                style={{
                                  flex: 1,
                                  minWidth: '0',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  background: '#ffffff',
                                  color: '#0F172A'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {Number(selectedOrderForDetails.discountAmount || 0) > 0 && (
                                <button
                                  type="button"
                                  disabled={isSavingDetailsDiscount}
                                  onClick={async () => {
                                    setIsSavingDetailsDiscount(true);
                                    try {
                                      const res = await apiClient.patch(`/orders/${selectedOrderForDetails.id}/discount`, {
                                        discountValue: 0,
                                        discountAmount: 0
                                      });
                                      presentToast({ message: 'Descuento eliminado', duration: 2000, color: 'success' });
                                      setSelectedOrderForDetails((prev: any) => ({ ...prev, ...res.data }));
                                      setIsEditingDetailsDiscount(false);
                                      setDetailsDiscountValue('');
                                      fetchOrders();
                                    } catch (err: any) {
                                      presentToast({ message: 'Error: ' + (err.response?.data?.message || err.message), duration: 3000, color: 'danger' });
                                    } finally {
                                      setIsSavingDetailsDiscount(false);
                                    }
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #FCA5A5',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Quitar Descuento
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isSavingDetailsDiscount}
                                onClick={() => setIsEditingDetailsDiscount(false)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isSavingDetailsDiscount}
                                onClick={async () => {
                                  const valNum = parseFloat(detailsDiscountValue) || 0;
                                  setIsSavingDetailsDiscount(true);
                                  try {
                                    const res = await apiClient.patch(`/orders/${selectedOrderForDetails.id}/discount`, {
                                      discountType: detailsDiscountType,
                                      discountValue: valNum
                                    });
                                    presentToast({ message: '✓ Descuento actualizado con éxito', duration: 2500, color: 'success' });
                                    setSelectedOrderForDetails((prev: any) => ({ ...prev, ...res.data }));
                                    setIsEditingDetailsDiscount(false);
                                    fetchOrders();
                                  } catch (err: any) {
                                    presentToast({ message: 'Error: ' + (err.response?.data?.message || err.message), duration: 3000, color: 'danger' });
                                  } finally {
                                    setIsSavingDetailsDiscount(false);
                                  }
                                }}
                                className="ff-btn-primary"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '800'
                                }}
                              >
                                {isSavingDetailsDiscount ? 'Guardando...' : 'Guardar Descuento'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!isKitchen && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '2px dashed #E2E8F0', fontWeight: '800', fontSize: '16px', color: '#10B981' }}>
                        <span>Total Final:</span>
                        <span>${detailsTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Desglose de Pago & Arqueo */}
                  {!isKitchen && (
                    <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          💳 Información de Pago y Arqueo
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: selectedOrderForDetails.paymentStatus === PaymentStatus.PAID ? '#ECFDF5' : selectedOrderForDetails.paymentStatus === PaymentStatus.PARTIAL ? '#FEF3C7' : '#FEE2E2',
                          color: selectedOrderForDetails.paymentStatus === PaymentStatus.PAID ? '#065F46' : selectedOrderForDetails.paymentStatus === PaymentStatus.PARTIAL ? '#92400E' : '#991B1B'
                        }}>
                          {selectedOrderForDetails.paymentStatus === PaymentStatus.PAID ? '✓ Pagado' : selectedOrderForDetails.paymentStatus === PaymentStatus.PARTIAL ? '⏳ Abono Parcial' : '⚠️ Pendiente'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
                        <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px' }}>Método de Cobro</div>
                          <div style={{ fontWeight: '800', color: '#0F172A' }}>
                            {selectedOrderForDetails.paymentMethod === 'USD' && '💵 Efectivo Divisas ($)'}
                            {selectedOrderForDetails.paymentMethod === 'PAGO_MOVIL' && '📱 Pago Móvil (Bs.)'}
                            {selectedOrderForDetails.paymentMethod === 'PUNTO' && '💳 Punto de Venta'}
                            {selectedOrderForDetails.paymentMethod === 'BINANCE' && '🟡 Binance Pay'}
                            {selectedOrderForDetails.paymentMethod === 'TRANSFER' && '🏦 Transferencia'}
                            {selectedOrderForDetails.paymentMethod === 'PENDING' && '⏳ Cuenta Abierta'}
                            {!['USD','PAGO_MOVIL','PUNTO','BINANCE','TRANSFER','PENDING'].includes(selectedOrderForDetails.paymentMethod) && (selectedOrderForDetails.paymentMethod || 'Efectivo')}
                          </div>
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px' }}>Tasa Cambiaria</div>
                          <div style={{ fontWeight: '800', color: '#10B981' }}>
                            {formatLocalAmount(Number(selectedOrderForDetails.exchangeRate || exchangeRate))}
                          </div>
                        </div>
                      </div>

                      {/* Si pagó con USD (Monto Recibido y Vuelto) */}
                      {(Boolean(selectedOrderForDetails.usdReceived) || (selectedOrderForDetails.paymentMethod === 'USD' && selectedOrderForDetails.paymentStatus === PaymentStatus.PAID)) && (
                        <div style={{ marginTop: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: '#166534', fontWeight: '700' }}>
                              {selectedOrderForDetails.paymentStatus === PaymentStatus.PAID ? '💵 Efectivo Recibido:' : '💵 Paga al recibir con:'}
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: '#15803D' }}>
                              ${Number(selectedOrderForDetails.usdReceived || detailsTotal).toFixed(2)} USD
                            </span>
                          </div>

                          {Number(selectedOrderForDetails.changeAmount || 0) > 0 ? (
                            <div style={{ paddingTop: '10px', borderTop: '1px dashed #86EFAC' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', color: '#166534', fontWeight: '700' }}>Vuelto Entregado:</span>
                                <span style={{ fontSize: '16px', fontWeight: '900', color: '#047857' }}>
                                  ${Number(selectedOrderForDetails.changeAmount).toFixed(2)} USD
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#15803D', marginBottom: '8px' }}>
                                <span>Equivalente Local:</span>
                                <span style={{ fontWeight: '800' }}>
                                  {formatLocalAmount(Number(selectedOrderForDetails.changeAmountBs || (selectedOrderForDetails.changeAmount * (selectedOrderForDetails.exchangeRate || exchangeRate))))}
                                </span>
                              </div>
                              <div style={{ background: '#DCFCE7', padding: '8px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#166534' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>Canal de Entrega:</span>
                                  <b>{selectedOrderForDetails.changeMethod === 'PAGO_MOVIL' ? '📱 Pago Móvil' : selectedOrderForDetails.changeMethod === 'CASH_BS' ? '🇻🇪 Efectivo Bolívares' : '💵 Efectivo Divisas'}</b>
                                </div>
                                {selectedOrderForDetails.changeRef && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>N° Referencia Vuelto:</span>
                                    <b style={{ color: '#0F172A' }}>{selectedOrderForDetails.changeRef}</b>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#15803D', fontStyle: 'italic', marginTop: '4px' }}>
                              ✓ Cobro exacto sin vuelto
                            </div>
                          )}
                        </div>
                      )}

                      {/* Si fue Pago Móvil */}
                      {(selectedOrderForDetails.paymentMethod === 'PAGO_MOVIL' || (selectedOrderForDetails.pagoMovilRef && selectedOrderForDetails.paymentMethod !== 'USD')) && (
                        <div style={{ marginTop: '12px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '14px', padding: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                            <div>
                              <span style={{ color: '#6D28D9', display: 'block', fontSize: '11px', fontWeight: '600' }}>Referencia</span>
                              <span style={{ fontWeight: '800', color: '#4C1D95' }}>{selectedOrderForDetails.pagoMovilRef || 'N/A'}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6D28D9', display: 'block', fontSize: '11px', fontWeight: '600' }}>Banco</span>
                              <span style={{ fontWeight: '800', color: '#4C1D95' }}>{selectedOrderForDetails.pagoMovilBank || 'Pago Móvil'}</span>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <span style={{ color: '#6D28D9', display: 'block', fontSize: '11px', fontWeight: '600' }}>Monto Cobrado</span>
                              <span style={{ fontWeight: '900', color: '#4C1D95', fontSize: '14px' }}>
                                {formatLocalAmount(Number(selectedOrderForDetails.amountBs || (detailsTotal * (selectedOrderForDetails.exchangeRate || exchangeRate))))}
                              </span>
                            </div>
                            {selectedOrderForDetails.pagoMovilPhone && (
                              <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ color: '#6D28D9', fontSize: '11px', fontWeight: '600' }}>Teléfono/Cédula: </span>
                                <span style={{ fontWeight: '700', color: '#4C1D95' }}>{selectedOrderForDetails.pagoMovilPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Si fue Punto de Venta */}
                      {selectedOrderForDetails.paymentMethod === 'PUNTO' && (
                        <div style={{ marginTop: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '14px', padding: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                            <div>
                              <span style={{ color: '#1D4ED8', display: 'block', fontSize: '11px', fontWeight: '600' }}>N° Voucher / Ref</span>
                              <span style={{ fontWeight: '800', color: '#1E3A8A' }}>{selectedOrderForDetails.puntoRef || selectedOrderForDetails.pagoMovilRef || 'N/A'}</span>
                            </div>
                            <div>
                              <span style={{ color: '#1D4ED8', display: 'block', fontSize: '11px', fontWeight: '600' }}>Banco / Terminal</span>
                              <span style={{ fontWeight: '800', color: '#1E3A8A' }}>{selectedOrderForDetails.puntoBank || selectedOrderForDetails.pagoMovilBank || 'Punto de Venta'}</span>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <span style={{ color: '#1D4ED8', display: 'block', fontSize: '11px', fontWeight: '600' }}>Monto Cobrado</span>
                              <span style={{ fontWeight: '900', color: '#1E3A8A', fontSize: '14px' }}>
                                {formatLocalAmount(Number(selectedOrderForDetails.amountBs || (detailsTotal * (selectedOrderForDetails.exchangeRate || exchangeRate))))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Si fue Binance o Transferencia */}
                      {(selectedOrderForDetails.paymentMethod === 'BINANCE' || selectedOrderForDetails.paymentMethod === 'TRANSFER') && (
                        <div style={{ marginTop: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Referencia / ID:</span>
                            <b style={{ color: '#0F172A' }}>{selectedOrderForDetails.binanceRef || selectedOrderForDetails.transferRef || selectedOrderForDetails.pagoMovilRef || 'N/A'}</b>
                          </div>
                          {selectedOrderForDetails.transferBank && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748B', fontWeight: '600' }}>Banco Emisor:</span>
                              <b style={{ color: '#0F172A' }}>{selectedOrderForDetails.transferBank}</b>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Si es Cuenta Abierta / Pago Pendiente o tiene Abonos */}
                      {(selectedOrderForDetails.paymentMethod === 'PENDING' || selectedOrderForDetails.paymentStatus !== PaymentStatus.PAID || Number(selectedOrderForDetails.abonosTotal || 0) > 0) && (
                        <div style={{ marginTop: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                            <span style={{ color: '#92400E', fontWeight: '600' }}>Total Abonado:</span>
                            <span style={{ fontWeight: '800', color: '#10B981' }}>${Number(selectedOrderForDetails.abonosTotal || 0).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '4px', borderTop: '1px dashed #FCD34D' }}>
                            <span style={{ color: '#92400E', fontWeight: '700' }}>
                              {Number(selectedOrderForDetails.abonosTotal || 0) > detailsTotal ? 'Saldo a Favor del Cliente:' : 'Saldo Pendiente:'}
                            </span>
                            <span style={{ fontWeight: '900', color: Number(selectedOrderForDetails.abonosTotal || 0) > detailsTotal ? '#059669' : '#D97706' }}>
                              {Number(selectedOrderForDetails.abonosTotal || 0) > detailsTotal
                                ? `+$${(Number(selectedOrderForDetails.abonosTotal) - detailsTotal).toFixed(2)} USD`
                                : `$${Math.max(0, detailsTotal - Number(selectedOrderForDetails.abonosTotal || 0)).toFixed(2)} USD`
                              }
                            </span>
                          </div>
                          {Array.isArray(selectedOrderForDetails.abonosHistory) && selectedOrderForDetails.abonosHistory.length > 0 && (
                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #FEF3C7', fontSize: '11px', color: '#92400E' }}>
                              <div style={{ fontWeight: '700', marginBottom: '4px' }}>Historial de Abonos:</div>
                              {selectedOrderForDetails.abonosHistory.map((ab: any, i: number) => (
                                <div key={ab.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                  <span>
                                    Abono #{i + 1} ({new Date(ab.date).toLocaleDateString()})
                                    {ab.method ? ` • ${ab.method}` : ''}
                                    {ab.reference || ab.ref ? ` (Ref: ${ab.reference || ab.ref})` : ''}
                                  </span>
                                  <b>${Number(ab.amount).toFixed(2)}</b>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedOrderForDetails.notes && (
                    <div style={{ background: '#F1F5F9', borderRadius: '12px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                      <b>Notas:</b> {selectedOrderForDetails.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isKitchen ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedOrderForDetails.status === OrderStatus.PENDING && (
                          <button
                            type="button"
                            onClick={() => {
                              updateStatus(selectedOrderForDetails.id, OrderStatus.PREPARING);
                              setSelectedOrderForDetails({
                                ...selectedOrderForDetails,
                                status: OrderStatus.PREPARING
                              });
                            }}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: 'none',
                              background: '#F59E0B',
                              color: '#FFFFFF',
                              fontWeight: '800',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            👨‍🍳 Empezar a Preparar
                          </button>
                        )}
                        {selectedOrderForDetails.status === OrderStatus.PREPARING && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus = selectedOrderForDetails.deliveryMethod === DeliveryMethod.DELIVERY ? OrderStatus.IN_TRANSIT : OrderStatus.DELIVERED;
                              updateStatus(selectedOrderForDetails.id, nextStatus);
                              setSelectedOrderForDetails({
                                ...selectedOrderForDetails,
                                status: nextStatus
                              });
                            }}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: 'none',
                              background: '#10B981',
                              color: '#FFFFFF',
                              fontWeight: '800',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            ✅ Listo / Completar
                          </button>
                        )}
                        {selectedOrderForDetails.status === OrderStatus.DELIVERED && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#065F46',
                            fontWeight: '800',
                            fontSize: '13px',
                            textAlign: 'center'
                          }}>
                            ✓ Pedido Completado y Listo
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedOrderForDetails.paymentStatus !== PaymentStatus.PAID && selectedOrderForDetails.status !== OrderStatus.CANCELED && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const ord = selectedOrderForDetails;
                                setSelectedOrderForDetails(null);
                                router.push(`/pos?editOrderId=${ord.id}`);
                              }}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid #93C5FD',
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <IonIcon icon={cartOutline} />
                              🛒 Agregar Productos a la Cuenta (Abrir en POS)
                            </button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const ord = selectedOrderForDetails;
                                  setSelectedOrderForDetails(null);
                                  openAbonoModal(ord);
                                }}
                                style={{
                                  padding: '12px',
                                  borderRadius: '12px',
                                  border: '1px solid #FCD34D',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  fontWeight: '700',
                                  fontSize: '13px',
                                  cursor: 'pointer'
                                }}
                              >
                                ➕ Registrar Abono
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const ord = selectedOrderForDetails;
                                  setSelectedOrderForDetails(null);
                                  openPaymentAlert(ord);
                                }}
                                className="ff-btn-primary"
                                style={{ padding: '12px', fontSize: '13px', justifyContent: 'center' }}
                              >
                                💵 Cobrar Total
                              </button>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyOrderSummary(selectedOrderForDetails, false)}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #A7F3D0',
                            background: '#ECFDF5',
                            color: '#065F46',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <IonIcon icon={copyOutline} style={{ fontSize: '16px' }} />
                          <span>📋 Copiar Código y Resumen de Venta</span>
                        </button>

                        {/* Sección de Facturación Fiscal SENIAT */}
                        {systemSettings?.featureFiscalSupport && (
                          <div style={{
                            margin: '4px 0',
                            padding: '14px',
                            borderRadius: '12px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>🧾</span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                                    Desglose y Control de IVA
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                                    {selectedOrderForDetails.fiscalInvoiceId
                                      ? `Control interno: ${selectedOrderForDetails.fiscalControlNumber || 'Generado'}`
                                      : 'Este pedido aún no tiene comprobante con IVA generado'}
                                  </div>
                                </div>
                              </div>
                              {selectedOrderForDetails.fiscalInvoiceId ? (
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  background: selectedOrderForDetails.fiscalStatus === 'CANCELED' ? '#FEF2F2' : '#ECFDF5',
                                  color: selectedOrderForDetails.fiscalStatus === 'CANCELED' ? '#DC2626' : '#047857',
                                  border: `1px solid ${selectedOrderForDetails.fiscalStatus === 'CANCELED' ? '#FECACA' : '#A7F3D0'}`,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  ✓ {selectedOrderForDetails.fiscalStatus === 'CANCELED' ? 'Anulado' : 'Generado'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: '700', background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '6px' }}>
                                  Pendiente
                                </span>
                              )}
                            </div>

                            {selectedOrderForDetails.fiscalInvoiceId ? (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewFiscalReceipt(selectedOrderForDetails.fiscalInvoiceId)}
                                  style={{
                                    flex: 1,
                                    padding: '11px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'var(--theme-primary, #10B981)',
                                    color: 'var(--theme-primary-contrast, #ffffff)',
                                    fontWeight: '800',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  🖨️ Ver / Imprimir Comprobante
                                </button>
                                {selectedOrderForDetails.fiscalStatus !== 'CANCELED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelFiscalInvoice(selectedOrderForDetails.fiscalInvoiceId)}
                                    style={{
                                      padding: '11px 14px',
                                      borderRadius: '10px',
                                      border: '1px solid #FECACA',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      fontWeight: '700',
                                      fontSize: '12px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    🚫 Anular (Ajuste)
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isEmittingFiscal}
                                onClick={() => handleEmitFiscalInvoice(selectedOrderForDetails)}
                                style={{
                                  width: '100%',
                                  padding: '11px 16px',
                                  borderRadius: '10px',
                                  border: '1px solid #A7F3D0',
                                  background: '#ECFDF5',
                                  color: '#065F46',
                                  fontWeight: '800',
                                  fontSize: '13px',
                                  cursor: isEmittingFiscal ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                {isEmittingFiscal ? 'Generando Comprobante...' : '🧾 Generar Comprobante con IVA'}
                              </button>
                            )}
                          </div>
                        )}

                        {selectedOrderForDetails.status === OrderStatus.DELIVERED && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#065F46',
                            fontWeight: '800',
                            fontSize: '13px',
                            textAlign: 'center'
                          }}>
                            ✓ Pedido Entregado y Finalizado
                          </div>
                        )}

                        {selectedOrderForDetails.status !== OrderStatus.DELIVERED && selectedOrderForDetails.status !== OrderStatus.CANCELED && (
                          <button
                            type="button"
                            onClick={() => {
                              const ord = selectedOrderForDetails;
                              setSelectedOrderForDetails(null);
                              setSelectedOrderForPartial(ord);
                            }}
                            style={{
                              padding: '12px',
                              borderRadius: '12px',
                              border: '1px solid #BAE6FD',
                              background: '#F0F9FF',
                              color: '#0369A1',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <IonIcon icon={cubeOutline} />
                            📦 Despacho / Entrega Parcial de Productos
                          </button>
                        )}

                        {selectedOrderForDetails.status !== OrderStatus.CANCELED && (
                          <button
                            type="button"
                            onClick={() => {
                              const isDelivered = selectedOrderForDetails.status === OrderStatus.DELIVERED;
                              presentAlert({
                                header: 'Confirmar Cancelación',
                                message: isDelivered 
                                  ? 'Este pedido figura como entregado. Al cancelarlo se anulará su venta en el Dashboard y se desvinculará cualquier cita asociada. ¿Deseas anularlo?'
                                  : '¿Estás seguro de cancelar este pedido? Se liberarán los productos reservados.',
                                buttons: [
                                  { text: 'Volver', role: 'cancel' },
                                  {
                                    text: 'Sí, Cancelar',
                                    role: 'destructive',
                                    handler: () => {
                                      updateStatus(selectedOrderForDetails.id, OrderStatus.CANCELED);
                                      setSelectedOrderForDetails(null);
                                    }
                                  }
                                ]
                              });
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

                        <button
                          type="button"
                          onClick={() => {
                            presentAlert({
                              header: 'Eliminar Registro',
                              message: `¿Estás seguro de eliminar el pedido #${(selectedOrderForDetails.orderNumber || selectedOrderForDetails.id.slice(0, 8)).toUpperCase()} definitivamente? Se borrará por completo de la base de datos.`,
                              buttons: [
                                { text: 'Volver', role: 'cancel' },
                                {
                                  text: 'Eliminar',
                                  role: 'destructive',
                                  handler: async () => {
                                    try {
                                      await apiClient.delete(`/orders/${selectedOrderForDetails.id}`);
                                      setSelectedOrderForDetails(null);
                                      fetchOrders();
                                      presentToast({ message: 'Pedido eliminado de la base de datos', duration: 2500, color: 'success' });
                                    } catch (err: any) {
                                      const msg = err.response?.data?.message || 'Error al eliminar pedido';
                                      presentToast({ message: msg, duration: 3000, color: 'danger' });
                                    }
                                  }
                                }
                              ]
                            });
                          }}
                          style={{
                            padding: '11px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#64748b',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <IonIcon icon={trashOutline} style={{ fontSize: '15px', color: '#ef4444' }} />
                          <span>Eliminar de Base de Datos</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </IonModal>

        {/* Abono Modal */}
        <IonModal isOpen={!!selectedOrderForAbono} onDidDismiss={() => setSelectedOrderForAbono(null)} style={{ '--border-radius': '20px' } as any}>
          {selectedOrderForAbono && (() => {
            const abonoItems = Array.isArray(selectedOrderForAbono.items) ? selectedOrderForAbono.items : [];
            const abonoItemsSum = abonoItems.reduce((acc: number, it: any) => acc + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
            const deliveryFee = Number(selectedOrderForAbono.deliveryFee || 0);
            const grossTotal = abonoItemsSum > 0 ? (abonoItemsSum + deliveryFee) : (Number(selectedOrderForAbono.totalAmount || 0) + Number(selectedOrderForAbono.discountAmount || 0));

            const parsedDiscVal = parseFloat(abonoDiscountValue) || 0;
            let computedDiscountAmount = 0;
            if (parsedDiscVal > 0) {
              if (abonoDiscountType === 'PERCENTAGE') {
                computedDiscountAmount = (abonoItemsSum > 0 ? abonoItemsSum : grossTotal) * (parsedDiscVal / 100);
              } else {
                computedDiscountAmount = parsedDiscVal;
              }
            }
            computedDiscountAmount = Math.min(grossTotal, Math.max(0, computedDiscountAmount));

            const total = Math.max(0, grossTotal - computedDiscountAmount);
            const yaAbonado = Number(selectedOrderForAbono.abonosTotal || 0);
            const restante = Math.max(0, total - yaAbonado);
            const effectiveOrderRate = Number(selectedOrderForAbono.exchangeRate) > 0 ? Number(selectedOrderForAbono.exchangeRate) : (Number(exchangeRate) || 40);
            const restanteBs = restante * effectiveOrderRate;
            const parsedAmount = parseFloat(abonoAmount) || 0;
            const effectiveUsd = abonoCurrency === 'VES' ? (parsedAmount / effectiveOrderRate) : parsedAmount;

            const handleConfirmAbono = async () => {
              if (restante <= 0.001 && computedDiscountAmount > 0 && effectiveUsd <= 0) {
                try {
                  await apiClient.patch(`/orders/${selectedOrderForAbono.id}/discount`, {
                    discountType: abonoDiscountType,
                    discountValue: parsedDiscVal > 0 ? parsedDiscVal : 0,
                    discountAmount: computedDiscountAmount
                  });
                  presentToast({ message: '✓ Descuento aplicado y orden liquidada con éxito', duration: 2500, color: 'success' });
                  setSelectedOrderForAbono(null);
                  fetchOrders();
                  return;
                } catch (err: any) {
                  presentToast({ message: 'Error: ' + (err.response?.data?.message || err.message), duration: 3000, color: 'danger' });
                  return;
                }
              }

              if (effectiveUsd <= 0) {
                presentToast({ message: 'Ingresa un monto válido para el abono', duration: 2500, color: 'warning' });
                return;
              }
              const isTableTab = Boolean(selectedOrderForAbono.tableNumber);
              if (effectiveUsd > restante + 0.05 && !isTableTab) {
                presentToast({ message: `El abono no puede superar el saldo restante (${restante.toFixed(2)})`, duration: 3000, color: 'warning' });
                return;
              }
              if (abonoMethod === 'PAGO_MOVIL' && !abonoRef.trim()) {
                presentToast({ message: 'Por favor indica la referencia del Pago Móvil', duration: 3000, color: 'warning' });
                return;
              }
              if (abonoMethod === 'PUNTO' && !abonoRef.trim()) {
                presentToast({ message: 'Por favor indica el N° de Voucher / Aprobación', duration: 3000, color: 'warning' });
                return;
              }
              if (abonoMethod === 'TRANSFER' && !abonoRef.trim()) {
                presentToast({ message: 'Por favor indica la referencia de la Transferencia', duration: 3000, color: 'warning' });
                return;
              }

              try {
                await apiClient.post(`/orders/${selectedOrderForAbono.id}/abono`, {
                  amount: effectiveUsd,
                  method: abonoMethod,
                  ref: abonoRef.trim() || undefined,
                  bank: normalizeBankName(abonoBank) || undefined,
                  nextAbonoDueDate: abonoNextDueDate || undefined,
                  discountType: parsedDiscVal > 0 ? abonoDiscountType : undefined,
                  discountValue: parsedDiscVal > 0 ? parsedDiscVal : (abonoDiscountValue === '0' ? 0 : undefined),
                });
                presentToast({ message: `✓ ¡Abono de ${effectiveUsd.toFixed(2)} registrado con éxito!`, duration: 2500, color: 'success' });
                setSelectedOrderForAbono(null);
                fetchOrders();
              } catch (err: any) {
                console.error(err);
                presentToast({ message: 'Error registrando abono: ' + (err.response?.data?.message || err.message), duration: 3000, color: 'danger' });
              }
            };

            const handleSaveDiscountOnly = async () => {
              try {
                await apiClient.patch(`/orders/${selectedOrderForAbono.id}/discount`, {
                  discountType: abonoDiscountType,
                  discountValue: parsedDiscVal > 0 ? parsedDiscVal : 0,
                  discountAmount: computedDiscountAmount
                });
                presentToast({ message: '✓ Descuento guardado correctamente', duration: 2500, color: 'success' });
                setSelectedOrderForAbono(null);
                fetchOrders();
              } catch (err: any) {
                presentToast({ message: 'Error guardando descuento: ' + (err.response?.data?.message || err.message), duration: 3000, color: 'danger' });
              }
            };

            return (
              <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                    Registrar Abono
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForAbono(null)}
                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
                  {/* Summary Card */}
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                      {selectedOrderForAbono.customerName || 'Cliente General'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                      Pedido #{selectedOrderForAbono.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '10px', border: '1px solid #EEF2F6' }}>
                        <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: '600' }}>Total</span>
                        <b style={{ fontSize: '13px', color: '#0F172A' }}>${total.toFixed(2)}</b>
                        {computedDiscountAmount > 0 && (
                          <span style={{ fontSize: '9px', color: '#10B981', display: 'block', fontWeight: '700' }}>
                            (Desc. -${computedDiscountAmount.toFixed(2)})
                          </span>
                        )}
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '10px', border: '1px solid #EEF2F6' }}>
                        <span style={{ fontSize: '10px', color: '#64748B', display: 'block', fontWeight: '600' }}>Abonado</span>
                        <b style={{ fontSize: '13px', color: '#059669' }}>${yaAbonado.toFixed(2)}</b>
                      </div>
                      <div style={{ background: '#FFFBEB', padding: '8px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                        <span style={{ fontSize: '10px', color: '#92400E', display: 'block', fontWeight: '700' }}>Resta</span>
                        <b style={{ fontSize: '13px', color: '#D97706' }}>${restante.toFixed(2)}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '11px', color: '#92400E', fontWeight: '700' }}>
                      Resta en {currencySymbol}: {formatLocalAmount(restanteBs)}
                    </div>
                  </div>

                  {/* Sección Descuento Especial */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '12px 14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🏷️ Descuento Especial (Opcional)
                      </span>
                      {computedDiscountAmount > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--theme-primary, #10B981)' }}>
                          - ${computedDiscountAmount.toFixed(2)} USD
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #CBD5E1', overflow: 'hidden', background: '#FFFFFF', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setAbonoDiscountType('FIXED')}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: abonoDiscountType === 'FIXED' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                            color: abonoDiscountType === 'FIXED' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          $ Fijo
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbonoDiscountType('PERCENTAGE')}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: abonoDiscountType === 'PERCENTAGE' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                            color: abonoDiscountType === 'PERCENTAGE' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          % Porc.
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={abonoDiscountType === 'PERCENTAGE' ? '100' : undefined}
                        step="any"
                        value={abonoDiscountValue}
                        onChange={e => {
                          const v = e.target.value;
                          if (abonoDiscountType === 'PERCENTAGE' && Number(v) > 100) {
                            setAbonoDiscountValue('100');
                          } else {
                            setAbonoDiscountValue(v);
                          }
                        }}
                        placeholder={abonoDiscountType === 'FIXED' ? 'Monto ($)' : 'Porcentaje (%)'}
                        style={{
                          flex: 1,
                          minWidth: '0',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#ffffff',
                          color: '#0F172A',
                          outline: 'none'
                        }}
                      />
                      {abonoDiscountValue && (
                        <button
                          type="button"
                          onClick={() => setAbonoDiscountValue('')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#64748B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Quitar descuento"
                        >
                          <IonIcon icon={closeOutline} />
                        </button>
                      )}
                    </div>
                    {computedDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
                        <span>Subtotal original: <b>${grossTotal.toFixed(2)}</b></span>
                        <button
                          type="button"
                          onClick={handleSaveDiscountOnly}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--theme-primary-readable, #065F46)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                            fontSize: '11px'
                          }}
                        >
                          💾 Guardar sólo descuento
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Currency Toggle */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Moneda del Abono
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (abonoCurrency === 'VES' && abonoAmount) {
                            setAbonoAmount((parseFloat(abonoAmount) / effectiveOrderRate).toFixed(2));
                          }
                          setAbonoCurrency('USD');
                        }}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: abonoCurrency === 'USD' ? '2px solid #10B981' : '1px solid #CBD5E1',
                          background: abonoCurrency === 'USD' ? '#ECFDF5' : '#ffffff',
                          color: abonoCurrency === 'USD' ? '#065F46' : '#475569',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        💵 Dólares ($ USD)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (abonoCurrency === 'USD' && abonoAmount) {
                            setAbonoAmount((parseFloat(abonoAmount) * effectiveOrderRate).toFixed(2));
                          }
                          setAbonoCurrency('VES');
                        }}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: abonoCurrency === 'VES' ? '2px solid #10B981' : '1px solid #CBD5E1',
                          background: abonoCurrency === 'VES' ? '#ECFDF5' : '#ffffff',
                          color: abonoCurrency === 'VES' ? '#065F46' : '#475569',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        {currencySymbol === 'COP' ? '🇨🇴 Pesos (COP)' : '🇻🇪 Bolívares (Bs.)'}
                      </button>
                    </div>
                  </div>

                  {/* Monto Input */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Monto a Abonar ({abonoCurrency === 'USD' ? '$ USD' : 'Bs.'}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={abonoAmount}
                      onChange={e => setAbonoAmount(e.target.value)}
                      placeholder={abonoCurrency === 'USD' ? `Ej. ${restante.toFixed(2)}` : `Ej. ${restanteBs.toFixed(2)}`}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '16px', fontWeight: '800', outline: 'none' }}
                    />
                    {effectiveUsd > 0 && (
                      <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '700', marginTop: '4px' }}>
                        {abonoCurrency === 'VES' ? `≈ $${effectiveUsd.toFixed(2)} USD` : `≈ ${formatLocalAmount(effectiveUsd * effectiveOrderRate)}`}
                      </div>
                    )}

                    {/* Quick chips */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {[5, 10, 20].filter(n => n <= restante).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            if (abonoCurrency === 'USD') setAbonoAmount(n.toString());
                            else setAbonoAmount((n * effectiveOrderRate).toFixed(2));
                          }}
                          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '11px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                        >
                          +${n}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (abonoCurrency === 'USD') setAbonoAmount(restante.toFixed(2));
                          else setAbonoAmount(restanteBs.toFixed(2));
                        }}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #A7F3D0', background: '#ECFDF5', fontSize: '11px', fontWeight: '800', color: '#047857', cursor: 'pointer' }}
                      >
                        Liquidar Total (${restante.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Método del Abono */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Método de Pago del Abono
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                      {[
                        { id: 'USD', label: '💵 Divisas ($)' },
                        { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' },
                        { id: 'PUNTO', label: '💳 Punto de Venta' },
                        { id: 'TRANSFER', label: '🏦 Transferencia' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAbonoMethod(m.id)}
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            border: abonoMethod === m.id ? '2px solid #10B981' : '1px solid #CBD5E1',
                            background: abonoMethod === m.id ? '#ECFDF5' : '#ffffff',
                            color: abonoMethod === m.id ? '#065F46' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {(abonoMethod === 'PAGO_MOVIL' || abonoMethod === 'PUNTO' || abonoMethod === 'TRANSFER') && (
                      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                            {abonoMethod === 'PUNTO' ? 'N° de Aprobación del Voucher *' : 'N° Referencia *'}
                          </label>
                          <input
                            type="text"
                            value={abonoRef}
                            onChange={e => setAbonoRef(e.target.value)}
                            placeholder="Ej. 984210"
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <BankSelect
                            size="small"
                            label={abonoMethod === 'PUNTO' ? 'Banco / Punto de Venta' : 'Banco Emisor'}
                            value={abonoBank}
                            onChange={val => setAbonoBank(val)}
                            placeholder={abonoMethod === 'PUNTO' ? 'Selecciona banco del punto...' : 'Selecciona banco emisor...'}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fecha personalizada de próximo abono */}
                  {effectiveUsd < restante - 0.01 && (
                    <div style={{ marginBottom: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#92400E', marginBottom: '4px' }}>
                        ⏰ Fecha de Vencimiento del Próximo Abono (Personalizable)
                      </label>
                      <input
                        type="date"
                        value={abonoNextDueDate}
                        onChange={e => setAbonoNextDueDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FCD34D', fontSize: '13px', fontWeight: '700', background: '#FFFFFF', color: '#0F172A' }}
                      />
                      <span style={{ display: 'block', fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                        Por defecto {systemSettings?.abonoDefaultDueDays || 7} días. Recibirás alerta cuando llegue esta fecha.
                      </span>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <button
                    type="button"
                    onClick={handleConfirmAbono}
                    className="ff-btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}
                  >
                    Confirmar Abono {effectiveUsd > 0 ? `($${effectiveUsd.toFixed(2)})` : ''}
                  </button>
                </div>
              </div>
            );
          })()}
        </IonModal>

        {/* TAREA 3: Modal Limpio de Cobro Directo (Reemplaza alertas anidadas de Ionic) */}
        <IonModal isOpen={!!selectedOrderForCobro} onDidDismiss={() => setSelectedOrderForCobro(null)} style={{ '--border-radius': '20px' } as any}>
          {selectedOrderForCobro && (() => {
            const cobroItems = Array.isArray(selectedOrderForCobro.items) ? selectedOrderForCobro.items : [];
            const cobroItemsSum = cobroItems.reduce((acc: number, it: any) => acc + (Number(it.subtotal) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
            const deliveryFee = Number(selectedOrderForCobro.deliveryFee || 0);
            const grossTotal = cobroItemsSum > 0 ? (cobroItemsSum + deliveryFee) : (Number(selectedOrderForCobro.totalAmount || 0) + Number(selectedOrderForCobro.discountAmount || 0));

            const parsedDiscVal = parseFloat(cobroDiscountValue) || 0;
            let computedDiscountAmount = 0;
            if (parsedDiscVal > 0) {
              if (cobroDiscountType === 'PERCENTAGE') {
                computedDiscountAmount = (cobroItemsSum > 0 ? cobroItemsSum : grossTotal) * (parsedDiscVal / 100);
              } else {
                computedDiscountAmount = parsedDiscVal;
              }
            }
            computedDiscountAmount = Math.min(grossTotal, Math.max(0, computedDiscountAmount));

            const total = Math.max(0, grossTotal - computedDiscountAmount);
            const yaAbonado = Number(selectedOrderForCobro.abonosTotal || 0);
            const restante = Math.max(0, total - yaAbonado);
            const effectiveOrderRate = Number(selectedOrderForCobro.exchangeRate) > 0 ? Number(selectedOrderForCobro.exchangeRate) : (Number(exchangeRate) || 40);
            const restanteBs = Number((restante * effectiveOrderRate).toFixed(2));

            const handleConfirmCobro = async () => {
              const discountPayload = {
                discountType: parsedDiscVal > 0 ? cobroDiscountType : undefined,
                discountValue: parsedDiscVal > 0 ? parsedDiscVal : (cobroDiscountValue === '0' ? 0 : undefined),
                discountAmount: computedDiscountAmount
              };

              if (cobroMethod === 'USD') {
                const received = parseFloat(cobroUsdReceived);
                if (!received || received < restante) {
                  presentToast({ message: 'El monto recibido debe ser mayor o igual al saldo restante', duration: 3000, color: 'warning' });
                  return;
                }
                const changeUsd = received - restante;
                const changeBs = changeUsd * effectiveOrderRate;
                try {
                  await apiClient.patch(`/orders/${selectedOrderForCobro.id}/payment`, {
                    status: PaymentStatus.PAID,
                    paymentMethod: 'USD',
                    usdReceived: received,
                    changeAmount: changeUsd > 0 ? changeUsd : undefined,
                    changeAmountBs: changeBs > 0 ? changeBs : undefined,
                    changeMethod: changeUsd > 0 ? 'CASH_BS' : undefined,
                    ...discountPayload,
                    notes: (selectedOrderForCobro.notes ? selectedOrderForCobro.notes + '\n' : '') + `Pago USD: ${restante.toFixed(2)} | Recibido: ${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`
                  });
                  presentToast({ message: 'Pago en USD registrado', duration: 2000, color: 'success' });
                  setSelectedOrderForCobro(null);
                  fetchOrders();
                } catch (e: any) {
                  presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
                }
              } else if (cobroMethod === 'PAGO_MOVIL') {
                if (!cobroRef.trim()) {
                  presentToast({ message: 'La referencia del Pago Móvil es obligatoria', duration: 3000, color: 'warning' });
                  return;
                }
                try {
                  await apiClient.patch(`/orders/${selectedOrderForCobro.id}/payment`, {
                    status: PaymentStatus.PAID,
                    paymentMethod: 'PAGO_MOVIL',
                    pagoMovilRef: cobroRef.trim(),
                    pagoMovilBank: normalizeBankName(cobroBank) || 'Pago Móvil',
                    amountBs: restanteBs,
                    exchangeRate: effectiveOrderRate,
                    ...discountPayload
                  });
                  presentToast({ message: 'Pago móvil registrado con éxito', duration: 2000, color: 'success' });
                  setSelectedOrderForCobro(null);
                  fetchOrders();
                } catch (e: any) {
                  presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
                }
              } else if (cobroMethod === 'PUNTO') {
                if (!cobroRef.trim()) {
                  presentToast({ message: 'El N° de Aprobación del Voucher es obligatorio', duration: 3000, color: 'warning' });
                  return;
                }
                try {
                  await apiClient.patch(`/orders/${selectedOrderForCobro.id}/payment`, {
                    status: PaymentStatus.PAID,
                    paymentMethod: 'PUNTO',
                    puntoRef: cobroRef.trim(),
                    puntoBank: normalizeBankName(cobroBank) || 'Punto de Venta',
                    pagoMovilRef: cobroRef.trim(),
                    pagoMovilBank: normalizeBankName(cobroBank) || 'Punto de Venta',
                    amountBs: restanteBs,
                    exchangeRate: effectiveOrderRate,
                    ...discountPayload
                  });
                  presentToast({ message: 'Pago por Punto de Venta registrado', duration: 2000, color: 'success' });
                  setSelectedOrderForCobro(null);
                  fetchOrders();
                } catch (e: any) {
                  presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
                }
              } else if (cobroMethod === 'TRANSFER') {
                if (!cobroRef.trim()) {
                  presentToast({ message: 'El N° de Transferencia es obligatorio', duration: 3000, color: 'warning' });
                  return;
                }
                try {
                  await apiClient.patch(`/orders/${selectedOrderForCobro.id}/payment`, {
                    status: PaymentStatus.PAID,
                    paymentMethod: 'TRANSFER',
                    transferRef: cobroRef.trim(),
                    transferBank: normalizeBankName(cobroBank) || 'Transferencia',
                    amountBs: restanteBs,
                    exchangeRate: effectiveOrderRate,
                    ...discountPayload
                  });
                  presentToast({ message: 'Transferencia registrada con éxito', duration: 2000, color: 'success' });
                  setSelectedOrderForCobro(null);
                  fetchOrders();
                } catch (e: any) {
                  presentToast({ message: 'Error registrando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
                }
              }
            };

            const receivedNum = parseFloat(cobroUsdReceived) || 0;
            const vueltoUsd = Math.max(0, receivedNum - restante);
            const vueltoBs = vueltoUsd * effectiveOrderRate;

            return (
              <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                      Cobrar Pedido #{selectedOrderForCobro.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {selectedOrderForCobro.customerName || 'Cliente General'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForCobro(null)}
                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
                  {/* Total Banner */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>SALDO RESTANTE</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#10B981' }}>${restante.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>EN MONEDA LOCAL</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{currencySymbol} {restanteBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  {/* Sección Descuento Especial */}
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🏷️ Descuento Especial (Opcional)
                      </span>
                      {computedDiscountAmount > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--theme-primary, #10B981)' }}>
                          - ${computedDiscountAmount.toFixed(2)} USD
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #CBD5E1', overflow: 'hidden', background: '#FFFFFF', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setCobroDiscountType('FIXED')}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: cobroDiscountType === 'FIXED' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                            color: cobroDiscountType === 'FIXED' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          $ Fijo
                        </button>
                        <button
                          type="button"
                          onClick={() => setCobroDiscountType('PERCENTAGE')}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            background: cobroDiscountType === 'PERCENTAGE' ? 'var(--theme-primary, #10B981)' : '#ffffff',
                            color: cobroDiscountType === 'PERCENTAGE' ? 'var(--theme-primary-contrast, #ffffff)' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          % Porc.
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={cobroDiscountType === 'PERCENTAGE' ? '100' : undefined}
                        step="any"
                        value={cobroDiscountValue}
                        onChange={e => {
                          const v = e.target.value;
                          if (cobroDiscountType === 'PERCENTAGE' && Number(v) > 100) {
                            setCobroDiscountValue('100');
                          } else {
                            setCobroDiscountValue(v);
                          }
                        }}
                        placeholder={cobroDiscountType === 'FIXED' ? 'Monto ($)' : 'Porcentaje (%)'}
                        style={{
                          flex: 1,
                          minWidth: '0',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#ffffff',
                          color: '#0F172A',
                          outline: 'none'
                        }}
                      />
                      {cobroDiscountValue && (
                        <button
                          type="button"
                          onClick={() => setCobroDiscountValue('')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#64748B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Quitar descuento"
                        >
                          <IonIcon icon={closeOutline} />
                        </button>
                      )}
                    </div>
                    {computedDiscountAmount > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
                        Subtotal original: <b>${grossTotal.toFixed(2)}</b> (Descuento de ${computedDiscountAmount.toFixed(2)} aplicado)
                      </div>
                    )}
                  </div>

                  {/* Método Selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                      Forma de Cobro:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'USD', label: '💵 Divisas USD' },
                        { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' },
                        { id: 'PUNTO', label: '💳 Punto de Venta' },
                        { id: 'TRANSFER', label: '🏦 Transferencia' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCobroMethod(m.id as any)}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: cobroMethod === m.id ? '2px solid #10B981' : '1px solid #CBD5E1',
                            background: cobroMethod === m.id ? '#ECFDF5' : '#ffffff',
                            color: cobroMethod === m.id ? '#065F46' : '#475569',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inputs específicos según método */}
                  {cobroMethod === 'USD' && (
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                        Monto Recibido en Dólares ($) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={cobroUsdReceived}
                        onChange={e => setCobroUsdReceived(e.target.value)}
                        placeholder={`Mínimo $${restante.toFixed(2)}`}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}
                      />
                      {receivedNum >= restante && (
                        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#065F46' }}>
                          <b>Vuelto a dar:</b> ${vueltoUsd.toFixed(2)} (Bs. {vueltoBs.toFixed(2)})
                        </div>
                      )}
                    </div>
                  )}

                  {(cobroMethod === 'PAGO_MOVIL' || cobroMethod === 'PUNTO' || cobroMethod === 'TRANSFER') && (
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                          {cobroMethod === 'PUNTO' ? 'N° de Aprobación del Voucher *' : 'N° de Referencia *'}
                        </label>
                        <input
                          type="text"
                          value={cobroRef}
                          onChange={e => setCobroRef(e.target.value)}
                          placeholder="Ej. 649201"
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <BankSelect
                          label={cobroMethod === 'PUNTO' ? 'Banco / Punto de Venta' : 'Banco Emisor'}
                          value={cobroBank}
                          onChange={val => setCobroBank(val)}
                          placeholder={cobroMethod === 'PUNTO' ? 'Selecciona banco del punto...' : 'Selecciona banco emisor...'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const ord = selectedOrderForCobro;
                        setSelectedOrderForCobro(null);
                        openAbonoModal(ord);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid #FCD34D',
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Registrar Abono Parcial
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCobro}
                      className="ff-btn-primary"
                      style={{ flex: 1, padding: '14px', fontSize: '15px', justifyContent: 'center' }}
                    >
                      Confirmar Cobro ✓
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </IonModal>

        <FiscalReceiptModal
          isOpen={showFiscalReceiptModal}
          onClose={() => {
            setShowFiscalReceiptModal(false);
            setActiveFiscalReceipt(null);
          }}
          invoice={activeFiscalReceipt}
          settings={systemSettings}
        />

        <PartialDeliveryModal
          order={selectedOrderForPartial}
          isOpen={!!selectedOrderForPartial}
          onClose={() => setSelectedOrderForPartial(null)}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Orders;
