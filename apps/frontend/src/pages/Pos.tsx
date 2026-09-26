// @ts-nocheck
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonBadge,
  useIonToast,
  useIonAlert,
  useIonRouter
} from '@ionic/react';
import {
  searchOutline,
  closeOutline,
  addOutline,
  trashOutline,
  cartOutline,
  cashOutline,
  cardOutline,
  phonePortraitOutline,
  logoBitcoin,
  checkmarkCircle,
  chevronForwardOutline,
  storefrontOutline,
  bicycleOutline,
  timeOutline,
  imageOutline,
  arrowForwardOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useImageViewer } from '../context/ImageViewerContext';
import { offlineDb, type OfflineOrder } from '../services/offline-db';
import { DeliveryMethod, PaymentStatus, UserRole } from '@nutrideli/shared-types';
import type { DeliveryZone } from '../types';
import AppHeader from '../components/AppHeader';

type Product = {
  id: string;
  name: string;
  category?: string;
  stockQuantity: number;
  salePrice: number;
  baseCost: number;
  durationMinutes?: number;
  images?: string[] | string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod = 'PENDING' | 'PAGO_MOVIL' | 'USD' | 'PUNTO' | 'BINANCE' | 'TRANSFER';

const Pos: React.FC = () => {
  const { openImage } = useImageViewer();
  const { user } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const location = useLocation();
  const router = useIonRouter();

  // Products & Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Cart & Order
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAGO_MOVIL');
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('flujofino_exchange_rate');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch (e) {}
    return 40.0;
  });
  const [allowPartialPayments, setAllowPartialPayments] = useState<boolean>(false);
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('flujofino_cached_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  const [initialAbono, setInitialAbono] = useState<string>('');
  const [bypassMinDeposit, setBypassMinDeposit] = useState<boolean>(false);

  // Discounts
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState<string>('');

  // Payment specific fields
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilCedula, setPagoMovilCedula] = useState('');
  const [pagoMovilBank, setPagoMovilBank] = useState('');

  const [puntoRef, setPuntoRef] = useState('');
  const [puntoBank, setPuntoBank] = useState('');

  const [binanceRef, setBinanceRef] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferBank, setTransferBank] = useState('');

  const [usdReceived, setUsdReceived] = useState<number | ''>('');
  const [changeMethod, setChangeMethod] = useState<'CASH_USD' | 'PAGO_MOVIL' | 'CASH_BS'>('CASH_USD');
  const [changeRef, setChangeRef] = useState('');
  const [changePhone, setChangePhone] = useState('');
  const [changeBank, setChangeBank] = useState('');

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.IN_STORE);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Editing & Linked
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [linkedReservationId, setLinkedReservationId] = useState<string | null>(null);

  // Employees
  const [employees, setEmployees] = useState<{ id: string; username: string; name?: string; role?: string; jobTitle?: string }[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  // Fetching Products
  const fetchProducts = async () => {
    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
      if (res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedProducts.bulkPut(res.data);
        } catch (e) {}
      }
    } catch (e) {
      try {
        const localProducts = await offlineDb.cachedProducts.toArray();
        if (localProducts && localProducts.length > 0) {
          setProducts(localProducts);
          presentToast({ message: 'Sin conexión: Catálogo cargado desde la memoria local', duration: 2500, color: 'warning' });
          return;
        }
      } catch (dbErr) {}
      presentToast({ message: 'Error cargando productos', duration: 3000, color: 'danger' });
    }
  };

  const fetchRate = async () => {
    try {
      const res = await apiClient.get<any>('/settings');
      const s = res.data;
      setSettings(s);
      if (s.exchangeRateBs && Number(s.exchangeRateBs) > 0) {
        const rate = Number(s.exchangeRateBs);
        setExchangeRate(rate);
        localStorage.setItem('flujofino_exchange_rate', rate.toString());
      }
      localStorage.setItem('flujofino_cached_settings', JSON.stringify(s));
      setAllowPartialPayments(s.allowPartialPayments !== false);

      if (s.acceptPagoMovil !== false) setPaymentMethod('PAGO_MOVIL');
      else if (s.acceptCashUsd !== false) setPaymentMethod('USD');
      else if (s.acceptCardPos === true) setPaymentMethod('PUNTO');
      else if (s.acceptBinance === true) setPaymentMethod('BINANCE');
      else if (s.acceptTransfer === true) setPaymentMethod('TRANSFER');
      else if (s.allowPartialPayments !== false) setPaymentMethod('PENDING');
    } catch (e) {
      const cachedRate = localStorage.getItem('flujofino_exchange_rate');
      if (cachedRate && Number(cachedRate) > 0) setExchangeRate(Number(cachedRate));
    }
  };

  const fetchDeliveryZones = async () => {
    try {
      const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
      setDeliveryZones(res.data.filter(z => z.isActive));
    } catch (e) {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get<any[]>('/users');
      setEmployees(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchRate();
    fetchDeliveryZones();
    fetchEmployees();
  }, []);

  // Handle passed location state (e.g. from Reservations or Orders)
  useEffect(() => {
    if (location.state && (location.state as any).editOrder) {
      const order = (location.state as any).editOrder;
      setEditingOrderId(order.id);
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setCustomerAddress(order.customerAddress || '');
      setTableNumber(order.tableNumber || '');
      setDeliveryMethod(order.deliveryMethod || DeliveryMethod.IN_STORE);
      setDeliveryZoneId(order.deliveryZoneId || '');
      setEmployeeId(order.employeeId || '');
      setPaymentMethod(order.paymentMethod || 'PAGO_MOVIL');

      if (order.items && order.items.length > 0) {
        const loadedCart: CartItem[] = order.items.map((it: any) => ({
          product: {
            id: it.productId || it.product?.id || it.id,
            name: it.productName || it.product?.name || 'Producto',
            salePrice: Number(it.unitPrice || it.product?.salePrice || 0),
            baseCost: Number(it.product?.baseCost || 0),
            stockQuantity: 999
          },
          quantity: it.quantity
        }));
        setCart(loadedCart);
      }
    } else if (location.state && (location.state as any).reservationToBill) {
      const resData = (location.state as any).reservationToBill;
      setCustomerName(resData.customerName || '');
      setCustomerPhone(resData.customerPhone || '');
      setTableNumber(resData.tableNumber || '');
      setLinkedReservationId(resData.id);

      if (resData.serviceId) {
        apiClient.get<Product[]>('/products').then(res => {
          const found = res.data.find(p => p.id === resData.serviceId);
          if (found) {
            setCart([{ product: found, quantity: 1 }]);
          }
        }).catch(() => {});
      }
    } else {
      const params = new URLSearchParams(location.search || window.location.search);
      const editOrderIdFromUrl = params.get('editOrderId');
      if (editOrderIdFromUrl && !editingOrderId) {
        apiClient.get(`/orders/${editOrderIdFromUrl}`).then(res => {
          const order = res.data;
          if (order) {
            setEditingOrderId(order.id);
            setCustomerName(order.customerName || '');
            setCustomerPhone(order.customerPhone || '');
            setCustomerAddress(order.customerAddress || '');
            setTableNumber(order.tableNumber || '');
            setDeliveryMethod(order.deliveryMethod || DeliveryMethod.IN_STORE);
            setDeliveryZoneId(order.deliveryZoneId || '');
            setEmployeeId(order.employeeId || '');
            setPaymentMethod(order.paymentMethod || 'PENDING');

            if (order.items && order.items.length > 0) {
              const loadedCart: CartItem[] = order.items.map((it: any) => ({
                product: {
                  id: it.productId || it.product?.id || it.id,
                  name: it.productName || it.product?.name || 'Producto',
                  salePrice: Number(it.unitPrice || it.product?.salePrice || 0),
                  baseCost: Number(it.product?.baseCost || 0),
                  stockQuantity: 999
                },
                quantity: it.quantity
              }));
              setCart(loadedCart);
            }
            presentToast({
              message: `Modificando Cuenta Abierta #${order.id.slice(0, 8).toUpperCase()}`,
              duration: 3000,
              color: 'primary'
            });
          }
        }).catch(console.error);
      }
    }
  }, [location.state, location.search]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'Todos' ||
        (selectedCategory === 'Servicios' ? (p.category === 'Servicios' || p.durationMinutes) : p.category === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    presentToast({ message: `+1 ${product.name}`, duration: 1000, color: 'success', position: 'top' });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculations
  const totalCartItems = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (deliveryMethod !== DeliveryMethod.DELIVERY || !deliveryZoneId) return 0;
    const zone = deliveryZones.find(z => z.id === deliveryZoneId);
    return zone ? Number(zone.feePrice) : 0;
  }, [deliveryMethod, deliveryZoneId, deliveryZones]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return 0;
    if (discountType === 'PERCENTAGE') {
      return (cartSubtotal * val) / 100;
    }
    return val;
  }, [discountType, discountValue, cartSubtotal]);

  const totalCart = useMemo(() => {
    const sum = cartSubtotal - discountAmount + deliveryFee;
    return sum > 0 ? sum : 0;
  }, [cartSubtotal, discountAmount, deliveryFee]);

  const totalCartBs = useMemo(() => {
    return totalCart * exchangeRate;
  }, [totalCart, exchangeRate]);

  // Vuelto calculation for Cash USD
  const vueltoUsd = useMemo(() => {
    if (typeof usdReceived === 'number' && usdReceived >= totalCart) {
      return usdReceived - totalCart;
    }
    return 0;
  }, [usdReceived, totalCart]);

  const vueltoBs = useMemo(() => {
    return vueltoUsd * exchangeRate;
  }, [vueltoUsd, exchangeRate]);

  // Place / Confirm Order (handles Online & Offline with Dexie)
  const placeOrder = async () => {
    if (cart.length === 0) {
      presentToast({ message: 'El carrito está vacío', duration: 2000, color: 'warning' });
      return;
    }

    if (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived < totalCart) {
      presentToast({ message: 'El monto recibido es menor al total a pagar', duration: 2500, color: 'warning' });
      return;
    }

    if (paymentMethod === 'PAGO_MOVIL' && !pagoMovilRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia de Pago Móvil', duration: 2500, color: 'warning' });
      return;
    }

    if (paymentMethod === 'PUNTO' && !puntoRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia o voucher del Punto de Venta', duration: 2500, color: 'warning' });
      return;
    }

    if (paymentMethod === 'BINANCE' && !binanceRef.trim()) {
      presentToast({ message: 'Por favor ingresa el ID de transacción de Binance Pay', duration: 2500, color: 'warning' });
      return;
    }

    if (paymentMethod === 'TRANSFER' && !transferRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia de la Transferencia', duration: 2500, color: 'warning' });
      return;
    }

    if (deliveryMethod === DeliveryMethod.DELIVERY && !deliveryZoneId) {
      presentToast({ message: 'Por favor selecciona la zona de delivery', duration: 2500, color: 'warning' });
      return;
    }

    if (paymentMethod === 'PENDING') {
      const minPct = Number(settings?.minDepositPercentage || 0);
      const canBypassDeposit = (settings?.allowCashierBypassDeposit !== false) || (user?.role === UserRole.ADMIN);
      const isBypassed = bypassMinDeposit && canBypassDeposit;
      const minRequired = isBypassed || minPct === 0 ? 0 : (totalCart * (minPct / 100));
      const abonoNum = parseFloat(initialAbono) || 0;

      if (!isBypassed && minRequired > 0 && abonoNum < minRequired) {
        presentToast({
          message: `El anticipo mínimo requerido es de $${minRequired.toFixed(2)} (${minPct}% del total).`,
          duration: 3500,
          color: 'warning'
        });
        return;
      }
    }

    if (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived > totalCart) {
      if (changeMethod === 'PAGO_MOVIL' && !changeRef.trim()) {
        presentToast({
          message: 'Por favor indica la Referencia del Pago Móvil del vuelto para el arqueo de caja',
          duration: 3500,
          color: 'warning'
        });
        return;
      }
    }

    const abonoAmount = paymentMethod === 'PENDING' ? (parseFloat(initialAbono) || 0) : 0;

    const payload: any = {
      customerName: customerName.trim() || 'Cliente Mostrador',
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      tableNumber: tableNumber.trim() || undefined,
      deliveryMethod,
      deliveryZoneId: deliveryMethod === DeliveryMethod.DELIVERY ? deliveryZoneId || undefined : undefined,
      employeeId: employeeId || undefined,
      paymentMethod,
      paymentStatus: paymentMethod === 'PENDING'
        ? (abonoAmount >= totalCart ? PaymentStatus.PAID : (abonoAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING))
        : PaymentStatus.PAID,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.salePrice
      })),
      discountType: discountAmount > 0 ? discountType : undefined,
      discountValue: discountAmount > 0 ? parseFloat(discountValue) : undefined,
      pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : undefined,
      pagoMovilPhone: paymentMethod === 'PAGO_MOVIL' ? pagoMovilPhone : undefined,
      pagoMovilCedula: paymentMethod === 'PAGO_MOVIL' ? pagoMovilCedula : undefined,
      pagoMovilBank: paymentMethod === 'PAGO_MOVIL' ? pagoMovilBank : undefined,
      puntoRef: paymentMethod === 'PUNTO' ? puntoRef : undefined,
      puntoBank: paymentMethod === 'PUNTO' ? puntoBank : undefined,
      binanceRef: paymentMethod === 'BINANCE' ? binanceRef : undefined,
      transferRef: paymentMethod === 'TRANSFER' ? transferRef : undefined,
      transferBank: paymentMethod === 'TRANSFER' ? transferBank : undefined,
      usdReceived: paymentMethod === 'USD' && typeof usdReceived === 'number' ? usdReceived : undefined,
      changeAmount: (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived > totalCart) ? vueltoUsd : undefined,
      changeAmountBs: (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived > totalCart) ? vueltoBs : undefined,
      changeMethod: (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived > totalCart) ? changeMethod : undefined,
      changeRef: (paymentMethod === 'USD' && typeof usdReceived === 'number' && usdReceived > totalCart) ? (changeRef.trim() || undefined) : undefined,
      initialAbono: paymentMethod === 'PENDING' ? abonoAmount : undefined,
      bypassMinDeposit: paymentMethod === 'PENDING' ? bypassMinDeposit : undefined,
      exchangeRateBs: exchangeRate,
      linkedReservationId: linkedReservationId || undefined
    };

    const isOffline = !navigator.onLine || localStorage.getItem('flujofino_simulating_offline') === 'true';

    // OFFLINE MODE: Save to Dexie
    if (isOffline) {
      try {
        const offlineId = 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const offlineOrder: OfflineOrder = {
          offlineId,
          tenantId: user?.tenantId || 'default',
          payload,
          rateAtSale: exchangeRate,
          createdAt: new Date().toISOString(),
          synced: false
        };

        await offlineDb.offlineOrders.add(offlineOrder);

        presentToast({
          message: '✓ Venta guardada localmente (Modo Offline)',
          duration: 3000,
          color: 'success'
        });

        // Reset cart and modal
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setTableNumber('');
        setPagoMovilRef('');
        setPuntoRef('');
        setBinanceRef('');
        setTransferRef('');
        setTransferBank('');
        setUsdReceived('');
        setChangeMethod('CASH_USD');
        setChangeRef('');
        setChangePhone('');
        setChangeBank('');
        setInitialAbono('');
        setBypassMinDeposit(false);
        setDiscountValue('');
        setShowCheckoutModal(false);
        setLinkedReservationId(null);
        return;
      } catch (dexieErr) {
        console.error('Error guardando en Dexie:', dexieErr);
        presentToast({ message: 'Error guardando orden local', duration: 3000, color: 'danger' });
        return;
      }
    }

    // ONLINE MODE: Send to server
    try {
      if (editingOrderId) {
        await apiClient.put(`/orders/${editingOrderId}`, payload);
        presentToast({ message: 'Pedido actualizado con éxito', duration: 2500, color: 'success' });
      } else {
        await apiClient.post('/orders', payload);
        presentToast({ message: '✓ ¡Pedido registrado con éxito!', duration: 2500, color: 'success' });
      }

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setTableNumber('');
      setPagoMovilRef('');
      setPuntoRef('');
      setBinanceRef('');
      setTransferRef('');
      setTransferBank('');
      setUsdReceived('');
      setChangeMethod('CASH_USD');
      setChangeRef('');
      setChangePhone('');
      setChangeBank('');
      setInitialAbono('');
      setBypassMinDeposit(false);
      setDiscountValue('');
      setShowCheckoutModal(false);
      setEditingOrderId(null);
      setLinkedReservationId(null);
      fetchProducts();
    } catch (e: any) {
      console.error(e);
      // Fallback: If network failed unexpectedly, save offline
      try {
        const offlineId = 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const offlineOrder: OfflineOrder = {
          offlineId,
          tenantId: user?.tenantId || 'default',
          payload,
          rateAtSale: exchangeRate,
          createdAt: new Date().toISOString(),
          synced: false
        };
        await offlineDb.offlineOrders.add(offlineOrder);
        presentToast({
          message: 'Fallo de conexión: Pedido guardado localmente en Modo Offline',
          duration: 3500,
          color: 'warning'
        });
        setCart([]);
        setShowCheckoutModal(false);
      } catch (err) {
        presentToast({ message: 'Error al registrar pedido', duration: 3000, color: 'danger' });
      }
    }
  };

  return (
    <IonPage>
      <AppHeader title="POS / Caja" onRefresh={fetchProducts} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 16px 80px 16px' }}>
          
          {/* Editing Order Banner */}
          {editingOrderId && (
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              padding: '10px 14px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '800', display: 'block' }}>
                  📝 MODIFICANDO CUENTA ABIERTA
                </span>
                <span style={{ fontSize: '13px', color: '#1E3A8A', fontWeight: '700' }}>
                  Pedido #{editingOrderId.slice(0, 8).toUpperCase()} {customerName ? `• ${customerName}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingOrderId(null);
                  setCart([]);
                  setCustomerName('');
                  setCustomerPhone('');
                  setTableNumber('');
                  window.history.replaceState({}, '', '/pos');
                }}
                style={{
                  background: '#DBEAFE',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#1E40AF',
                  cursor: 'pointer'
                }}
              >
                ✖ Salir / Limpiar
              </button>
            </div>
          )}

          {/* 1. Search Bar (Figma Pill) */}
          <div className="ff-search-pill" style={{ marginBottom: '12px' }}>
            <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Buscar producto o servicio..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <IonIcon
                icon={closeOutline}
                style={{ fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          {/* 2. Category Chips Horizontal Carousel */}
          <div className="ff-chips-container">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`ff-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 3. 2-Column Product Grid (Mobile-First) */}
          <IonGrid style={{ padding: 0, marginTop: '8px' }}>
            <IonRow>
              {filteredProducts.map(p => {
                const isService = settings?.featureProduction === false || p.category === 'Servicios' || !!p.durationMinutes;
                const img = Array.isArray(p.images) && p.images.length > 0
                  ? p.images[p.images.length - 1]
                  : (typeof p.images === 'string' && p.images ? (p.images as string).split(',').pop()?.trim() : null);

                const itemInCart = cart.find(it => it.product.id === p.id);

                return (
                  <IonCol size="6" sizeSm="4" sizeMd="3" key={p.id} style={{ padding: '6px' }}>
                    <div
                      className="ff-card ff-card-interactive"
                      onClick={() => addToCart(p)}
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        background: '#ffffff'
                      }}
                    >
                      {/* Product Image / Placeholder */}
                      <div
                        style={{
                          height: '120px',
                          background: '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              openImage(img, p.name);
                            }}
                            title="Toca para ampliar imagen"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ color: '#94A3B8', textAlign: 'center' }}>
                            <IonIcon icon={isService ? timeOutline : imageOutline} style={{ fontSize: '32px' }} />
                          </div>
                        )}

                        {/* In-cart count badge */}
                        {itemInCart && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              background: '#10B981',
                              color: '#ffffff',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                          >
                            {itemInCart.quantity} en carrito
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#0F172A',
                            lineHeight: '1.3',
                            marginBottom: '6px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            height: '34px'
                          }}
                        >
                          {p.name}
                        </div>

                        {/* Price Display */}
                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>
                              ${p.salePrice.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748B', marginTop: '1px' }}>
                            (Bs. {(p.salePrice * exchangeRate).toFixed(2)})
                          </div>
                        </div>

                        {/* Meta badge & Add button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: isService ? '#ECFDF5' : (p.stockQuantity <= 0 ? '#FEF2F2' : '#F1F5F9'),
                              color: isService ? '#047857' : (p.stockQuantity <= 0 ? '#991B1B' : '#475569')
                            }}
                          >
                            {isService
                              ? (p.durationMinutes ? `⏱️ ${p.durationMinutes}m` : 'Servicio')
                              : (p.stockQuantity <= 0 ? 'Agotado' : `Stock: ${p.stockQuantity}`)}
                          </span>

                          {/* Circular Add Button */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#10B981',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            <IonIcon icon={addOutline} style={{ fontSize: '18px', strokeWidth: '32' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
              <IonIcon icon={storefrontOutline} style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: '600' }}>No se encontraron productos o servicios</p>
              <small>Prueba buscando con otro término o categoría.</small>
            </div>
          )}
        </div>

        {/* 4. Sticky Floating Cart Capsule (Figma Dark Capsule) */}
        {cart.length > 0 && (
          <div className="ff-floating-cart">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <IonIcon icon={cartOutline} style={{ fontSize: '22px', color: '#10B981' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                  {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} &bull; ${totalCart.toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Bs. {totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="ff-btn-primary"
              onClick={() => setShowCheckoutModal(true)}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Cobrar
              <IonIcon icon={arrowForwardOutline} style={{ fontSize: '14px' }} />
            </button>
          </div>
        )}

        {/* 5. Checkout Bottom Sheet Modal (Deslizable desde abajo) */}
        <IonModal
          isOpen={showCheckoutModal}
          onDidDismiss={() => setShowCheckoutModal(false)}
          style={{ '--border-radius': '24px' } as any}
        >
          <div
            className="ff-bottom-sheet-content"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              overflow: 'hidden'
            }}
          >
            {/* Drag handle */}
            <div className="ff-drag-handle" style={{ flexShrink: 0 }} />

            <div style={{ padding: '8px 20px 14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                Resumen del Pedido
              </h2>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ fontSize: '18px', color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 40px 20px' }}>

                {/* Items Breakdown */}
                <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '12px', marginBottom: '16px' }}>
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #EEF2F6'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                          {item.quantity}x {item.product.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          ${(item.product.salePrice * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#ffffff', fontWeight: '700' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#ffffff', fontWeight: '700' }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', padding: '4px', cursor: 'pointer' }}
                        >
                          <IonIcon icon={trashOutline} style={{ fontSize: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total Highlight */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '2px dashed #E2E8F0' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Total a Pagar:</span>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Tasa: Bs. {exchangeRate.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                        ${totalCart.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>
                        Bs. {totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. Canal de Entrega (En Tienda vs Delivery) */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    Canal de Entrega
                  </label>
                  <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod(DeliveryMethod.IN_STORE)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        background: deliveryMethod === DeliveryMethod.IN_STORE ? '#10B981' : 'transparent',
                        color: deliveryMethod === DeliveryMethod.IN_STORE ? '#ffffff' : '#64748B',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      🏪 En Tienda / Mesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod(DeliveryMethod.DELIVERY)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        background: deliveryMethod === DeliveryMethod.DELIVERY ? '#10B981' : 'transparent',
                        color: deliveryMethod === DeliveryMethod.DELIVERY ? '#ffffff' : '#64748B',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      🛵 Delivery
                    </button>
                  </div>
                </div>

                {/* Delivery Zone & Shipping Info */}
                {deliveryMethod === DeliveryMethod.DELIVERY && (
                  <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        Zona de Envío *
                      </label>
                      <select
                        value={deliveryZoneId}
                        onChange={e => setDeliveryZoneId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#ffffff', fontSize: '13px', color: '#0F172A' }}
                      >
                        <option value="">Selecciona zona de envío...</option>
                        {deliveryZones.map(z => (
                          <option key={z.id} value={z.id}>
                            {z.name} (+${Number(z.feePrice).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Teléfono WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="0412..."
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Dirección de Entrega
                        </label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={e => setCustomerAddress(e.target.value)}
                          placeholder="Calle, Casa..."
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cliente / Mesa / Empleado */}
                <div style={{ display: 'grid', gridTemplateColumns: employees.length > 0 ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                      Cliente {deliveryMethod === DeliveryMethod.IN_STORE ? '/ Mesa' : ''}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder={deliveryMethod === DeliveryMethod.IN_STORE ? "Ej. Mesa 4 - Carlos" : "Nombre del cliente"}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        outline: 'none',
                        fontSize: '14px',
                        color: '#0F172A',
                        background: '#ffffff'
                      }}
                    />
                  </div>

                  {employees.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                        Atendido por (Opcional)
                      </label>
                      <select
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          outline: 'none',
                          fontSize: '14px',
                          color: '#0F172A',
                          background: '#ffffff'
                        }}
                      >
                        <option value="">Sin asignar</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name || emp.username} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Descuento (Opcional) */}
                <div style={{ marginBottom: '16px', background: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                      🏷️ Descuento Especial
                    </span>
                    {discountAmount > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#10B981' }}>
                        - ${discountAmount.toFixed(2)} USD
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value as any)}
                      style={{ width: '100px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#ffffff', fontSize: '12px', color: '#0F172A' }}
                    >
                      <option value="FIXED">$ Fijo</option>
                      <option value="PERCENTAGE">% Porc.</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'FIXED' ? 'Monto ($)' : 'Porcentaje (%)'}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#ffffff', color: '#0F172A' }}
                    />
                  </div>
                </div>

                {/* Grid Dinámico de Métodos de Pago */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                    Método de Pago
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    
                    {/* Pago Movil */}
                    {settings?.acceptPagoMovil !== false && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PAGO_MOVIL')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'PAGO_MOVIL' ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: paymentMethod === 'PAGO_MOVIL' ? '#ECFDF5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={phonePortraitOutline} style={{ fontSize: '18px', color: paymentMethod === 'PAGO_MOVIL' ? '#10B981' : '#64748B' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'PAGO_MOVIL' ? '#065F46' : '#0F172A' }}>
                          Pago Móvil
                        </span>
                      </button>
                    )}

                    {/* Efectivo USD */}
                    {settings?.acceptCashUsd !== false && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('USD')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'USD' ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: paymentMethod === 'USD' ? '#ECFDF5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={cashOutline} style={{ fontSize: '18px', color: paymentMethod === 'USD' ? '#10B981' : '#64748B' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'USD' ? '#065F46' : '#0F172A' }}>
                          Efectivo USD
                        </span>
                      </button>
                    )}

                    {/* Punto de Venta */}
                    {settings?.acceptCardPos !== false && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PUNTO')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'PUNTO' ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: paymentMethod === 'PUNTO' ? '#ECFDF5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={cardOutline} style={{ fontSize: '18px', color: paymentMethod === 'PUNTO' ? '#10B981' : '#64748B' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'PUNTO' ? '#065F46' : '#0F172A' }}>
                          Punto de Venta
                        </span>
                      </button>
                    )}

                    {/* Binance Pay */}
                    {settings?.acceptBinance === true && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('BINANCE')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'BINANCE' ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: paymentMethod === 'BINANCE' ? '#ECFDF5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={logoBitcoin} style={{ fontSize: '18px', color: paymentMethod === 'BINANCE' ? '#10B981' : '#64748B' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'BINANCE' ? '#065F46' : '#0F172A' }}>
                          Binance
                        </span>
                      </button>
                    )}

                    {/* Transferencia Bancaria */}
                    {settings?.acceptTransfer === true && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('TRANSFER')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'TRANSFER' ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: paymentMethod === 'TRANSFER' ? '#ECFDF5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={cardOutline} style={{ fontSize: '18px', color: paymentMethod === 'TRANSFER' ? '#10B981' : '#64748B' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'TRANSFER' ? '#065F46' : '#0F172A' }}>
                          Transferencia
                        </span>
                      </button>
                    )}

                    {/* Cuenta Abierta / Abonos / Por Pagar */}
                    {settings?.allowPartialPayments !== false && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PENDING')}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: paymentMethod === 'PENDING' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                          background: paymentMethod === 'PENDING' ? '#FEF3C7' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <IonIcon icon={timeOutline} style={{ fontSize: '18px', color: paymentMethod === 'PENDING' ? '#D97706' : '#64748B' }} />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: paymentMethod === 'PENDING' ? '#92400E' : '#0F172A', display: 'block' }}>
                            Cuenta Abierta
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B' }}>
                            Abono / Por Pagar
                          </span>
                        </div>
                      </button>
                    )}

                  </div>
                </div>

                {/* Dynamic Fields: Pago Móvil */}
                {paymentMethod === 'PAGO_MOVIL' && (
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Referencia *
                        </label>
                        <input
                          type="text"
                          value={pagoMovilRef}
                          onChange={e => setPagoMovilRef(e.target.value)}
                          placeholder="Ej. 123456"
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Banco
                        </label>
                        <input
                          type="text"
                          value={pagoMovilBank}
                          onChange={e => setPagoMovilBank(e.target.value)}
                          placeholder="Banesco, BDV..."
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Fields: Efectivo USD + Vuelto Card */}
                {paymentMethod === 'USD' && (
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Efectivo Recibido ($ USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={usdReceived}
                      onChange={e => setUsdReceived(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={`Ej. $${Math.ceil(totalCart)}`}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}
                    />

                    {/* Vuelto Interactive Card */}
                    {typeof usdReceived === 'number' && usdReceived >= totalCart && (
                      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '14px', padding: '14px', marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#065F46', marginBottom: '4px' }}>
                          💵 Vuelto a Entregar
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: vueltoUsd > 0 ? '12px' : '0' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#047857' }}>
                            ${vueltoUsd.toFixed(2)} USD
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#065F46' }}>
                            Bs. {vueltoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {vueltoUsd > 0 && (
                          <div style={{ borderTop: '1px solid #A7F3D0', paddingTop: '10px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#065F46', marginBottom: '6px' }}>
                              ¿CÓMO ENTREGARÁS EL VUELTO? *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                              <button
                                type="button"
                                onClick={() => setChangeMethod('CASH_USD')}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  border: changeMethod === 'CASH_USD' ? '2px solid #059669' : '1px solid #CBD5E1',
                                  background: changeMethod === 'CASH_USD' ? '#D1FAE5' : '#ffffff',
                                  color: changeMethod === 'CASH_USD' ? '#065F46' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                💵 Divisas ($)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setChangeMethod('PAGO_MOVIL');
                                  if (!changePhone && customerPhone) setChangePhone(customerPhone);
                                }}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  border: changeMethod === 'PAGO_MOVIL' ? '2px solid #059669' : '1px solid #CBD5E1',
                                  background: changeMethod === 'PAGO_MOVIL' ? '#D1FAE5' : '#ffffff',
                                  color: changeMethod === 'PAGO_MOVIL' ? '#065F46' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                📱 Pago Móvil
                              </button>
                              <button
                                type="button"
                                onClick={() => setChangeMethod('CASH_BS')}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  border: changeMethod === 'CASH_BS' ? '2px solid #059669' : '1px solid #CBD5E1',
                                  background: changeMethod === 'CASH_BS' ? '#D1FAE5' : '#ffffff',
                                  color: changeMethod === 'CASH_BS' ? '#065F46' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                🇻🇪 Efectivo Bs
                              </button>
                            </div>

                            {/* Detalle si es Pago Móvil */}
                            {changeMethod === 'PAGO_MOVIL' && (
                              <div style={{ background: '#ffffff', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#047857', marginBottom: '8px' }}>
                                  📲 Registra la transferencia de vuelto (Bs. {vueltoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                    N° Referencia Pago Móvil *
                                  </label>
                                  <input
                                    type="text"
                                    value={changeRef}
                                    onChange={e => setChangeRef(e.target.value)}
                                    placeholder="Últimos 4 o 6 dígitos..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}
                                  />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                      Teléfono / Cédula
                                    </label>
                                    <input
                                      type="text"
                                      value={changePhone}
                                      onChange={e => setChangePhone(e.target.value)}
                                      placeholder="0414... / V-..."
                                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                      Banco
                                    </label>
                                    <input
                                      type="text"
                                      value={changeBank}
                                      onChange={e => setChangeBank(e.target.value)}
                                      placeholder="Banesco, BDV..."
                                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {changeMethod === 'CASH_USD' && (
                              <div style={{ fontSize: '11px', color: '#065F46', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                                💡 Se entregarán <b>${vueltoUsd.toFixed(2)} USD</b> en billetes físicos desde la gaveta.
                              </div>
                            )}

                            {changeMethod === 'CASH_BS' && (
                              <div style={{ fontSize: '11px', color: '#065F46', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                                💡 Se entregarán <b>Bs. {vueltoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> en billetes de bolívares desde la gaveta.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Fields: Punto */}
                {paymentMethod === 'PUNTO' && (
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      N° Voucher / Aprobación *
                    </label>
                    <input
                      type="text"
                      value={puntoRef}
                      onChange={e => setPuntoRef(e.target.value)}
                      placeholder="Ej. 084213"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                )}

                {/* Dynamic Fields: Binance */}
                {paymentMethod === 'BINANCE' && (
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      ID de Orden / TxID / Pay ID *
                    </label>
                    <input
                      type="text"
                      value={binanceRef}
                      onChange={e => setBinanceRef(e.target.value)}
                      placeholder="Ej. 2938471928"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                )}

                {/* Dynamic Fields: Transferencia */}
                {paymentMethod === 'TRANSFER' && (
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          N° Referencia *
                        </label>
                        <input
                          type="text"
                          value={transferRef}
                          onChange={e => setTransferRef(e.target.value)}
                          placeholder="Ej. 987654"
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Banco Emisor
                        </label>
                        <input
                          type="text"
                          value={transferBank}
                          onChange={e => setTransferBank(e.target.value)}
                          placeholder="Banesco, Mercantil..."
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Fields: Cuenta Abierta / Abono Inicial (PENDING) */}
                {paymentMethod === 'PENDING' && (() => {
                  const canBypassDeposit = (settings?.allowCashierBypassDeposit !== false) || (user?.role === UserRole.ADMIN);
                  const isBypassed = bypassMinDeposit && canBypassDeposit;
                  const minPct = Number(settings?.minDepositPercentage || 0);
                  const minRequiredUSD = minPct > 0 ? (totalCart * (minPct / 100)) : 0;
                  const abonoNum = parseFloat(initialAbono) || 0;
                  const saldoPendiente = Math.max(0, totalCart - abonoNum);
                  const saldoPendienteBs = saldoPendiente * exchangeRate;

                  return (
                    <div style={{ background: '#FFFBEB', borderRadius: '16px', border: '1px solid #FDE68A', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonIcon icon={timeOutline} style={{ fontSize: '18px' }} />
                          Abono Inicial / Cuenta Abierta
                        </h4>
                        {minPct > 0 && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            background: isBypassed ? '#ECFDF5' : '#FEF3C7',
                            color: isBypassed ? '#065F46' : '#92400E',
                            border: `1px solid ${isBypassed ? '#A7F3D0' : '#FCD34D'}`
                          }}>
                            {isBypassed ? 'Exonerado ($0)' : `Exige ${minPct}% ($${minRequiredUSD.toFixed(2)})`}
                          </span>
                        )}
                      </div>

                      {minPct > 0 && canBypassDeposit && (
                        <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, paddingRight: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E' }}>
                              Exonerar anticipo
                            </div>
                            <div style={{ fontSize: '11px', color: '#78350F' }}>
                              Permite abrir cuenta con $0 (mesa de confianza o cliente habitual)
                            </div>
                          </div>
                          <IonToggle
                            checked={bypassMinDeposit}
                            onIonChange={e => setBypassMinDeposit(e.detail.checked)}
                            color="warning"
                          />
                        </div>
                      )}

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#78350F', marginBottom: '4px' }}>
                          Monto del Abono Inicial (USD)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={initialAbono}
                          onChange={e => setInitialAbono(e.target.value)}
                          placeholder={minPct > 0 && !isBypassed ? `Mínimo: $${minRequiredUSD.toFixed(2)}` : '0.00 (Opcional, puede ser $0)'}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #FCD34D', fontSize: '15px', fontWeight: '700', background: '#ffffff', color: '#0F172A' }}
                        />
                      </div>

                      {/* Saldo Breakdown Card */}
                      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #FCD34D', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Abono Hoy:</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>
                            ${abonoNum.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Saldo por Cobrar:</div>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: '#D97706' }}>
                            ${saldoPendiente.toFixed(2)} USD
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E' }}>
                            Bs. {saldoPendienteBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Big Action: Confirmar Pedido */}
                <button
                  type="button"
                  onClick={placeOrder}
                  className="ff-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '14px', marginTop: '6px' }}
                >
                  <IonIcon icon={checkmarkCircle} style={{ fontSize: '20px' }} />
                  {editingOrderId ? 'Guardar Cambios del Pedido' : 'Confirmar Pedido ✓'}
                </button>
            </div>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Pos;
