import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonSearchbar,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import {
  cartOutline,
  logoWhatsapp,
  addOutline,
  removeOutline,
  trashOutline,
  checkmarkCircleOutline,
  closeOutline,
  storefrontOutline,
  bicycleOutline,
  copyOutline,
  refreshOutline,
  checkmarkDoneOutline,
  searchOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useImageViewer } from '../context/ImageViewerContext';
import { requestAndSubscribePush } from '../services/push-notification.service';
import { CustomerNotificationPrompt } from '../components/CustomerNotificationPrompt';
import { formatWhatsAppUrl } from '../utils/whatsapp';
import { playNotificationSound } from '../utils/audio';
import { BankSelect } from '../components/BankSelect';
import { getContrastColor, ensureReadableColor, applyThemeToDom, resetToDefaultTheme } from '../utils/colors';
import { normalizeCedula, analyzeCedulaInput, type CedulaPrefix } from '../utils/cedula';
import { formatTime12h } from '../utils/time';
import { getBaseURL } from '../api/client';

const apiBase = getBaseURL();

interface StoreProductVariant {
  id: string;
  name: string;
  sku?: string;
  stockQuantity: number;
  priceOverride?: number | null;
  images?: string[];
  isOutOfStock?: boolean;
}

interface StoreProduct {
  id: string;
  name: string;
  code?: string;
  description: string;
  category: string;
  salePrice: number;
  images: string[];
  hasVariants?: boolean;
  variants?: StoreProductVariant[];
  stockQuantity: number;
  stock?: number;
  isService: boolean;
  isOutOfStock: boolean;
  availabilityType?: 'INMEDIATO' | 'BAJO_ENCARGO';
  isSupplierPreorder?: boolean;
  product_type?: string;
  isCombo?: boolean;
  isPreAssembled?: boolean;
  isMadeToOrder?: boolean;
}

const isProductMadeToOrder = (p: StoreProduct) => {
  if (p.isMadeToOrder) return true;
  if (p.isPreAssembled === false) return true;
  if (p.product_type === 'FORMULA') return true;
  if (p.category && /comida|alimento|hamburguesa|snack|bebida|preparad|postre|restaurante/i.test(p.category)) return true;
  return false;
};

const getAvailableStock = (p: StoreProduct, variant?: StoreProductVariant) => {
  if (isProductMadeToOrder(p)) return 999;
  if (variant) {
    return Math.max(0, Number(variant.stockQuantity || 0));
  }
  return Math.max(0, Number(p.stock !== undefined && p.stock !== null ? p.stock : (p.stockQuantity || 0)));
};

interface DeliveryZone {
  id: string;
  name: string;
  feePrice: number;
}

interface CartItem {
  cartKey: string;
  product: StoreProduct;
  variant?: StoreProductVariant;
  unitPrice: number;
  quantity: number;
}

