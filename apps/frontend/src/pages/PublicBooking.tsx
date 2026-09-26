import React, { useState, useEffect, useMemo } from 'react';
import { IonPage, IonContent, IonCard, IonCardContent, IonInput, IonLabel, IonItem, IonButton, useIonToast, IonSpinner, IonIcon, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { checkmarkCircleOutline, timeOutline, chevronBackOutline, imagesOutline, personOutline, sparklesOutline } from 'ionicons/icons';
import { useImageViewer } from '../context/ImageViewerContext';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PublicBooking: React.FC = () => {
  const { openImage } = useImageViewer();
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Specialists available specifically for the currently selected service
  const availableStaffForService = useMemo(() => {
    if (!tenantInfo?.staff || !tenantInfo?.bookingAllowStaffSelection || !selectedService) return [];
    const assigned = selectedService.assignedStaffIds;
    if (Array.isArray(assigned) && assigned.length > 0) {
      return tenantInfo.staff.filter((st: any) => assigned.includes(st.id));
    } else if (typeof assigned === 'string' && (assigned as string).trim().length > 0) {
      const ids = (assigned as string).split(',').map((s: string) => s.trim()).filter(Boolean);
      return tenantInfo.staff.filter((st: any) => ids.includes(st.id));
    }
    // If no specific staff is restricted, all staff in tenant can perform it
    return tenantInfo.staff;
  }, [tenantInfo?.staff, tenantInfo?.bookingAllowStaffSelection, selectedService]);

  // When selected service changes, reset staff if current staff cannot do this service
  useEffect(() => {
    if (selectedStaff && availableStaffForService.length > 0) {
      const isStillAvailable = availableStaffForService.some((st: any) => st.id === selectedStaff.id);
      if (!isStillAvailable) {
        setSelectedStaff(null);
      }
    }
  }, [selectedService, availableStaffForService]);

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
        
        // If business is pure retail/buy-sell without customer schedules, redirect to online store
        if (res.data.featureBuySell && !res.data.featureCustomerSchedules) {
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

    try {
      const res = await axios.post(`${apiBase}/public/reservations/${tenantId}`, {
        customerName, 
        customerPhone, 
        identification: identification || undefined,
        date: (selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined), 
        time: selectedTime, 
        numberOfPeople: (tenantInfo?.bookingRequireService || selectedService) ? 1 : numberOfPeople, 
        notes,
        referralSource,
        serviceId: selectedService?.id,
        serviceName: selectedService?.name,
        employeeId: selectedStaff?.id || undefined,
        employeeName: selectedStaff?.name || undefined,
        totalAmount: selectedService?.price || 0
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
        const sId = selectedService ? `&serviceId=${selectedService.id}` : '';
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
  }, [selectedDate, selectedService, selectedStaff, tenantId]);

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
                  {selectedService && <p><b>Servicio:</b> {selectedService.name}</p>}
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

  const goBack = () => {
    if (step === 2 && (tenantInfo?.bookingRequireService || selectedService || (tenantInfo?.services && tenantInfo.services.length > 0))) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };

  const hasServices = tenantInfo?.services && tenantInfo.services.length > 0;
  const isServiceRequired = tenantInfo?.bookingRequireService;

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
        <div style={{ maxWidth: '500px', margin: '20px auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            {step > 1 && (step !== 2 || hasServices || isServiceRequired) && (
              <IonButton fill="clear" onClick={goBack} style={{ margin: 0 }}>
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            )}
            <h2 style={{ fontWeight: 'bold', color: '#333', margin: '0 auto', paddingRight: (step > 1 && (step !== 2 || hasServices || isServiceRequired)) ? '48px' : '0' }}>
              {tenantInfo?.name}
            </h2>
          </div>

          {tenantInfo?.featureShowCatalog && (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <IonButton fill="outline" color="primary" onClick={openCatalog}>
                <IonIcon slot="start" icon={imagesOutline} />
                Ver Portafolio de Trabajos
              </IonButton>
            </div>
          )}

          {/* Navigation Switcher if Business has both Booking & Store */}
          {tenantInfo?.featureBuySell && (
            <div
              style={{
                display: 'flex',
                backgroundColor: '#e2e8f0',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '16px',
                gap: '4px',
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cbd5e1')}
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

          <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <IonCardContent style={{ padding: '20px' }}>
              
              {/* STEP 1: SERVICES & SPECIALIST */}
              {step === 1 && (
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '4px', textAlign: 'center', fontSize: '18px' }}>
                    {isServiceRequired ? 'Elige tu Servicio' : 'Selecciona un Servicio (Opcional)'}
                  </h3>
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
                    {isServiceRequired 
                      ? 'Escoge el tratamiento o atención que deseas agendar' 
                      : 'Elige un servicio o avanza directamente para reservar'}
                  </p>

                  {/* Services List */}
                  {hasServices ? (
                    <div>
                      {tenantInfo.services.map((svc: any) => {
                        const isSelected = selectedService?.id === svc.id;
                        return (
                          <div 
                            key={svc.id} 
                            onClick={() => {
                              setSelectedService(svc);
                              setSelectedTime('');
                            }}
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
                              {isSelected && (
                                <div style={{ fontSize: '11px', color: 'var(--ion-color-success)', fontWeight: 'bold', marginTop: '2px' }}>
                                  Seleccionado
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Specialist Selection: Exclusively shown once a service is selected */}
                      {selectedService && tenantInfo?.bookingAllowStaffSelection && availableStaffForService.length > 0 && (
                        <div style={{ marginTop: '16px', marginBottom: '8px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={personOutline} color="primary" />
                            ¿Con quién deseas atenderte para {selectedService.name}?
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                            {selectedService.assignedStaffIds && (Array.isArray(selectedService.assignedStaffIds) ? selectedService.assignedStaffIds.length > 0 : String(selectedService.assignedStaffIds).trim().length > 0)
                              ? 'Personal especialista capacitado para este servicio:'
                              : 'Personal disponible:'}
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

                      <IonButton 
                        expand="block" 
                        color="primary" 
                        disabled={isServiceRequired && !selectedService}
                        onClick={() => setStep(2)}
                        style={{ marginTop: '16px', height: '48px', fontWeight: 'bold' }}
                      >
                        Continuar a Fecha y Hora
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
                  
                  {selectedService && (
                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{selectedService.name}</b> • ⏱️ {selectedService.durationMinutes} min
                        {selectedStaff && <div><span style={{ color: '#64748b' }}>Especialista:</span> <b>{selectedStaff.name}</b></div>}
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--ion-color-primary)', fontSize: '15px' }}>
                        ${Number(selectedService.price).toFixed(2)}
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
                    Para el <b>{selectedDate?.toLocaleDateString()}</b>
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
                      {selectedService && (
                        <>
                          💅 <b>Servicio:</b> {selectedService.name} (⏱️ {selectedService.durationMinutes} min)<br/>
                          💰 <b>Inversión:</b> ${Number(selectedService.price).toFixed(2)}<br/>
                        </>
                      )}
                      {selectedStaff && (
                        <>👤 <b>Atendido por:</b> {selectedStaff.name} {selectedStaff.jobTitle ? `(${selectedStaff.jobTitle})` : ''}<br/></>
                      )}
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
                  {!isServiceRequired && !selectedService && (
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
            <IonTitle>Portafolio / Catálogo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowCatalog(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ backgroundColor: '#f4f5f8' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', padding: '10px' }}>
            {catalogItems.map(item => (
              <IonCard key={item.id} style={{ margin: 0, padding: 0 }}>
                <img 
                  src={item.url} 
                  style={{ width: '100%', height: '150px', objectFit: 'cover', cursor: 'zoom-in' }} 
                  alt={item.title} 
                  onClick={() => openImage(item.url, `${item.title}${item.subtitle ? ' - ' + item.subtitle : ''}`)}
                  title="Toca para ver en grande"
                />
                <IonCardContent style={{ padding: '10px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold', lineHeight: '1.2' }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{item.subtitle}</p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
          {catalogItems.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Aún no hay trabajos en el portafolio.
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
