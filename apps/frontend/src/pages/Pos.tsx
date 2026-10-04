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
import { DeliveryMethod, PaymentStatus, UserRole } from '@finowork/shared-types';
import type { DeliveryZone } from '../types';
import AppHeader from '../components/AppHeader';
import { SalaryAdvanceModal } from '../components/SalaryAdvanceModal';

type Product = {
  id: string;
  name: string;
  category?: string;
  stockQuantity: number;
  salePrice: number;
  baseCost: number;
  durationMinutes?: number;
  images?: string[] | string;
  recipe?: any[];
  isCombo?: boolean;
  isPreAssembled?: boolean;
  comboItems?: any[];
  product_type?: string;
};

type CartItem = {
  cartItemId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  removedIngredients?: string[];
  addedExtras?: Array<{ rawMaterialId: string; name: string; priceUSD: number; quantity: number }>;
  hasModifications?: boolean;
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

  // Raw Materials & Customization (Extras / Retiro de Insumos)
  const [availableRawMaterials, setAvailableRawMaterials] = useState<any[]>([]);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [returnToCheckout, setReturnToCheckout] = useState<boolean>(false);
  const [customRemovedIngredients, setCustomRemovedIngredients] = useState<string[]>([]);
  const [customExtras, setCustomExtras] = useState<Record<string, number>>({});

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
    return 0;
  });
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('flujofino_currency_symbol');
      if (saved) return saved;
      const s = localStorage.getItem('flujofino_cached_settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.currencySymbol) return parsed.currencySymbol;
      }
    } catch (e) {}
    return 'Bs.';
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
  const [deliveryUserId, setDeliveryUserId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [showSalaryAdvanceModal, setShowSalaryAdvanceModal] = useState<boolean>(false);

  // Editing & Linked
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [linkedReservationId, setLinkedReservationId] = useState<string | null>(null);

  // Employees
  const [employees, setEmployees] = useState<{ id: string; username: string; name?: string; role?: string; roles?: string[]; jobTitle?: string }[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  const isDeliveryDriver = (emp: any) => {
    if (!emp) return false;
    if (emp.role === UserRole.DELIVERY) return true;
    if (Array.isArray(emp.roles) && emp.roles.includes(UserRole.DELIVERY)) return true;
    return false;
  };

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
      if (s.currencySymbol) {
        setCurrencySymbol(s.currencySymbol);
        localStorage.setItem('flujofino_currency_symbol', s.currencySymbol);
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
      const cachedSymbol = localStorage.getItem('flujofino_currency_symbol');
      if (cachedSymbol) setCurrencySymbol(cachedSymbol);
    }
  };

  const fetchDeliveryZones = async () => {
    try {
      const res = await apiClient.get<DeliveryZone[]>('/delivery-zones');
      const rawZones = Array.isArray(res.data) ? res.data : [];
      const zones = rawZones.map((z: any) => ({
        ...z,
        feePrice: Number(z.priceUSD ?? z.feePrice ?? 0),
        priceUSD: Number(z.priceUSD ?? z.feePrice ?? 0)
      }));
      setDeliveryZones(zones);
    } catch (e) {
      console.error('Error cargando zonas de delivery:', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get<any[]>('/users/employees');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setEmployees(res.data);
        return;
      }
    } catch (e) {
      console.warn('Error cargando /users/employees:', e);
    }
    try {
      const fallback = await apiClient.get<any[]>('/users');
      if (Array.isArray(fallback.data)) {
        setEmployees(fallback.data);
      }
    } catch (err) {
      console.error('Error cargando empleados:', err);
    }
  };

  useEffect(() => {
    if (showCheckoutModal) {
      fetchEmployees();
      fetchDeliveryZones();
    }
  }, [showCheckoutModal]);

  useEffect(() => {
    if (deliveryMethod === DeliveryMethod.DELIVERY) {
      fetchEmployees();
    }
  }, [deliveryMethod]);

  useEffect(() => {
    if (deliveryUserId && employees.length > 0) {
      const isValid = employees.some(d => d.id === deliveryUserId && isDeliveryDriver(d));
      if (!isValid) {
        setDeliveryUserId('');
      }
    }
  }, [employees, deliveryUserId]);

  const fetchRawMaterials = async () => {
    try {
      const res = await apiClient.get<any[]>('/raw-materials');
      setAvailableRawMaterials(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchRawMaterials();
    fetchRate();
    fetchDeliveryZones();
    fetchEmployees();

    // Check for calculator quoted cart
    const calcCartRaw = localStorage.getItem('calculator_cart');
    const calcZoneRaw = localStorage.getItem('calculator_zone');
    if (calcCartRaw) {
      try {
        const parsed = JSON.parse(calcCartRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedItems: CartItem[] = parsed.map((item: any) => ({
            cartItemId: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            product: item.product,
            quantity: item.quantity || 1,
            unitPrice: Number(item.product?.salePrice || item.unitPrice || 0),
            hasModifications: false,
            removedIngredients: [],
            addedExtras: [],
          }));
          setCart(loadedItems);
          if (calcZoneRaw) {
            setDeliveryMethod(DeliveryMethod.DELIVERY);
            setDeliveryZoneId(calcZoneRaw);
          }
          presentToast({
            message: 'Cotización de Calculadora cargada en el carrito',
            duration: 2500,
            color: 'success'
          });
        }
      } catch (err) {
        console.error('Error cargando carrito de calculadora:', err);
      } finally {
        localStorage.removeItem('calculator_cart');
        localStorage.removeItem('calculator_zone');
      }
    }

    const handleSettingsUpdated = (e: any) => {
      const s = e.detail;
      if (s) {
        if (s.exchangeRateBs) {
          setExchangeRate(Number(s.exchangeRateBs));
        }
        if (s.currencySymbol) {
          setCurrencySymbol(s.currencySymbol);
        }
        setSettings((prev: any) => ({ ...prev, ...s }));
      }
    };

    window.addEventListener('settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdated);
    };
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
          cartItemId: it.id || (Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
          product: {
            id: it.productId || it.product?.id || it.id,
            name: it.productName || it.product?.name || 'Producto',
            salePrice: Number(it.unitPrice || it.product?.salePrice || 0),
            baseCost: Number(it.product?.baseCost || 0),
            stockQuantity: 999
          },
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice || it.product?.salePrice || 0),
          removedIngredients: it.removedIngredients || [],
          addedExtras: it.addedExtras || [],
          hasModifications: Boolean(it.hasModifications)
        }));
        setCart(loadedCart);
      }
    } else {
      const params = new URLSearchParams(location.search || window.location.search);
      const editOrderIdFromUrl = params.get('editOrderId');
      const reservationIdFromUrl = params.get('reservationId');
      const storedReservationRaw = sessionStorage.getItem('reservation_to_bill');
      const navReservation = location.state && (location.state as any).reservationToBill;

      if (reservationIdFromUrl || storedReservationRaw || navReservation) {
        let resData: any = navReservation || (storedReservationRaw ? JSON.parse(storedReservationRaw) : null);
        
        const loadReservationIntoPos = (resToLoad: any) => {
          setCustomerName(resToLoad.customerName || '');
          setCustomerPhone(resToLoad.customerPhone || '');
          setTableNumber(resToLoad.tableNumber || '');
          setLinkedReservationId(resToLoad.id);
          if (resToLoad.employeeId) setEmployeeId(resToLoad.employeeId);
          
          // Si el cliente ya dio un abono al reservar, reflejarlo
          if (resToLoad.abonosTotal && Number(resToLoad.abonosTotal) > 0) {
            setInitialAbono(Number(resToLoad.abonosTotal).toString());
            setPaymentMethod('PENDING');
          }

          if (resToLoad.serviceId) {
            const sIds = String(resToLoad.serviceId).split(',').map((s: string) => s.trim()).filter(Boolean);
            apiClient.get<Product[]>('/products').then(pRes => {
              const matchedItems: CartItem[] = [];
              for (const sId of sIds) {
                const found = pRes.data.find(p => p.id === sId);
                if (found) {
                  matchedItems.push({
                    cartItemId: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    product: found,
                    quantity: 1,
                    unitPrice: Number(found.salePrice || 0),
                    hasModifications: false,
                    removedIngredients: [],
                    addedExtras: []
                  });
                }
              }
              if (matchedItems.length > 0) {
                setCart(matchedItems);
              }
            }).catch(console.error);
          }
          sessionStorage.removeItem('reservation_to_bill');
        };

        if (resData && (!reservationIdFromUrl || resData.id === reservationIdFromUrl)) {
          loadReservationIntoPos(resData);
        } else if (reservationIdFromUrl) {
          apiClient.get(`/reservations`).then(rList => {
            const found = rList.data.find((r: any) => r.id === reservationIdFromUrl);
            if (found) loadReservationIntoPos(found);
          }).catch(console.error);
        }
      } else if (editOrderIdFromUrl && !editingOrderId) {
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
            setEmployeeId(order.employeeId || order.employee?.id || '');
            setPaymentMethod(order.paymentMethod || 'PENDING');

            if (order.items && order.items.length > 0) {
              const loadedCart: CartItem[] = order.items.map((it: any) => ({
                cartItemId: it.id || (Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
                product: {
                  id: it.productId || it.product?.id || it.id,
                  name: it.productName || it.product?.name || 'Producto',
                  salePrice: Number(it.unitPrice || it.product?.salePrice || 0),
                  baseCost: Number(it.product?.baseCost || 0),
                  stockQuantity: 999
                },
                quantity: it.quantity,
                unitPrice: Number(it.unitPrice || it.product?.salePrice || 0),
                removedIngredients: it.removedIngredients || [],
                addedExtras: it.addedExtras || [],
                hasModifications: Boolean(it.hasModifications)
              }));
              setCart(loadedCart);
            }

            if (order.discountAmount && Number(order.discountAmount) > 0) {
              if (order.discountType && order.discountValue) {
                setDiscountType(order.discountType);
                setDiscountValue(Number(order.discountValue).toString());
              } else {
                setDiscountType('FIXED');
                setDiscountValue(Number(order.discountAmount).toString());
              }
            } else {
              setDiscountValue('');
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
    const hasExtras = availableRawMaterials.some(rm => rm.allowAsExtra);
    const catList = ['Todos', ...Array.from(set)];
    if (hasExtras) {
      catList.push('🍟 Extras Sueltos');
    }
    return catList;
  }, [products, availableRawMaterials]);

  const getExtraPrice = (rm: any) => {
    if (rm.extraPriceType === 'FIXED_PRICE') return Number(rm.extraPriceValue || 0);
    if (rm.extraPriceType === 'MARGIN_PERCENT') return Number((rm.costPerUnit * (1 + (Number(rm.extraPriceValue) || 0) / 100)).toFixed(2));
    return Number(rm.costPerUnit || 0);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (selectedCategory === '🍟 Extras Sueltos') {
      return availableRawMaterials
        .filter(rm => rm.allowAsExtra)
        .filter(rm => rm.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(rm => ({
          id: rm.id,
          name: rm.name,
          category: '🍟 Extras Sueltos',
          salePrice: getExtraPrice(rm),
          stockQuantity: Number(rm.stockQuantity || 0),
          baseCost: Number(rm.costPerUnit || 0),
          is_service: false,
        } as Product));
    }
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'Todos' ||
        (selectedCategory === 'Servicios' ? (p.category === 'Servicios' || p.durationMinutes) : p.category === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, availableRawMaterials]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && !item.hasModifications);
      if (existing) {
        return prev.map(item =>
          item.cartItemId === existing.cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          cartItemId: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          product,
          quantity: 1,
          unitPrice: product.salePrice,
          hasModifications: false,
          removedIngredients: [],
          addedExtras: []
        }
      ];
    });
    presentToast({ message: `+1 ${product.name}`, duration: 1000, color: 'success', position: 'top' });
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const openCustomizeModal = (p: Product, cartItem?: CartItem) => {
    if (!p.recipe || p.recipe.length === 0) return;
    if (showCheckoutModal) {
      setReturnToCheckout(true);
      setShowCheckoutModal(false);
    } else {
      setReturnToCheckout(false);
    }
    setCustomizingProduct(p);
    if (cartItem) {
      setEditingCartItemId(cartItem.cartItemId);
      setCustomRemovedIngredients(cartItem.removedIngredients ? [...cartItem.removedIngredients] : []);
      const extrasMap: Record<string, number> = {};
      (cartItem.addedExtras || []).forEach(ex => {
        extrasMap[ex.rawMaterialId] = ex.quantity;
      });
      setCustomExtras(extrasMap);
    } else {
      setEditingCartItemId(null);
      setCustomRemovedIngredients([]);
      setCustomExtras({});
    }
  };

  const closeCustomizeModal = () => {
    setCustomizingProduct(null);
    setEditingCartItemId(null);
    if (returnToCheckout) {
      setShowCheckoutModal(true);
      setReturnToCheckout(false);
    }
  };


  const addCustomizedToCart = () => {
    if (!customizingProduct) return;
    const selectedExtrasList: Array<{ rawMaterialId: string; name: string; priceUSD: number; quantity: number }> = [];
    let extrasTotal = 0;

    Object.entries(customExtras).forEach(([rmId, qty]) => {
      if (qty > 0) {
        const rm = availableRawMaterials.find(m => m.id === rmId);
        if (rm) {
          const priceUSD = getExtraPrice(rm);
          extrasTotal += priceUSD * qty;
          selectedExtrasList.push({
            rawMaterialId: rm.id,
            name: rm.name,
            priceUSD,
            quantity: qty
          });
        }
      }
    });

    const finalUnitPrice = Number((customizingProduct.salePrice + extrasTotal).toFixed(2));
    const hasMods = customRemovedIngredients.length > 0 || selectedExtrasList.length > 0;

    if (editingCartItemId) {
      setCart(prev =>
        prev.map(item =>
          item.cartItemId === editingCartItemId
            ? {
                ...item,
                unitPrice: finalUnitPrice,
                removedIngredients: [...customRemovedIngredients],
                addedExtras: selectedExtrasList,
                hasModifications: hasMods
              }
            : item
        )
      );
      presentToast({ message: `Personalización actualizada`, duration: 1500, color: 'success', position: 'top' });
    } else {
      const newItem: CartItem = {
        cartItemId: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        product: customizingProduct,
        quantity: 1,
        unitPrice: finalUnitPrice,
        removedIngredients: [...customRemovedIngredients],
        addedExtras: selectedExtrasList,
        hasModifications: hasMods
      };
      setCart(prev => [...prev, newItem]);
      presentToast({ message: `Agregado: ${customizingProduct.name} (Personalizado)`, duration: 1500, color: 'success', position: 'top' });
    }

    setCustomizingProduct(null);
    setEditingCartItemId(null);
    if (returnToCheckout) {
      setShowCheckoutModal(true);
      setReturnToCheckout(false);
    }
  };

  // Calculations
  const totalCartItems = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.unitPrice || item.product.salePrice) * item.quantity, 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (deliveryMethod !== DeliveryMethod.DELIVERY || !deliveryZoneId) return 0;
    const zone = deliveryZones.find(z => z.id === deliveryZoneId);
    return zone ? Number((zone as any).priceUSD ?? zone.feePrice ?? 0) : 0;
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

  const formatLocalAmount = (val: number) => {
    return currencySymbol === 'COP'
      ? Number(val).toLocaleString('es-CO')
      : Number(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
      deliveryUserId: deliveryMethod === DeliveryMethod.DELIVERY && deliveryUserId ? deliveryUserId : undefined,
      employeeId: employeeId || undefined,
      paymentMethod,
      paymentStatus: paymentMethod === 'PENDING'
        ? (abonoAmount >= totalCart ? PaymentStatus.PAID : (abonoAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING))
        : PaymentStatus.PAID,
      items: cart.map(item => ({
        productId: item.product?.id || (item as any).productId,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice || item.product?.salePrice || 0),
        removedIngredients: item.removedIngredients || [],
        addedExtras: item.addedExtras || [],
        hasModifications: Boolean(item.hasModifications)
      })),
      discountAmount: discountAmount > 0 ? Number(discountAmount.toFixed(2)) : 0,
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
      amountBs: Number(totalCartBs.toFixed(2)),
      exchangeRate: exchangeRate,
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
      console.error('Error procesando pedido:', e);
      if (e.response) {
        const errorMsg = e.response.data?.message || e.response.data?.error || 'Error al procesar el pedido';
        presentToast({
          message: `Error: ${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg}`,
          duration: 4500,
          color: 'danger'
        });
        return;
      }

      // Fallback: If network failed unexpectedly (no response), save offline
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
                  setDiscountValue('');
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

          {/* 1. Search Bar & Vale Button */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div className="ff-search-pill" style={{ flex: 1, marginBottom: 0 }}>
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
            <button
              type="button"
              onClick={() => setShowSalaryAdvanceModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                color: '#DC2626',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title="Registrar salida de dinero por vale de empleado"
            >
              <IonIcon icon={cashOutline} style={{ fontSize: '16px' }} />
              <span>Vale</span>
            </button>
          </div>

          {/* 2. Category Chips Horizontal Carousel */}
          <div className="ff-chips-container">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`ff-chip ${selectedCategory === cat ? 'active bg-theme-primary border-theme-primary' : ''}`}
                style={selectedCategory === cat ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)', borderColor: 'var(--theme-primary)' } : {}}
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
                            ({currencySymbol} {currencySymbol === 'COP' ? Number(p.salePrice * exchangeRate).toLocaleString('es-CO') : (p.salePrice * exchangeRate).toFixed(2)})
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
                            className="bg-theme-primary"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--theme-primary)',
                              color: 'var(--theme-primary-contrast, #ffffff)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
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
                  {currencySymbol} {currencySymbol === 'COP' ? Number(totalCartBs).toLocaleString('es-CO') : totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      key={item.cartItemId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #EEF2F6'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{item.quantity}x {item.product.name}</span>
                          {item.hasModifications && (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px' }}>
                              ⚠️ Modificado
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          ${((item.unitPrice || item.product.salePrice) * item.quantity).toFixed(2)}
                        </div>

                        {item.hasModifications && (
                          <div style={{ marginTop: '3px', fontSize: '11px', lineHeight: '1.3' }}>
                            {item.removedIngredients && item.removedIngredients.length > 0 && (
                              <div style={{ color: '#DC2626', fontWeight: '700' }}>
                                SIN: {item.removedIngredients.join(', ')}
                              </div>
                            )}
                            {item.addedExtras && item.addedExtras.length > 0 && (
                              <div style={{ color: '#16A34A', fontWeight: '700' }}>
                                {item.addedExtras.map((e, idx) => (
                                  <span key={idx} style={{ marginRight: '6px' }}>
                                    EXTRA: {e.quantity > 1 ? `${e.quantity}x ` : ''}{e.name} (+${(e.priceUSD * e.quantity).toFixed(2)})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {Boolean(Array.isArray(item.product?.recipe) && item.product.recipe.length > 0) && (
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => openCustomizeModal(item.product, item)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 9px',
                                borderRadius: '6px',
                                background: '#ECFDF5',
                                color: '#065F46',
                                border: '1px solid #A7F3D0',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              ⚙️ {item.hasModifications ? 'Editar Personalización' : 'Personalizar (Quitar / Extras)'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#ffffff', fontWeight: '700' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#ffffff', fontWeight: '700' }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId)}
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
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Tasa: {currencySymbol} {currencySymbol === 'COP' ? Number(exchangeRate).toLocaleString('es-CO') : exchangeRate.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                        ${totalCart.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>
                        {currencySymbol} {currencySymbol === 'COP' ? Number(totalCartBs).toLocaleString('es-CO') : totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '100%' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Zona de Envío *
                        </label>
                        <IonSelect
                          interface="popover"
                          value={deliveryZoneId}
                          placeholder="Selecciona zona de envío..."
                          onIonChange={e => setDeliveryZoneId(e.detail.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-slate-800 text-sm"
                          style={{ '--padding-start': '6px', '--padding-end': '6px', minHeight: '42px', width: '100%', maxWidth: '100%' }}
                        >
                          <IonSelectOption value="">Selecciona zona de envío...</IonSelectOption>
                          {deliveryZones.map(zone => (
                            <IonSelectOption key={zone.id} value={zone.id}>
                              {zone.name} (+${zone.priceUSD})
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </div>
                      <div style={{ width: '100%' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          🛵 Repartidor Asignado
                        </label>
                        <IonSelect
                          interface="popover"
                          value={deliveryUserId}
                          placeholder="Sin asignar / A convenir"
                          onIonChange={e => setDeliveryUserId(e.detail.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-slate-800 text-sm"
                          style={{ '--padding-start': '6px', '--padding-end': '6px', minHeight: '42px', width: '100%', maxWidth: '100%' }}
                        >
                          <IonSelectOption value="">Sin asignar / A convenir</IonSelectOption>
                          {employees
                            .filter(d => isDeliveryDriver(d))
                            .map(d => {
                              const roleName = d.jobTitle || 'Repartidor';
                              return (
                                <IonSelectOption key={d.id} value={d.id}>
                                  🛵 {d.username || d.name} ({roleName})
                                </IonSelectOption>
                              );
                            })}
                        </IonSelect>
                      </div>
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
                      <IonSelect
                        interface="popover"
                        value={employeeId}
                        placeholder="Sin asignar"
                        onIonChange={e => setEmployeeId(e.detail.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-slate-800 text-sm"
                        style={{ '--padding-start': '0px', '--padding-end': '0px', minHeight: '44px' }}
                      >
                        <IonSelectOption value="">Sin asignar</IonSelectOption>
                        {employees.map(emp => (
                          <IonSelectOption key={emp.id} value={emp.id}>
                            {emp.name || emp.username} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
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
                    <IonSelect
                      interface="popover"
                      value={discountType}
                      onIonChange={e => setDiscountType(e.detail.value)}
                      style={{ width: '110px', minHeight: '38px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#ffffff', fontSize: '12px', color: '#0F172A', '--padding-start': '8px', '--padding-end': '8px' }}
                    >
                      <IonSelectOption value="FIXED">$ Fijo</IonSelectOption>
                      <IonSelectOption value="PERCENTAGE">% Porc.</IonSelectOption>
                    </IonSelect>
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
                    {settings?.acceptCardPos === true && (
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
                            {currencySymbol} {formatLocalAmount(vueltoBs)}
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
                                🇻🇪 Efectivo {currencySymbol}
                              </button>
                            </div>

                            {/* Detalle si es Pago Móvil */}
                            {changeMethod === 'PAGO_MOVIL' && (
                              <div style={{ background: '#ffffff', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#047857', marginBottom: '8px' }}>
                                  📲 Registra la transferencia de vuelto ({currencySymbol} {formatLocalAmount(vueltoBs)})
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
                                💡 Se entregarán <b>{currencySymbol} {formatLocalAmount(vueltoBs)}</b> en billetes físicos desde la gaveta.
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
                          {abonoNum > totalCart ? (
                            <>
                              <div style={{ fontSize: '11px', color: '#047857', fontWeight: '700' }}>Saldo a Favor del Cliente:</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                                +${(abonoNum - totalCart).toFixed(2)} USD
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#065F46' }}>
                                {currencySymbol} {formatLocalAmount((abonoNum - totalCart) * exchangeRate)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>Saldo por Cobrar:</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#D97706' }}>
                                ${saldoPendiente.toFixed(2)} USD
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E' }}>
                                {currencySymbol} {formatLocalAmount(saldoPendienteBs)}
                              </div>
                            </>
                          )}
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

        {/* Modal Personalizar Producto (Retiro de Insumos y Adicionales Extra) */}
        <IonModal isOpen={Boolean(customizingProduct)} onDidDismiss={closeCustomizeModal}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F8FAFC' }}>
            {/* Modal Header */}
            <div style={{ background: '#ffffff', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                  Personalizar: {customizingProduct?.name}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Base: ${Number(customizingProduct?.salePrice || 0).toFixed(2)} USD
                </div>
              </div>
              <button
                type="button"
                onClick={closeCustomizeModal}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <IonIcon icon={closeOutline} style={{ fontSize: '20px' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {customizingProduct?.recipe && customizingProduct.recipe.length > 0 ? (
                <>
                  {/* Sección 1: Quitar Insumos */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🥗 Ingredientes de la Receta (Toca para quitar)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customizingProduct.recipe.map((ri: any) => {
                        const rm = ri.rawMaterial || availableRawMaterials.find(m => m.id === ri.rawMaterialId);
                        const rmName = rm?.name || ri.rawMaterialName || 'Insumo';
                        const isRemoved = customRemovedIngredients.includes(rmName);

                        return (
                          <div
                            key={ri.id || ri.rawMaterialId}
                            onClick={() => {
                              if (isRemoved) {
                                setCustomRemovedIngredients(prev => prev.filter(n => n !== rmName));
                              } else {
                                setCustomRemovedIngredients(prev => [...prev, rmName]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: `1px solid ${isRemoved ? '#FCA5A5' : '#E2E8F0'}`,
                              background: isRemoved ? '#FEF2F2' : '#F8FAFC',
                              cursor: 'pointer'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: isRemoved ? '#991B1B' : '#0F172A', textDecoration: isRemoved ? 'line-through' : 'none' }}>
                                {rmName}
                              </div>
                              <div style={{ fontSize: '11px', color: isRemoved ? '#DC2626' : '#64748B', fontWeight: isRemoved ? '700' : '500' }}>
                                {isRemoved ? '❌ Se quitará de la preparación' : '✓ Incluido'}
                              </div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: isRemoved ? '#DC2626' : '#E2E8F0',
                              color: isRemoved ? '#FFFFFF' : '#475569'
                            }}>
                              {isRemoved ? 'QUITADO' : 'INCLUIDO'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sección 2: Agregar Extras */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✨ Adicionales / Extras Disponibles
                    </h4>

                    {availableRawMaterials.filter(rm => rm.allowAsExtra).length === 0 ? (
                      <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '14px', border: '1px solid #FDE68A', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E', marginBottom: '4px' }}>
                          ⚠️ No hay adicionales habilitados como Extra
                        </div>
                        <div style={{ fontSize: '12px', color: '#78350F' }}>
                          Ve a <strong>Inventario (Insumos)</strong> y activa la opción <strong>"🍔 Vender como Adicional / Extra"</strong> en los insumos que desees ofrecer con recargo (Queso, Tocineta, Salsas, etc.).
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableRawMaterials.filter(rm => rm.allowAsExtra).map(rm => {
                          const price = getExtraPrice(rm);
                          const qty = customExtras[rm.id] || 0;

                          return (
                            <div
                              key={rm.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: `1px solid ${qty > 0 ? '#86EFAC' : '#E2E8F0'}`,
                                background: qty > 0 ? '#F0FDF4' : '#F8FAFC'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                                  {rm.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700' }}>
                                  +${price.toFixed(2)} USD (Bs. {(price * exchangeRate).toFixed(2)})
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  disabled={qty <= 0}
                                  onClick={() => setCustomExtras(prev => ({ ...prev, [rm.id]: Math.max(0, (prev[rm.id] || 0) - 1) }))}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#ffffff', fontWeight: '700', cursor: qty > 0 ? 'pointer' : 'default', opacity: qty > 0 ? 1 : 0.4 }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '14px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCustomExtras(prev => ({ ...prev, [rm.id]: (prev[rm.id] || 0) + 1 }))}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #10B981', background: '#ECFDF5', color: '#047857', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ background: '#FFFBEB', borderRadius: '14px', padding: '16px', border: '1px solid #FDE68A', textAlign: 'center', color: '#92400E', fontSize: '13px' }}>
                  ℹ️ Este producto no cuenta con receta ni insumos para personalizar o añadir extras.
                </div>
              )}
            </div>

            {/* Modal Footer: Total & Add button */}
            <div style={{ background: '#ffffff', padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {(() => {
                  let extrasSum = 0;
                  Object.entries(customExtras).forEach(([rmId, qty]) => {
                    if (qty > 0) {
                      const rm = availableRawMaterials.find(m => m.id === rmId);
                      if (rm) extrasSum += getExtraPrice(rm) * qty;
                    }
                  });
                  const total = (customizingProduct?.salePrice || 0) + extrasSum;
                  return (
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Total Ítem:</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>
                        ${total.toFixed(2)} USD
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button
                type="button"
                className="ff-btn-primary"
                onClick={addCustomizedToCart}
                style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}
              >
                {editingCartItemId ? 'Guardar Cambios ✓' : 'Agregar al Carrito ✓'}
              </button>
            </div>
          </div>
        </IonModal>

        <SalaryAdvanceModal
          isOpen={showSalaryAdvanceModal}
          onClose={() => setShowSalaryAdvanceModal(false)}
          employees={employees}
          defaultExchangeRate={exchangeRate}
        />
      </IonContent>
    </IonPage>
  );
};

export default Pos;