const PublicStore: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { openImage } = useImageViewer();
  const [presentToast] = useIonToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [activeImageByProduct, setActiveImageByProduct] = useState<Record<string, string>>({});

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'IN_STORE' | 'DELIVERY'>('IN_STORE');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState<'PAGO_MOVIL' | 'USD' | 'CASH_COP' | 'TRANSFER_COP' | 'TRANSFER' | 'BINANCE' | 'WHATSAPP' | 'PENDING'>('PAGO_MOVIL');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [originBank, setOriginBank] = useState('');
  const [binanceRef, setBinanceRef] = useState('');
  const [cashReceivedAmount, setCashReceivedAmount] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Submission & Tracking state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [reservedPaymentOrder, setReservedPaymentOrder] = useState<any | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [activeOrderMini, setActiveOrderMini] = useState<any | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<string | null>(null);
  const [livePaymentStatus, setLivePaymentStatus] = useState<string>('PENDING');

  // Order Abono / Payment Reporting Modal state
  const [showOrderPaymentModal, setShowOrderPaymentModal] = useState(false);
  const [orderPaymentType, setOrderPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [orderPaymentAmount, setOrderPaymentAmount] = useState<string>('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>('PAGO_MOVIL');
  const [orderPaymentOriginBank, setOrderPaymentOriginBank] = useState<string>('');
  const [orderPaymentRef, setOrderPaymentRef] = useState<string>('');
  const [orderPaymentNotes, setOrderPaymentNotes] = useState<string>('');
  const [isSubmittingOrderPayment, setIsSubmittingOrderPayment] = useState(false);
  const [showOrderPaymentHistory, setShowOrderPaymentHistory] = useState(false);

  // Track Order Modal state
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const getOrderStorageKey = (tid?: string) => `finowork_active_order_${tid || tenantId}`;

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawCode = trackOrderCode.trim();
    const cleanCode = rawCode.replace(/^#/, '').replace(/^(ord|ped)[-_]?/i, '').trim();
    const cleanPh = trackPhone.trim();

    if (!cleanCode) {
      setTrackError('Por favor ingresa tu código de pedido (ej: #ORD-4F7380 o 4F7380)');
      return;
    }
    if (!cleanPh) {
      setTrackError('Por favor ingresa tu teléfono o cédula registrada (o los últimos 4 dígitos)');
      return;
    }

    try {
      setIsTrackingLoading(true);
      setTrackError(null);
      const res = await axios.post(`${apiBase}/public/store/tenant/${tenantId}/track`, {
        orderCode: cleanCode,
        phone: cleanPh,
      });

      if (res.data?.orderId || res.data?.id) {
        const orderIdVal = res.data.orderId || res.data.id;
        const fullOrder = {
          ...res.data,
          orderId: orderIdVal,
          orderNumber: res.data.orderNumber || orderIdVal.slice(0, 8).toUpperCase(),
          items: (res.data.items || []).map((it: any) => ({
            quantity: it.quantity,
            product: it.product || { name: 'Producto', salePrice: 0 },
          })),
          grandTotalUSD: Number(res.data.grandTotalUSD || res.data.totalAmount || 0),
          grandTotalBs: Number(res.data.grandTotalBs || res.data.amountBs || 0),
          deliveryFeeUSD: Number(res.data.deliveryFeeUSD || 0),
          customerAddress: res.data.customerAddress || '',
          customerCedula: res.data.customerCedula || res.data.identification || '',
        };

        setActiveOrderMini(fullOrder);
        try {
          localStorage.setItem(getOrderStorageKey(), JSON.stringify(fullOrder));
        } catch (err) {}

        setOrderResult(fullOrder);
        setLiveOrderStatus(fullOrder.status);
        setLivePaymentStatus(fullOrder.paymentStatus || 'PENDING');

        try {
          const url = new URL(window.location.href);
          url.searchParams.set('orderId', orderIdVal);
          window.history.replaceState({}, '', url.toString());
        } catch (err) {}

        setIsTrackModalOpen(false);
        setTrackOrderCode('');
        setTrackPhone('');
        presentToast({
          message: `¡Pedido #${fullOrder.orderNumber} localizado con éxito!`,
          duration: 3000,
          color: 'success',
          position: 'top',
        });
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.message;
      const msg = Array.isArray(rawMsg) ? rawMsg[0] : (rawMsg || 'No se encontró ningún pedido con esos datos o el teléfono/cédula no coincide.');
      setTrackError(msg);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: string, showConfirmationScreen: boolean = true) => {
    try {
      const res = await axios.get(`${apiBase}/public/store/order/${orderId}`);
      if (res.data?.orderId || res.data?.id) {
        const orderIdVal = res.data.orderId || res.data.id;
        const fullOrder = {
          ...res.data,
          orderId: orderIdVal,
          orderNumber: res.data.orderNumber || orderIdVal.slice(0, 8).toUpperCase(),
          items: (res.data.items || []).map((it: any) => ({
            quantity: it.quantity,
            product: it.product || { name: 'Producto', salePrice: 0 },
          })),
          grandTotalUSD: Number(res.data.grandTotalUSD || res.data.totalAmount || 0),
          grandTotalBs: Number(res.data.grandTotalBs || res.data.amountBs || 0),
          deliveryFeeUSD: Number(res.data.deliveryFeeUSD || 0),
          customerAddress: res.data.customerAddress || '',
          customerCedula: res.data.customerCedula || res.data.identification || '',
        };

        setActiveOrderMini(fullOrder);
        try {
          localStorage.setItem(getOrderStorageKey(), JSON.stringify(fullOrder));
        } catch (e) {}

        if (showConfirmationScreen) {
          setOrderResult(fullOrder);
          setLiveOrderStatus(fullOrder.status);
          setLivePaymentStatus(fullOrder.paymentStatus || 'PENDING');
          try {
            const url = new URL(window.location.href);
            if (url.searchParams.get('orderId') !== orderIdVal) {
              url.searchParams.set('orderId', orderIdVal);
              window.history.replaceState({}, '', url.toString());
            }
          } catch (e) {}
        }
        return fullOrder;
      }
    } catch (err) {
      console.warn('No se pudo cargar el pedido:', err);
    }
    return null;
  };

  const fetchStore = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBase}/public/store/tenant/${tenantId}`);
      if (res.data?.isSuspended) {
        setStoreData(res.data);
        setLoading(false);
        return;
      }
      if (res.data?.settings?.featureShowCatalog === false) {
        setErrorMsg('El catálogo online se encuentra temporalmente desactivado');
        setLoading(false);
        return;
      }
      setStoreData(res.data);
      setProducts(res.data.products || []);
      setDeliveryZones(res.data.deliveryZones || []);
      setCategories(res.data.categories || []);
      if (res.data.deliveryZones?.length > 0) {
        setSelectedZoneId(res.data.deliveryZones[0].id);
      }

      if (res.data?.settings) {
        const s = res.data.settings;
        if (s.acceptPagoMovil !== false) setPaymentOption('PAGO_MOVIL');
        else if (s.acceptCashUsd !== false) setPaymentOption('USD');
        else if (s.acceptTransfer === true) setPaymentOption('TRANSFER');
        else if (s.acceptBinance === true) setPaymentOption('BINANCE');
        else setPaymentOption('WHATSAPP');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'No se pudo cargar la tienda. Verifica el enlace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchStore();

      // Check if URL specifies orderId to restore confirmation view, or check localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrderId = urlParams.get('orderId');

      if (urlOrderId) {
        loadOrderDetails(urlOrderId, true);
      } else {
        try {
          const saved = localStorage.getItem(getOrderStorageKey(tenantId));
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.orderId || parsed.id)) {
              const oid = parsed.orderId || parsed.id;
              setActiveOrderMini(parsed);
              loadOrderDetails(oid, false);
            }
          }
        } catch (e) {}
      }
    }
  }, [tenantId]);

  // Preload customer data from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flujofino_customer_data') || localStorage.getItem('lastBookingCustomer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
        if (parsed.cedula || parsed.identification) setCustomerCedula(parsed.cedula || parsed.identification);
        if (parsed.address) setCustomerAddress(parsed.address);
        if (parsed.zoneId) setSelectedZoneId(parsed.zoneId);
      }
    } catch (e) {}
  }, []);

  // Live order status tracking with audible chime
  useEffect(() => {
    if (!orderResult?.orderId) return;

    let isMounted = true;
    let currentStatus = orderResult.status || 'PENDING';
    setLiveOrderStatus(currentStatus);
    setLivePaymentStatus(orderResult.paymentStatus || 'PENDING');

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiBase}/public/store/order/${orderResult.orderId}`);
        if (!isMounted) return;
        const newStatus = res.data?.status;
        const newPayStatus = res.data?.paymentStatus;

        if (newPayStatus) {
          setLivePaymentStatus(newPayStatus);
        }

        if (res.data) {
          setOrderResult((prev: any) => prev ? {
            ...prev,
            ...res.data,
            status: newStatus || prev?.status,
            paymentStatus: newPayStatus || prev?.paymentStatus,
          } : prev);
          setActiveOrderMini((prev: any) => {
            const updated = {
              ...prev,
              ...res.data,
              status: newStatus || prev?.status,
              paymentStatus: newPayStatus || prev?.paymentStatus,
            };
            try {
              localStorage.setItem(getOrderStorageKey(), JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        if (newStatus && newStatus !== currentStatus) {
          currentStatus = newStatus;
          setLiveOrderStatus(newStatus);
          playNotificationSound();
          presentToast({
            message: `🔔 ¡Estado actualizado: ${getStatusLabel(newStatus)}!`,
            duration: 4000,
            color: 'success',
            position: 'top',
          });
        }
      } catch (err) {}
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderResult?.orderId]);

  const openOrderPaymentModal = () => {
    const totalAmt = Number(orderResult?.grandTotalUSD || orderResult?.totalAmount || 0);
    const abonosAmt = Number(orderResult?.abonosTotal || 0);
    const remaining = Math.max(0, Math.round((totalAmt - abonosAmt) * 100) / 100);
    setOrderPaymentType('FULL');
    setOrderPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setOrderPaymentRef('');
    setOrderPaymentNotes('');
    setOrderPaymentOriginBank('');
    if (storeData?.settings?.acceptPagoMovil !== false) {
      setOrderPaymentMethod('PAGO_MOVIL');
    } else if (storeData?.settings?.acceptTransfer === true) {
      setOrderPaymentMethod('TRANSFER');
    } else if (storeData?.settings?.acceptBinance === true) {
      setOrderPaymentMethod('BINANCE');
    } else {
      setOrderPaymentMethod('PAGO_MOVIL');
    }
    setShowOrderPaymentModal(true);
  };

  const handleOrderPaymentTypeChange = (type: 'FULL' | 'PARTIAL') => {
    setOrderPaymentType(type);
    const totalAmt = Number(orderResult?.grandTotalUSD || orderResult?.totalAmount || 0);
    const abonosAmt = Number(orderResult?.abonosTotal || 0);
    const remaining = Math.max(0, Math.round((totalAmt - abonosAmt) * 100) / 100);
    if (type === 'FULL') {
      setOrderPaymentAmount(remaining > 0 ? remaining.toString() : '');
    } else {
      const half = Math.round((remaining * 0.5) * 100) / 100;
      setOrderPaymentAmount(half > 0 ? half.toString() : '');
    }
  };

  const handleOrderPaymentSubmit = async () => {
    if (!orderResult?.orderId) return;
    const amt = parseFloat(orderPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      presentToast({ message: 'Ingresa un monto válido mayor a 0', duration: 3000, color: 'warning' });
      return;
    }
    if (!orderPaymentRef.trim()) {
      presentToast({ message: 'Por favor, ingresa el número de referencia del comprobante', duration: 3000, color: 'warning' });
      return;
    }

    setIsSubmittingOrderPayment(true);
    try {
      const rate = Number(storeData?.settings?.exchangeRateBs || orderResult?.exchangeRate || 40);
      const amtBs = Math.round(amt * rate * 100) / 100;
      const res = await axios.post(`${apiBase}/public/store/order/${orderResult.orderId}/payment`, {
        amount: amt,
        amountBs: amtBs,
        method: orderPaymentMethod,
        reference: orderPaymentRef.trim(),
        bank: orderPaymentOriginBank.trim() || undefined,
        notes: orderPaymentNotes.trim() || undefined,
      });

      if (res.data) {
        setOrderResult((prev: any) => prev ? { ...prev, ...res.data } : res.data);
        setActiveOrderMini((prev: any) => prev ? { ...prev, ...res.data } : res.data);
      }
      presentToast({
        message: '✓ ¡Abono / Pago reportado con éxito! El negocio verificará tu comprobante.',
        duration: 4000,
        color: 'success',
      });
      setShowOrderPaymentModal(false);
      setOrderPaymentRef('');
      setOrderPaymentNotes('');
      setOrderPaymentOriginBank('');
      await loadOrderDetails(orderResult.orderId, true);
    } catch (e: any) {
      presentToast({
        message: e.response?.data?.message || 'Error al reportar el abono / pago',
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSubmittingOrderPayment(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SOLICITUD_ENCARGO':
        return '📋 Solicitud de encargo recibida (Verificando con proveedor)';
      case 'PENDIENTE_PAGO':
        return '💳 Disponibilidad confirmada (Pendiente de pago)';
      case 'CANCELADO_PROVEEDOR':
        return '❌ Agotado en distribuidor / proveedor';
      case 'PENDING':
        return '🕒 Esperando confirmación';
      case 'PREPARING':
      case 'IN_PROGRESS':
        return '👨‍🍳 En preparación';
      case 'READY':
        return '✅ ¡Listo para retirar en tienda!';
      case 'DELIVERING':
      case 'ON_THE_WAY':
        return '🛵 ¡Tu pedido va en camino!';
      case 'COMPLETED':
        return '🎉 ¡Pedido entregado con éxito!';
      case 'CANCELED':
        return '❌ Pedido cancelado';
      default:
        return status;
    }
  };

  const cedulaAnalysis = useMemo(() => analyzeCedulaInput(customerCedula), [customerCedula]);

  const handleCedulaInput = (val: string) => {
    setCustomerCedula(val);
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 5) {
      try {
        const saved = localStorage.getItem('flujofino_customer_data') || localStorage.getItem('lastBookingCustomer');
        if (saved) {
          const parsed = JSON.parse(saved);
          const savedCedula = parsed.cedula || parsed.identification || '';
          if (savedCedula && savedCedula.replace(/\D/g, '') === digits) {
            if (parsed.name && !customerName) setCustomerName(parsed.name);
            if (parsed.phone && !customerPhone) setCustomerPhone(parsed.phone);
            if (parsed.address && !customerAddress) setCustomerAddress(parsed.address);
            if (parsed.zoneId && !selectedZoneId) setSelectedZoneId(parsed.zoneId);
          }
        }
      } catch (e) {}
    }
  };

  const handleCedulaBlur = () => {
    if (customerCedula.trim()) {
      const norm = normalizeCedula(customerCedula);
      if (norm) setCustomerCedula(norm);
    }
  };

  const applyCedulaPrefix = (prefix: CedulaPrefix) => {
    const digits = customerCedula.replace(/\D/g, '');
    setCustomerCedula(digits ? `${prefix}-${digits}` : `${prefix}-`);
  };

  // Calculations
  const exchangeRate = Number(storeData?.settings?.exchangeRateBs || 40.0);
  const enableCopCurrency = Boolean(storeData?.settings?.enableCopCurrency);
  const exchangeRateCop = Number(storeData?.settings?.exchangeRateCop || 4000);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      if (p.isService) return false;
      if (p.category?.toLowerCase() === 'servicios') return false;
      const matchCat =
        selectedCategory === 'TODOS' ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchVariant = Boolean(
        p.hasVariants &&
        Array.isArray(p.variants) &&
        p.variants.some((v) => v.name?.toLowerCase().includes(q) || v.sku?.toLowerCase().includes(q))
      );
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        Boolean(p.code && p.code.toLowerCase().includes(q)) ||
        p.description?.toLowerCase().includes(q) ||
        matchVariant;
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotalUSD = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const deliveryFeeUSD = useMemo(() => {
    if (deliveryMethod !== 'DELIVERY') return 0;
    const zone = deliveryZones.find((z) => z.id === selectedZoneId);
    return zone ? Number(zone.feePrice) : 0;
  }, [deliveryMethod, deliveryZones, selectedZoneId]);

  const rawCartTotalUSD = cartSubtotalUSD + deliveryFeeUSD;
  const grandTotalUSD = reservedPaymentOrder
    ? Number(reservedPaymentOrder.grandTotalUSD || reservedPaymentOrder.totalAmount || 0)
    : rawCartTotalUSD;
  const grandTotalBs = reservedPaymentOrder
    ? Number(reservedPaymentOrder.grandTotalBs || reservedPaymentOrder.totalAmountBs || grandTotalUSD * exchangeRate)
    : grandTotalUSD * exchangeRate;
  const grandTotalCop = reservedPaymentOrder
    ? Number(reservedPaymentOrder.totalAmountCop || Math.round(grandTotalUSD * exchangeRateCop))
    : Math.round(grandTotalUSD * exchangeRateCop);

  const hasBajoEncargo = useMemo(() => cart.some((i) => i.product.availabilityType === 'BAJO_ENCARGO'), [cart]);
  const hasSupplierPreorder = useMemo(() => cart.some((i) => i.product.isSupplierPreorder), [cart]);

  const handleAddToCart = (product: StoreProduct, variant?: StoreProductVariant) => {
    const isExempt = product.availabilityType === 'BAJO_ENCARGO' || product.isSupplierPreorder || isProductMadeToOrder(product);
    const availableStock = getAvailableStock(product, variant);
    const isOut = variant ? (availableStock <= 0) : product.isOutOfStock;

    if (isOut && !isExempt) {
      presentToast({
        message: 'Esta opción está agotada por el momento.',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    const cartKey = variant ? `${product.id}__${variant.id}` : product.id;
    const existingIndex = cart.findIndex((i) => i.cartKey === cartKey);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    // Check inventory availability
    if (!isExempt && !product.isService && currentQtyInCart + 1 > availableStock) {
      presentToast({
        message: `Solo quedan ${availableStock} unidades disponibles de "${product.name}${variant ? ` (${variant.name})` : ''}".`,
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    const effectivePrice =
      variant && variant.priceOverride !== undefined && variant.priceOverride !== null
        ? Number(variant.priceOverride)
        : Number(product.salePrice || 0);

    if (existingIndex > -1) {
      const nextCart = [...cart];
      nextCart[existingIndex].quantity += 1;
      setCart(nextCart);
    } else {
      setCart([...cart, { cartKey, product, variant, unitPrice: effectivePrice, quantity: 1 }]);
    }

    presentToast({
      message: `"${product.name}${variant ? ` (${variant.name})` : ''}" agregado al carrito`,
      duration: 1500,
      color: 'success',
    });
  };

  const handleUpdateQuantity = (cartKey: string, delta: number) => {
    const existingIndex = cart.findIndex((i) => i.cartKey === cartKey);
    if (existingIndex === -1) return;

    const item = cart[existingIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.cartKey !== cartKey));
      return;
    }

    const isExempt = item.product.availabilityType === 'BAJO_ENCARGO' || item.product.isSupplierPreorder || isProductMadeToOrder(item.product);
    const availableStock = getAvailableStock(item.product, item.variant);

    if (delta > 0 && !isExempt && !item.product.isService && newQty > availableStock) {
      presentToast({
        message: `Límite alcanzado: solo hay ${availableStock} unidades disponibles de "${item.product.name}${item.variant ? ` (${item.variant.name})` : ''}".`,
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    const nextCart = [...cart];
    nextCart[existingIndex].quantity = newQty;
    setCart(nextCart);
  };

  const handleRemoveItem = (cartKey: string) => {
    setCart(cart.filter((i) => i.cartKey !== cartKey));
  };

  // Paso 1: Al darle al botón de Pagar, apartar condicionalmente los productos del carrito en inventario
  const handleCheckout = async () => {
    if (submittingRef.current || isSubmitting) return;

    if (!customerName.trim()) {
      presentToast({ message: 'Por favor ingresa tu nombre', duration: 2500, color: 'warning' });
      return;
    }
    if (!customerPhone.trim()) {
      presentToast({ message: 'Por favor ingresa tu número de WhatsApp / Teléfono', duration: 2500, color: 'warning' });
      return;
    }
    if (deliveryMethod === 'DELIVERY' && !customerAddress.trim()) {
      presentToast({ message: 'Por favor ingresa la dirección de entrega', duration: 2500, color: 'warning' });
      return;
    }
    if (cart.length === 0) {
      presentToast({ message: 'El carrito está vacío', duration: 2000, color: 'warning' });
      return;
    }
    if (hasBajoEncargo && !requestedDeliveryDate.trim()) {
      presentToast({ message: 'Por favor indica la fecha y hora para cuándo necesitas tu encargo', duration: 3000, color: 'warning' });
      return;
    }

    for (const item of cart) {
      const isExempt = item.product.availabilityType === 'BAJO_ENCARGO' || item.product.isSupplierPreorder || isProductMadeToOrder(item.product);
      const avail = getAvailableStock(item.product, item.variant);
      if (!isExempt && !item.product.isService && item.quantity > avail) {
        presentToast({
          message: `El producto "${item.product.name}${item.variant ? ` (${item.variant.name})` : ''}" solo tiene ${avail} unidades disponibles. Por favor ajusta la cantidad.`,
          duration: 3500,
          color: 'warning',
        });
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const normalizedCustomerCedula = customerCedula.trim() ? normalizeCedula(customerCedula) : '';
      if (normalizedCustomerCedula && normalizedCustomerCedula !== customerCedula) {
        setCustomerCedula(normalizedCustomerCedula);
      }

      const deliveryDateNote = requestedDeliveryDate.trim() ? (
        (() => {
          const parts = requestedDeliveryDate.split('T');
          const datePart = parts[0] || '';
          const timePart = parts[1] ? ` (${formatTime12h(parts[1])})` : '';
          return `Fecha requerida: ${datePart}${timePart}`;
        })()
      ) : '';
      const cedulaNote = normalizedCustomerCedula ? `Cédula: ${normalizedCustomerCedula}` : '';
      const preorderNote = hasSupplierPreorder ? 'MÉTODO: Solicitud de Encargo (Pago tras confirmación de proveedor)' : '';
      const initialNotes = [notes.trim(), deliveryDateNote, cedulaNote, preorderNote].filter(Boolean).join(' | ');

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerCedula: normalizedCustomerCedula || undefined,
        identification: normalizedCustomerCedula || undefined,
        pagoMovilCedula: normalizedCustomerCedula || undefined,
        deliveryMethod,
        deliveryZoneId: deliveryMethod === 'DELIVERY' ? selectedZoneId : undefined,
        customerAddress: deliveryMethod === 'DELIVERY' ? customerAddress.trim() : undefined,
        requestedDeliveryDate: requestedDeliveryDate.trim() ? new Date(requestedDeliveryDate).toISOString() : undefined,
        status: hasSupplierPreorder ? 'SOLICITUD_ENCARGO' : undefined,
        notes: initialNotes,
        paymentMethod: 'PENDING',
        exchangeRate,
        amountBs: grandTotalBs,
        exchangeRateCop: enableCopCurrency ? exchangeRateCop : undefined,
        amountCop: enableCopCurrency ? grandTotalCop : undefined,
        items: cart.map((i) => ({
          productId: i.product.id,
          variantId: i.variant?.id || undefined,
          variantName: i.variant?.name || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await axios.post(`${apiBase}/public/store/tenant/${tenantId}/order`, payload);
      const createdOrderData = {
        ...res.data,
        orderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
        items: cart.map((i) => ({
          quantity: i.quantity,
          variantName: i.variant?.name,
          product: {
            id: i.product.id,
            name: i.variant ? `${i.product.name} (${i.variant.name})` : i.product.name,
            salePrice: i.unitPrice,
          },
        })),
        deliveryMethod,
        deliveryFeeUSD,
        grandTotalUSD,
        grandTotalBs,
        totalAmountCop: enableCopCurrency ? grandTotalCop : undefined,
        notes: initialNotes,
        customerAddress: deliveryMethod === 'DELIVERY' ? customerAddress.trim() : '',
        customerCedula: normalizedCustomerCedula || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      };

      setActiveOrderMini(createdOrderData);

      try {
        localStorage.setItem(getOrderStorageKey(), JSON.stringify(createdOrderData));
        const url = new URL(window.location.href);
        url.searchParams.set('orderId', res.data.orderId);
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}

      // Save customer info in LocalStorage for next time
      try {
        localStorage.setItem(
          'flujofino_customer_data',
          JSON.stringify({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            cedula: normalizedCustomerCedula,
            address: customerAddress.trim(),
            zoneId: selectedZoneId,
          }),
        );
      } catch (e) {}

      // Clear cart and refresh catalog stock immediately
      setCart([]);
      fetchStore();

      // Prompt and subscribe Web Push notifications linked to customer phone or cédula
      const pushIdentifier = customerPhone.trim() || customerCedula.trim();
      if (pushIdentifier) {
        requestAndSubscribePush(pushIdentifier, tenantId).catch((e) =>
          console.warn('Web push subscription failed:', e),
        );
      }

      if (hasSupplierPreorder) {
        setOrderResult(createdOrderData);
        setIsCartOpen(false);
      } else {
        // Solo ahora que ya se apartaron los productos se le muestran los métodos de pago
        setReservedPaymentOrder(createdOrderData);
        presentToast({
          message: '🔒 ¡Productos apartados con éxito! Ahora selecciona tu método de pago.',
          duration: 3000,
          color: 'success',
        });
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al apartar los productos. Intenta de nuevo.';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
      fetchStore();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Paso 2: Confirmar método de pago o comprobante una vez que los productos ya fueron apartados
  const handleConfirmReservedPayment = async () => {
    if (!reservedPaymentOrder || submittingRef.current || isSubmitting) return;

    if (paymentOption === 'PAGO_MOVIL' && !pagoMovilRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia de tu Pago Móvil', duration: 2500, color: 'warning' });
      return;
    }
    if ((paymentOption === 'TRANSFER' || paymentOption === 'TRANSFER_COP') && !transferRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia o comprobante de transferencia', duration: 2500, color: 'warning' });
      return;
    }
    if (paymentOption === 'BINANCE' && !binanceRef.trim()) {
      presentToast({ message: 'Por favor ingresa el ID de transacción / Binance Pay', duration: 2500, color: 'warning' });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      let usdNote = 'MÉTODO: Divisas Efectivo (USD)';
      if (paymentOption === 'USD' && cashReceivedAmount) {
        const cashNum = parseFloat(cashReceivedAmount);
        if (!isNaN(cashNum) && cashNum >= grandTotalUSD) {
          const change = cashNum - grandTotalUSD;
          usdNote = `MÉTODO: Divisas Efectivo (USD) | Paga con: $${cashNum.toFixed(2)} | Vuelto a recibir: $${change.toFixed(2)}`;
        }
      }

      let copCashNote = `MÉTODO: Efectivo Pesos (COP: $${grandTotalCop.toLocaleString('es-CO')})`;
      if (paymentOption === 'CASH_COP' && cashReceivedAmount) {
        const cashNumCop = parseFloat(cashReceivedAmount);
        if (!isNaN(cashNumCop) && cashNumCop >= grandTotalCop) {
          const changeCop = Math.round(cashNumCop - grandTotalCop);
          copCashNote = `MÉTODO: Efectivo Pesos (COP) | Paga con: $${Math.round(cashNumCop).toLocaleString('es-CO')} COP | Vuelto: $${changeCop.toLocaleString('es-CO')} COP`;
        }
      }

      const paymentNote =
        paymentOption === 'PAGO_MOVIL' ? `MÉTODO: Pago Móvil | Ref: ${pagoMovilRef.trim()}` :
        paymentOption === 'TRANSFER' ? `MÉTODO: Transferencia Bancaria | Ref: ${transferRef.trim()}` :
        paymentOption === 'TRANSFER_COP' ? `MÉTODO: ${storeData?.settings?.companyCopBank || 'Nequi / Bancolombia'} (COP: $${grandTotalCop.toLocaleString('es-CO')}) | Ref: ${transferRef.trim()}` :
        paymentOption === 'CASH_COP' ? copCashNote :
        paymentOption === 'BINANCE' ? `MÉTODO: Binance Pay | ID: ${binanceRef.trim()}` :
        paymentOption === 'USD' ? usdNote :
        paymentOption === 'PENDING' ? 'MÉTODO: Cuenta Abierta / Pagar Después' :
        paymentOption === 'WHATSAPP' ? 'MÉTODO: A convenir por WhatsApp' : '';

      const refValue =
        paymentOption === 'PAGO_MOVIL' ? pagoMovilRef.trim() :
        (paymentOption === 'TRANSFER' || paymentOption === 'TRANSFER_COP') ? transferRef.trim() :
        paymentOption === 'BINANCE' ? binanceRef.trim() : undefined;

      const res = await axios.post(`${apiBase}/public/store/order/${reservedPaymentOrder.orderId}/payment`, {
        amount: grandTotalUSD,
        amountBs: grandTotalBs,
        amountCop: enableCopCurrency ? grandTotalCop : undefined,
        method: paymentOption,
        reference: refValue,
        bank: originBank || undefined,
        notes: paymentNote,
      });

      const updatedOrderData = {
        ...reservedPaymentOrder,
        ...res.data,
        items: reservedPaymentOrder.items,
        deliveryMethod: reservedPaymentOrder.deliveryMethod,
        deliveryFeeUSD: reservedPaymentOrder.deliveryFeeUSD,
        grandTotalUSD: reservedPaymentOrder.grandTotalUSD,
        grandTotalBs: reservedPaymentOrder.grandTotalBs,
        customerAddress: reservedPaymentOrder.customerAddress,
        customerCedula: reservedPaymentOrder.customerCedula,
        customerName: reservedPaymentOrder.customerName,
        customerPhone: reservedPaymentOrder.customerPhone,
        notes: res.data?.notes || [reservedPaymentOrder.notes, paymentNote].filter(Boolean).join(' | '),
      };

      setOrderResult(updatedOrderData);
      setActiveOrderMini(updatedOrderData);
      try {
        localStorage.setItem(getOrderStorageKey(), JSON.stringify(updatedOrderData));
      } catch (e) {}

      setReservedPaymentOrder(null);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al registrar el método de pago. Intenta de nuevo.';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // WhatsApp Order message builder
  const openWhatsAppOrder = () => {
    if (!orderResult || !storeData) return;
    const isPreorder = orderResult.status === 'SOLICITUD_ENCARGO';
    const phone = storeData.settings?.companyPhone?.replace(/\D/g, '') || '';
    const cedulaVal = orderResult.customerCedula || customerCedula.trim();
    const addressVal = orderResult.customerAddress || customerAddress.trim();

    const lines = [
      isPreorder ? `📋 *SOLICITUD DE ENCARGO #${orderResult.orderNumber}*` : `🛍️ *COMPROBANTE DE PEDIDO #${orderResult.orderNumber}*`,
      `👤 *Cliente:* ${orderResult.customerName}`,
      cedulaVal ? `🪪 *Cédula:* ${cedulaVal}` : '',
      `📞 *Teléfono:* ${orderResult.customerPhone}`,
      `📦 *Entrega:* ${orderResult.deliveryMethod === 'DELIVERY' ? '🛵 Delivery a Domicilio' : '🏪 Retiro en Tienda'}`,
    ].filter(Boolean);

    if (orderResult.requestedDeliveryDate) {
      try {
        const d = new Date(orderResult.requestedDeliveryDate);
        lines.push(`📅 *Fecha requerida:* ${d.toLocaleDateString('es-VE')} ${formatTime12h(d)}`);
      } catch (e) {}
    }

    if (orderResult.deliveryMethod === 'DELIVERY' && addressVal) {
      lines.push(`📍 *Dirección:* ${addressVal}`);
    }

    lines.push('', '🛒 *PRODUCTOS:*');
    (orderResult.items || []).forEach((item: any) => {
      lines.push(`• ${item.quantity}x ${item.product?.name || 'Producto'} - $${((item.product?.salePrice || 0) * item.quantity).toFixed(2)}`);
    });

    if (orderResult.deliveryFeeUSD > 0) {
      lines.push(`🛵 *Delivery:* $${Number(orderResult.deliveryFeeUSD).toFixed(2)}`);
    }

    const totalUSD = Number(orderResult.grandTotalUSD || 0).toFixed(2);
    const totalBs = Number(orderResult.grandTotalBs || 0).toFixed(2);
    const totalCop = Math.round(Number(orderResult.grandTotalUSD || 0) * exchangeRateCop).toLocaleString('es-CO');
    lines.push(
      '',
      enableCopCurrency
        ? `💵 *TOTAL:* $${totalUSD} / Bs. ${totalBs} / 🇨🇴 $${totalCop} COP`
        : `💵 *TOTAL:* $${totalUSD} / Bs. ${totalBs}`
    );

    const refPM = orderResult.pagoMovilRef || pagoMovilRef;
    const refTrans = orderResult.transferRef || transferRef;
    const refBin = orderResult.binanceRef || binanceRef;

    if (refPM) {
      lines.push(`📱 *Ref. Pago Móvil:* ${refPM}${originBank ? ` (${originBank})` : ''}`);
    } else if (paymentOption === 'TRANSFER_COP' && refTrans) {
      lines.push(`🇨🇴 *Ref. ${storeData?.settings?.companyCopBank || 'Nequi / Bancolombia'}:* ${refTrans}`);
    } else if (refTrans) {
      lines.push(`🏦 *Ref. Transferencia:* ${refTrans}${originBank ? ` (${originBank})` : ''}`);
    } else if (refBin) {
      lines.push(`🟡 *ID Binance Pay:* ${refBin}`);
    } else if (paymentOption === 'USD') {
      lines.push(`💵 *Método:* Efectivo Divisas (USD)`);
    } else if (paymentOption === 'CASH_COP') {
      lines.push(`🇨🇴 *Método:* Efectivo Pesos (COP)`);
    } else if (paymentOption === 'PENDING') {
      lines.push(`⏳ *Método:* Cuenta Abierta / Pagar Después`);
    } else if (paymentOption === 'WHATSAPP') {
      lines.push(`💬 *Método:* A convenir por WhatsApp`);
    }

    if (orderResult.notes) {
      lines.push(`📝 *Notas:* ${orderResult.notes}`);
    }

    const message = lines.join('\n');
    window.open(formatWhatsAppUrl(phone, message), '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
    presentToast({ message: `¡${label} copiado!`, duration: 1800, color: 'success' });
  };

  const copyAllPagoMovil = () => {
    if (!storeData?.settings) return;
    const s = storeData.settings;
    const lines = [
      s.companyBank ? `Banco: ${s.companyBank}` : '',
      s.companyCedula ? `Cédula: ${s.companyCedula}` : '',
      s.companyPhone ? `Teléfono: ${s.companyPhone}` : '',
      `Monto: Bs. ${grandTotalBs.toFixed(2)}`,
    ].filter(Boolean).join('\n');
    copyToClipboard(lines, 'Datos de Pago Móvil');
  };

  const primaryColor = storeData?.settings?.themePrimaryColor || storeData?.themePrimaryColor || '#10b981';
  const headerColor = storeData?.settings?.themeHeaderColor || storeData?.themeHeaderColor || primaryColor;
  const headerContrast = getContrastColor(headerColor);
  const primaryContrast = getContrastColor(primaryColor);
  const primaryReadable = ensureReadableColor(primaryColor);
  const primarySoftBg = (primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`) + '18';
  const companyLogoUrl = storeData?.settings?.companyLogoUrl || storeData?.companyLogoUrl || null;
  const logoShape = storeData?.settings?.logoShape || storeData?.logoShape || 'ROUNDED';
  const logoFit = storeData?.settings?.logoFit || storeData?.logoFit || 'contain';

  useEffect(() => {
    if (storeData) {
      const pColor = storeData?.settings?.themePrimaryColor || storeData?.themePrimaryColor || '#10b981';
      const hColor = storeData?.settings?.themeHeaderColor || storeData?.themeHeaderColor || pColor;
      applyThemeToDom(pColor, hColor);
    }
    return () => {
      resetToDefaultTheme();
    };
  }, [storeData]);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ marginTop: '30vh' }}>
            <IonSpinner name="crescent" color="primary" style={{ width: '48px', height: '48px' }} />
            <p style={{ marginTop: '12px', color: '#64748b' }}>Cargando catálogo de productos...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (storeData?.isSuspended) {
    const rawPhone = storeData?.settings?.companyPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('58')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `58${cleanPhone.slice(1)}`
      : cleanPhone;

    const waMsg = encodeURIComponent(
      `Hola, me gustaría consultar información sobre sus productos en ${storeData?.tenant?.name || 'su tienda'}.`
    );
    const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : undefined;

    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ backgroundColor: '#f8fafc' }}>
          <div
            style={{
              maxWidth: '480px',
              margin: '18vh auto 0 auto',
              textAlign: 'center',
              background: '#ffffff',
              padding: '36px 24px',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
            }}
          >
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={storeData?.tenant?.name || 'Logo'}
                style={{
                  width: logoShape === 'NATURAL' ? 'auto' : '96px',
                  maxWidth: logoShape === 'NATURAL' ? '180px' : '96px',
                  height: '96px',
                  borderRadius: logoShape === 'CIRCLE' ? '50%' : logoShape === 'NATURAL' ? '12px' : '18px',
                  objectFit: (logoFit === 'cover' ? 'cover' : 'contain') as any,
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  margin: '0 auto 16px auto',
                  display: 'block',
                  padding: logoFit === 'contain' ? '4px' : '0',
                }}
              />
            ) : (
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  fontSize: '32px',
                  color: '#64748b',
                }}
              >
                🏪
              </div>
            )}

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              {storeData?.tenant?.name || 'Tienda'}
            </h2>

            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', margin: '0 0 14px 0' }}>
              Tienda temporalmente en pausa
            </h1>

            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              En este momento {storeData?.tenant?.name || 'este negocio'} no está recibiendo pedidos en línea. Estaremos de vuelta muy pronto.
            </p>

            {waUrl ? (
              <IonButton
                expand="block"
                color="success"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 700, '--border-radius': '12px' }}
              >
                <IonIcon slot="start" icon={logoWhatsapp} style={{ fontSize: '1.25rem' }} />
                Consultar directamente por WhatsApp
              </IonButton>
            ) : null}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (errorMsg) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ marginTop: '25vh' }}>
            <h2>⚠️ {errorMsg}</h2>
            <IonButton fill="outline" onClick={fetchStore} style={{ marginTop: '20px' }}>
              <IonIcon slot="start" icon={refreshOutline} /> Reintentar
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Confirmation view after success
  if (orderResult) {
    const currentStatus = liveOrderStatus || orderResult.status || 'PENDING';
    const isPreorder = orderResult.status === 'SOLICITUD_ENCARGO' || currentStatus === 'SOLICITUD_ENCARGO';
    const statusBg =
      currentStatus === 'COMPLETED'
        ? '#dcfce7'
        : currentStatus === 'READY' || currentStatus === 'DELIVERING' || currentStatus === 'ON_THE_WAY'
        ? '#dbeafe'
        : currentStatus === 'PREPARING' || currentStatus === 'IN_PROGRESS'
        ? '#fef3c7'
        : currentStatus === 'SOLICITUD_ENCARGO'
        ? '#f3e8ff'
        : currentStatus === 'PENDIENTE_PAGO'
        ? '#fef9c3'
        : '#f1f5f9';

    const statusTextColor =
      currentStatus === 'COMPLETED'
        ? '#15803d'
        : currentStatus === 'READY' || currentStatus === 'DELIVERING' || currentStatus === 'ON_THE_WAY'
        ? '#1d4ed8'
        : currentStatus === 'PREPARING' || currentStatus === 'IN_PROGRESS'
        ? '#b45309'
        : currentStatus === 'SOLICITUD_ENCARGO'
        ? '#7e22ce'
        : currentStatus === 'PENDIENTE_PAGO'
        ? '#854d0e'
        : '#475569';

    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ ['--background' as any]: headerColor, color: headerContrast }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Logo"
                  style={{
                    width: logoShape === 'NATURAL' ? 'auto' : '36px',
                    maxWidth: '56px',
                    height: '36px',
                    borderRadius: logoShape === 'CIRCLE' ? '50%' : '8px',
                    objectFit: (logoFit === 'cover' ? 'cover' : 'contain') as any,
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <IonTitle style={{ fontWeight: 'bold', padding: 0, color: headerContrast }}>
                {storeData?.tenant?.name || 'Tienda Online'}
              </IonTitle>
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <IonIcon icon={checkmarkCircleOutline} color={isPreorder ? 'tertiary' : 'success'} style={{ fontSize: '72px' }} />
            <h1 style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>
              {isPreorder ? '¡Solicitud de Encargo Enviada!' : '¡Pedido Recibido!'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              {isPreorder 
                ? <>Tu solicitud <b>#{orderResult.orderNumber}</b> fue registrada. Verificaremos stock con el proveedor y te contactaremos.</>
                : <>Tu orden <b>#{orderResult.orderNumber}</b> ha sido registrada con éxito.</>}
            </p>

            {/* Live Order Status Tracking Banner */}
            <div
              style={{
                background: statusBg,
                color: statusTextColor,
                border: `1.5px solid ${statusTextColor}40`,
                borderRadius: '12px',
                padding: '14px 16px',
                margin: '18px 0',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px', opacity: 0.85 }}>
                📡 Seguimiento en Tiempo Real
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {getStatusLabel(currentStatus)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                Esta pantalla se actualiza automáticamente cuando tu pedido cambie de estado.
              </div>
            </div>

            {/* Payment & Abonos Control Panel */}
            {(() => {
              const totalOrderUsd = Number(orderResult.grandTotalUSD || orderResult.totalAmount || 0);
              const abonosOrderUsd = Number(orderResult.abonosTotal || 0);
              const remainingOrderUsd = Math.max(0, Math.round((totalOrderUsd - abonosOrderUsd) * 100) / 100);
              const activeRate = Number(storeData?.settings?.exchangeRateBs || orderResult.exchangeRate || 40);
              const remainingOrderBs = Math.round(remainingOrderUsd * activeRate * 100) / 100;
              const hasReportedPending = Boolean(orderResult.paymentReported) || Boolean(orderResult.pagoMovilRef || orderResult.transferRef || orderResult.binanceRef || pagoMovilRef || transferRef || binanceRef) && livePaymentStatus !== 'PAID' && !orderResult.paymentRejectedReason || (Array.isArray(orderResult.abonosHistory) && orderResult.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'));
              const isOrderCanceled = currentStatus === 'CANCELED' || currentStatus === 'CANCELADO_PROVEEDOR';
              const isPaidFull = livePaymentStatus === 'PAID';
              const isPartial = livePaymentStatus === 'PARTIAL' || (abonosOrderUsd > 0 && remainingOrderUsd > 0);
              const inputPayAmt = parseFloat(orderPaymentAmount) || 0;
              const inputPayBs = Math.round(inputPayAmt * activeRate * 100) / 100;
              const s = storeData?.settings;

              return (
                <>
                  <div style={{
                    backgroundColor: isPaidFull ? primarySoftBg : '#EFF6FF',
                    border: `1.5px solid ${isPaidFull ? primaryColor : '#BFDBFE'}`,
                    borderRadius: '14px',
                    padding: '16px',
                    margin: '16px 0',
                    textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: isPaidFull ? primaryReadable : '#1E3A8A' }}>
                        💳 Estado de Pago y Abonos
                      </div>
                      {isPaidFull ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: primarySoftBg, color: primaryReadable, padding: '4px 10px', borderRadius: '999px' }}>
                          ✅ Verificado y Pagado
                        </span>
                      ) : hasReportedPending ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '999px' }}>
                          ⏳ Comprobante en Verificación
                        </span>
                      ) : isPartial ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '999px' }}>
                          💵 Abono Parcial
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '4px 10px', borderRadius: '999px' }}>
                          ⏳ Cuenta Abierta / Por Pagar
                        </span>
                      )}
                    </div>

                    {orderResult.paymentRejectedReason && !orderResult.paymentReported && (
                      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', color: '#991B1B', fontSize: '12px', fontWeight: 700 }}>
                        ⚠️ Comprobante anterior rechazado: {orderResult.paymentRejectedReason}. Por favor, verifica y reporta tu pago nuevamente.
                      </div>
                    )}

                    {/* Desglose Financiero */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Compra</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>${totalOrderUsd.toFixed(2)}</span>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                          ≈ Bs. {(totalOrderUsd * activeRate).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Por Pagar</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: isPaidFull || remainingOrderUsd <= 0 ? primaryReadable : '#DC2626' }}>
                          ${isPaidFull ? '0.00' : remainingOrderUsd.toFixed(2)}
                        </span>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                          ≈ Bs. {isPaidFull ? '0.00' : remainingOrderBs.toFixed(2)}
                        </div>
                      </div>
                      {abonosOrderUsd > 0 && (
                        <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #E2E8F0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: primaryReadable, fontWeight: 700 }}>Abonado / Reportado:</span>
                          <span style={{ color: primaryReadable, fontWeight: 800 }}>${abonosOrderUsd.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>

                    {/* Cuentas Bancarias del Negocio para Pagar o Abonar */}
                    {!isPaidFull && !isOrderCanceled && s && (s.companyPhone || s.companyAccountNumber || s.binancePayId) && (
                      <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', color: '#334155', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                          🏦 Cuentas para Abonar o Pagar:
                        </div>
                        {s.companyPhone && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span><b>Pago Móvil:</b> {s.companyBank ? `${s.companyBank} - ` : ''}{s.companyPhone} ({s.companyCedula})</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(s.companyPhone, 'Teléfono Pago Móvil')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                        {s.companyAccountNumber && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ wordBreak: 'break-all' }}><b>Transferencia:</b> {s.companyAccountNumber}</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(s.companyAccountNumber, 'Cuenta Bancaria')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                        {s.binancePayId && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span><b>Binance Pay:</b> {s.binancePayId}</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(s.binancePayId, 'Binance Pay ID')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Historial de Abonos */}
                    {Array.isArray(orderResult.abonosHistory) && orderResult.abonosHistory.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <IonButton
                          fill="clear"
                          size="small"
                          style={{ textTransform: 'none', padding: 0, fontSize: '12px' }}
                          onClick={() => setShowOrderPaymentHistory(!showOrderPaymentHistory)}
                        >
                          {showOrderPaymentHistory ? 'Ocultar historial de abonos' : `Ver abonos registrados (${orderResult.abonosHistory.length})`}
                        </IonButton>
                        {showOrderPaymentHistory && (
                          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {orderResult.abonosHistory.map((ab: any, idx: number) => (
                              <div key={ab.id || idx} style={{ backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <b>${Number(ab.amount || 0).toFixed(2)}</b> {ab.amountBs ? `(~Bs. ${Number(ab.amountBs).toFixed(2)})` : ''}
                                  <span style={{ color: '#64748B', marginLeft: '6px' }}>
                                    {ab.method || 'Pago'} {ab.ref || ab.reference ? `(Ref: ${ab.ref || ab.reference})` : ''}
                                  </span>
                                </div>
                                <span style={{ color: ab.status === 'REJECTED' ? '#DC2626' : ab.status === 'REPORTED_PENDING_APPROVAL' ? '#D97706' : primaryReadable, fontWeight: 800, fontSize: '11px' }}>
                                  {ab.status === 'REJECTED' ? 'Rechazado' : ab.status === 'REPORTED_PENDING_APPROVAL' ? 'En revisión' : '✓ Aprobado'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botón Principal para Abonar o Reportar Pago */}
                    {!isOrderCanceled && !isPaidFull && (
                      <button
                        type="button"
                        onClick={openOrderPaymentModal}
                        className="ff-btn-primary"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: primaryColor,
                          color: primaryContrast,
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginTop: '6px',
                        }}
                      >
                        ➕ Registrar Abono o Pago Completo
                      </button>
                    )}
                  </div>

                  {/* Modal para Reportar Abono o Pago Completo de la Orden */}
                  <IonModal isOpen={showOrderPaymentModal} onDidDismiss={() => setShowOrderPaymentModal(false)}>
                    <IonHeader>
                      <IonToolbar style={{ ['--background' as any]: headerColor, color: headerContrast }}>
                        <IonTitle style={{ fontWeight: 800, fontSize: '16px' }}>Registrar Abono / Pago</IonTitle>
                        <IonButtons slot="end">
                          <IonButton onClick={() => setShowOrderPaymentModal(false)} style={{ color: headerContrast }}>
                            <IonIcon icon={closeOutline} />
                          </IonButton>
                        </IonButtons>
                      </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
                      <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '30px' }}>
                        {/* Resumen de Saldo */}
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Pedido #{orderResult.orderNumber}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{orderResult.customerName}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Saldo Pendiente</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: primaryColor }}>${remainingOrderUsd.toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: '#475569' }}>≈ Bs. {remainingOrderBs.toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Tipo de Pago: Completo vs Abono Parcial */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                          <button
                            type="button"
                            onClick={() => handleOrderPaymentTypeChange('FULL')}
                            style={{
                              padding: '10px',
                              borderRadius: '10px',
                              border: orderPaymentType === 'FULL' ? `2px solid ${primaryColor}` : '1px solid #CBD5E1',
                              background: orderPaymentType === 'FULL' ? primarySoftBg : '#FFFFFF',
                              color: orderPaymentType === 'FULL' ? primaryReadable : '#475569',
                              fontWeight: 800,
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Pago Completo (${remainingOrderUsd.toFixed(2)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderPaymentTypeChange('PARTIAL')}
                            style={{
                              padding: '10px',
                              borderRadius: '10px',
                              border: orderPaymentType === 'PARTIAL' ? `2px solid ${primaryColor}` : '1px solid #CBD5E1',
                              background: orderPaymentType === 'PARTIAL' ? primarySoftBg : '#FFFFFF',
                              color: orderPaymentType === 'PARTIAL' ? primaryReadable : '#475569',
                              fontWeight: 800,
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Abono Parcial
                          </button>
                        </div>

                        {/* Monto a Reportar */}
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Monto a Abonar ($ USD) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={orderPaymentAmount}
                            onChange={(e) => setOrderPaymentAmount(e.target.value)}
                            placeholder={`Ej. ${remainingOrderUsd.toFixed(2)}`}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: `1.5px solid ${primaryColor}`,
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#0F172A',
                              boxSizing: 'border-box',
                            }}
                          />
                          {inputPayAmt > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 700, color: primaryReadable }}>
                              Equivalente a transferir: Bs. {inputPayBs.toFixed(2)} (Tasa BCV: Bs. {activeRate.toFixed(2)})
                            </div>
                          )}
                        </div>

                        {/* Método de Pago */}
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            Método Utilizado *
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                            {[
                              { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' },
                              { id: 'TRANSFER', label: '🏦 Transferencia' },
                              { id: 'BINANCE', label: '🟡 Binance Pay' },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setOrderPaymentMethod(m.id)}
                                style={{
                                  padding: '10px 8px',
                                  borderRadius: '10px',
                                  border: orderPaymentMethod === m.id ? `2px solid ${primaryColor}` : '1px solid #CBD5E1',
                                  background: orderPaymentMethod === m.id ? primarySoftBg : '#FFFFFF',
                                  color: orderPaymentMethod === m.id ? primaryReadable : '#475569',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {(orderPaymentMethod === 'PAGO_MOVIL' || orderPaymentMethod === 'TRANSFER') && (
                            <div style={{ marginBottom: '10px' }}>
                              <BankSelect
                                label="Banco Emisor"
                                value={orderPaymentOriginBank}
                                onChange={(val) => setOrderPaymentOriginBank(val)}
                                placeholder="Selecciona tu banco..."
                              />
                            </div>
                          )}

                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              N° de Referencia / Comprobante *
                            </label>
                            <input
                              type="text"
                              value={orderPaymentRef}
                              onChange={(e) => setOrderPaymentRef(e.target.value)}
                              placeholder="Últimos 4 a 8 dígitos de la operación"
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                              Nota adicional (Opcional)
                            </label>
                            <input
                              type="text"
                              value={orderPaymentNotes}
                              onChange={(e) => setOrderPaymentNotes(e.target.value)}
                              placeholder="Ej. Titular de la cuenta..."
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmittingOrderPayment}
                          onClick={handleOrderPaymentSubmit}
                          className="ff-btn-primary"
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            background: primaryColor,
                            color: primaryContrast,
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '15px',
                            cursor: isSubmittingOrderPayment ? 'not-allowed' : 'pointer',
                            opacity: isSubmittingOrderPayment ? 0.7 : 1,
                          }}
                        >
                          {isSubmittingOrderPayment ? 'Enviando comprobante...' : `Confirmar Reporte de Abono ($${inputPayAmt.toFixed(2)})`}
                        </button>
                      </div>
                    </IonContent>
                  </IonModal>
                </>
              );
            })()}

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', margin: '20px 0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Cliente:</span>
                <span style={{ fontWeight: '600' }}>{orderResult.customerName}</span>
              </div>
              {(orderResult.customerCedula || customerCedula.trim()) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Cédula:</span>
                  <span style={{ fontWeight: '600' }}>{orderResult.customerCedula || customerCedula.trim()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Teléfono:</span>
                <span style={{ fontWeight: '600' }}>{orderResult.customerPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Modalidad:</span>
                <span style={{ fontWeight: '600' }}>
                  {orderResult.deliveryMethod === 'DELIVERY' ? '🛵 Delivery a Domicilio' : '🏪 Retiro en Tienda'}
                </span>
              </div>
              {orderResult.deliveryMethod === 'DELIVERY' && (orderResult.customerAddress || customerAddress.trim()) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Dirección:</span>
                  <span style={{ fontWeight: '500', color: '#1e293b', textAlign: 'right', maxWidth: '65%' }}>
                    {orderResult.customerAddress || customerAddress.trim()}
                  </span>
                </div>
              )}
              {orderResult.items && orderResult.items.length > 0 && (
                <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '10px', paddingTop: '10px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Productos Solicitados:
                  </div>
                  {orderResult.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: '#334155' }}>
                      <span>{it.quantity}x {it.product?.name || 'Producto'}</span>
                      <span style={{ fontWeight: 600 }}>${((it.product?.salePrice || 0) * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {Number(orderResult.deliveryFeeUSD) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: '#334155' }}>
                      <span>Costo de Delivery</span>
                      <span style={{ fontWeight: 600 }}>${Number(orderResult.deliveryFeeUSD).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              {orderResult.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Detalle:</span>
                  <span style={{ fontWeight: '500', color: '#334155', textAlign: 'right', maxWidth: '65%' }}>
                    {orderResult.notes}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>Total a pagar:</span>
                <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }}>
                  ${Number(orderResult.grandTotalUSD || 0).toFixed(2)} (Bs. {Number(orderResult.grandTotalBs || 0).toFixed(2)})
                </span>
              </div>
            </div>

            <CustomerNotificationPrompt
              identifier={customerPhone.trim() || customerCedula.trim()}
              tenantId={tenantId}
              type="order"
              orderNumber={orderResult.orderNumber}
            />

            <IonButton
              expand="block"
              color={isPreorder ? 'tertiary' : 'success'}
              onClick={openWhatsAppOrder}
              style={{ height: '52px', fontWeight: 'bold', fontSize: '1rem', marginBottom: '12px' }}
            >
              <IonIcon slot="start" icon={logoWhatsapp} style={{ fontSize: '1.3rem' }} />
              {isPreorder ? 'Enviar Solicitud por WhatsApp' : 'Enviar Comprobante por WhatsApp'}
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => {
                setOrderResult(null);
                setLiveOrderStatus(null);
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('orderId');
                  window.history.replaceState({}, '', url.toString());
                } catch (e) {}
                fetchStore();
              }}
            >
              Hacer otro pedido / Ver catálogo
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* Header */}
      <IonHeader className="ion-no-border" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <IonToolbar style={{ ['--background' as any]: headerColor, color: headerContrast }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt="Logo"
                style={{
                  width: logoShape === 'NATURAL' ? 'auto' : '36px',
                  maxWidth: '56px',
                  height: '36px',
                  borderRadius: logoShape === 'CIRCLE' ? '50%' : '8px',
                  objectFit: (logoFit === 'cover' ? 'cover' : 'contain') as any,
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  flexShrink: 0,
                }}
              />
            ) : null}
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.3px',
                color: headerContrast,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {storeData?.tenant?.name || 'Tienda Online'}
            </span>
          </div>
          <IonButtons slot="end" style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            {/* Tasa BCV compact micro-pill in top navbar */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                color: headerContrast,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                letterSpacing: '0.1px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title="Tasa oficial del día"
            >
              <span style={{ opacity: 0.85, fontSize: '0.66rem', textTransform: 'uppercase' }}>BCV</span>
              <span>Bs. {exchangeRate.toFixed(2)}</span>
            </div>

            <IonButton
              fill="clear"
              onClick={() => {
                setTrackError(null);
                setIsTrackModalOpen(true);
              }}
              title="Rastrear mi pedido"
              style={{ color: headerContrast, margin: 0, '--padding-start': '6px', '--padding-end': '6px' }}
            >
              <IonIcon slot="icon-only" icon={searchOutline} style={{ fontSize: '1.35rem' }} />
            </IonButton>
            {storeData?.settings?.companyPhone && (
              <IonButton
                fill="clear"
                onClick={() => {
                  window.open(formatWhatsAppUrl(storeData.settings.companyPhone), '_blank');
                }}
                title="Contactar por WhatsApp"
                style={{ margin: 0, '--padding-start': '6px', '--padding-end': '6px' }}
              >
                <IonIcon slot="icon-only" icon={logoWhatsapp} style={{ color: '#25D366', fontSize: '1.45rem' }} />
              </IonButton>
            )}
            <IonButton
              onClick={() => setIsCartOpen(true)}
              style={{ position: 'relative', color: headerContrast, margin: 0, '--padding-start': '6px', '--padding-end': '8px' }}
              title="Ver Carrito"
            >
              <IonIcon slot="icon-only" icon={cartOutline} style={{ fontSize: '1.55rem' }} />
              {cartTotalItems > 0 && (
                <IonBadge
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: '10px',
                    backgroundColor: primaryColor,
                    color: primaryContrast,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {cartTotalItems}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '70px' }}>
        {/* Banner Persistente de Pedido Activo */}
        {activeOrderMini && !orderResult && (
          <div
            style={{
              backgroundColor: primarySoftBg,
              border: `1.5px solid ${primaryReadable}40`,
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: primaryColor,
                  color: primaryContrast,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                📡
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Pedido activo #{activeOrderMini.orderNumber || (activeOrderMini.orderId || activeOrderMini.id || '').slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.82rem', color: primaryReadable, fontWeight: 700 }}>
                  Estado: {getStatusLabel(activeOrderMini.status || 'PENDING')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => loadOrderDetails(activeOrderMini.orderId || activeOrderMini.id, true)}
                style={{
                  backgroundColor: primaryColor,
                  color: primaryContrast,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <span>Ver Seguimiento</span> ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveOrderMini(null);
                  try {
                    localStorage.removeItem(getOrderStorageKey());
                  } catch (e) {}
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: primaryReadable,
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1,
                }}
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hero Card / Store Info */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '16px 20px',
            marginBottom: '18px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle accent highlight bar on top of the card */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: primaryColor,
            }}
          />

          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt={storeData?.tenant?.name}
              style={{
                width: logoShape === 'NATURAL' ? 'auto' : '92px',
                maxWidth: logoShape === 'NATURAL' ? '180px' : '92px',
                height: '92px',
                borderRadius: logoShape === 'CIRCLE' ? '50%' : logoShape === 'NATURAL' ? '12px' : '18px',
                objectFit: (logoFit === 'cover' ? 'cover' : 'contain') as any,
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                flexShrink: 0,
                padding: logoFit === 'contain' ? '4px' : '0',
              }}
            />
          ) : (
            <div
              style={{
                width: '92px',
                height: '92px',
                borderRadius: logoShape === 'CIRCLE' ? '50%' : '18px',
                backgroundColor: primarySoftBg,
                color: primaryReadable,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                border: `1.5px solid ${primaryReadable}30`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}
            >
              🏪
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {storeData?.tenant?.name}
              </h2>
              <span
                style={{
                  backgroundColor: primarySoftBg,
                  color: primaryReadable,
                  border: `1px solid ${primaryColor}40`,
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                ● En línea
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Catálogo de productos disponibles para retiro o delivery
            </p>
          </div>
        </div>

        {/* Navigation Switcher if Business has both Store & Booking */}
        {storeData?.settings?.featureCustomerSchedules && (
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '18px',
              gap: '4px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#fff',
                color: '#0f172a',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'default',
              }}
            >
              <span>🛍️</span> Catálogo / Tienda
            </button>
            <button
              onClick={() => (window.location.href = `/book/${tenantId}`)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span>📅</span> Agendar Citas Online ↗
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ marginBottom: '8px' }}>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value!)}
            placeholder="Buscar productos..."
            style={{ padding: 0 }}
          />
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '16px',
            scrollbarWidth: 'none',
          }}
        >
          <IonButton
            size="small"
            fill={selectedCategory === 'TODOS' ? 'solid' : 'outline'}
            color={selectedCategory === 'TODOS' ? 'primary' : 'medium'}
            onClick={() => setSelectedCategory('TODOS')}
            style={{ borderRadius: '20px', textTransform: 'capitalize' }}
          >
            Todos
          </IonButton>
          {categories.map((cat) => (
            <IonButton
              key={cat}
              size="small"
              fill={selectedCategory.toLowerCase() === cat.toLowerCase() ? 'solid' : 'outline'}
              color={selectedCategory.toLowerCase() === cat.toLowerCase() ? 'primary' : 'medium'}
              onClick={() => setSelectedCategory(cat)}
              style={{ borderRadius: '20px', textTransform: 'capitalize' }}
            >
              {cat}
            </IonButton>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 10px', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.1rem' }}>No se encontraron productos disponibles.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
              width: '100%',
            }}
          >
            {filteredProducts.map((product) => {
              const hasVariants = Boolean(product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0);
              const selectedVarId = hasVariants
                ? (selectedVariantByProduct[product.id] || product.variants![0]?.id)
                : undefined;
              const activeVariant = hasVariants
                ? product.variants!.find((v) => v.id === selectedVarId) || product.variants![0]
                : undefined;

              const galleryImages = Array.from(
                new Set([
                  ...(activeVariant && Array.isArray(activeVariant.images) ? activeVariant.images : []),
                  ...(Array.isArray(product.images) ? product.images : []),
                ].filter(Boolean))
              );
              const imageUrl = activeImageByProduct[product.id] && galleryImages.includes(activeImageByProduct[product.id])
                ? activeImageByProduct[product.id]
                : (galleryImages[0] || null);

              const effectivePrice = activeVariant && activeVariant.priceOverride !== undefined && activeVariant.priceOverride !== null
                ? Number(activeVariant.priceOverride)
                : Number(product.salePrice || 0);
              const priceBs = effectivePrice * exchangeRate;
              const activeCartKey = activeVariant ? `${product.id}__${activeVariant.id}` : product.id;
              const inCart = cart.find((i) => i.cartKey === activeCartKey);
              const availStock = getAvailableStock(product, activeVariant);
              const isOptionOutOfStock = activeVariant ? availStock <= 0 : product.isOutOfStock;

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* Product Image with lazy loading and zoom lightbox */}
                  {imageUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '180px', background: '#f1f5f9' }}>
                      <img
                        src={imageUrl}
                        alt={product.name}
                        loading="lazy"
                        onClick={() => {
                          const curIdx = galleryImages.indexOf(imageUrl);
                          openImage(galleryImages, activeVariant ? `${product.name} - ${activeVariant.name}` : product.name, curIdx >= 0 ? curIdx : 0);
                        }}
                        title="Toca para ampliar imagen"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'zoom-in',
                          display: 'block',
                        }}
                      />
                      {/* Counter Pill */}
                      {galleryImages.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: product.isSupplierPreorder || product.availabilityType === 'BAJO_ENCARGO' || isOptionOutOfStock ? '38px' : '8px',
                            right: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.72)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                            zIndex: 3,
                          }}
                        >
                          {(galleryImages.indexOf(imageUrl) >= 0 ? galleryImages.indexOf(imageUrl) : 0) + 1}/{galleryImages.length}
                        </div>
                      )}

                      {/* Navigation Arrows for Card */}
                      {galleryImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cur = galleryImages.indexOf(imageUrl);
                              const prev = cur > 0 ? cur - 1 : galleryImages.length - 1;
                              setActiveImageByProduct((p) => ({ ...p, [product.id]: galleryImages[prev] }));
                            }}
                            title="Foto anterior"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '6px',
                              transform: 'translateY(-50%)',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(15, 23, 42, 0.65)',
                              backdropFilter: 'blur(4px)',
                              WebkitBackdropFilter: 'blur(4px)',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 3,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              padding: 0,
                            }}
                          >
                            <IonIcon icon={chevronBackOutline} style={{ fontSize: '18px' }} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cur = galleryImages.indexOf(imageUrl);
                              const next = cur < galleryImages.length - 1 ? cur + 1 : 0;
                              setActiveImageByProduct((p) => ({ ...p, [product.id]: galleryImages[next] }));
                            }}
                            title="Foto siguiente"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              right: '6px',
                              transform: 'translateY(-50%)',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(15, 23, 42, 0.65)',
                              backdropFilter: 'blur(4px)',
                              WebkitBackdropFilter: 'blur(4px)',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 3,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              padding: 0,
                            }}
                          >
                            <IonIcon icon={chevronForwardOutline} style={{ fontSize: '18px' }} />
                          </button>
                        </>
                      )}
                      {product.code && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.78)',
                            color: '#fff',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          #{product.code}
                        </div>
                      )}
                      {product.isSupplierPreorder ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#7e22ce',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          📦 Por Catálogo (Proveedor)
                        </div>
                      ) : product.availabilityType === 'BAJO_ENCARGO' ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#d97706',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          🎂 Bajo Encargo (Preparación)
                        </div>
                      ) : isOptionOutOfStock ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Agotado
                        </div>
                      ) : !product.isService && !isProductMadeToOrder(product) ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}
                        >
                          Disp: {availStock}
                        </div>
                      ) : null}

                      {/* Multi-image Thumbnail Strip */}
                      {galleryImages.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '8px',
                            right: '8px',
                            display: 'flex',
                            gap: '5px',
                            overflowX: 'auto',
                            padding: '3px 4px',
                            backgroundColor: 'rgba(15, 23, 42, 0.45)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: '8px',
                          }}
                        >
                          {galleryImages.slice(0, 6).map((thumbUrl, tIdx) => (
                            <img
                              key={tIdx}
                              src={thumbUrl}
                              alt="thumb"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageByProduct((prev) => ({ ...prev, [product.id]: thumbUrl }));
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '5px',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                border: imageUrl === thumbUrl ? `2px solid ${primaryColor}` : '1px solid rgba(255,255,255,0.6)',
                                flexShrink: 0,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '120px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px',
                        position: 'relative',
                      }}
                    >
                      {product.code && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: '#E2E8F0',
                            color: '#475569',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          #{product.code}
                        </span>
                      )}
                      Sin imagen
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          color: '#64748b',
                          fontWeight: '600',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {product.category}
                      </span>
                      <h3
                        style={{
                          margin: '4px 0 6px 0',
                          fontSize: '1.05rem',
                          fontWeight: 'bold',
                          color: '#0f172a',
                          lineHeight: '1.3',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {product.name}
                      </h3>
                      {product.description && (
                        <p
                          style={{
                            margin: '0 0 10px 0',
                            color: '#64748b',
                            fontSize: '0.85rem',
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {product.description}
                        </p>
                      )}

                      {/* Selector de Subproductos / Variantes */}
                      {hasVariants && (
                        <div style={{ marginTop: '6px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Elige opción / variante:
                          </div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {product.variants!.map((v) => {
                              const isSelected = activeVariant?.id === v.id;
                              const vStock = Number(v.stockQuantity || 0);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedVariantByProduct((prev) => ({ ...prev, [product.id]: v.id }));
                                    if (Array.isArray(v.images) && v.images.length > 0) {
                                      setActiveImageByProduct((prev) => ({ ...prev, [product.id]: v.images![0] }));
                                    }
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    border: isSelected ? `1.5px solid ${primaryColor}` : '1px solid #cbd5e1',
                                    backgroundColor: isSelected ? primarySoftBg : '#f8fafc',
                                    color: isSelected ? primaryReadable : (vStock <= 0 ? '#94a3b8' : '#334155'),
                                    fontSize: '11px',
                                    fontWeight: isSelected ? 800 : 600,
                                    cursor: 'pointer',
                                    opacity: vStock <= 0 && !isProductMadeToOrder(product) ? 0.65 : 1,
                                  }}
                                >
                                  {v.name} {vStock <= 0 && !isProductMadeToOrder(product) ? '(Agotado)' : `(${vStock})`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price and Action Button */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: primaryReadable }}>
                          ${effectivePrice.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Bs. {priceBs.toFixed(2)}
                        </div>
                        {enableCopCurrency && (
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', marginTop: '2px' }}>
                            🇨🇴 ${Math.round(effectivePrice * exchangeRateCop).toLocaleString('es-CO')} COP
                          </div>
                        )}
                      </div>

                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonButton
                            size="small"
                            fill="outline"
                            color="primary"
                            onClick={() => handleUpdateQuantity(activeCartKey, -1)}
                            style={{ margin: 0, height: '32px', width: '32px' }}
                          >
                            <IonIcon slot="icon-only" icon={removeOutline} />
                          </IonButton>
                          <span style={{ fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>
                            {inCart.quantity}
                          </span>
                          <IonButton
                            size="small"
                            color="primary"
                            onClick={() => handleUpdateQuantity(activeCartKey, 1)}
                            disabled={!product.isService && !isProductMadeToOrder(product) && product.availabilityType !== 'BAJO_ENCARGO' && !product.isSupplierPreorder && inCart.quantity >= availStock}
                            style={{ margin: 0, height: '32px', width: '32px' }}
                          >
                            <IonIcon slot="icon-only" icon={addOutline} />
                          </IonButton>
                        </div>
                      ) : (
                        <IonButton
                          size="small"
                          color={product.isSupplierPreorder ? 'tertiary' : product.availabilityType === 'BAJO_ENCARGO' ? 'warning' : 'primary'}
                          disabled={isOptionOutOfStock && !product.isSupplierPreorder && product.availabilityType !== 'BAJO_ENCARGO' && !isProductMadeToOrder(product)}
                          onClick={() => handleAddToCart(product, activeVariant)}
                          style={{ margin: 0, borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          {product.isSupplierPreorder
                            ? 'Solicitar Encargo'
                            : product.availabilityType === 'BAJO_ENCARGO'
                            ? 'Encargar'
                            : isOptionOutOfStock
                            ? 'Agotado'
                            : 'Agregar'}
                        </IonButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Floating Cart Button (when items in cart) */}
        {cartTotalItems > 0 && !isCartOpen && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              width: '90%',
              maxWidth: '450px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              style={{
                width: '100%',
                backgroundColor: primaryColor,
                color: primaryContrast,
                border: 'none',
                borderRadius: '14px',
                height: '52px',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                cursor: 'pointer',
              }}
            >
              <IonIcon icon={cartOutline} style={{ fontSize: '1.4rem' }} />
              <span>Ver Carrito ({cartTotalItems}) • ${cartSubtotalUSD.toFixed(2)}</span>
            </button>
          </div>
        )}

        {/* Cart and Checkout Modal */}
        <IonModal
          isOpen={isCartOpen}
          onDidDismiss={() => {
            if (reservedPaymentOrder) {
              setOrderResult(reservedPaymentOrder);
              setReservedPaymentOrder(null);
            }
            setIsCartOpen(false);
          }}
        >
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: headerColor, color: headerContrast }}>
              <IonTitle style={{ color: headerContrast }}>
                {reservedPaymentOrder
                  ? `💳 Métodos de Pago (#${reservedPaymentOrder.orderNumber})`
                  : `Mi Carrito (${cartTotalItems})`}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() => {
                    if (reservedPaymentOrder) {
                      setOrderResult(reservedPaymentOrder);
                      setReservedPaymentOrder(null);
                    }
                    setIsCartOpen(false);
                  }}
                  style={{ color: headerContrast }}
                >
                  <IonIcon slot="icon-only" icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ maxWidth: '650px', margin: '0 auto' }}>
            {!reservedPaymentOrder && cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                <IonIcon icon={cartOutline} style={{ fontSize: '64px', marginBottom: '10px' }} />
                <h3>Tu carrito está vacío</h3>
                <p>Agrega productos del catálogo para continuar.</p>
                <IonButton fill="outline" onClick={() => setIsCartOpen(false)} style={{ marginTop: '16px' }}>
                  Volver al Catálogo
                </IonButton>
              </div>
            ) : !reservedPaymentOrder ? (
              <div>
                {/* Cart Items List */}
                <h4 style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Productos Seleccionados</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
                  {cart.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity;
                    const itemImg = (item.variant?.images && item.variant.images[0]) || item.product.images?.[0];
                    const itemAvail = getAvailableStock(item.product, item.variant);
                    return (
                      <div
                        key={item.cartKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fff',
                          gap: '12px',
                        }}
                      >
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.product.name}
                            loading="lazy"
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              background: '#f1f5f9',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#94a3b8',
                            }}
                          >
                            Item
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 3px 0', fontSize: '0.95rem', fontWeight: '600' }}>
                            {item.product.name}
                            {item.variant && (
                              <span style={{ marginLeft: '6px', fontSize: '0.78rem', fontWeight: 800, backgroundColor: '#F3E8FF', color: '#6D28D9', padding: '1px 6px', borderRadius: '5px' }}>
                                🎨 {item.variant.name}
                              </span>
                            )}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold' }}>
                            ${item.unitPrice.toFixed(2)} c/u (${lineTotal.toFixed(2)})
                          </span>
                          {!item.product.isService && !isProductMadeToOrder(item.product) && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: item.quantity > itemAvail ? '#ef4444' : '#64748b',
                                display: 'block',
                                marginTop: '2px',
                                fontWeight: item.quantity > itemAvail ? 'bold' : 'normal',
                              }}
                            >
                              {item.quantity > itemAvail
                                ? `⚠️ Excede stock disponible (${itemAvail})`
                                : `Disponible: ${itemAvail}`}
                            </span>
                          )}
                          {isProductMadeToOrder(item.product) && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: primaryReadable,
                                display: 'block',
                                marginTop: '2px',
                                fontWeight: '500',
                              }}
                            >
                              👨‍🍳 Preparado al momento
                            </span>
                          )}
                        </div>

                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonButton
                            size="small"
                            fill="outline"
                            color="medium"
                            onClick={() => handleUpdateQuantity(item.cartKey, -1)}
                            style={{ height: '30px', width: '30px', margin: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={removeOutline} />
                          </IonButton>
                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <IonButton
                            size="small"
                            fill="outline"
                            color="primary"
                            disabled={!item.product.isService && !isProductMadeToOrder(item.product) && item.quantity >= itemAvail}
                            onClick={() => handleUpdateQuantity(item.cartKey, 1)}
                            style={{ height: '30px', width: '30px', margin: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={addOutline} />
                          </IonButton>
                          <IonButton
                            size="small"
                            fill="clear"
                            color="danger"
                            onClick={() => handleRemoveItem(item.cartKey)}
                            style={{ height: '30px', width: '30px', margin: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={trashOutline} />
                          </IonButton>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Options */}
                <h4 style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Método de Entrega</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div
                    onClick={() => setDeliveryMethod('IN_STORE')}
                    style={{
                      border: `2px solid ${deliveryMethod === 'IN_STORE' ? '#2563eb' : '#e2e8f0'}`,
                      backgroundColor: deliveryMethod === 'IN_STORE' ? '#eff6ff' : '#fff',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <IonIcon icon={storefrontOutline} style={{ fontSize: '24px', color: deliveryMethod === 'IN_STORE' ? '#2563eb' : '#64748b' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>Retiro en Tienda</div>
                    <div style={{ fontSize: '0.78rem', color: '#16a34a' }}>Gratis</div>
                  </div>

                  <div
                    onClick={() => setDeliveryMethod('DELIVERY')}
                    style={{
                      border: `2px solid ${deliveryMethod === 'DELIVERY' ? '#2563eb' : '#e2e8f0'}`,
                      backgroundColor: deliveryMethod === 'DELIVERY' ? '#eff6ff' : '#fff',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <IonIcon icon={bicycleOutline} style={{ fontSize: '24px', color: deliveryMethod === 'DELIVERY' ? '#2563eb' : '#64748b' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>Envío a Domicilio</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {deliveryZones.length > 0 ? 'Con recargo por zona' : 'Delivery directo'}
                    </div>
                  </div>
                </div>

                {deliveryMethod === 'DELIVERY' && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    {deliveryZones.length > 0 && (
                      <IonItem lines="none" style={{ '--background': 'transparent', marginBottom: '8px' }}>
                        <IonLabel position="stacked">Zona de Reparto</IonLabel>
                        <IonSelect value={selectedZoneId} onIonChange={(e) => setSelectedZoneId(e.detail.value)}>
                          {deliveryZones.map((z) => (
                            <IonSelectOption key={z.id} value={z.id}>
                              {z.name} (+${Number(z.feePrice).toFixed(2)})
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                    )}
                    <IonItem lines="none" style={{ '--background': 'transparent' }}>
                      <IonLabel position="stacked">Dirección Completa de Entrega *</IonLabel>
                      <IonTextarea
                        value={customerAddress}
                        onIonInput={(e) => setCustomerAddress(e.detail.value!)}
                        placeholder="Ej. Calle Los Mangos, Casa #45, frente a la panadería"
                        rows={2}
                      />
                    </IonItem>
                  </div>
                )}

                {/* Customer Details */}
                <h4 style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Tus Datos de Contacto</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', background: '#fff' }}>
                  <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        Cédula / RIF (Opcional - Autocompleta tus datos)
                      </label>
                      {cedulaAnalysis.normalized && cedulaAnalysis.digits.length >= 5 && (
                        <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: primarySoftBg, color: primaryReadable, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${primaryColor}40` }}>
                          ✓ Se guardará: {cedulaAnalysis.normalized}
                        </span>
                      )}
                    </div>

                    {/* Selector rápido de indicador V-, E-, J-, G-, P- */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Indicador:</span>
                      {(['V', 'E', 'J', 'G', 'P'] as CedulaPrefix[]).map((pref) => {
                        const isSelected = (cedulaAnalysis.prefix || 'V') === pref && Boolean(customerCedula.trim());
                        return (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => applyCedulaPrefix(pref)}
                            style={{
                              padding: '3px 9px',
                              borderRadius: '6px',
                              border: isSelected ? `1.5px solid ${primaryColor}` : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? primarySoftBg : '#f8fafc',
                              color: isSelected ? primaryReadable : '#475569',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {pref}-
                          </button>
                        );
                      })}
                    </div>

                    <IonInput
                      value={customerCedula}
                      onIonInput={(e) => handleCedulaInput(e.detail.value!)}
                      onIonBlur={handleCedulaBlur}
                      placeholder="Ej. V-31075846 o J-401234567"
                      style={{
                        border: cedulaAnalysis.warningMessage && !cedulaAnalysis.isValidFormat ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0 10px',
                        backgroundColor: '#f8fafc',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    />

                    {cedulaAnalysis.warningMessage ? (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          backgroundColor: cedulaAnalysis.isValidFormat ? '#f0fdf4' : '#fffbeb',
                          border: `1px solid ${cedulaAnalysis.isValidFormat ? '#bbf7d0' : '#fde68a'}`,
                          color: cedulaAnalysis.isValidFormat ? '#166534' : '#92400e',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        {cedulaAnalysis.isValidFormat ? '✨ ' : '⚠️ '}
                        {cedulaAnalysis.warningMessage}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        💡 Incluye el indicador (<b>V-</b>, <b>E-</b>, <b>J-</b>, <b>G-</b> o <b>P-</b>) sin puntos. Si escribes solo números o con puntos, lo estandarizaremos automáticamente (ej. <b>V-31075846</b>).
                      </div>
                    )}
                  </div>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Nombre y Apellido *</IonLabel>
                    <IonInput
                      value={customerName}
                      onIonInput={(e) => setCustomerName(e.detail.value!)}
                      placeholder="Ej. María Pérez"
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Teléfono / WhatsApp *</IonLabel>
                    <IonInput
                      type="tel"
                      value={customerPhone}
                      onIonInput={(e) => setCustomerPhone(e.detail.value!)}
                      placeholder="Ej. 04141234567"
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Notas o Instrucciones (Opcional)</IonLabel>
                    <IonInput
                      value={notes}
                      onIonInput={(e) => setNotes(e.detail.value!)}
                      placeholder="Ej. Timbre dañado, color de envoltura, etc."
                    />
                  </IonItem>
                </div>

                {/* Bajo Encargo - Fecha requerida */}
                {hasBajoEncargo && (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e', marginBottom: '4px' }}>
                      🎂 Productos Bajo Encargo (Preparación)
                    </div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '10px' }}>
                      Este pedido incluye platos o postres preparados a solicitud. Se requiere un abono previo para procesar la orden.
                    </div>
                    <IonItem lines="none" style={{ '--background': '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <IonLabel position="stacked" style={{ color: '#92400e', fontWeight: 'bold' }}>
                        ¿Para cuándo lo necesitas? * (Fecha y Hora) {requestedDeliveryDate && requestedDeliveryDate.includes('T') && (
                          <span style={{ color: primaryReadable, fontWeight: 600 }}>({formatTime12h(requestedDeliveryDate.split('T')[1])})</span>
                        )}
                      </IonLabel>
                      <IonInput
                        type="datetime-local"
                        value={requestedDeliveryDate}
                        onIonInput={(e) => setRequestedDeliveryDate(e.detail.value!)}
                      />
                    </IonItem>
                  </div>
                )}

                {/* Preorder Notice or Stock Reservation Notice before Payment */}
                {hasSupplierPreorder ? (
                  <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '20px' }}>📦</span>
                      <h4 style={{ fontWeight: 'bold', margin: 0, color: '#6b21a8', fontSize: '15px' }}>
                        Preorden por Catálogo (Sujeto a Proveedor)
                      </h4>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7e22ce', lineHeight: '1.4' }}>
                      Hemos recibido tu solicitud. Verificaremos existencia con el distribuidor y te avisaremos para realizar el pago de apartado.
                    </p>
                    <div style={{ fontSize: '12px', color: '#9333ea', fontWeight: '600' }}>
                      ✓ No requieres transferir ni registrar pago en este momento.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: primarySoftBg, border: `1.5px solid ${primaryColor}40`, borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>🔒</span>
                      <h4 style={{ fontWeight: 'bold', margin: 0, color: primaryReadable, fontSize: '14px' }}>
                        Apartado Inmediato al Pagar
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: '1.4' }}>
                      Al darle al botón de <b>Pagar</b> se descontarán y apartarán tus productos inmediatamente del inventario. Solo una vez apartados se te mostrarán los métodos de pago para que nadie más tome tu stock.
                    </p>
                  </div>
                )}

                {/* Totals Summary (Step 1) */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span>${cartSubtotalUSD.toFixed(2)}</span>
                  </div>
                  {deliveryFeeUSD > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Costo Delivery:</span>
                      <span>+${deliveryFeeUSD.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '6px' }}>
                    <div>
                      <b style={{ fontSize: '1.1rem' }}>Total General:</b>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tasa: Bs. {exchangeRate.toFixed(2)}</div>
                      {enableCopCurrency && (
                        <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>
                          Tasa COP: ${exchangeRateCop.toLocaleString('es-CO')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                        ${grandTotalUSD.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                        Bs. {grandTotalBs.toFixed(2)}
                      </div>
                      {enableCopCurrency && (
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                          🇨🇴 ${grandTotalCop.toLocaleString('es-CO')} COP
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 1 Button: Apartar y Proceder al Pago */}
                <IonButton
                  expand="block"
                  color={hasSupplierPreorder ? 'tertiary' : 'success'}
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                  style={{ height: '52px', fontWeight: 'bold', fontSize: '1rem', borderRadius: '10px' }}
                >
                  {isSubmitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      {hasSupplierPreorder
                        ? `Enviar Solicitud de Encargo ($${grandTotalUSD.toFixed(2)})`
                        : `💳 Pagar ($${grandTotalUSD.toFixed(2)})`}
                    </>
                  )}
                </IonButton>
              </div>
            ) : (
              <div>
                {/* Paso 2: Solo cuando ya se apartaron los productos se muestran los métodos de pago */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <div style={{ fontWeight: 800, color: '#166534', fontSize: '15px' }}>
                      ¡Productos Apartados! (Pedido #{reservedPaymentOrder.orderNumber})
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803d', lineHeight: '1.4' }}>
                    Tus productos ya fueron descontados del inventario y están reservados para ti. Selecciona tu método de pago para finalizar:
                  </div>
                </div>

                <h4 style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Forma de Pago</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#fff', marginBottom: '20px' }}>
                  <IonItem lines="none">
                    <IonLabel>Método</IonLabel>
                    <IonSelect value={paymentOption} onIonChange={(e) => setPaymentOption(e.detail.value)}>
                      {storeData?.settings?.acceptPagoMovil !== false && (
                        <IonSelectOption value="PAGO_MOVIL">📱 Pago Móvil (Bolívares)</IonSelectOption>
                      )}
                      {storeData?.settings?.acceptCashUsd !== false && (
                        <IonSelectOption value="USD">💵 Divisas / Efectivo (USD)</IonSelectOption>
                      )}
                      {enableCopCurrency && storeData?.settings?.acceptCashCop !== false && (
                        <IonSelectOption value="CASH_COP">🇨🇴 Efectivo Pesos (COP)</IonSelectOption>
                      )}
                      {enableCopCurrency && storeData?.settings?.acceptTransferCop === true && (
                        <IonSelectOption value="TRANSFER_COP">📲 {storeData?.settings?.companyCopBank || 'Nequi / Bancolombia'} (COP)</IonSelectOption>
                      )}
                      {storeData?.settings?.acceptTransfer === true && (
                        <IonSelectOption value="TRANSFER">🏦 Transferencia Bancaria (Bs.)</IonSelectOption>
                      )}
                      {storeData?.settings?.acceptBinance === true && (
                        <IonSelectOption value="BINANCE">🟡 Binance Pay (USDT)</IonSelectOption>
                      )}
                      <IonSelectOption value="PENDING">⏳ Cuenta Abierta / Pagar Después</IonSelectOption>
                      <IonSelectOption value="WHATSAPP">💬 Acordar por WhatsApp</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {(paymentOption === 'PENDING' || paymentOption === 'WHATSAPP') && (
                    <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>
                        {paymentOption === 'PENDING' ? '⏳ Cuenta Abierta / Pago Posterior' : '💬 Coordinación por WhatsApp'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#15803d', lineHeight: '1.4' }}>
                        Tu pedido quedará registrado de inmediato. Podrás realizar abonos parciales o el pago completo en cualquier momento desde el panel de control de tu pedido.
                      </p>
                    </div>
                  )}

                  {paymentOption === 'PAGO_MOVIL' && storeData?.settings && (
                    <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                          Datos para Pago Móvil
                        </span>
                        <button
                          type="button"
                          onClick={copyAllPagoMovil}
                          style={{
                            background: copiedField === 'Datos de Pago Móvil' ? '#DCFCE7' : '#EFF6FF',
                            color: copiedField === 'Datos de Pago Móvil' ? '#15803D' : '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <IonIcon icon={copiedField === 'Datos de Pago Móvil' ? checkmarkDoneOutline : copyOutline} />
                          {copiedField === 'Datos de Pago Móvil' ? '¡Copiado!' : 'Copiar todo'}
                        </button>
                      </div>

                      {/* Monto exacto a transferir */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#F8FAFC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '13px' }}>
                          <b>Monto en Bs:</b> <span style={{ color: primaryReadable, fontWeight: '800' }}>Bs. {grandTotalBs.toFixed(2)}</span>
                        </span>
                        <IonButton fill="clear" size="small" onClick={() => copyToClipboard(grandTotalBs.toFixed(2), 'Monto en Bs')}>
                          <IonIcon icon={copiedField === 'Monto en Bs' ? checkmarkDoneOutline : copyOutline} slot="icon-only" color={copiedField === 'Monto en Bs' ? 'success' : undefined} />
                        </IonButton>
                      </div>

                      {storeData.settings.companyBank && (
                        <p style={{ margin: '4px 0', fontSize: '13px' }}>
                          <b>Banco:</b> {storeData.settings.companyBank}
                        </p>
                      )}
                      {storeData.settings.companyCedula && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Cédula/RIF:</b> {storeData.settings.companyCedula}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyCedula, 'Cédula')}>
                            <IonIcon icon={copiedField === 'Cédula' ? checkmarkDoneOutline : copyOutline} slot="icon-only" color={copiedField === 'Cédula' ? 'success' : undefined} />
                          </IonButton>
                        </div>
                      )}
                      {storeData.settings.companyPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Teléfono:</b> {storeData.settings.companyPhone}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyPhone, 'Teléfono')}>
                            <IonIcon icon={copiedField === 'Teléfono' ? checkmarkDoneOutline : copyOutline} slot="icon-only" color={copiedField === 'Teléfono' ? 'success' : undefined} />
                          </IonButton>
                        </div>
                      )}
                      <div style={{ marginTop: '10px' }}>
                        <BankSelect
                          label="Banco Emisor (Desde donde transferiste)"
                          value={originBank}
                          onChange={(val) => setOriginBank(val)}
                          placeholder="Selecciona tu banco de origen..."
                        />
                      </div>
                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px', marginTop: '8px' }}>
                        <IonLabel position="stacked">Referencia de Pago Móvil (Últimos 4 o 6 dígitos)</IonLabel>
                        <IonInput
                          value={pagoMovilRef}
                          onIonInput={(e) => setPagoMovilRef(e.detail.value!)}
                          placeholder="Ej. 9482"
                        />
                      </IonItem>
                    </div>
                  )}

                  {paymentOption === 'USD' && (
                    <div style={{ background: primarySoftBg, padding: '14px', borderRadius: '10px', marginTop: '10px', border: `1px solid ${primaryColor}40` }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: primaryReadable }}>
                        💵 Pago en Efectivo (Total: ${grandTotalUSD.toFixed(2)} USD)
                      </p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: primaryReadable }}>
                        Indica con qué billete pagarás para preparar tu vuelto:
                      </p>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setCashReceivedAmount(grandTotalUSD.toFixed(2))}
                          style={{
                            background: cashReceivedAmount === grandTotalUSD.toFixed(2) ? primaryColor : '#ffffff',
                            color: cashReceivedAmount === grandTotalUSD.toFixed(2) ? primaryContrast : primaryReadable,
                            border: `1px solid ${primaryColor}40`,
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Monto Exacto
                        </button>
                        {[5, 10, 20, 50, 100].filter(d => d >= grandTotalUSD).map(denom => (
                          <button
                            key={denom}
                            type="button"
                            onClick={() => setCashReceivedAmount(denom.toString())}
                            style={{
                              background: cashReceivedAmount === denom.toString() ? primaryColor : '#ffffff',
                              color: cashReceivedAmount === denom.toString() ? primaryContrast : primaryReadable,
                              border: `1px solid ${primaryColor}40`,
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Billete ${denom}
                          </button>
                        ))}
                      </div>

                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px' }}>
                        <IonLabel position="stacked">¿Con cuánto pagarás? (USD)</IonLabel>
                        <IonInput
                          type="number"
                          value={cashReceivedAmount}
                          onIonInput={(e) => setCashReceivedAmount(e.detail.value!)}
                          placeholder={`Ej. ${(Math.ceil(grandTotalUSD / 5) * 5 || grandTotalUSD).toFixed(0)}`}
                        />
                      </IonItem>

                      {parseFloat(cashReceivedAmount) >= grandTotalUSD && (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: primarySoftBg, borderRadius: '6px', fontSize: '13px', color: primaryReadable, fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', border: `1px solid ${primaryColor}40` }}>
                          <span>Vuelto requerido:</span>
                          <span>${(parseFloat(cashReceivedAmount) - grandTotalUSD).toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentOption === 'CASH_COP' && (
                    <div style={{ background: '#fffbeb', padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #fde68a' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                        🇨🇴 Pago en Efectivo Pesos (Total: ${grandTotalCop.toLocaleString('es-CO')} COP)
                      </p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#b45309' }}>
                        Indica con qué billete pagarás para preparar tu vuelto en pesos:
                      </p>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setCashReceivedAmount(grandTotalCop.toString())}
                          style={{
                            background: cashReceivedAmount === grandTotalCop.toString() ? '#d97706' : '#ffffff',
                            color: cashReceivedAmount === grandTotalCop.toString() ? '#ffffff' : '#92400e',
                            border: '1px solid #fcd34d',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Monto Exacto
                        </button>
                        {[10000, 20000, 50000, 100000, 200000].filter(d => d >= grandTotalCop).map(denom => (
                          <button
                            key={denom}
                            type="button"
                            onClick={() => setCashReceivedAmount(denom.toString())}
                            style={{
                              background: cashReceivedAmount === denom.toString() ? '#d97706' : '#ffffff',
                              color: cashReceivedAmount === denom.toString() ? '#ffffff' : '#92400e',
                              border: '1px solid #fcd34d',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            ${(denom / 1000).toFixed(0)}k
                          </button>
                        ))}
                      </div>

                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px' }}>
                        <IonLabel position="stacked">¿Con cuánto pagarás? (COP)</IonLabel>
                        <IonInput
                          type="number"
                          value={cashReceivedAmount}
                          onIonInput={(e) => setCashReceivedAmount(e.detail.value!)}
                          placeholder={`Ej. ${grandTotalCop}`}
                        />
                      </IonItem>

                      {parseFloat(cashReceivedAmount) >= grandTotalCop && (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Vuelto requerido:</span>
                          <span>${Math.round(parseFloat(cashReceivedAmount) - grandTotalCop).toLocaleString('es-CO')} COP</span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentOption === 'TRANSFER_COP' && storeData?.settings && (
                    <div style={{ background: '#fffbeb', padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #fde68a' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                        📲 Datos para {storeData.settings.companyCopBank || 'Nequi / Bancolombia'} (Total: ${grandTotalCop.toLocaleString('es-CO')} COP):
                      </p>
                      {storeData.settings.companyCopBank && (
                        <p style={{ margin: '3px 0', fontSize: '13px' }}>
                          <b>Entidad:</b> {storeData.settings.companyCopBank}
                        </p>
                      )}
                      {storeData.settings.companyCopAccountHolder && (
                        <p style={{ margin: '3px 0', fontSize: '13px' }}>
                          <b>Titular:</b> {storeData.settings.companyCopAccountHolder}
                        </p>
                      )}
                      {storeData.settings.companyCopAccountNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                          <span style={{ fontSize: '13px' }}><b>Cuenta / Celular:</b> {storeData.settings.companyCopAccountNumber}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyCopAccountNumber, 'Cuenta COP')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px', marginTop: '10px' }}>
                        <IonLabel position="stacked">N° de Referencia / Comprobante *</IonLabel>
                        <IonInput
                          value={transferRef}
                          onIonInput={(e) => setTransferRef(e.detail.value!)}
                          placeholder="Ej. M1928374"
                        />
                      </IonItem>
                    </div>
                  )}

                  {paymentOption === 'TRANSFER' && storeData?.settings && (
                    <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #bfdbfe' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>
                        🏦 Datos para Transferencia Bancaria (Total: Bs. {grandTotalBs.toFixed(2)}):
                      </p>
                      {storeData.settings.companyBank && (
                        <p style={{ margin: '3px 0', fontSize: '13px' }}>
                          <b>Banco:</b> {storeData.settings.companyBank}
                        </p>
                      )}
                      {storeData.settings.companyAccountHolder && (
                        <p style={{ margin: '3px 0', fontSize: '13px' }}>
                          <b>Titular:</b> {storeData.settings.companyAccountHolder}
                        </p>
                      )}
                      {storeData.settings.companyCedula && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '3px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Cédula/RIF:</b> {storeData.settings.companyCedula}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyCedula, 'Cédula/RIF')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
                      {storeData.settings.companyAccountNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <span style={{ fontSize: '13px' }}><b>N° Cuenta:</b> {storeData.settings.companyAccountNumber}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyAccountNumber, 'Número de Cuenta')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
                      <div style={{ marginTop: '10px' }}>
                        <BankSelect
                          label="Banco Emisor (Desde donde transferiste)"
                          value={originBank}
                          onChange={(val) => setOriginBank(val)}
                          placeholder="Selecciona tu banco de origen..."
                        />
                      </div>
                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px', marginTop: '10px' }}>
                        <IonLabel position="stacked">N° de Referencia de Transferencia *</IonLabel>
                        <IonInput
                          value={transferRef}
                          onIonInput={(e) => setTransferRef(e.detail.value!)}
                          placeholder="Ej. 829104"
                        />
                      </IonItem>
                    </div>
                  )}

                  {paymentOption === 'BINANCE' && (
                    <div style={{ background: '#fefce8', padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #fde047' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#854d0e' }}>
                        🟡 Enviar pago por Binance Pay (Total: ${grandTotalUSD.toFixed(2)} USDT)
                      </p>

                      {storeData?.settings?.binancePayId && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fef08a' }}>
                          <span style={{ fontSize: '13px' }}><b>Binance Pay ID:</b> {storeData.settings.binancePayId}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.binancePayId, 'Binance Pay ID')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}

                      {storeData?.settings?.binanceEmail && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fef08a' }}>
                          <span style={{ fontSize: '13px' }}><b>Correo Binance:</b> {storeData.settings.binanceEmail}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.binanceEmail, 'Correo Binance')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}

                      {storeData?.settings?.binancePhone && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fef08a' }}>
                          <span style={{ fontSize: '13px' }}><b>Teléfono Binance:</b> {storeData.settings.binancePhone}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.binancePhone, 'Teléfono Binance')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}

                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px', marginTop: '10px' }}>
                        <IonLabel position="stacked">Tu ID de Transacción / Order ID / Pay ID *</IonLabel>
                        <IonInput
                          value={binanceRef}
                          onIonInput={(e) => setBinanceRef(e.detail.value!)}
                          placeholder="Ej. 2938471928"
                        />
                      </IonItem>
                    </div>
                  )}
                </div>

                {/* Totals Summary (Step 2) */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span>${Math.max(0, grandTotalUSD - Number(reservedPaymentOrder.deliveryFeeUSD || 0)).toFixed(2)}</span>
                  </div>
                  {Number(reservedPaymentOrder.deliveryFeeUSD || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Costo Delivery:</span>
                      <span>+${Number(reservedPaymentOrder.deliveryFeeUSD || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '6px' }}>
                    <div>
                      <b style={{ fontSize: '1.1rem' }}>Total a Pagar:</b>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tasa: Bs. {exchangeRate.toFixed(2)}</div>
                      {enableCopCurrency && (
                        <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>
                          Tasa COP: ${exchangeRateCop.toLocaleString('es-CO')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                        ${grandTotalUSD.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                        Bs. {grandTotalBs.toFixed(2)}
                      </div>
                      {enableCopCurrency && (
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                          🇨🇴 ${grandTotalCop.toLocaleString('es-CO')} COP
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confirm Payment Button (Step 2) */}
                <IonButton
                  expand="block"
                  color="success"
                  disabled={isSubmitting}
                  onClick={handleConfirmReservedPayment}
                  style={{ height: '52px', fontWeight: 'bold', fontSize: '1rem', borderRadius: '10px' }}
                >
                  {isSubmitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      {`Confirmar Pago ($${grandTotalUSD.toFixed(2)})`}
                    </>
                  )}
                </IonButton>
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Modal de Rastrear Pedido */}
        <IonModal
          isOpen={isTrackModalOpen}
          onDidDismiss={() => {
            setIsTrackModalOpen(false);
            setTrackError(null);
          }}
        >
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: headerColor, color: headerContrast }}>
              <IonTitle style={{ fontWeight: 'bold', color: headerContrast }}>🔍 Rastrear mi Pedido</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsTrackModalOpen(false)} style={{ color: headerContrast }}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding" style={{ ['--background' as any]: '#f8fafc' }}>
            <div style={{ maxWidth: '480px', margin: '20px auto 40px auto' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: primarySoftBg,
                      color: primaryColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      marginBottom: '10px',
                    }}
                  >
                    📡
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
                    Consulta el Estado de tu Pedido
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Ingresa el código que recibiste al comprar y tu número de teléfono o cédula para validar tu identidad.
                  </p>
                </div>

                {trackError && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '0.85rem',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>⚠️</span>
                    <span>{trackError}</span>
                  </div>
                )}

                <form onSubmit={handleTrackOrder}>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Código de Pedido:
                    </label>
                    <input
                      type="text"
                      value={trackOrderCode}
                      onChange={(e) => {
                        setTrackOrderCode(e.target.value.toUpperCase());
                        if (trackError) setTrackError(null);
                      }}
                      placeholder="Ejemplo: #3A4B5C6D"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      El código de tu comprobante o WhatsApp (ej. #ORD-4F7380 o 4F7380).
                    </span>
                  </div>

                  <div style={{ marginBottom: '22px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Teléfono o Cédula Registrada:
                    </label>
                    <input
                      type="text"
                      value={trackPhone}
                      onChange={(e) => {
                        setTrackPhone(e.target.value);
                        if (trackError) setTrackError(null);
                      }}
                      placeholder="Ej: 04121234567 o V-12345678"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      🔒 Candado de seguridad: solo tú puedes ver el estado de tu pedido.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isTrackingLoading}
                    style={{
                      width: '100%',
                      height: '46px',
                      borderRadius: '10px',
                      backgroundColor: primaryColor,
                      color: primaryContrast,
                      border: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: isTrackingLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {isTrackingLoading ? (
                      <IonSpinner name="crescent" color="light" style={{ width: '22px', height: '22px' }} />
                    ) : (
                      <>
                        <span>Consultar Estado</span> ↗
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default PublicStore;
