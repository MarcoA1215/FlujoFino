import React, { useState, useEffect, useMemo } from 'react';
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
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
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
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useImageViewer } from '../context/ImageViewerContext';
import { requestAndSubscribePush } from '../services/push-notification.service';
import { CustomerNotificationPrompt } from '../components/CustomerNotificationPrompt';
import { formatWhatsAppUrl } from '../utils/whatsapp';
import { playNotificationSound } from '../utils/audio';
import { BankSelect } from '../components/BankSelect';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  salePrice: number;
  images: string[];
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

const getAvailableStock = (p: StoreProduct) => {
  if (isProductMadeToOrder(p)) return 999;
  return Math.max(0, Number(p.stock !== undefined && p.stock !== null ? p.stock : (p.stockQuantity || 0)));
};

interface DeliveryZone {
  id: string;
  name: string;
  feePrice: number;
}

interface CartItem {
  product: StoreProduct;
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
  const [paymentOption, setPaymentOption] = useState<'PAGO_MOVIL' | 'USD' | 'TRANSFER' | 'BINANCE' | 'WHATSAPP'>('PAGO_MOVIL');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [originBank, setOriginBank] = useState('');
  const [binanceRef, setBinanceRef] = useState('');
  const [cashReceivedAmount, setCashReceivedAmount] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Submission & Tracking state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [activeOrderMini, setActiveOrderMini] = useState<any | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<string | null>(null);
  const [livePaymentStatus, setLivePaymentStatus] = useState<string>('PENDING');

