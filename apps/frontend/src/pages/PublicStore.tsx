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
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useImageViewer } from '../context/ImageViewerContext';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  salePrice: number;
  images: string[];
  stockQuantity: number;
  isService: boolean;
  isOutOfStock: boolean;
}

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
  const [deliveryMethod, setDeliveryMethod] = useState<'IN_STORE' | 'DELIVERY'>('IN_STORE');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState<'PAGO_MOVIL' | 'USD' | 'TRANSFER' | 'BINANCE' | 'WHATSAPP'>('PAGO_MOVIL');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [binanceRef, setBinanceRef] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);

  const fetchStore = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await axios.get(`${apiBase}/public/store/tenant/${tenantId}`);
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
    }
  }, [tenantId]);

  // Calculations
  const exchangeRate = Number(storeData?.settings?.exchangeRateBs || 40.0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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

  const handleAddToCart = (product: StoreProduct) => {
    if (product.isOutOfStock) {
      presentToast({
        message: 'Este producto está agotado por el momento.',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    const existingIndex = cart.findIndex((i) => i.product.id === product.id);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    // Check inventory availability
    if (!product.isService && currentQtyInCart + 1 > product.stockQuantity) {
      presentToast({
        message: `Solo quedan ${product.stockQuantity} unidades disponibles de "${product.name}".`,
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

    // Check inventory cap on increase
    if (delta > 0 && !item.product.isService && newQty > item.product.stockQuantity) {
      presentToast({
        message: `Límite alcanzado: solo hay ${item.product.stockQuantity} disponibles.`,
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

    if (paymentOption === 'TRANSFER' && !transferRef.trim()) {
      presentToast({ message: 'Por favor ingresa la referencia de transferencia bancaria', duration: 2500, color: 'warning' });
      return;
    }
    if (paymentOption === 'BINANCE' && !binanceRef.trim()) {
      presentToast({ message: 'Por favor ingresa el ID de transacción / Binance Pay', duration: 2500, color: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentNote = paymentOption === 'TRANSFER' ? `MÉTODO: Transferencia Bancaria | Ref: ${transferRef.trim()}` :
                          paymentOption === 'BINANCE' ? `MÉTODO: Binance Pay | ID: ${binanceRef.trim()}` :
                          paymentOption === 'USD' ? 'MÉTODO: Divisas Efectivo (USD)' :
                          paymentOption === 'WHATSAPP' ? 'MÉTODO: A convenir por WhatsApp' : '';

      const finalNotes = [notes.trim(), paymentNote].filter(Boolean).join(' | ');

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryMethod,
        deliveryZoneId: deliveryMethod === 'DELIVERY' ? selectedZoneId : undefined,
        customerAddress: deliveryMethod === 'DELIVERY' ? customerAddress.trim() : undefined,
        notes: finalNotes,
        pagoMovilRef: paymentOption === 'PAGO_MOVIL' ? pagoMovilRef.trim() : 
                      paymentOption === 'TRANSFER' ? transferRef.trim() : 
                      paymentOption === 'BINANCE' ? binanceRef.trim() : undefined,
        exchangeRate,
        amountBs: grandTotalBs,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.salePrice,
        })),
      };

      const res = await axios.post(`${apiBase}/public/store/tenant/${tenantId}/order`, payload);
      setOrderResult({
        ...res.data,
        items: [...cart],
        deliveryMethod,
        deliveryFeeUSD,
        grandTotalUSD,
        grandTotalBs,
        notes: finalNotes,
      });

      // Clear cart
      setCart([]);
      setIsCartOpen(false);
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
    const phone = storeData.settings?.companyPhone?.replace(/\D/g, '') || '';
    const lines = [
      `🛍️ *NUEVO PEDIDO #${orderResult.orderNumber}*`,
      `👤 *Cliente:* ${orderResult.customerName}`,
      `📞 *Teléfono:* ${orderResult.customerPhone}`,
      `📦 *Entrega:* ${orderResult.deliveryMethod === 'DELIVERY' ? '🛵 Delivery a Domicilio' : '🏪 Retiro en Tienda'}`,
    ];

    if (orderResult.deliveryMethod === 'DELIVERY' && customerAddress) {
      lines.push(`📍 *Dirección:* ${customerAddress}`);
    }

    lines.push('', '🛒 *PRODUCTOS:*');
    orderResult.items.forEach((item: CartItem) => {
      lines.push(`• ${item.quantity}x ${item.product.name} - $${(item.product.salePrice * item.quantity).toFixed(2)}`);
    });

    if (orderResult.deliveryFeeUSD > 0) {
      lines.push(`🛵 *Delivery:* $${orderResult.deliveryFeeUSD.toFixed(2)}`);
    }

    lines.push(
      '',
      `💵 *TOTAL:* $${orderResult.grandTotalUSD.toFixed(2)} / Bs. ${orderResult.grandTotalBs.toFixed(2)}`
    );

    if (paymentOption === 'PAGO_MOVIL' && pagoMovilRef) {
      lines.push(`📱 *Ref. Pago Móvil:* ${pagoMovilRef}`);
    } else if (paymentOption === 'TRANSFER' && transferRef) {
      lines.push(`🏦 *Ref. Transferencia:* ${transferRef}`);
    } else if (paymentOption === 'BINANCE' && binanceRef) {
      lines.push(`🟡 *ID Binance Pay:* ${binanceRef}`);
    } else if (paymentOption === 'USD') {
      lines.push(`💵 *Método:* Efectivo Divisas (USD)`);
    } else if (paymentOption === 'WHATSAPP') {
      lines.push(`💬 *Método:* A convenir por WhatsApp`);
    }

    if (orderResult.notes) {
      lines.push(`📝 *Notas:* ${orderResult.notes}`);
    }

    const text = encodeURIComponent(lines.join('\n'));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    presentToast({ message: `${label} copiado`, duration: 1800, color: 'success' });
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
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
            <IonTitle>{storeData?.tenant?.name || 'Tienda Online'}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <IonIcon icon={checkmarkCircleOutline} color="success" style={{ fontSize: '72px' }} />
            <h1 style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>¡Pedido Recibido!</h1>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              Tu orden <b>#{orderResult.orderNumber}</b> ha sido registrada con éxito.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', margin: '20px 0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Cliente:</span>
                <span style={{ fontWeight: '600' }}>{orderResult.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Modalidad:</span>
                <span style={{ fontWeight: '600' }}>
                  {orderResult.deliveryMethod === 'DELIVERY' ? '🛵 Delivery a Domicilio' : '🏪 Retiro en Tienda'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Total a pagar:</span>
                <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }}>
                  ${orderResult.grandTotalUSD.toFixed(2)} (Bs. {orderResult.grandTotalBs.toFixed(2)})
                </span>
              </div>
            </div>

            <IonButton
              expand="block"
              color="success"
              onClick={openWhatsAppOrder}
              style={{ height: '52px', fontWeight: 'bold', fontSize: '1rem', marginBottom: '12px' }}
            >
              <IonIcon slot="start" icon={logoWhatsapp} style={{ fontSize: '1.3rem' }} />
              Enviar Pedido por WhatsApp
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => {
                setOrderResult(null);
                fetchStore();
              }}
            >
              Hacer otro pedido
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
            {storeData?.settings?.companyPhone && (
              <IonButton
                fill="clear"
                onClick={() => {
                  const phone = storeData.settings.companyPhone.replace(/\D/g, '');
                  window.open(`https://wa.me/${phone}`, '_blank');
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
          <IonBadge color="light" style={{ fontSize: '0.95rem', padding: '8px 12px', border: '1px solid #cbd5e1' }}>
            Tasa BCV: <b>Bs. {exchangeRate.toFixed(2)}</b>
          </IonBadge>
        </div>

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
                          {product.isOutOfStock && (
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
                          )}
                          {!product.isOutOfStock && !product.isService && (
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
                              Disp: {product.stockQuantity}
                            </div>
                          )}
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
                                disabled={!product.isService && inCart.quantity >= product.stockQuantity}
                                style={{ margin: 0, height: '32px', width: '32px' }}
                              >
                                <IonIcon slot="icon-only" icon={addOutline} />
                              </IonButton>
                            </div>
                          ) : (
                            <IonButton
                              size="small"
                              color="primary"
                              disabled={product.isOutOfStock}
                              onClick={() => handleAddToCart(product)}
                              style={{ margin: 0, borderRadius: '8px' }}
                            >
                              {product.isOutOfStock ? 'Agotado' : 'Agregar'}
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
                            disabled={!item.product.isService && item.quantity >= item.product.stockQuantity}
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

                {/* Payment Option */}
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
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>Datos para Pago Móvil (Total: Bs. {grandTotalBs.toFixed(2)}):</p>
                      {storeData.settings.companyBank && (
                        <p style={{ margin: '2px 0', fontSize: '13px' }}>
                          <b>Banco:</b> {storeData.settings.companyBank}
                        </p>
                      )}
                      {storeData.settings.companyCedula && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Cédula/RIF:</b> {storeData.settings.companyCedula}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyCedula, 'Cédula')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
                      {storeData.settings.companyPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Teléfono:</b> {storeData.settings.companyPhone}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyPhone, 'Teléfono')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
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

                  {paymentOption === 'TRANSFER' && storeData?.settings && (
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', marginTop: '10px', border: '1px solid #bfdbfe' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>
                        Datos para Transferencia Bancaria (Total: Bs. {grandTotalBs.toFixed(2)}):
                      </p>
                      {storeData.settings.companyBank && (
                        <p style={{ margin: '2px 0', fontSize: '13px' }}>
                          <b>Banco:</b> {storeData.settings.companyBank}
                        </p>
                      )}
                      {storeData.settings.companyCedula && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ fontSize: '13px' }}><b>Cédula/RIF:</b> {storeData.settings.companyCedula}</span>
                          <IonButton fill="clear" size="small" onClick={() => copyToClipboard(storeData.settings.companyCedula, 'Cédula')}>
                            <IonIcon icon={copyOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )}
                      <IonItem lines="none" style={{ '--background': '#fff', borderRadius: '6px', marginTop: '8px' }}>
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
                  color="success"
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                  style={{ height: '52px', fontWeight: 'bold', fontSize: '1rem', borderRadius: '10px' }}
                >
                  {isSubmitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Confirmar Pedido (${grandTotalUSD.toFixed(2)})
                    </>
                  )}
                </IonButton>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default PublicStore;
