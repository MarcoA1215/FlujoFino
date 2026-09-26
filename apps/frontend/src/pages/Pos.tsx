// @ts-nocheck
import { refreshOutline, cartOutline, cashOutline, trashOutline, personOutline, walletOutline, copyOutline, closeOutline, storefrontOutline, bicycleOutline, globeOutline, logoWhatsapp, cardOutline, cloudDoneOutline, cloudOfflineOutline, syncOutline, flashOutline } from 'ionicons/icons';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonButton, IonList, IonLabel, IonBadge, IonToggle, useIonToast, useIonAlert, IonInput, IonSelect, IonSelectOption, IonText, IonIcon, IonSearchbar, useIonRouter, IonModal, IonSpinner } from '@ionic/react';
import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import type { DeliveryZone } from '../types';
import { DeliveryMethod, PaymentStatus, UserRole } from '@nutrideli/shared-types';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useImageViewer } from '../context/ImageViewerContext';
import { offlineDb, type OfflineOrder } from '../services/offline-db';

type Product = {
  id: string;
  name: string;
  stockQuantity: number;
  salePrice: number;
  baseCost: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type PaymentMethod = 'PENDING' | 'PAGO_MOVIL' | 'USD' | 'PUNTO' | 'BINANCE' | 'TRANSFER';

const Pos: React.FC = () => {
  const { openImage } = useImageViewer();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  
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
  
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState<string>('');
  
  // Pago Movil Fields
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilCedula, setPagoMovilCedula] = useState('');
  const [pagoMovilBank, setPagoMovilBank] = useState('');

  // Punto de Venta Fields
  const [puntoRef, setPuntoRef] = useState('');
  const [puntoBank, setPuntoBank] = useState('');

  // Binance Pay Fields
  const [binanceRef, setBinanceRef] = useState('');

  // Transferencia Bancaria Fields
  const [transferRef, setTransferRef] = useState('');
  const [transferBank, setTransferBank] = useState('');

  // USD Fields
  const [usdReceived, setUsdReceived] = useState<number | ''>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.IN_STORE);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [linkedReservationId, setLinkedReservationId] = useState<string | null>(null);
  
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState<{ id: string; username: string; name?: string; role?: string; jobTitle?: string }[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();
  const location = useLocation();
  const router = useIonRouter();

  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [loadingCashSummary, setLoadingCashSummary] = useState(false);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = async () => {
    try {
      const count = await offlineDb.offlineOrders.count();
      setPendingOfflineCount(count);
    } catch (err) {
      console.error('Error counting offline orders:', err);
    }
  };

  const syncPendingOrders = async () => {
    if (isSimulatingOffline || !navigator.onLine) {
      presentToast({ message: 'No hay conexión o la simulación offline está activa', duration: 2500, color: 'warning' });
      return;
    }
    try {
      const pending = await offlineDb.offlineOrders.toArray();
      if (!pending || pending.length === 0) {
        presentToast({ message: 'No hay ventas pendientes por sincronizar', duration: 2000, color: 'light' });
        return;
      }
      setIsSyncing(true);

      const response = await apiClient.post('/orders/sync-offline', { orders: pending });
      const syncedIds: string[] = response.data?.syncedOfflineIds || [];

      if (syncedIds.length > 0) {
        await offlineDb.offlineOrders.bulkDelete(syncedIds);
        await refreshPendingCount();
        presentToast({
          message: `✓ ${syncedIds.length} venta(s) sincronizada(s) con éxito con el servidor`,
          duration: 3000,
          color: 'success',
        });
        fetchProducts();
      } else {
        presentToast({ message: 'No se procesaron ventas para sincronizar', duration: 2500, color: 'medium' });
      }
    } catch (err: any) {
      console.error('Error sincronizando órdenes offline:', err);
      presentToast({
        message: 'Error al sincronizar con el servidor: ' + (err.response?.data?.message || err.message),
        duration: 3500,
        color: 'danger',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleOfflineSimulation = async () => {
    const nextVal = !isSimulatingOffline;
    setIsSimulatingOffline(nextVal);
    if (nextVal) {
      try {
        const local = await offlineDb.cachedProducts.toArray();
        if (local.length > 0) {
          setProducts(local);
        }
      } catch (e) {}
      presentToast({ message: '⚡ Modo offline simulado activado', duration: 2000, color: 'warning' });
    } else {
      presentToast({ message: '🟢 Simulación desactivada: Modo en línea activo', duration: 2000, color: 'success' });
      fetchProducts();
      if (navigator.onLine) {
        syncPendingOrders();
      }
    }
  };

  const fetchDailySummary = async () => {
    setLoadingCashSummary(true);
    try {
      const res = await apiClient.get('/orders/daily-cash-summary');
      setCashSummary(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando arqueo de caja', duration: 3000, color: 'danger' });
    } finally {
      setLoadingCashSummary(false);
    }
  };

  const openCashClose = () => {
    setShowCashCloseModal(true);
    fetchDailySummary();
  };

  const copyCashReportToWhatsApp = () => {
    if (!cashSummary) return;
    const text = `📊 *CIERRE DE CAJA / ARQUEO DIARIO*
📅 Fecha: ${cashSummary.date}
💱 Tasa BCV: Bs. ${Number(cashSummary.exchangeRate || 0).toFixed(2)}

💵 *TOTAL EFECTIVO USD:* $${Number(cashSummary.totalCashUSD || 0).toFixed(2)}
💳 *PUNTO DE VENTA (Bs.):* Bs. ${Number(cashSummary.totalPuntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (equiv. $${Number(cashSummary.totalPuntoUSD || 0).toFixed(2)})
📱 *PAGO MÓVIL (Bs.):* Bs. ${Number(cashSummary.totalPagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (equiv. $${Number(cashSummary.totalPagoMovilUSD || 0).toFixed(2)})
💰 *TOTAL INGRESOS COBRADOS:* $${Number(cashSummary.totalPaidUSD || 0).toFixed(2)}
⏳ *PENDIENTE POR COBRAR:* $${Number(cashSummary.totalPendingUSD || 0).toFixed(2)}
📈 *VENTAS TOTALES DEL DÍA:* $${Number(cashSummary.totalSalesUSD || 0).toFixed(2)}

📦 *DESGLOSE DE PEDIDOS:*
- Total pedidos: ${cashSummary.ordersCount} (Pagados: ${cashSummary.paidOrdersCount}, Pendientes: ${cashSummary.pendingOrdersCount})
- 🏪 En Tienda: ${cashSummary.inStoreOrdersCount}
- 🛵 Delivery: ${cashSummary.deliveryOrdersCount}
- 🛒 Tienda Web: ${cashSummary.webOrdersCount}
${cashSummary.cancelledOrdersCount > 0 ? `- ❌ Cancelados: ${cashSummary.cancelledOrdersCount}\n` : ''}
${cashSummary.puntoList?.length > 0 ? `\n💳 *VENTAS POR PUNTO DE VENTA (${cashSummary.puntoList.length}):*\n` + cashSummary.puntoList.map((p: any) => `• Ref: ${p.ref || 'S/R'} | Bs. ${Number(p.amountBs).toFixed(2)} | ${p.bank || 'Punto'} | ${p.customerName || 'Cliente'}`).join('\n') : ''}
${cashSummary.pagoMovilList?.length > 0 ? `\n📱 *PAGOS MÓVILES REGISTRADOS (${cashSummary.pagoMovilList.length}):*\n` + cashSummary.pagoMovilList.map((p: any) => `• Ref: ${p.ref || 'S/R'} | Bs. ${Number(p.amountBs).toFixed(2)} | ${p.customerName || 'Cliente'}`).join('\n') : ''}
`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      presentToast({ message: '¡Reporte copiado al portapapeles! Listo para pegar en WhatsApp.', duration: 3000, color: 'success' });
    } else {
      presentToast({ message: 'No se pudo acceder al portapapeles', duration: 3000, color: 'warning' });
    }
  };

  const fetchProducts = async () => {
    if (!navigator.onLine || isSimulatingOffline) {
      try {
        const localProducts = await offlineDb.cachedProducts.toArray();
        if (localProducts && localProducts.length > 0) {
          setProducts(localProducts);
          return;
        }
      } catch (e) {
        console.error('Error leyendo productos de Dexie:', e);
      }
    }

    try {
      const res = await apiClient.get<Product[]>('/products');
      setProducts(res.data);
      if (res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedProducts.bulkPut(res.data);
        } catch (e) {
          console.error('Error guardando productos en Dexie:', e);
        }
      }
    } catch (e) {
      console.error(e);
      try {
        const localProducts = await offlineDb.cachedProducts.toArray();
        if (localProducts && localProducts.length > 0) {
          setProducts(localProducts);
          presentToast({ message: 'Sin conexión: Catálogo cargado desde la memoria local', duration: 2500, color: 'warning' });
          return;
        }
      } catch (dbErr) {
        console.error('Error fallback Dexie:', dbErr);
      }
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
        try {
          localStorage.setItem('flujofino_exchange_rate', rate.toString());
        } catch (e) {}
      }
      try {
        localStorage.setItem('flujofino_cached_settings', JSON.stringify(s));
      } catch (e) {}
      setAllowPartialPayments(s.allowPartialPayments !== false);

      // Elegir método de pago por defecto entre los activos
      if (s.acceptPagoMovil !== false) setPaymentMethod('PAGO_MOVIL');
      else if (s.acceptCashUsd !== false) setPaymentMethod('USD');
      else if (s.acceptCardPos === true) setPaymentMethod('PUNTO');
      else if (s.acceptBinance === true) setPaymentMethod('BINANCE');
      else if (s.acceptTransfer === true) setPaymentMethod('TRANSFER');
      else if (s.allowPartialPayments !== false) setPaymentMethod('PENDING');
    } catch (e) {
      try {
        const cachedSettings = localStorage.getItem('flujofino_cached_settings');
        if (cachedSettings) {
          const s = JSON.parse(cachedSettings);
          setSettings(s);
          if (s.exchangeRateBs && Number(s.exchangeRateBs) > 0) {
            setExchangeRate(Number(s.exchangeRateBs));
          }
          setAllowPartialPayments(s.allowPartialPayments !== false);
        }
        const cachedRate = localStorage.getItem('flujofino_exchange_rate');
        if (cachedRate && Number(cachedRate) > 0) {
          setExchangeRate(Number(cachedRate));
        }
      } catch (err) {
        console.error('Error cargando tasa y settings cacheados:', err);
      }
    }
  };

  const fetchZones = async () => {
    try {
      const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
      setDeliveryZones(res.data);
    } catch(e) {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get<any[]>('/users/employees');
      setEmployees(res.data);
    } catch(e) {
      console.error('Error cargando empleados', e);
    }
  };

  const loadOrderForEditing = async (id: string) => {
    try {
      const res = await apiClient.get(`/orders/${id}`);
      const order = res.data;
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setTableNumber(order.tableNumber || '');
      setDeliveryMethod(order.deliveryMethod || DeliveryMethod.IN_STORE);
      setCustomerAddress(order.customerAddress || '');
      if (order.deliveryZone) setDeliveryZoneId(order.deliveryZone.id);
      if (order.employeeId) {
        setEmployeeId(order.employeeId);
      } else if (order.employee?.id) {
        setEmployeeId(order.employee.id);
      }
      
      const loadedCart = order.items.map((item: any) => ({
        product: item.product,
        quantity: item.quantity
      }));
      setCart(loadedCart);
      
      if (order.discountAmount > 0) {
        setDiscountType('FIXED');
        setDiscountValue(order.discountAmount.toString());
      }
      
      presentToast({ message: `Cargando orden para editar`, color: 'primary', duration: 2000 });
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando orden', color: 'danger', duration: 3000 });
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRate();
    fetchZones();
    fetchEmployees();
    if (user?.id && !editingOrderId) {
      setEmployeeId(user.id);
    }
    const calcCart = localStorage.getItem('calculator_cart');
    if (calcCart) {
      try {
        setCart(JSON.parse(calcCart));
        localStorage.removeItem('calculator_cart');
        const calcZone = localStorage.getItem('calculator_zone');
        if (calcZone) {
          setDeliveryMethod(DeliveryMethod.DELIVERY);
          setDeliveryZoneId(calcZone);
          localStorage.removeItem('calculator_zone');
        }
      } catch (e) {}
    }

    const urlParams = new URLSearchParams(location.search);
    const resId = urlParams.get('reservationId');
    const editId = urlParams.get('edit');
    
    if (editId) {
      setEditingOrderId(editId);
      loadOrderForEditing(editId);
    } else {
      setEditingOrderId(null);
    }
    if (resId) {
      setLinkedReservationId(resId);
      const loadReservationDetails = async () => {
        let found: any = null;
        try {
          const res = await apiClient.get('/reservations');
          found = res.data.find((r: any) => r.id === resId);
        } catch (e) {
          try {
            found = await offlineDb.cachedReservations.get(resId);
            if (!found) {
              const allLocal = await offlineDb.cachedReservations.toArray();
              found = allLocal.find((r: any) => r.id === resId);
            }
          } catch (dexErr) {
            console.error('Error fetching cached reservation in POS:', dexErr);
          }
        }

        if (!found) {
          try {
            found = await offlineDb.cachedReservations.get(resId);
            if (!found) {
              const allLocal = await offlineDb.cachedReservations.toArray();
              found = allLocal.find((r: any) => r.id === resId);
            }
          } catch (e) {}
        }

        if (found) {
          setCustomerName(found.customerName || '');
          setCustomerPhone(found.customerPhone || '');
          setTableNumber(found.tableNumber || '');
          setPaymentMethod('PENDING');
          if (found.abonosTotal && found.abonosTotal > 0) {
            setInitialAbono(found.abonosTotal.toString());
          }
          
          if (found.serviceName) {
            let prod: any = null;
            try {
              const pres = await apiClient.get('/products');
              prod = pres.data.find((p: any) => p.name === found.serviceName);
            } catch (e) {}

            if (!prod) {
              try {
                const prods = await offlineDb.cachedProducts.toArray();
                prod = prods.find((p: any) => p.name === found.serviceName);
              } catch (e) {}
            }

            if (prod) {
              setCart([{ product: prod, quantity: 1 }]);
            } else {
              presentToast({ message: `Servicio "${found.serviceName}" cargado para cobrar`, duration: 3000, color: 'primary' });
            }
          }
        }
      };
      loadReservationDetails();
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatingOffline) {
        syncPendingOrders();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSimulatingOffline]);

  const openRateAlert = () => {
    presentAlert({
      header: 'Tasa BCV',
      inputs: [{ name: 'rate', type: 'number', value: exchangeRate }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: async (data: any) => {
            const newRate = parseFloat(data.rate);
            if (newRate > 0) {
              setExchangeRate(newRate);
              try {
                localStorage.setItem('flujofino_exchange_rate', newRate.toString());
              } catch (e) {}
              await apiClient.put('/settings/exchange-rate', { rate: newRate });
              presentToast({ message: 'Tasa actualizada', duration: 2000, color: 'success' });
            }
          }
        }
      ]
    });
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  const cartBaseCost = cart.reduce((acc, item) => acc + ((item.product.baseCost || 0) * item.quantity), 0);
  
  const discountValNum = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'PERCENTAGE' 
    ? cartSubtotal * (discountValNum / 100) 
    : discountValNum;

  const deliveryFee = (deliveryMethod === DeliveryMethod.DELIVERY && deliveryZoneId) 
    ? (deliveryZones.find(z => z.id === deliveryZoneId)?.feePrice || 0) 
    : 0;
    
  const totalCart = (cartSubtotal - discountAmount) + deliveryFee;
  
  const regularMargin = cartSubtotal > 0 ? ((cartSubtotal - cartBaseCost) / cartSubtotal) * 100 : 0;
  const discountedSubtotal = cartSubtotal - discountAmount;
  const discountedMargin = discountedSubtotal > 0 ? ((discountedSubtotal - cartBaseCost) / discountedSubtotal) * 100 : 0;
  const lossAmount = cartBaseCost - discountedSubtotal;

  const placeOrder = async () => {
    if (cart.length === 0 && paymentMethod !== 'PENDING') return presentToast({ message: 'Carrito vacío', duration: 2000, color: 'warning' });
    if (!customerName.trim()) return presentToast({ message: 'Ingresa el nombre', duration: 2000, color: 'warning' });

    const canBypassDeposit = (settings?.allowCashierBypassDeposit !== false) || (user?.role === UserRole.ADMIN);

    if (paymentMethod === 'PENDING') {
      const minDepositPct = Number(settings?.minDepositPercentage || 0);
      const isBypassed = bypassMinDeposit && canBypassDeposit;
      if (minDepositPct > 0 && !isBypassed) {
        const minRequired = totalCart * (minDepositPct / 100);
        const abonoVal = initialAbono ? Number(initialAbono) : 0;
        if (abonoVal < minRequired) {
          return presentToast({
            message: canBypassDeposit 
              ? `El abono inicial debe ser al menos el ${minDepositPct}% ($${minRequired.toFixed(2)}). Activa "Exonerar abono" si es consumo en mesa o cliente de confianza.`
              : `El abono inicial debe ser al menos el ${minDepositPct}% ($${minRequired.toFixed(2)}).`,
            duration: 4500,
            color: 'warning'
          });
        }
      }
    }

    if (paymentMethod === 'PAGO_MOVIL') {
      if (!pagoMovilRef || !pagoMovilBank) {
        return presentToast({ message: 'Referencia y Banco son obligatorios', duration: 3000, color: 'warning' });
      }
    }

    if (paymentMethod === 'PUNTO') {
      if (!puntoRef) {
        return presentToast({ message: 'El número de aprobación/referencia del voucher del punto es obligatorio', duration: 3000, color: 'warning' });
      }
    }

    if (paymentMethod === 'BINANCE') {
      if (!binanceRef.trim()) {
        return presentToast({ message: 'El ID de orden / comprobante de Binance Pay es obligatorio', duration: 3000, color: 'warning' });
      }
    }

    if (paymentMethod === 'TRANSFER') {
      if (!transferRef.trim()) {
        return presentToast({ message: 'La referencia de la transferencia es obligatoria', duration: 3000, color: 'warning' });
      }
    }

    let notes = '';
    if (paymentMethod === 'USD') {
      const received = typeof usdReceived === 'number' ? usdReceived : totalCart;
      const changeUsd = received - totalCart;
      const changeBs = changeUsd * exchangeRate;
      notes = `MÉTODO: Divisas (USD) | Recibido: $${received.toFixed(2)} | Vuelto: Bs. ${changeBs.toFixed(2)}`;
    } else if (paymentMethod === 'PUNTO') {
      notes = `MÉTODO: Punto de Venta | Ref: ${puntoRef} | Banco/Terminal: ${puntoBank || 'Punto de Venta'}`;
    } else if (paymentMethod === 'BINANCE') {
      notes = `MÉTODO: Binance Pay | ID/Hash: ${binanceRef}`;
    } else if (paymentMethod === 'TRANSFER') {
      notes = `MÉTODO: Transferencia Bancaria | Ref: ${transferRef} | Banco: ${transferBank || 'Bancario'}`;
    }

    try {
      const initialAbonoVal = initialAbono ? Number(initialAbono) : undefined;
      const payload = {
        customerName,
        customerPhone,
        tableNumber,
        paymentStatus: paymentMethod === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.PAID,
        paymentMethod,
        notes,
        pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : 
                      paymentMethod === 'PUNTO' ? puntoRef : 
                      paymentMethod === 'BINANCE' ? binanceRef : 
                      paymentMethod === 'TRANSFER' ? transferRef : undefined,
        pagoMovilPhone: paymentMethod === 'PAGO_MOVIL' ? pagoMovilPhone : undefined,
        pagoMovilCedula: paymentMethod === 'PAGO_MOVIL' ? pagoMovilCedula : undefined,
        pagoMovilBank: paymentMethod === 'PAGO_MOVIL' ? pagoMovilBank : 
                       paymentMethod === 'PUNTO' ? (puntoBank || 'Punto de Venta') : 
                       paymentMethod === 'BINANCE' ? 'Binance Pay' : 
                       paymentMethod === 'TRANSFER' ? (transferBank || 'Transferencia') : undefined,
        amountBs: totalCart * exchangeRate,
        exchangeRate,
        deliveryMethod,
        deliveryZoneId: (deliveryMethod === DeliveryMethod.DELIVERY && deliveryZoneId) ? deliveryZoneId : undefined,
        employeeId: employeeId || undefined,
        initialAbono: initialAbonoVal,
        discountAmount,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.salePrice,
        }))
      };

      if (!isOnline || isSimulatingOffline) {
        const offlineId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

        const offlineOrder: OfflineOrder = {
          offlineId,
          tenantId: user?.tenantId || '',
          payload,
          rateAtSale: exchangeRate,
          createdAt: new Date().toISOString(),
          synced: false,
        };

        await offlineDb.offlineOrders.add(offlineOrder);
        await refreshPendingCount();
        presentToast({
          message: '✓ Venta guardada localmente (Modo Offline)',
          duration: 3000,
          color: 'success',
        });

        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setTableNumber('');
        setCustomerAddress('');
        setEmployeeId(user?.id || '');
        setInitialAbono('');
        setPagoMovilRef('');
        setPagoMovilPhone('');
        setPagoMovilCedula('');
        setPagoMovilBank('');
        setPuntoRef('');
        setPuntoBank('');
        setBinanceRef('');
        setTransferRef('');
        setTransferBank('');
        setDeliveryMethod(DeliveryMethod.IN_STORE);
        setDeliveryZoneId('');
        setUsdReceived('');
        setSearchTerm('');
        setPaymentMethod('PAGO_MOVIL');
        setBypassMinDeposit(false);
        setLinkedReservationId(null);
        return;
      }

      if (editingOrderId) {
        await apiClient.put(`/orders/${editingOrderId}`, payload);
        presentToast({ message: 'Pedido actualizado exitosamente', duration: 2000, color: 'success' });
        router.push('/orders');
      } else {
        await apiClient.post('/orders', payload);
        if (linkedReservationId && paymentMethod !== 'PENDING') {
          try {
            await apiClient.post(`/reservations/${linkedReservationId}/abono`, { amount: totalCart });
            await apiClient.put(`/reservations/${linkedReservationId}/status`, { status: 'CONFIRMED' });
          } catch (err) {
            console.error('Error sincronizando pago a reservacion:', err);
          }
        }
        presentToast({ message: 'Pedido creado exitosamente', duration: 2000, color: 'success' });
      }

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setCustomerAddress('');
      setEmployeeId(user?.id || '');
      setInitialAbono('');
      setPagoMovilRef('');
      setPagoMovilPhone('');
      setPagoMovilCedula('');
      setPagoMovilBank('');
      setPuntoRef('');
      setPuntoBank('');
      setBinanceRef('');
      setTransferRef('');
      setTransferBank('');
      setDeliveryMethod(DeliveryMethod.IN_STORE);
      setDeliveryZoneId('');
      setUsdReceived('');
      setSearchTerm('');
      setPaymentMethod('PAGO_MOVIL');
      setBypassMinDeposit(false);
      setLinkedReservationId(null);
      fetchProducts();
    } catch (e: any) {
      if (!navigator.onLine || !e.response) {
        try {
          const offlineId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

          const initialAbonoVal = initialAbono ? Number(initialAbono) : undefined;
          const fallbackPayload = {
            customerName,
            customerPhone,
            tableNumber,
            paymentStatus: paymentMethod === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.PAID,
            paymentMethod,
            notes,
            pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : 
                          paymentMethod === 'PUNTO' ? puntoRef : 
                          paymentMethod === 'BINANCE' ? binanceRef : 
                          paymentMethod === 'TRANSFER' ? transferRef : undefined,
            pagoMovilPhone: paymentMethod === 'PAGO_MOVIL' ? pagoMovilPhone : undefined,
            pagoMovilCedula: paymentMethod === 'PAGO_MOVIL' ? pagoMovilCedula : undefined,
            pagoMovilBank: paymentMethod === 'PAGO_MOVIL' ? pagoMovilBank : 
                           paymentMethod === 'PUNTO' ? (puntoBank || 'Punto de Venta') : 
                           paymentMethod === 'BINANCE' ? 'Binance Pay' : 
                           paymentMethod === 'TRANSFER' ? (transferBank || 'Transferencia') : undefined,
            amountBs: totalCart * exchangeRate,
            exchangeRate,
            deliveryMethod,
            deliveryZoneId: (deliveryMethod === DeliveryMethod.DELIVERY && deliveryZoneId) ? deliveryZoneId : undefined,
            employeeId: employeeId || undefined,
            initialAbono: initialAbonoVal,
            discountAmount,
            items: cart.map(i => ({
              productId: i.product.id,
              quantity: i.quantity,
              unitPrice: i.product.salePrice,
            }))
          };

          const offlineOrder: OfflineOrder = {
            offlineId,
            tenantId: user?.tenantId || '',
            payload: fallbackPayload,
            rateAtSale: exchangeRate,
            createdAt: new Date().toISOString(),
            synced: false,
          };
          await offlineDb.offlineOrders.add(offlineOrder);
          await refreshPendingCount();
          presentToast({
            message: '✓ Conexión interrumpida: Venta guardada localmente (Modo Offline)',
            duration: 3500,
            color: 'warning',
          });
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
          setTableNumber('');
          setCustomerAddress('');
          setEmployeeId(user?.id || '');
          setInitialAbono('');
          setPagoMovilRef('');
          setPagoMovilPhone('');
          setPagoMovilCedula('');
          setPagoMovilBank('');
          setPuntoRef('');
          setPuntoBank('');
          setBinanceRef('');
          setTransferRef('');
          setTransferBank('');
          setDeliveryMethod(DeliveryMethod.IN_STORE);
          setDeliveryZoneId('');
          setUsdReceived('');
          setSearchTerm('');
          setPaymentMethod('PAGO_MOVIL');
          setBypassMinDeposit(false);
          setLinkedReservationId(null);
          return;
        } catch (dbErr) {
          console.error('Error guardando orden offline tras fallo de red:', dbErr);
        }
      }
      presentToast({ message: 'Error al crear pedido', duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>POS / Caja</IonTitle>
          <IonButtons slot="end">
            {/* Único botón/indicador de estado y simulación offline */}
            <IonButton 
              fill={isSimulatingOffline ? 'solid' : 'outline'} 
              color={isSimulatingOffline ? 'danger' : 'light'}
              onClick={toggleOfflineSimulation} 
              style={{ fontWeight: '600', marginRight: '6px', textTransform: 'none' }}
              title={isSimulatingOffline ? 'Desactivar simulación offline' : 'Clic para simular modo sin internet'}
            >
              <IonIcon icon={(!isOnline || isSimulatingOffline) ? cloudOfflineOutline : cloudDoneOutline} slot="start" />
              {(!isOnline || isSimulatingOffline) 
                ? (isSimulatingOffline ? '⚡ Offline (Simulado)' : '🟠 Modo Offline') 
                : '🟢 En línea'}
            </IonButton>

            {/* Botón sincronizar: solo aparece cuando hay ventas pendientes */}
            {pendingOfflineCount > 0 && (
              <IonButton 
                fill="solid" 
                color="warning" 
                onClick={syncPendingOrders}
                disabled={isSyncing || (!isOnline && !isSimulatingOffline)}
                style={{ fontWeight: 'bold', marginRight: '6px', textTransform: 'none' }}
                title="Sincronizar ventas offline con el servidor"
              >
                {isSyncing ? (
                  <>
                    <IonSpinner name="crescent" slot="start" style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <IonIcon icon={syncOutline} slot="start" />
                    📦 {pendingOfflineCount} Sincronizar
                  </>
                )}
              </IonButton>
            )}

            <IonButton fill="solid" color="dark" onClick={openCashClose} style={{ fontWeight: 'bold', marginRight: '6px' }}>
              <IonIcon icon={walletOutline} slot="start" />
              Cierre
            </IonButton>
            <IonButton onClick={fetchProducts} title="Recargar catálogo">
              <IonIcon icon={refreshOutline} />
            </IonButton>
            <IonButton onClick={() => (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'ADMIN' || (user?.role as string) === 'SUPERADMIN') ? openRateAlert() : presentToast({message: 'Solo el administrador puede configurar la tasa', duration: 2000, color: 'warning'})}>
              <IonBadge color="light" style={{ padding: '8px', fontSize: '0.95rem', color: '#000', fontWeight: 'bold' }}>
                Tasa: Bs. {exchangeRate.toFixed(2)}
              </IonBadge>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            {/* Products Catalog */}
            <IonCol size="12" sizeMd="7">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Catálogo de Productos</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonSearchbar placeholder="Buscar producto..." value={searchTerm} onIonInput={e => setSearchTerm(e.detail.value!)}></IonSearchbar>

                  <IonGrid>
                    <IonRow>
                      {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                        const isService = settings?.featureProduction === false || p.category === 'Servicios';
                        const img = Array.isArray(p.images) && p.images.length > 0 
                          ? p.images[p.images.length - 1] 
                          : (typeof p.images === 'string' && p.images ? (p.images as string).split(',').pop()?.trim() : null);

                        return (
                          <IonCol size="6" sizeMd="4" key={p.id}>
                            <IonCard 
                              button 
                              onClick={() => addToCart(p)} 
                              color={!isService && p.stockQuantity <= 0 ? 'light' : 'white'} 
                              style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                            >
                              {img && (
                                <img 
                                  src={img} 
                                  alt={p.name} 
                                  onClick={(e) => { e.stopPropagation(); openImage(img, p.name); }}
                                  title="Toca para ver en grande"
                                  style={{ width: '100%', height: '85px', objectFit: 'cover', cursor: 'zoom-in' }} 
                                />
                              )}
                              <IonCardHeader style={{ padding: '10px 12px 4px 12px' }}>
                                <IonCardTitle style={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: '1.2' }}>{p.name}</IonCardTitle>
                              </IonCardHeader>
                              <IonCardContent style={{ marginTop: 'auto', padding: '0 12px 10px 12px' }}>
                                <IonText color="primary"><h2 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>${p.salePrice.toFixed(2)}</h2></IonText>
                                {isService ? (
                                  <IonBadge color="success">
                                    {p.durationMinutes ? `⏱️ ${p.durationMinutes} min` : 'Disponible'}
                                  </IonBadge>
                                ) : (
                                  <IonBadge color={p.stockQuantity <= 0 ? 'danger' : 'success'}>
                                    Stock: {p.stockQuantity}
                                  </IonBadge>
                                )}
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        );
                      })}
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Cart & Checkout */}
            <IonCol size="12" sizeMd="5">
              <IonCard color="light">
                <IonCardHeader>
                  <IonCardTitle>
                    <IonIcon icon={cartOutline} /> Pedido Actual
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Cliente / Mesa</IonLabel>
                    <IonInput 
                      value={customerName} 
                      onIonInput={e => setCustomerName(e.detail.value!)} 
                      placeholder="Ej. Juan Pérez" 
                    />
                  </IonItem>
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Teléfono del Cliente (Opcional)</IonLabel>
                    <IonInput 
                      value={customerPhone} 
                      onIonInput={e => setCustomerPhone(e.detail.value!)} 
                      placeholder="0414-0000000" 
                    />
                  </IonItem>

                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Mesa / Taburete (Opcional)</IonLabel>
                    <IonInput 
                      value={tableNumber} 
                      onIonInput={e => setTableNumber(e.detail.value!)} 
                      placeholder="Ej. Mesa 5" 
                    />
                  </IonItem>

                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Atendido por:</IonLabel>
                    <IonSelect 
                      value={employeeId} 
                      onIonChange={e => setEmployeeId(e.detail.value)}
                      interface="popover"
                      placeholder="Seleccionar empleado"
                    >
                      {employees.map(emp => (
                        <IonSelectOption key={emp.id} value={emp.id}>
                          {emp.username || emp.name}{emp.jobTitle ? ` (${emp.jobTitle})` : ''} {emp.id === user?.id ? '(Yo)' : ''}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>

                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Método de Entrega</IonLabel>
                    <IonSelect value={deliveryMethod} onIonChange={e => setDeliveryMethod(e.detail.value)}>
                      <IonSelectOption value={DeliveryMethod.IN_STORE}>Consumo en Local / Retiro Inmediato</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.PICKUP}>Pickup (Para LLevar / Encargo)</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.DELIVERY}>Delivery (Envío)</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {deliveryMethod !== DeliveryMethod.IN_STORE && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Dirección / Referencia Exacta</IonLabel>
                      <IonInput 
                        value={customerAddress} 
                        onIonInput={e => setCustomerAddress(e.detail.value!)} 
                        placeholder="Ej. Calle 1, Casa 2..." 
                      />
                    </IonItem>
                  )}

                  {deliveryMethod === DeliveryMethod.DELIVERY && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Zona de Envío</IonLabel>
                      <IonSelect value={deliveryZoneId} onIonChange={e => setDeliveryZoneId(e.detail.value)}>
                        {deliveryZones.map(z => (
                          <IonSelectOption key={z.id} value={z.id}>{z.name} (+ $ {z.feePrice.toFixed(2)})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  )}

                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Método de Pago</IonLabel>
                    <IonSelect value={paymentMethod} onIonChange={e => setPaymentMethod(e.detail.value)}>
                      {settings?.acceptPagoMovil !== false && (
                        <IonSelectOption value="PAGO_MOVIL">📱 Pago Móvil (Bs.)</IonSelectOption>
                      )}
                      {settings?.acceptCardPos === true && (
                        <IonSelectOption value="PUNTO">💳 Punto de Venta / Tarjeta (Bs.)</IonSelectOption>
                      )}
                      {settings?.acceptCashUsd !== false && (
                        <IonSelectOption value="USD">💵 Divisas (USD Efectivo)</IonSelectOption>
                      )}
                      {settings?.acceptBinance === true && (
                        <IonSelectOption value="BINANCE">🟡 Binance Pay (USDT)</IonSelectOption>
                      )}
                      {settings?.acceptTransfer === true && (
                        <IonSelectOption value="TRANSFER">🏦 Transferencia Bancaria (Bs.)</IonSelectOption>
                      )}
                      {settings?.allowPartialPayments !== false && (
                        <IonSelectOption value="PENDING">⏳ Por Pagar / Cuenta Abierta</IonSelectOption>
                      )}
                    </IonSelect>
                  </IonItem>

                  {paymentMethod === 'PENDING' && (() => {
                    const canBypassDeposit = (settings?.allowCashierBypassDeposit !== false) || (user?.role === UserRole.ADMIN);
                    const isBypassed = bypassMinDeposit && canBypassDeposit;
                    const minPct = Number(settings?.minDepositPercentage || 0);

                    return (
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1e293b', fontWeight: 'bold' }}>
                            Abono Inicial / Cuenta Abierta
                          </h4>
                          {minPct > 0 && canBypassDeposit && (
                            <IonBadge color={isBypassed ? 'success' : 'primary'}>
                              {isBypassed ? 'Exonerado ($0.00)' : `Exige ${minPct}%`}
                            </IonBadge>
                          )}
                        </div>

                        {minPct > 0 && (
                          <div style={{ marginBottom: '12px', padding: '10px', background: isBypassed ? '#ecfdf5' : '#eff6ff', borderRadius: '8px', border: `1px solid ${isBypassed ? '#a7f3d0' : '#bfdbfe'}` }}>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.84rem', color: isBypassed ? '#065f46' : '#1e40af', fontWeight: 600 }}>
                              {isBypassed
                                ? '✅ Abono inicial exonerado: la cuenta o mesa puede abrirse con $0.00.'
                                : `💡 Abono mínimo requerido (${minPct}%): $${(totalCart * (minPct / 100)).toFixed(2)} USD`}
                            </p>
                            {canBypassDeposit && (
                              <IonItem lines="none" style={{ '--background': 'transparent' }}>
                                <IonToggle 
                                  checked={bypassMinDeposit} 
                                  onIonChange={e => setBypassMinDeposit(e.detail.checked)}
                                >
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                                    Exonerar abono (Mesa abierta / Tasca / Confianza)
                                  </span>
                                </IonToggle>
                              </IonItem>
                            )}
                          </div>
                        )}

                        <IonItem color="light" style={{ borderRadius: '8px' }}>
                          <IonLabel position="stacked">
                            {isBypassed || minPct === 0
                              ? 'Monto de Abono Inicial (USD - Opcional, puede ser $0)'
                              : `Monto de Abono Inicial (USD - Mínimo $${(totalCart * (minPct / 100)).toFixed(2)})`}
                          </IonLabel>
                          <IonInput 
                            type="number" 
                            min="0" 
                            value={initialAbono} 
                            onIonInput={e => setInitialAbono(e.detail.value!)} 
                            placeholder={!isBypassed && minPct > 0 ? `Mínimo: $${(totalCart * (minPct / 100)).toFixed(2)}` : '0.00'} 
                          />
                        </IonItem>
                      </div>
                    );
                  })()}

                  {paymentMethod === 'PUNTO' && (
                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #bbf7d0' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={cardOutline} />
                        Cobro por Punto de Venta (Total: Bs. {(totalCart * exchangeRate).toFixed(2)})
                      </h4>
                      <IonItem color="light" className="ion-margin-bottom">
                        <IonLabel position="stacked">N° de Aprobación / Referencia del Voucher *</IonLabel>
                        <IonInput value={puntoRef} onIonInput={e => setPuntoRef(e.detail.value!)} placeholder="Ej. 084213 (del ticket del punto)" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Banco / Terminal del Punto (Opcional)</IonLabel>
                        <IonInput value={puntoBank} onIonInput={e => setPuntoBank(e.detail.value!)} placeholder="Ej. Punto Banesco, BDV, Bancamiga..." />
                      </IonItem>
                    </div>
                  )}

                  {paymentMethod === 'BINANCE' && (
                    <div style={{ background: '#fefce8', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #fde047' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🟡 Binance Pay (USDT) (Total: ${totalCart.toFixed(2)} USDT)
                      </h4>
                      {(settings?.binancePayId || settings?.binanceEmail) && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#713f12' }}>
                          💡 <b>Datos del negocio para el cliente:</b> Pay ID: <b>{settings.binancePayId || 'N/A'}</b> {settings.binanceEmail ? `| Correo: ${settings.binanceEmail}` : ''}
                        </p>
                      )}
                      <IonItem color="light">
                        <IonLabel position="stacked">ID de Orden / Pay ID / TxID del Cliente *</IonLabel>
                        <IonInput value={binanceRef} onIonInput={e => setBinanceRef(e.detail.value!)} placeholder="Ej. 2938471928" />
                      </IonItem>
                    </div>
                  )}

                  {paymentMethod === 'TRANSFER' && (
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #bfdbfe' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🏦 Transferencia Bancaria en Bs. (Total: Bs. {(totalCart * exchangeRate).toFixed(2)})
                      </h4>
                      {(settings?.companyBank || settings?.companyAccountNumber) && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#1e3a8a' }}>
                          💡 <b>Datos del negocio:</b> {settings.companyBank || 'Banco'} | N° Cuenta: <b>{settings.companyAccountNumber || 'Sin cuenta'}</b> {settings.companyAccountHolder ? `| Titular: ${settings.companyAccountHolder}` : ''} {settings.companyCedula ? `| RIF: ${settings.companyCedula}` : ''}
                        </p>
                      )}
                      <IonItem color="light" className="ion-margin-bottom">
                        <IonLabel position="stacked">N° de Transferencia / Referencia *</IonLabel>
                        <IonInput value={transferRef} onIonInput={e => setTransferRef(e.detail.value!)} placeholder="Ej. 182746" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Banco de Origen / Destino (Opcional)</IonLabel>
                        <IonInput value={transferBank} onIonInput={e => setTransferBank(e.detail.value!)} placeholder="Ej. Banesco a Banesco" />
                      </IonItem>
                    </div>
                  )}

                  {paymentMethod === 'PAGO_MOVIL' && (
                    <div style={{ background: '#f4f5f8', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Datos del Pago Móvil (Total: Bs. {(totalCart * exchangeRate).toFixed(2)})</h4>
                      <IonItem color="light">
                        <IonLabel position="stacked">Ref.</IonLabel>
                        <IonInput value={pagoMovilRef} onIonInput={e => setPagoMovilRef(e.detail.value!)} placeholder="Ej. 123456" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Teléfono Origen (Opcional)</IonLabel>
                        <IonInput value={pagoMovilPhone} onIonInput={e => setPagoMovilPhone(e.detail.value!)} placeholder="0414-XXXXXXX" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Cédula (Opcional)</IonLabel>
                        <IonInput value={pagoMovilCedula} onIonInput={e => setPagoMovilCedula(e.detail.value!)} placeholder="V-12345678" />
                      </IonItem>
                      <IonItem color="light">
                        <IonLabel position="stacked">Banco</IonLabel>
                        <IonInput value={pagoMovilBank} onIonInput={e => setPagoMovilBank(e.detail.value!)} placeholder="Banesco" />
                      </IonItem>
                    </div>
                  )}

                  {paymentMethod === 'USD' && (
                    <div style={{ background: '#f4f5f8', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Pago en Divisas</h4>
                      <IonItem color="light">
                        <IonLabel position="stacked">Monto Recibido ($)</IonLabel>
                        <IonInput type="number" min="0" value={usdReceived} onIonInput={e => setUsdReceived(parseFloat(e.detail.value!) || '')} placeholder={`Mínimo: $${totalCart.toFixed(2)}`} />
                      </IonItem>
                      
                      {typeof usdReceived === 'number' && usdReceived >= totalCart && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#d1e7dd', borderRadius: '8px' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#0f5132' }}>Vuelto en Divisas: ${(usdReceived - totalCart).toFixed(2)}</p>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#0f5132' }}>Vuelto en Bs: {((usdReceived - totalCart) * exchangeRate).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <IonList>
                    {cart.map(item => (
                      <IonItem key={item.product.id}>
                        <IonLabel>
                          <h3>{item.product.name}</h3>
                          <p>${item.product.salePrice.toFixed(2)} c/u</p>
                        </IonLabel>
                        <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</IonButton>
                          <IonText><b>{item.quantity}</b></IonText>
                          <IonButton size="small" fill="clear" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</IonButton>
                          <IonButton color="danger" fill="clear" onClick={() => removeFromCart(item.product.id)}>
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </IonItem>
                    ))}
                  </IonList>

                  {cart.length > 0 && (
                    <>
                      <hr className="ion-margin-vertical" />
                      
                      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#495057' }}>Descuento Comercial</h4>
                        <IonItem color="light" lines="none">
                          <IonSelect value={discountType} onIonChange={e => setDiscountType(e.detail.value)} slot="start" style={{ width: '80px' }}>
                            <IonSelectOption value="FIXED">$</IonSelectOption>
                            <IonSelectOption value="PERCENTAGE">%</IonSelectOption>
                          </IonSelect>
                          <IonInput type="number" min="0" value={discountValue} onIonInput={e => setDiscountValue(e.detail.value!)} placeholder="0.00" />
                        </IonItem>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Subtotal:</h4>
                        <h4>${cartSubtotal.toFixed(2)}</h4>
                      </div>
                      
                      {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'red' }}>
                          <h4>Descuento:</h4>
                          <h4>- ${discountAmount.toFixed(2)}</h4>
                        </div>
                      )}
                      
                      {deliveryMethod === DeliveryMethod.DELIVERY && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'gray' }}>
                          <h4>Delivery:</h4>
                          <h4>+ ${deliveryFee.toFixed(2)}</h4>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <h2>Total a Pagar:</h2>
                        <h2 style={{ fontWeight: 'bold', color: '#2dd36f' }}>${totalCart.toFixed(2)}</h2>
                      </div>
                      
                      {cartBaseCost > 0 && (
                        <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: lossAmount > 0 ? '#fff3cd' : '#f8f9fa' }}>
                           <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: lossAmount > 0 ? '#856404' : '#6c757d' }}>Análisis de Rentabilidad</h4>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                             <span>Costo Base Insumos:</span>
                             <strong>${cartBaseCost.toFixed(2)}</strong>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                             <span>Margen Regular:</span>
                             <strong>{regularMargin.toFixed(1)}%</strong>
                           </div>
                           {discountAmount > 0 && (
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: lossAmount > 0 ? '#dc3545' : '#000' }}>
                               <span>Margen Post-Descuento:</span>
                               <strong>{discountedMargin.toFixed(1)}%</strong>
                             </div>
                           )}
                           {lossAmount > 0 && (
                             <div style={{ marginTop: '8px', color: '#dc3545', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                               ⚠️ Venta por debajo del costo (Pérdida: ${lossAmount.toFixed(2)})
                             </div>
                           )}
                        </div>
                      )}
                    </>
                  )}
                  
                  <IonButton 
                    expand="block" 
                    color="success" 
                    className="ion-margin-top" 
                    size="large"
                    onClick={placeOrder}
                  >
                    <IonIcon icon={cashOutline} slot="start" />
                    {editingOrderId ? 'Actualizar Pedido' : 'Confirmar Pedido'}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonModal isOpen={showCashCloseModal} onDidDismiss={() => setShowCashCloseModal(false)}>
        <IonHeader>
          <IonToolbar color="dark">
            <IonTitle>💼 Cierre de Caja / Arqueo Diario</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowCashCloseModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {loadingCashSummary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonSpinner name="crescent" />
              <p>Calculando arqueo de caja...</p>
            </div>
          ) : !cashSummary ? (
            <p>No se encontraron datos para la jornada.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 'bold' }}>Jornada: {cashSummary.date}</h3>
                  <small style={{ color: '#666' }}>Tasa del día: Bs. {Number(cashSummary.exchangeRate || 0).toFixed(2)}</small>
                </div>
                <IonButton size="small" fill="outline" onClick={fetchDailySummary}>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Actualizar
                </IonButton>
              </div>

              {/* Summary Cards */}
              <IonGrid style={{ padding: 0 }}>
                <IonRow>
                  {/* Cash USD */}
                  <IonCol size="12" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                      <IonCardContent>
                        <div style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold' }}>💵 EFECTIVO EN CAJA (USD)</div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1b5e20', margin: '6px 0' }}>
                          ${Number(cashSummary.totalCashUSD || 0).toFixed(2)}
                        </h1>
                        <small style={{ color: '#4caf50' }}>Total billetes en gaveta</small>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  {/* Punto de Venta Bs */}
                  <IonCol size="12" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <IonCardContent>
                        <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold' }}>💳 PUNTO DE VENTA (BS.)</div>
                        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#14532d', margin: '6px 0' }}>
                          Bs. {Number(cashSummary.totalPuntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h1>
                        <small style={{ color: '#15803d' }}>Equiv: ~${Number(cashSummary.totalPuntoUSD || 0).toFixed(2)} ({cashSummary.puntoList?.length || 0} vouchers para cuadre)</small>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  {/* Pago Movil Bs */}
                  <IonCol size="12" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#e3f2fd', border: '1px solid #bbdefb' }}>
                      <IonCardContent>
                        <div style={{ fontSize: '0.85rem', color: '#1565c0', fontWeight: 'bold' }}>📱 PAGO MÓVIL (BS.)</div>
                        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#0d47a1', margin: '6px 0' }}>
                          Bs. {Number(cashSummary.totalPagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h1>
                        <small style={{ color: '#1976d2' }}>Equiv: ~${Number(cashSummary.totalPagoMovilUSD || 0).toFixed(2)} ({cashSummary.pagoMovilList?.length || 0} transferencias)</small>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {/* Totals Breakdown */}
                  <IonCol size="6" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#fafafa', border: '1px solid #eee' }}>
                      <IonCardContent style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>💰 Total Cobrado</div>
                        <h3 style={{ margin: '4px 0', fontWeight: 'bold', color: '#2dd36f' }}>${Number(cashSummary.totalPaidUSD || 0).toFixed(2)}</h3>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="6" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#fafafa', border: '1px solid #eee' }}>
                      <IonCardContent style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>⏳ Por Cobrar (Pendiente)</div>
                        <h3 style={{ margin: '4px 0', fontWeight: 'bold', color: '#e0ac08' }}>${Number(cashSummary.totalPendingUSD || 0).toFixed(2)}</h3>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>

                  <IonCol size="12" sizeMd="4">
                    <IonCard style={{ margin: '4px', background: '#fafafa', border: '1px solid #eee' }}>
                      <IonCardContent style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>📈 Total Facturado (Ventas)</div>
                        <h3 style={{ margin: '4px 0', fontWeight: 'bold' }}>${Number(cashSummary.totalSalesUSD || 0).toFixed(2)}</h3>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                </IonRow>
              </IonGrid>

              {/* Order Channels Breakdown */}
              <IonCard style={{ margin: '8px 4px 16px 4px' }}>
                <IonCardHeader style={{ padding: '12px' }}>
                  <IonCardTitle style={{ fontSize: '0.95rem' }}>📦 Flujo de Canales de Venta</IonCardTitle>
                </IonCardHeader>
                <IonCardContent style={{ padding: '0 12px 12px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{cashSummary.inStoreOrdersCount}</div>
                      <small style={{ color: '#666' }}>🏪 En Tienda</small>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3880ff' }}>{cashSummary.deliveryOrdersCount}</div>
                      <small style={{ color: '#666' }}>🛵 Delivery</small>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#7044ff' }}>{cashSummary.webOrdersCount}</div>
                      <small style={{ color: '#666' }}>🛒 Tienda Web</small>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2dd36f' }}>{cashSummary.ordersCount}</div>
                      <small style={{ color: '#666' }}>Total Activos</small>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              {/* Punto de Venta Vouchers List */}
              {cashSummary.puntoList?.length > 0 && (
                <IonCard style={{ margin: '8px 4px 16px 4px' }}>
                  <IonCardHeader style={{ padding: '12px' }}>
                    <IonCardTitle style={{ fontSize: '0.95rem' }}>💳 Vouchers de Punto de Venta ({cashSummary.puntoList.length})</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent style={{ padding: '0 12px 12px 12px' }}>
                    <IonList lines="full">
                      {cashSummary.puntoList.map((p: any, idx: number) => (
                        <IonItem key={idx} style={{ '--padding-start': '0px' }}>
                          <IonLabel>
                            <h3><strong>Aprobación: {p.ref || 'Sin ref'}</strong> &bull; {p.customerName || 'Cliente'}</h3>
                            <p style={{ fontSize: '0.8rem' }}>{p.bank || 'Punto de Venta'}</p>
                          </IonLabel>
                          <IonBadge slot="end" color="success" style={{ fontSize: '0.9rem' }}>
                            Bs. {Number(p.amountBs).toFixed(2)}
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              )}

              {/* Pago Movil Reference List */}
              {cashSummary.pagoMovilList?.length > 0 && (
                <IonCard style={{ margin: '8px 4px 16px 4px' }}>
                  <IonCardHeader style={{ padding: '12px' }}>
                    <IonCardTitle style={{ fontSize: '0.95rem' }}>📱 Detalle de Pagos Móviles del Día ({cashSummary.pagoMovilList.length})</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent style={{ padding: '0 12px 12px 12px' }}>
                    <IonList lines="full">
                      {cashSummary.pagoMovilList.map((p: any, idx: number) => (
                        <IonItem key={idx} style={{ '--padding-start': '0px' }}>
                          <IonLabel>
                            <h3><strong>Ref: {p.ref || 'Sin ref'}</strong> &bull; {p.customerName || 'Cliente'}</h3>
                            <p style={{ fontSize: '0.8rem' }}>{p.bank} {p.phone ? `(${p.phone})` : ''}</p>
                          </IonLabel>
                          <IonBadge slot="end" color="primary" style={{ fontSize: '0.9rem' }}>
                            Bs. {Number(p.amountBs).toFixed(2)}
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '20px' }}>
                <IonButton 
                  expand="block" 
                  color="success" 
                  size="large" 
                  onClick={copyCashReportToWhatsApp}
                  style={{ fontWeight: 'bold' }}
                >
                  <IonIcon icon={logoWhatsapp} slot="start" />
                  Copiar Reporte para WhatsApp
                </IonButton>
                <IonButton 
                  expand="block" 
                  fill="clear" 
                  color="medium" 
                  onClick={() => setShowCashCloseModal(false)}
                >
                  Cerrar Ventana
                </IonButton>
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Pos;