  // Track Order Modal state
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackOrderCode, setTrackOrderCode] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const getOrderStorageKey = (tid?: string) => `finowork_active_order_${tid || tenantId}`;

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = trackOrderCode.trim();
    const cleanPh = trackPhone.trim();

    if (!cleanCode) {
      setTrackError('Por favor ingresa tu código de pedido (ej: #3A4B5C6D)');
      return;
    }
    if (!cleanPh) {
      setTrackError('Por favor ingresa tu teléfono registrado (o los últimos 4 dígitos)');
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
      const msg = err.response?.data?.message || 'No se encontró ningún pedido con esos datos o el teléfono no coincide.';
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

  const handleCedulaInput = (val: string) => {
    setCustomerCedula(val);
    try {
      const saved = localStorage.getItem('flujofino_customer_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cedula && parsed.cedula.replace(/\D/g, '') === val.replace(/\D/g, '')) {
          if (parsed.name && !customerName) setCustomerName(parsed.name);
          if (parsed.phone && !customerPhone) setCustomerPhone(parsed.phone);
          if (parsed.address && !customerAddress) setCustomerAddress(parsed.address);
          if (parsed.zoneId && !selectedZoneId) setSelectedZoneId(parsed.zoneId);
        }
      }
    } catch (e) {}
  };

  // Calculations
  const exchangeRate = Number(storeData?.settings?.exchangeRateBs || 40.0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isService) return false;
      if (p.category?.toLowerCase() === 'servicios') return false;
      const matchCat =
        selectedCategory === 'TODOS' ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotalUSD = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const deliveryFeeUSD = useMemo(() => {
    if (deliveryMethod !== 'DELIVERY') return 0;
    const zone = deliveryZones.find((z) => z.id === selectedZoneId);
    return zone ? Number(zone.feePrice) : 0;
  }, [deliveryMethod, deliveryZones, selectedZoneId]);

  const grandTotalUSD = cartSubtotalUSD + deliveryFeeUSD;
  const grandTotalBs = grandTotalUSD * exchangeRate;

  const hasBajoEncargo = useMemo(() => cart.some((i) => i.product.availabilityType === 'BAJO_ENCARGO'), [cart]);
  const hasSupplierPreorder = useMemo(() => cart.some((i) => i.product.isSupplierPreorder), [cart]);

  const handleAddToCart = (product: StoreProduct) => {
    const isExempt = product.availabilityType === 'BAJO_ENCARGO' || product.isSupplierPreorder || isProductMadeToOrder(product);
    if (product.isOutOfStock && !isExempt) {
      presentToast({
        message: 'Este producto está agotado por el momento.',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    const existingIndex = cart.findIndex((i) => i.product.id === product.id);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;
    const availableStock = getAvailableStock(product);

    // Check inventory availability
    if (!isExempt && !product.isService && currentQtyInCart + 1 > availableStock) {
      presentToast({
        message: `Solo quedan ${availableStock} unidades disponibles de "${product.name}".`,
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    if (existingIndex > -1) {
      const nextCart = [...cart];
      nextCart[existingIndex].quantity += 1;
      setCart(nextCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    presentToast({
      message: `"${product.name}" agregado al carrito`,
      duration: 1500,
      color: 'success',
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const existingIndex = cart.findIndex((i) => i.product.id === productId);
    if (existingIndex === -1) return;

    const item = cart[existingIndex];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      // Remove item
      setCart(cart.filter((i) => i.product.id !== productId));
      return;
    }

    const isExempt = item.product.availabilityType === 'BAJO_ENCARGO' || item.product.isSupplierPreorder || isProductMadeToOrder(item.product);
    const availableStock = getAvailableStock(item.product);

    // Check inventory cap on increase
    if (delta > 0 && !isExempt && !item.product.isService && newQty > availableStock) {
      presentToast({
        message: `Límite alcanzado: solo hay ${availableStock} unidades disponibles de "${item.product.name}".`,
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    const nextCart = [...cart];
    nextCart[existingIndex].quantity = newQty;
    setCart(nextCart);
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  // Submit Order
  const handleCheckout = async () => {
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
      const avail = getAvailableStock(item.product);
      if (!isExempt && !item.product.isService && item.quantity > avail) {
        presentToast({
          message: `El producto "${item.product.name}" solo tiene ${avail} unidades disponibles. Por favor ajusta la cantidad.`,
          duration: 3500,
          color: 'warning',
        });
        return;
      }
    }

    if (!hasSupplierPreorder) {
      if (paymentOption === 'TRANSFER' && !transferRef.trim()) {
        presentToast({ message: 'Por favor ingresa la referencia de transferencia bancaria', duration: 2500, color: 'warning' });
        return;
      }
      if (paymentOption === 'BINANCE' && !binanceRef.trim()) {
        presentToast({ message: 'Por favor ingresa el ID de transacción / Binance Pay', duration: 2500, color: 'warning' });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      let usdNote = 'MÉTODO: Divisas Efectivo (USD)';
      if (paymentOption === 'USD' && cashReceivedAmount) {
        const cashNum = parseFloat(cashReceivedAmount);
        if (!isNaN(cashNum) && cashNum >= grandTotalUSD) {
          const change = cashNum - grandTotalUSD;
          usdNote = `MÉTODO: Divisas Efectivo (USD) | Paga con: $${cashNum.toFixed(2)} | Vuelto a recibir: $${change.toFixed(2)}`;
        }
      }

      const paymentNote = hasSupplierPreorder ? 'MÉTODO: Solicitud de Encargo (Pago tras confirmación de proveedor)' :
                          paymentOption === 'TRANSFER' ? `MÉTODO: Transferencia Bancaria | Ref: ${transferRef.trim()}` :
                          paymentOption === 'BINANCE' ? `MÉTODO: Binance Pay | ID: ${binanceRef.trim()}` :
                          paymentOption === 'USD' ? usdNote :
                          paymentOption === 'WHATSAPP' ? 'MÉTODO: A convenir por WhatsApp' : '';

      const deliveryDateNote = requestedDeliveryDate.trim() ? `Fecha requerida: ${requestedDeliveryDate.replace('T', ' ')}` : '';
      const cedulaNote = customerCedula.trim() ? `Cédula: ${customerCedula.trim()}` : '';
      const finalNotes = [notes.trim(), deliveryDateNote, cedulaNote, paymentNote].filter(Boolean).join(' | ');

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerCedula: customerCedula.trim() || undefined,
        pagoMovilCedula: customerCedula.trim() || undefined,
        deliveryMethod,
        deliveryZoneId: deliveryMethod === 'DELIVERY' ? selectedZoneId : undefined,
        customerAddress: deliveryMethod === 'DELIVERY' ? customerAddress.trim() : undefined,
        requestedDeliveryDate: requestedDeliveryDate.trim() ? new Date(requestedDeliveryDate).toISOString() : undefined,
        status: hasSupplierPreorder ? 'SOLICITUD_ENCARGO' : undefined,
        notes: finalNotes,
        pagoMovilRef: hasSupplierPreorder ? undefined : (
                      paymentOption === 'PAGO_MOVIL' ? pagoMovilRef.trim() : 
                      paymentOption === 'TRANSFER' ? transferRef.trim() : 
                      paymentOption === 'BINANCE' ? binanceRef.trim() : undefined),
        pagoMovilBank: originBank || undefined,
        transferBank: (paymentOption === 'TRANSFER' && originBank) ? originBank : undefined,
        paymentMethod: paymentOption,
        exchangeRate,
        amountBs: grandTotalBs,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.salePrice,
        })),
      };

      const res = await axios.post(`${apiBase}/public/store/tenant/${tenantId}/order`, payload);
      const createdOrderData = {
        ...res.data,
        orderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
        items: cart.map((i) => ({
          quantity: i.quantity,
          product: {
            id: i.product.id,
            name: i.product.name,
            salePrice: i.product.salePrice,
          },
        })),
        deliveryMethod,
        deliveryFeeUSD,
        grandTotalUSD,
        grandTotalBs,
        notes: finalNotes,
        customerAddress: deliveryMethod === 'DELIVERY' ? customerAddress.trim() : '',
        customerCedula: customerCedula.trim() || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      };

      setOrderResult(createdOrderData);
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
            cedula: customerCedula.trim(),
            address: customerAddress.trim(),
            zoneId: selectedZoneId,
          }),
        );
      } catch (e) {}

      // Clear cart
      setCart([]);
      setIsCartOpen(false);

      // Prompt and subscribe Web Push notifications linked to customer phone or cédula
      const pushIdentifier = customerPhone.trim() || customerCedula.trim();
      if (pushIdentifier) {
        requestAndSubscribePush(pushIdentifier, tenantId).catch((e) =>
          console.warn('Web push subscription failed:', e),
        );
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al procesar el pedido. Intenta de nuevo.';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    } finally {
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
        lines.push(`📅 *Fecha requerida:* ${new Date(orderResult.requestedDeliveryDate).toLocaleString('es-ES')}`);
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
    lines.push('', `💵 *TOTAL:* $${totalUSD} / Bs. ${totalBs}`);

    const refPM = orderResult.pagoMovilRef || pagoMovilRef;
    const refTrans = orderResult.transferRef || transferRef;
    const refBin = orderResult.binanceRef || binanceRef;

    if (refPM) {
      lines.push(`📱 *Ref. Pago Móvil:* ${refPM}${originBank ? ` (${originBank})` : ''}`);
    } else if (refTrans) {
      lines.push(`🏦 *Ref. Transferencia:* ${refTrans}${originBank ? ` (${originBank})` : ''}`);
    } else if (refBin) {
      lines.push(`🟡 *ID Binance Pay:* ${refBin}`);
    } else if (paymentOption === 'USD') {
      lines.push(`💵 *Método:* Efectivo Divisas (USD)`);
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

  const headerColor = storeData?.settings?.themeHeaderColor || '#0f172a';

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
          <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
            <IonTitle>{storeData?.tenant?.name || 'Tienda Online'}</IonTitle>
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

            {/* Payment Verification Status Badge */}
            <div style={{ margin: '14px 0' }}>
              {livePaymentStatus === 'PAID' ? (
                <div style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #10B981',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#065F46',
                  fontWeight: '700',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <span>✅ Pago Verificado y Aprobado (${orderResult.grandTotalUSD.toFixed(2)})</span>
                </div>
              ) : (pagoMovilRef || transferRef || binanceRef || orderResult.paymentReported || orderResult.paymentStatus === 'PENDING') ? (
                <div style={{
                  background: '#FEF3C7',
                  border: '1.5px solid #FCD34D',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#92400E',
                  fontWeight: '700',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <span>⏳ Pago Reportado: En proceso de verificación por el negocio</span>
                </div>
              ) : null}
            </div>

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
      <IonHeader>
        <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>{storeData?.tenant?.name || 'Tienda Online'}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={() => {
                setTrackError(null);
                setIsTrackModalOpen(true);
              }}
              title="Rastrear mi pedido"
              style={{ color: '#fff' }}
            >
              <IonIcon slot="icon-only" icon={searchOutline} style={{ fontSize: '1.45rem' }} />
            </IonButton>
            {storeData?.settings?.companyPhone && (
              <IonButton
                fill="clear"
                onClick={() => {
                  window.open(formatWhatsAppUrl(storeData.settings.companyPhone), '_blank');
                }}
              >
                <IonIcon slot="icon-only" icon={logoWhatsapp} style={{ color: '#25D366', fontSize: '1.5rem' }} />
              </IonButton>
            )}
            <IonButton onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
              <IonIcon slot="icon-only" icon={cartOutline} style={{ fontSize: '1.6rem' }} />
              {cartTotalItems > 0 && (
                <IonBadge
                  color="danger"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    fontSize: '11px',
                    padding: '2px 5px',
                    borderRadius: '10px',
                  }}
                >
                  {cartTotalItems}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Banner Persistente de Pedido Activo */}
        {activeOrderMini && !orderResult && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
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
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065f46' }}>
                  Pedido activo #{activeOrderMini.orderNumber || (activeOrderMini.orderId || activeOrderMini.id || '').slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                  Estado: {getStatusLabel(activeOrderMini.status || 'PENDING')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => loadOrderDetails(activeOrderMini.orderId || activeOrderMini.id, true)}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
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
                  color: '#059669',
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

        {/* Banner / Store Info */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {storeData?.tenant?.name}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Catálogo de productos disponibles para retiro o delivery
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <IonBadge color="light" style={{ fontSize: '0.95rem', padding: '8px 12px', border: '1px solid #cbd5e1' }}>
              Tasa BCV: <b>Bs. {exchangeRate.toFixed(2)}</b>
            </IonBadge>
            <button
              type="button"
              onClick={() => {
                setTrackError(null);
                setIsTrackModalOpen(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <span>🔍</span> Rastrear Pedido
            </button>
          </div>
        </div>

        {/* Navigation Switcher if Business has both Store & Booking */}
        {storeData?.settings?.featureCustomerSchedules && (
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '16px',
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
        <IonSearchbar
          value={searchQuery}
          onIonInput={(e) => setSearchQuery(e.detail.value!)}
          placeholder="Buscar productos..."
          style={{ padding: '0 0 10px 0' }}
        />

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '12px',
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
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.1rem' }}>No se encontraron productos disponibles.</p>
          </div>
        ) : (
          <IonGrid className="ion-no-padding">
            <IonRow>
              {filteredProducts.map((product) => {
                const imageUrl = product.images?.[0] || null;
                const priceBs = product.salePrice * exchangeRate;
                const inCart = cart.find((i) => i.product.id === product.id);

                return (
                  <IonCol key={product.id} size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
                    <IonCard
                      style={{
                        margin: '6px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Product Image with lazy loading and zoom lightbox */}
                      {imageUrl ? (
                        <div style={{ position: 'relative', width: '100%', height: '170px', background: '#f1f5f9' }}>
                          <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            onClick={() => openImage(imageUrl, product.name)}
                            title="Toca para ampliar imagen"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'zoom-in',
                            }}
                          />
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
                          ) : product.isOutOfStock ? (
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
                              Disp: {getAvailableStock(product)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '110px',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Sin imagen
                        </div>
                      )}

                      <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}>
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
                        </div>

                        {/* Price and Action Button */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '10px',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                              ${product.salePrice.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Bs. {priceBs.toFixed(2)}
                            </div>
                          </div>

                          {inCart ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IonButton
                                size="small"
                                fill="outline"
                                color="primary"
                                onClick={() => handleUpdateQuantity(product.id, -1)}
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
                                onClick={() => handleUpdateQuantity(product.id, 1)}
                                disabled={!product.isService && !isProductMadeToOrder(product) && product.availabilityType !== 'BAJO_ENCARGO' && !product.isSupplierPreorder && inCart.quantity >= getAvailableStock(product)}
                                style={{ margin: 0, height: '32px', width: '32px' }}
                              >
                                <IonIcon slot="icon-only" icon={addOutline} />
                              </IonButton>
                            </div>
                          ) : (
                            <IonButton
                              size="small"
                              color={product.isSupplierPreorder ? 'tertiary' : product.availabilityType === 'BAJO_ENCARGO' ? 'warning' : 'primary'}
                              disabled={product.isOutOfStock && !product.isSupplierPreorder && product.availabilityType !== 'BAJO_ENCARGO' && !isProductMadeToOrder(product)}
                              onClick={() => handleAddToCart(product)}
                              style={{ margin: 0, borderRadius: '8px', fontWeight: 'bold' }}
                            >
                              {product.isSupplierPreorder
                                ? 'Solicitar Encargo'
                                : product.availabilityType === 'BAJO_ENCARGO'
                                ? 'Encargar'
                                : product.isOutOfStock
                                ? 'Agotado'
                                : 'Agregar'}
                            </IonButton>
                          )}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        )}

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
            <IonButton
              expand="block"
              color="success"
              onClick={() => setIsCartOpen(true)}
              style={{
                boxShadow: '0 8px 20px rgba(22, 163, 74, 0.35)',
                borderRadius: '12px',
                height: '52px',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              <IonIcon slot="start" icon={cartOutline} style={{ fontSize: '1.3rem' }} />
              Ver Carrito ({cartTotalItems}) • ${cartSubtotalUSD.toFixed(2)}
            </IonButton>
          </div>
        )}

        {/* Cart and Checkout Modal */}
        <IonModal isOpen={isCartOpen} onDidDismiss={() => setIsCartOpen(false)}>
          <IonHeader>
            <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
              <IonTitle>Mi Carrito ({cartTotalItems})</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsCartOpen(false)}>
                  <IonIcon slot="icon-only" icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ maxWidth: '650px', margin: '0 auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                <IonIcon icon={cartOutline} style={{ fontSize: '64px', marginBottom: '10px' }} />
                <h3>Tu carrito está vacío</h3>
                <p>Agrega productos del catálogo para continuar.</p>
                <IonButton fill="outline" onClick={() => setIsCartOpen(false)} style={{ marginTop: '16px' }}>
                  Volver al Catálogo
                </IonButton>
              </div>
            ) : (
              <div>
                {/* Cart Items List */}
                <h4 style={{ fontWeight: 'bold', margin: '0 0 10px 0' }}>Productos Seleccionados</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
                  {cart.map((item) => {
                    const lineTotal = item.product.salePrice * item.quantity;
                    return (
                      <div
                        key={item.product.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fff',
                          gap: '12px',
                        }}
                      >
                        {item.product.images?.[0] ? (
                          <img
                            src={item.product.images[0]}
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
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold' }}>
                            ${item.product.salePrice.toFixed(2)} c/u (${lineTotal.toFixed(2)})
                          </span>
                          {!item.product.isService && !isProductMadeToOrder(item.product) && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: item.quantity > getAvailableStock(item.product) ? '#ef4444' : '#64748b',
                                display: 'block',
                                marginTop: '2px',
                                fontWeight: item.quantity > getAvailableStock(item.product) ? 'bold' : 'normal',
                              }}
                            >
                              {item.quantity > getAvailableStock(item.product)
                                ? `⚠️ Excede stock disponible (${getAvailableStock(item.product)})`
                                : `Disponible: ${getAvailableStock(item.product)}`}
                            </span>
                          )}
                          {isProductMadeToOrder(item.product) && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#059669',
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
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
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
                            disabled={!item.product.isService && !isProductMadeToOrder(item.product) && item.quantity >= getAvailableStock(item.product)}
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            style={{ height: '30px', width: '30px', margin: 0 }}
                          >
                            <IonIcon slot="icon-only" icon={addOutline} />
                          </IonButton>
                          <IonButton
                            size="small"
                            fill="clear"
                            color="danger"
                            onClick={() => handleRemoveItem(item.product.id)}
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
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', marginBottom: '16px', background: '#fff' }}>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Cédula / RIF (Opcional - Autocompleta tus datos)</IonLabel>
                    <IonInput
                      value={customerCedula}
                      onIonInput={(e) => handleCedulaInput(e.detail.value!)}
                      placeholder="Ej. V-12345678"
                    />
                  </IonItem>
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
                        ¿Para cuándo lo necesitas? * (Fecha y Hora)
                      </IonLabel>
                      <IonInput
                        type="datetime-local"
                        value={requestedDeliveryDate}
                        onIonInput={(e) => setRequestedDeliveryDate(e.detail.value!)}
                      />
                    </IonItem>
                  </div>
                )}

                {/* Payment Option / Preorder Notice */}
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
                  <>
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
                      {storeData?.settings?.acceptTransfer === true && (
                        <IonSelectOption value="TRANSFER">🏦 Transferencia Bancaria (Bs.)</IonSelectOption>
                      )}
                      {storeData?.settings?.acceptBinance === true && (
                        <IonSelectOption value="BINANCE">🟡 Binance Pay (USDT)</IonSelectOption>
                      )}
                      <IonSelectOption value="WHATSAPP">💬 Acordar por WhatsApp</IonSelectOption>
                    </IonSelect>
                  </IonItem>

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
                          <b>Monto en Bs:</b> <span style={{ color: '#059669', fontWeight: '800' }}>Bs. {grandTotalBs.toFixed(2)}</span>
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
                    <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid #a7f3d0' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: '#065f46' }}>
                        💵 Pago en Efectivo (Total: ${grandTotalUSD.toFixed(2)} USD)
                      </p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#047857' }}>
                        Indica con qué billete pagarás para preparar tu vuelto:
                      </p>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setCashReceivedAmount(grandTotalUSD.toFixed(2))}
                          style={{
                            background: cashReceivedAmount === grandTotalUSD.toFixed(2) ? '#059669' : '#ffffff',
                            color: cashReceivedAmount === grandTotalUSD.toFixed(2) ? '#ffffff' : '#065F46',
                            border: '1px solid #A7F3D0',
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
                              background: cashReceivedAmount === denom.toString() ? '#059669' : '#ffffff',
                              color: cashReceivedAmount === denom.toString() ? '#ffffff' : '#065F46',
                              border: '1px solid #A7F3D0',
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
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#d1fae5', borderRadius: '6px', fontSize: '13px', color: '#065f46', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Vuelto requerido:</span>
                          <span>${(parseFloat(cashReceivedAmount) - grandTotalUSD).toFixed(2)} USD</span>
                        </div>
                      )}
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
              </>
            )}

                {/* Totals Summary */}
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
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                        ${grandTotalUSD.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                        Bs. {grandTotalBs.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Button */}
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
                        : `Confirmar Pedido ($${grandTotalUSD.toFixed(2)})`}
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
            <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
              <IonTitle style={{ fontWeight: 'bold' }}>🔍 Rastrear mi Pedido</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsTrackModalOpen(false)} style={{ color: '#fff' }}>
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
                      backgroundColor: '#ecfdf5',
                      color: '#10b981',
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
                    Ingresa el código que recibiste al comprar y tu número de teléfono para validar tu identidad.
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
                      Los 8 caracteres de tu comprobante o WhatsApp (ej. 3A4B5C6D).
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
                      Teléfono Registrado:
                    </label>
                    <input
                      type="tel"
                      value={trackPhone}
                      onChange={(e) => {
                        setTrackPhone(e.target.value);
                        if (trackError) setTrackError(null);
                      }}
                      placeholder="Ej: 04121234567 o últimos 4 dígitos"
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
                      backgroundColor: '#10b981',
                      color: '#ffffff',
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
