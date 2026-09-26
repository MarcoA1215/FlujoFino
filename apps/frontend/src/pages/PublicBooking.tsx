import React, { useState, useEffect, useMemo } from 'react';
import { IonPage, IonContent, IonCard, IonCardContent, IonInput, IonLabel, IonItem, IonButton, useIonToast, IonSpinner, IonIcon, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  checkmarkCircleOutline, 
  timeOutline, 
  chevronBackOutline, 
  imagesOutline, 
  personOutline, 
  sparklesOutline,
  copyOutline,
  walletOutline,
  businessOutline
} from 'ionicons/icons';
import { useImageViewer } from '../context/ImageViewerContext';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PublicBooking: React.FC = () => {
  const { openImage } = useImageViewer();
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const toggleService = (svc: any) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === svc.id);
      if (exists) {
        return prev.filter(s => s.id !== svc.id);
      } else {
        return [...prev, svc];
      }
    });
    setSelectedTime(''); // Reset time because combined duration changes
  };

  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.durationMinutes) || 30), 0);
  }, [selectedServices]);

  const totalServicePrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [selectedServices]);

  const selectedServiceNames = useMemo(() => {
    return selectedServices.map(s => s.name).join(' + ');
  }, [selectedServices]);

  const selectedServiceIds = useMemo(() => {
    return selectedServices.map(s => s.id).join(',');
  }, [selectedServices]);

  // Specialists available specifically for all currently selected services
  const availableStaffForService = useMemo(() => {
    if (!tenantInfo?.staff || !tenantInfo?.bookingAllowStaffSelection || selectedServices.length === 0) return [];
    
    return tenantInfo.staff.filter((st: any) => {
      return selectedServices.every((svc: any) => {
        const assigned = svc.assignedStaffIds;
        if (!assigned || (Array.isArray(assigned) && assigned.length === 0) || (typeof assigned === 'string' && !assigned.trim())) {
          return true;
        }
        const ids = Array.isArray(assigned) ? assigned : (assigned as string).split(',').map((s: string) => s.trim());
        return ids.includes(st.id);
      });
    });
  }, [tenantInfo?.staff, tenantInfo?.bookingAllowStaffSelection, selectedServices]);

  // When selected services change, reset staff if current staff cannot do all selected services
  useEffect(() => {
    if (selectedStaff && availableStaffForService.length > 0) {
      const isStillAvailable = availableStaffForService.some((st: any) => st.id === selectedStaff.id);
      if (!isStillAvailable) {
        setSelectedStaff(null);
      }
    }
  }, [selectedServices, availableStaffForService]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [identification, setIdentification] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<{ name: string; phone: string; identification?: string } | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [success, setSuccess] = useState(false);
  const [magicLink, setMagicLink] = useState('');

  // Payment reporting states for booking
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<string>('PAGO_MOVIL');
  const [bookingPaymentOption, setBookingPaymentOption] = useState<'FULL' | 'DEPOSIT'>('FULL');
  const [bookingPaymentAmount, setBookingPaymentAmount] = useState<string>('');
  const [bookingPaymentRef, setBookingPaymentRef] = useState<string>('');
  const [bookingPaymentNotes, setBookingPaymentNotes] = useState<string>('');

  const rateBs = Number(tenantInfo?.exchangeRateBs || 40.0);
  const minDepositPercentage = Number(tenantInfo?.minDepositPercentage || 0);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      presentToast({ message: `${label} copiado al portapapeles`, duration: 2000, color: 'success' });
    }
  };

  useEffect(() => {
    if (totalServicePrice > 0) {
      if (bookingPaymentOption === 'FULL') {
        setBookingPaymentAmount(totalServicePrice.toString());
      } else {
        const minPct = minDepositPercentage > 0 ? minDepositPercentage : 30;
        const minDep = Math.round((totalServicePrice * (minPct / 100)) * 100) / 100;
        setBookingPaymentAmount(minDep.toString());
      }
    }
  }, [totalServicePrice, bookingPaymentOption, minDepositPercentage]);

  // Preload returning customer data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lastBookingCustomer');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
        if (parsed.identification) setIdentification(parsed.identification);
        setRecognizedCustomer(parsed);
      }
    } catch (e) {
      console.warn('Failed reading lastBookingCustomer', e);
    }
  }, []);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [hasMoreCatalog, setHasMoreCatalog] = useState(true);
  const [portfolioTab, setPortfolioTab] = useState<'ALL' | 'SERVICE' | 'WORK'>('ALL');

  const fetchCatalog = async (page: number, append = false) => {
    try {
      const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}/catalog?page=${page}&limit=10`);
      const data = res.data.data;
      if (data.length < 10) setHasMoreCatalog(false);
      else setHasMoreCatalog(true);
      
      if (append) {
        setCatalogItems(prev => [...prev, ...data]);
      } else {
        setCatalogItems(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openCatalog = () => {
    setCatalogPage(1);
    setHasMoreCatalog(true);
    fetchCatalog(1, false);
    setShowCatalog(true);
  };

  const loadMoreCatalog = (e: any) => {
    const nextPage = catalogPage + 1;
    setCatalogPage(nextPage);
    fetchCatalog(nextPage, true).finally(() => e.target.complete());
  };

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}`);
        setTenantInfo(res.data);
        
        // If business is pure retail/recipes without customer schedules, redirect to online store
        if ((res.data.featureBuySell || res.data.featureRecipes) && !res.data.featureCustomerSchedules) {
          window.location.replace(`/store/${tenantId}`);
          return;
        }

        // If require service is NOT enabled and no services are defined, skip step 1
        if (!res.data.bookingRequireService && (!res.data.services || res.data.services.length === 0)) {
          setStep(2);
        } else {
          setStep(1);
        }
      } catch (e) {
        presentToast({ message: 'Error cargando información', duration: 3000, color: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) fetchTenant();
  }, [tenantId]);

  const handleLookup = async (q?: string) => {
    const queryToUse = q !== undefined ? q : lookupQuery;
    if (!queryToUse || !queryToUse.trim() || !tenantId) return;
    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}/customer-lookup?query=${encodeURIComponent(queryToUse.trim())}`);
      if (res.data && res.data.exists) {
        setCustomerName(res.data.name || '');
        setCustomerPhone(res.data.phone || '');
        if (res.data.identification) setIdentification(res.data.identification);
        setRecognizedCustomer(res.data);
        presentToast({ message: `¡Hola de nuevo, ${res.data.name}! Hemos cargado tus datos.`, duration: 3000, color: 'success' });
      } else {
        setLookupMessage('No encontramos citas anteriores con este dato. Puedes completar tus datos a continuación.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName) {
      presentToast({ message: 'Por favor, ingresa tu nombre', duration: 2000, color: 'warning' });
      return;
    }
    if (!customerPhone) {
      presentToast({ message: 'Por favor, ingresa tu teléfono', duration: 2000, color: 'warning' });
      return;
    }

    if (totalServicePrice > 0) {
      if (bookingPaymentMethod !== 'CASH') {
        if (!bookingPaymentRef.trim()) {
          presentToast({ 
            message: 'Por favor, ingresa el número de referencia del comprobante de pago.', 
            duration: 3500, 
            color: 'warning' 
          });
          return;
        }
        const payNum = parseFloat(bookingPaymentAmount);
        if (isNaN(payNum) || payNum <= 0) {
          presentToast({ 
            message: 'El monto de abono o pago debe ser mayor a 0.', 
            duration: 3000, 
            color: 'warning' 
          });
          return;
        }
        if (minDepositPercentage > 0) {
          const minReq = Math.round((totalServicePrice * (minDepositPercentage / 100)) * 100) / 100;
          if (payNum < minReq) {
            presentToast({ 
              message: `El abono mínimo requerido es de $${minReq.toFixed(2)} (${minDepositPercentage}%)`, 
              duration: 3500, 
              color: 'warning' 
            });
            return;
          }
        }
      } else {
        if (minDepositPercentage > 0) {
          presentToast({ 
            message: `Este negocio requiere un abono previo del ${minDepositPercentage}% para apartar la cita. Selecciona un método de pago electrónico e ingresa la referencia.`, 
            duration: 4000, 
            color: 'warning' 
          });
          return;
        }
      }
    }

    try {
      const payAmtNum = parseFloat(bookingPaymentAmount) || totalServicePrice;
      const res = await axios.post(`${apiBase}/public/reservations/${tenantId}`, {
        customerName, 
        customerPhone, 
        identification: identification || undefined,
        date: (selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined), 
        time: selectedTime, 
        numberOfPeople: (tenantInfo?.bookingRequireService || selectedServices.length > 0) ? 1 : numberOfPeople, 
        notes,
        referralSource,
        serviceId: selectedServiceIds || undefined,
        serviceName: selectedServiceNames || undefined,
        employeeId: selectedStaff?.id || undefined,
        employeeName: selectedStaff?.name || undefined,
        totalAmount: totalServicePrice,
        paymentMethod: totalServicePrice > 0 ? bookingPaymentMethod : undefined,
        paymentReference: totalServicePrice > 0 && bookingPaymentMethod !== 'CASH' ? bookingPaymentRef.trim() : undefined,
        paymentAmount: totalServicePrice > 0 && bookingPaymentMethod !== 'CASH' ? payAmtNum : undefined,
        paymentAmountBs: totalServicePrice > 0 && bookingPaymentMethod !== 'CASH' ? Math.round(payAmtNum * rateBs * 100) / 100 : undefined,
        paymentNotes: totalServicePrice > 0 ? (bookingPaymentNotes.trim() || undefined) : undefined,
      });

      // Persist customer profile locally for recurring visits
      try {
        localStorage.setItem('lastBookingCustomer', JSON.stringify({
          name: customerName,
          phone: customerPhone,
          identification: identification || undefined
        }));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }

      const appointmentId = res.data.id;
      setMagicLink(`${window.location.origin}/appointment/${appointmentId}`);
      setSuccess(true);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error procesando tu reservación. Intenta de nuevo.';
      presentToast({ message: msg, duration: 3000, color: 'danger' });
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const bHours = tenantInfo?.businessHours || {};
    
    // Generate next 14 days
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dayStr = d.getDay().toString();
      
      const dayConfig = bHours[dayStr];
      if (dayConfig && dayConfig.isOpen) {
        dates.push(d);
      } else if (!bHours[dayStr] && Object.keys(bHours).length === 0) {
        // Fallback if no business hours configured at all
        dates.push(d);
      }
    }
    return dates;
  };

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !tenantId) return;
      setLoadingSlots(true);
      try {
        const dStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const sId = selectedServiceIds ? `&serviceId=${selectedServiceIds}` : '';
        const empId = selectedStaff?.id ? `&employeeId=${selectedStaff.id}` : '';
        const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}/availability?date=${dStr}${sId}${empId}`);
        setAvailableSlots(res.data);
      } catch (e) {
        presentToast({ message: 'Error cargando horarios', duration: 2000, color: 'danger' });
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedServiceIds, selectedStaff, tenantId]);

  if (loading) return <IonPage><IonContent className="ion-padding ion-text-center"><IonSpinner /></IonContent></IonPage>;

  if (success) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
          <div style={{ maxWidth: '500px', margin: '50px auto', textAlign: 'center' }}>
            <IonCard>
              <IonCardContent>
                <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '80px', color: '#2dd36f' }} />
                <h2 style={{ color: '#2dd36f', fontWeight: 'bold' }}>¡Cita Agendada!</h2>
                <p style={{fontSize: '16px', marginTop: '10px'}}>Tu cita en <b>{tenantInfo?.name}</b> ha sido confirmada.</p>
                
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'left' }}>
                  <p><b>Fecha:</b> {selectedDate?.toLocaleDateString()}</p>
                  <p><b>Hora:</b> {selectedTime}</p>
                  {selectedServices.length > 0 && (
                    <>
                      <p><b>Servicio(s):</b> {selectedServiceNames}</p>
                      <p><b>Duración estimada:</b> {totalDurationMinutes} min</p>
                      <p><b>Total:</b> ${totalServicePrice.toFixed(2)}</p>
                    </>
                  )}
                  {selectedStaff ? (
                    <p><b>Especialista:</b> {selectedStaff.name}</p>
                  ) : selectedServices.length > 1 ? (
                    <p><b>Atención:</b> Equipo del Local (Coordinación continua)</p>
                  ) : null}
                </div>

                <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#eef8ff', borderRadius: '8px', border: '1px dashed var(--ion-color-primary)' }}>
                  <h3 style={{ color: 'var(--ion-color-primary)', fontWeight: 'bold', fontSize: '16px', margin: '0 0 10px 0' }}>Enlace de Gestión</h3>
                  <p style={{ fontSize: '14px', color: '#555', margin: '0 0 15px 0' }}>Guarda este enlace único. Desde aquí podrás ver los detalles bancarios, o cancelar y reprogramar tu cita sin necesidad de contactarnos:</p>
                  
                  <div style={{ wordBreak: 'break-all', backgroundColor: '#fff', padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #ddd', marginBottom: '10px' }}>
                    {magicLink}
                  </div>
                  
                  <IonButton fill="outline" color="primary" onClick={() => { navigator.clipboard.writeText(magicLink); presentToast({ message: '¡Enlace copiado!', duration: 2000, color: 'success' }); }}>
                    Copiar Enlace
                  </IonButton>
                  <IonButton fill="solid" color="primary" onClick={() => window.open(magicLink, '_blank')}>
                    Abrir Panel
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const availableServices = (tenantInfo?.services || []).filter((s: any) => {
    if (s.product_type === 'SERVICIO') return true;
    if (s.product_type === 'REVENTA' || s.product_type === 'FORMULA') return false;
    return s.is_service === true || s.category === 'Servicios';
  });
  const hasServices = availableServices.length > 0;
  const isServiceRequired = tenantInfo?.bookingRequireService;
  const hasStore = Boolean(tenantInfo?.hasStore ?? (tenantInfo?.featureBuySell || tenantInfo?.featureRecipes));

  const goBack = () => {
    if (step === 2 && (tenantInfo?.bookingRequireService || selectedServices.length > 0 || hasServices)) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
        <div style={{ maxWidth: '500px', margin: '20px auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
            {step > 1 && (step !== 2 || hasServices || isServiceRequired) ? (
              <IonButton fill="clear" onClick={goBack} style={{ margin: 0, position: 'absolute', left: 0 }} title="Regresar">
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            ) : hasStore ? (
              <IonButton 
                fill="clear" 
                onClick={() => (window.location.href = `/store/${tenantId}`)} 
                style={{ margin: 0, position: 'absolute', left: 0, color: '#475569' }}
                title="Volver a la Tienda"
              >
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            ) : null}
            <h2 style={{ fontWeight: 'bold', color: '#1e293b', margin: '0 auto', textAlign: 'center', fontSize: '1.4rem' }}>
              {tenantInfo?.name}
            </h2>
          </div>

          {/* Navigation Switcher if Business has both Booking & Store */}
          {hasStore && (
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
                onClick={() => (window.location.href = `/store/${tenantId}`)}
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
                <span>🛍️</span> Catálogo / Tienda ↗
              </button>
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
                <span>📅</span> Agendar Citas
              </button>
            </div>
          )}

          {tenantInfo?.featureShowCatalog && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <IonButton fill="outline" color="primary" onClick={openCatalog}>
                <IonIcon slot="start" icon={imagesOutline} />
                Ver Portafolio de Trabajos
              </IonButton>
            </div>
          )}

          <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <IonCardContent style={{ padding: '20px' }}>
              
              {/* STEP 1: SERVICES & SPECIALIST */}
              {step === 1 && (
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '4px', textAlign: 'center', fontSize: '18px' }}>
                    {isServiceRequired ? 'Elige tu(s) Servicio(s)' : 'Selecciona tu(s) Servicio(s) (Opcional)'}
                  </h3>
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
                    {isServiceRequired 
                      ? 'Puedes seleccionar uno o varios servicios para agendarlos en una sola cita' 
                      : 'Elige uno o más servicios o avanza directamente para reservar'}
                  </p>

                  {/* Services List */}
                  {hasServices ? (
                    <div>
                      {availableServices.map((svc: any) => {
                        const isSelected = selectedServices.some(s => s.id === svc.id);
                        return (
                          <div 
                            key={svc.id} 
                            onClick={() => toggleService(svc)}
                            style={{ 
                              padding: '12px', 
                              border: isSelected ? '2px solid var(--ion-color-primary)' : '1px solid #e2e8f0', 
                              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                              borderRadius: '10px', 
                              marginBottom: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {svc.image && (
                                <img 
                                  src={svc.image} 
                                  alt={svc.name} 
                                  onClick={(e) => { e.stopPropagation(); openImage(svc.image, svc.name); }}
                                  title="Toca para ver en grande"
                                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', cursor: 'zoom-in' }} 
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{svc.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <IonIcon icon={timeOutline} style={{ fontSize: '13px' }} /> 
                                  {svc.durationMinutes} min
                                  {svc.category && svc.category !== 'Servicios' && ` • ${svc.category}`}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--ion-color-primary)' }}>
                                ${Number(svc.price).toFixed(2)}
                              </div>
                              {isSelected ? (
                                <div style={{ fontSize: '11px', color: 'var(--ion-color-success)', fontWeight: 'bold', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                                  <IonIcon icon={checkmarkCircleOutline} /> Seleccionado
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  + Agregar
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Live Summary Box when at least 1 service is picked */}
                      {selectedServices.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          marginBottom: '14px',
                          padding: '12px 14px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#166534', fontSize: '13px' }}>
                              {selectedServices.length === 1 ? '1 servicio seleccionado' : `${selectedServices.length} servicios seleccionados`}
                            </div>
                            <div style={{ color: '#15803d', fontSize: '12px', marginTop: '2px' }}>
                              ⏱️ Duración total: <b>{totalDurationMinutes} min</b>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#166534' }}>Total estimado</div>
                            <div style={{ fontWeight: '800', fontSize: '17px', color: '#166534' }}>
                              ${totalServicePrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Specialist Selection: Exclusively shown once a service is selected */}
                      {selectedServices.length > 0 && tenantInfo?.bookingAllowStaffSelection && availableStaffForService.length > 0 && (
                        <div style={{ marginTop: '16px', marginBottom: '8px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={personOutline} color="primary" />
                            ¿Con quién deseas atenderte?
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                            Personal especialista capacitado para tu selección:
                          </div>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                            <div 
                              onClick={() => setSelectedStaff(null)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                border: !selectedStaff ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                                backgroundColor: !selectedStaff ? '#eff6ff' : '#ffffff',
                                color: !selectedStaff ? 'var(--ion-color-primary)' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <IonIcon icon={sparklesOutline} />
                              Cualquiera disponible
                            </div>
                            {availableStaffForService.map((st: any) => (
                              <div 
                                key={st.id}
                                onClick={() => setSelectedStaff(st)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  border: selectedStaff?.id === st.id ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                                  backgroundColor: selectedStaff?.id === st.id ? '#eff6ff' : '#ffffff',
                                  color: selectedStaff?.id === st.id ? 'var(--ion-color-primary)' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                              >
                                <IonIcon icon={personOutline} />
                                {st.name} {st.jobTitle ? `(${st.jobTitle})` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info box when staff selection is enabled, but no single specialist performs ALL selected services */}
                      {selectedServices.length > 1 && tenantInfo?.bookingAllowStaffSelection && availableStaffForService.length === 0 && (
                        <div style={{
                          marginTop: '16px',
                          marginBottom: '8px',
                          backgroundColor: '#f8fafc',
                          padding: '14px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={sparklesOutline} color="primary" />
                            👥 Atención Coordinada por el Equipo
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                            Los servicios seleccionados cuentan con especialistas específicos en nuestro equipo. Tu cita se reservará en un solo bloque continuo y el personal coordinará tu atención al momento de tu llegada.
                          </p>
                        </div>
                      )}

                      <IonButton 
                        expand="block" 
                        color="primary" 
                        disabled={isServiceRequired && selectedServices.length === 0}
                        onClick={() => setStep(2)}
                        style={{ marginTop: '16px', height: '48px', fontWeight: 'bold' }}
                      >
                        Continuar a Fecha y Hora {selectedServices.length > 0 ? `(${totalDurationMinutes} min)` : ''}
                      </IonButton>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: '#64748b' }}>
                      {tenantInfo?.bookingAllowStaffSelection && tenantInfo?.staff && tenantInfo.staff.length > 0 && (
                        <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={personOutline} color="primary" />
                            ¿Con quién deseas atenderte?
                          </div>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                            <div 
                              onClick={() => setSelectedStaff(null)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                border: !selectedStaff ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                                backgroundColor: !selectedStaff ? '#eff6ff' : '#ffffff',
                                color: !selectedStaff ? 'var(--ion-color-primary)' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <IonIcon icon={sparklesOutline} />
                              Cualquiera disponible
                            </div>
                            {tenantInfo.staff.map((st: any) => (
                              <div 
                                key={st.id}
                                onClick={() => setSelectedStaff(st)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  border: selectedStaff?.id === st.id ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                                  backgroundColor: selectedStaff?.id === st.id ? '#eff6ff' : '#ffffff',
                                  color: selectedStaff?.id === st.id ? 'var(--ion-color-primary)' : '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <IonIcon icon={personOutline} />
                                {st.name} {st.jobTitle ? `(${st.jobTitle})` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                        No hay servicios cargados en este momento. Puedes continuar para reservar una mesa o consultar con el local.
                      </p>
                      <IonButton expand="block" color="primary" onClick={() => setStep(2)}>
                        Continuar con Reserva General
                      </IonButton>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DATE */}
              {step === 2 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '8px', textAlign: 'center'}}>Elige una Fecha</h3>
                  
                  {selectedServices.length > 0 && (
                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{selectedServiceNames}</b> • ⏱️ {totalDurationMinutes} min
                        {selectedStaff && <div><span style={{ color: '#64748b' }}>Especialista:</span> <b>{selectedStaff.name}</b></div>}
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--ion-color-primary)', fontSize: '15px' }}>
                        ${totalServicePrice.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {getAvailableDates().map((d, i) => (
                      <div 
                        key={i}
                        onClick={() => { setSelectedDate(d); setStep(3); }}
                        style={{
                          padding: '15px 10px',
                          border: '1px solid var(--ion-color-primary)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          color: 'var(--ion-color-primary)',
                          fontWeight: 'bold'
                        }}
                      >
                        {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: TIME */}
              {step === 3 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '6px', textAlign: 'center'}}>Horas Disponibles</h3>
                  <div style={{textAlign: 'center', marginBottom: '14px', color: '#64748b', fontSize: '13px'}}>
                    Para el <b>{selectedDate?.toLocaleDateString()}</b> {selectedServices.length > 0 ? `(${totalDurationMinutes} min)` : ''}
                    {selectedStaff && ` con ${selectedStaff.name}`}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {loadingSlots ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px' }}><IonSpinner /></div>
                    ) : availableSlots.length === 0 ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#999', padding: '20px' }}>
                        No hay horarios disponibles para este día.
                      </div>
                    ) : availableSlots.map((t, i) => (
                      <div 
                        key={i}
                        onClick={() => { setSelectedTime(t); setStep(4); }}
                        style={{
                          padding: '12px 5px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: '#fff',
                          fontWeight: '500'
                        }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: FORM */}
              {step === 4 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center'}}>Tus Datos</h3>
                  
                  <div style={{ backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '6px' }}>Resumen de Cita:</div>
                    <div style={{ color: '#1e293b', lineHeight: '1.5' }}>
                      📅 <b>Fecha:</b> {selectedDate?.toLocaleDateString()} a las {selectedTime}<br/>
                      {selectedServices.length > 0 && (
                        <>
                          💅 <b>Servicio(s):</b> {selectedServiceNames} (⏱️ {totalDurationMinutes} min)<br/>
                          💰 <b>Inversión:</b> ${totalServicePrice.toFixed(2)}<br/>
                        </>
                      )}
                      {selectedStaff ? (
                        <>👤 <b>Atendido por:</b> {selectedStaff.name} {selectedStaff.jobTitle ? `(${selectedStaff.jobTitle})` : ''}<br/></>
                      ) : selectedServices.length > 1 ? (
                        <>👥 <b>Atención:</b> Equipo del Local (Coordinación continua)<br/></>
                      ) : null}
                    </div>
                  </div>

                  {/* Returning Customer Lookup */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={sparklesOutline} color="primary" />
                      ¿Ya te has atendido con nosotros?
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Ingresa tu Cédula o Teléfono para autocompletar tus datos al instante.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <IonInput 
                        value={lookupQuery}
                        placeholder="Ej. 28123456 o 04141234567"
                        onIonInput={e => setLookupQuery(e.detail.value!)}
                        onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                        onBlur={() => { if (lookupQuery && !recognizedCustomer) handleLookup(); }}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px', backgroundColor: '#fff', fontSize: '13px', minHeight: '38px' }}
                      />
                      <IonButton size="small" fill="outline" color="primary" onClick={() => handleLookup()} disabled={lookupLoading}>
                        {lookupLoading ? <IonSpinner name="dots" style={{ width: '20px' }} /> : 'Buscar'}
                      </IonButton>
                    </div>
                    {recognizedCustomer && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={checkmarkCircleOutline} color="success" style={{ fontSize: '16px' }} />
                        <span>¡Hola de nuevo, <b>{recognizedCustomer.name}</b>! Tus datos han sido cargados.</span>
                      </div>
                    )}
                    {lookupMessage && !recognizedCustomer && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                        {lookupMessage}
                      </div>
                    )}
                  </div>

                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Nombre Completo *</IonLabel>
                    <IonInput value={customerName} onIonInput={e => setCustomerName(e.detail.value!)} placeholder="Ej. Ana Pérez" />
                  </IonItem>
                  
                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Teléfono (WhatsApp) *</IonLabel>
                    <IonInput value={customerPhone} onIonInput={e => setCustomerPhone(e.detail.value!)} placeholder="Ej. 04141234567" />
                  </IonItem>

                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Cédula / Documento de Identidad (Opcional)</IonLabel>
                    <IonInput value={identification} onIonInput={e => setIdentification(e.detail.value!)} placeholder="Ej. V-28123456" />
                  </IonItem>

                  {/* Only show "Cantidad de Personas" if it's NOT a required service mode and no service was picked */}
                  {!isServiceRequired && selectedServices.length === 0 && (
                    <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                      <IonLabel position="stacked">Cantidad de Personas / Puestos</IonLabel>
                      <IonInput type="number" value={numberOfPeople} onIonInput={e => setNumberOfPeople(parseInt(e.detail.value!, 10))} min={1} />
                    </IonItem>
                  )}
                  
                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Notas Especiales</IonLabel>
                    <IonInput value={notes} onIonInput={e => setNotes(e.detail.value!)} placeholder="Ej. Retiro de acrílico, diseño específico..." />
                  </IonItem>

                  <IonItem lines="none" style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">¿Cómo nos conociste?</IonLabel>
                    <IonSelect value={referralSource} onIonChange={e => setReferralSource(e.detail.value)} placeholder="Selecciona una opción">
                      <IonSelectOption value="Instagram">Instagram</IonSelectOption>
                      <IonSelectOption value="Facebook">Facebook</IonSelectOption>
                      <IonSelectOption value="Tiktok">Tiktok</IonSelectOption>
                      <IonSelectOption value="Recomendacion">Recomendación de un amigo</IonSelectOption>
                      <IonSelectOption value="Local">Pasaba por el local</IonSelectOption>
                      <IonSelectOption value="Otro">Otro</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {/* Payment & Deposit Block */}
                  {totalServicePrice > 0 && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonIcon icon={walletOutline} /> Inversión & Forma de Pago
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '10px' }}>
                          Tasa BCV: Bs. {rateBs.toFixed(2)}
                        </span>
                      </div>

                      {/* Amounts Breakdown */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>TOTAL A PAGAR</span>
                          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>${totalServicePrice.toFixed(2)}</span>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                            ≈ Bs. {(totalServicePrice * rateBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>TASA DE CAMBIO</span>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>Bs. {rateBs.toFixed(2)} / USD</span>
                          {minDepositPercentage > 0 && (
                            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 'bold', marginTop: '3px' }}>
                              Seña mín ({minDepositPercentage}%): ${(totalServicePrice * (minDepositPercentage / 100)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      {minDepositPercentage > 0 && (
                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px', color: '#92400e' }}>
                          ⚠️ <strong>Abono previo requerido:</strong> Este negocio requiere un abono o seña mínima del <strong>{minDepositPercentage}% (${(totalServicePrice * (minDepositPercentage / 100)).toFixed(2)})</strong> para apartar tu turno en agenda.
                        </div>
                      )}

                      {/* Payment Method Selector */}
                      <div style={{ marginBottom: '12px' }}>
                        <IonLabel style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Método de Pago: *
                        </IonLabel>
                        <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                          <IonSelect 
                            value={bookingPaymentMethod} 
                            onIonChange={e => {
                              const m = e.detail.value;
                              setBookingPaymentMethod(m);
                              if (m === 'CASH') {
                                setBookingPaymentOption('FULL');
                                setBookingPaymentAmount(totalServicePrice.toString());
                              }
                            }}
                            placeholder="Selecciona método de pago"
                          >
                            {tenantInfo?.acceptPagoMovil !== false && <IonSelectOption value="PAGO_MOVIL">📲 Pago Móvil</IonSelectOption>}
                            {tenantInfo?.acceptTransfer && <IonSelectOption value="TRANSFER">🏦 Transferencia Bancaria</IonSelectOption>}
                            {tenantInfo?.acceptBinance && <IonSelectOption value="BINANCE">🟡 Binance Pay (USDT)</IonSelectOption>}
                            {minDepositPercentage === 0 && tenantInfo?.acceptCashUsd !== false && (
                              <IonSelectOption value="CASH">💵 Pagar en Efectivo (Al asistir)</IonSelectOption>
                            )}
                          </IonSelect>
                        </IonItem>
                      </div>

                      {/* Bank Coordinates */}
                      {bookingPaymentMethod !== 'CASH' && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '12px', color: '#334155' }}>
                          <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonIcon icon={businessOutline} /> 
                            {bookingPaymentMethod === 'PAGO_MOVIL' && 'Datos para Pago Móvil:'}
                            {bookingPaymentMethod === 'TRANSFER' && 'Datos de Cuenta Bancaria:'}
                            {bookingPaymentMethod === 'BINANCE' && 'Datos Binance Pay:'}
                          </div>

                          {bookingPaymentMethod === 'PAGO_MOVIL' && (
                            <div>
                              {tenantInfo?.bankInfo && <div><strong>Banco:</strong> {tenantInfo.bankInfo}</div>}
                              {tenantInfo?.companyPhone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0' }}>
                                  <span><strong>Teléfono:</strong> {tenantInfo.companyPhone}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(tenantInfo.companyPhone, 'Teléfono')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {tenantInfo?.companyCedula && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span><strong>Cédula/RIF:</strong> {tenantInfo.companyCedula}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(tenantInfo.companyCedula, 'Cédula')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                                  </IonButton>
                                </div>
                              )}
                            </div>
                          )}

                          {bookingPaymentMethod === 'TRANSFER' && (
                            <div>
                              {tenantInfo?.bankInfo && <div><strong>Banco:</strong> {tenantInfo.bankInfo}</div>}
                              {tenantInfo?.companyAccountHolder && <div><strong>Titular:</strong> {tenantInfo.companyAccountHolder}</div>}
                              {tenantInfo?.companyCedula && <div><strong>Cédula/RIF:</strong> {tenantInfo.companyCedula}</div>}
                              {tenantInfo?.companyAccountNumber && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0' }}>
                                  <span style={{ wordBreak: 'break-all' }}><strong>Cuenta:</strong> {tenantInfo.companyAccountNumber}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(tenantInfo.companyAccountNumber, 'Número de cuenta')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                                  </IonButton>
                                </div>
                              )}
                            </div>
                          )}

                          {bookingPaymentMethod === 'BINANCE' && (
                            <div>
                              {tenantInfo?.binancePayId && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0' }}>
                                  <span><strong>Binance Pay ID:</strong> {tenantInfo.binancePayId}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(tenantInfo.binancePayId, 'Binance Pay ID')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {tenantInfo?.binanceEmail && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span><strong>Email:</strong> {tenantInfo.binanceEmail}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(tenantInfo.binanceEmail, 'Binance Email')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                                  </IonButton>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Type of payment: Full vs Deposit (if electronic) */}
                      {bookingPaymentMethod !== 'CASH' && (
                        <>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <IonButton 
                              size="small" 
                              fill={bookingPaymentOption === 'FULL' ? 'solid' : 'outline'} 
                              color="primary"
                              style={{ flex: 1, margin: 0, fontSize: '11px', fontWeight: 'bold' }}
                              onClick={() => {
                                setBookingPaymentOption('FULL');
                                setBookingPaymentAmount(totalServicePrice.toString());
                              }}
                            >
                              Pago Completo (${totalServicePrice.toFixed(2)})
                            </IonButton>
                            <IonButton 
                              size="small" 
                              fill={bookingPaymentOption === 'DEPOSIT' ? 'solid' : 'outline'} 
                              color="primary"
                              style={{ flex: 1, margin: 0, fontSize: '11px', fontWeight: 'bold' }}
                              onClick={() => {
                                setBookingPaymentOption('DEPOSIT');
                                const minPct = minDepositPercentage > 0 ? minDepositPercentage : 30;
                                const minDep = Math.round((totalServicePrice * (minPct / 100)) * 100) / 100;
                                setBookingPaymentAmount(minDep.toString());
                              }}
                            >
                              Abono / Seña
                            </IonButton>
                          </div>

                          {/* Amount to report */}
                          <div style={{ marginBottom: '12px' }}>
                            <IonLabel style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                              Monto a pagar (USD):
                            </IonLabel>
                            <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                              <IonInput 
                                type="number"
                                value={bookingPaymentAmount}
                                disabled={bookingPaymentOption === 'FULL'}
                                onIonInput={e => setBookingPaymentAmount(e.detail.value!)}
                                placeholder="0.00"
                              />
                            </IonItem>
                            {parseFloat(bookingPaymentAmount) > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                                Equivalente: <strong>Bs. {(parseFloat(bookingPaymentAmount) * rateBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                              </div>
                            )}
                          </div>

                          {/* Reference Number - MANDATORY */}
                          <div style={{ marginBottom: '12px' }}>
                            <IonLabel style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                              Número de Referencia / Comprobante: <span style={{ color: '#ef4444' }}>* (Obligatorio)</span>
                            </IonLabel>
                            <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                              <IonInput 
                                value={bookingPaymentRef}
                                placeholder="Ej. 12345678"
                                onIonInput={e => setBookingPaymentRef(e.detail.value!)}
                              />
                            </IonItem>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Ingresa los dígitos de la referencia de tu pago móvil, transferencia o billetera.
                            </div>
                          </div>

                          {/* Payment Notes */}
                          <div style={{ marginBottom: '10px' }}>
                            <IonLabel style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                              Observación del pago (Opcional):
                            </IonLabel>
                            <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                              <IonInput 
                                value={bookingPaymentNotes}
                                placeholder="Ej. Pago desde Banco Provincial a nombre de..."
                                onIonInput={e => setBookingPaymentNotes(e.detail.value!)}
                              />
                            </IonItem>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <IonButton expand="block" color="primary" onClick={handleSubmit} style={{ height: '50px', fontWeight: 'bold' }}>
                    CONFIRMAR CITA
                  </IonButton>
                </div>
              )}

            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>

      <IonModal isOpen={showCatalog} onDidDismiss={() => setShowCatalog(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Portafolio y Trabajos</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowCatalog(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ backgroundColor: '#f8fafc' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', overflowX: 'auto', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setPortfolioTab('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: portfolioTab === 'ALL' ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                backgroundColor: portfolioTab === 'ALL' ? '#eff6ff' : '#f8fafc',
                color: portfolioTab === 'ALL' ? 'var(--ion-color-primary)' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Todos ({catalogItems.length})
            </button>
            <button
              onClick={() => setPortfolioTab('SERVICE')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: portfolioTab === 'SERVICE' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: portfolioTab === 'SERVICE' ? '#dbeafe' : '#f8fafc',
                color: portfolioTab === 'SERVICE' ? '#1d4ed8' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              💅 Servicios ({catalogItems.filter(i => i.type === 'service').length})
            </button>
            <button
              onClick={() => setPortfolioTab('WORK')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: portfolioTab === 'WORK' ? '2px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: portfolioTab === 'WORK' ? '#d1fae5' : '#f8fafc',
                color: portfolioTab === 'WORK' ? '#047857' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ✨ Trabajos Realizados ({catalogItems.filter(i => i.type === 'work').length})
            </button>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', padding: '12px' }}>
            {catalogItems
              .filter(item => {
                if (portfolioTab === 'SERVICE') return item.type === 'service';
                if (portfolioTab === 'WORK') return item.type === 'work';
                return true;
              })
              .map(item => (
                <IonCard key={item.id} style={{ margin: 0, padding: 0, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={item.url} 
                      style={{ width: '100%', height: '150px', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} 
                      alt={item.title} 
                      onClick={() => openImage(item.url, `${item.title}${item.subtitle ? ' - ' + item.subtitle : ''}`)}
                      title="Toca para ver en grande"
                    />
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: item.type === 'service' ? 'rgba(37, 99, 235, 0.92)' : 'rgba(5, 150, 105, 0.92)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 2,
                    }}>
                      {item.type === 'service' ? '💅 Servicio' : '✨ Trabajo'}
                    </div>
                  </div>
                  <IonCardContent style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', lineHeight: '1.3' }}>{item.title}</h3>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{item.subtitle}</p>
                    </div>
                    {item.type === 'service' && item.productId && (
                      <IonButton 
                        size="small" 
                        expand="block" 
                        color="primary"
                        style={{ marginTop: '10px', fontSize: '11px', fontWeight: 'bold', height: '32px' }}
                        onClick={() => {
                          const svc = availableServices.find((s: any) => s.id === item.productId);
                          if (svc) {
                            setSelectedServices(prev => {
                              if (prev.some(s => s.id === svc.id)) return prev;
                              return [...prev, svc];
                            });
                          }
                          setShowCatalog(false);
                          setStep(1);
                        }}
                      >
                        {selectedServices.some(s => s.id === item.productId) ? '✓ Agregado' : '+ Agregar a mi cita'}
                      </IonButton>
                    )}
                  </IonCardContent>
                </IonCard>
              ))}
          </div>

          {catalogItems.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <IonIcon icon={imagesOutline} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Aún no hay trabajos ni servicios en el portafolio.</p>
            </div>
          )}

          <IonInfiniteScroll onIonInfinite={loadMoreCatalog} disabled={!hasMoreCatalog}>
            <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más..." />
          </IonInfiniteScroll>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default PublicBooking;
