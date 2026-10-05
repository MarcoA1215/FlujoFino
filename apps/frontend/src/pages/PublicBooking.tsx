import React, { useState, useEffect, useMemo } from 'react';
import { IonPage, IonContent, IonCard, IonCardContent, IonInput, IonLabel, IonItem, IonButton, useIonToast, IonSpinner, IonIcon, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  checkmarkCircleOutline, 
  timeOutline, 
  chevronBackOutline, 
  chevronForwardOutline,
  imagesOutline, 
  personOutline, 
  sparklesOutline,
  copyOutline,
  walletOutline,
  businessOutline,
  cartOutline,
  logoWhatsapp,
  calendarOutline,
  calendarNumberOutline,
  flashOutline
} from 'ionicons/icons';
import { useImageViewer } from '../context/ImageViewerContext';
import { requestAndSubscribePush } from '../services/push-notification.service';
import { BankSelect } from '../components/BankSelect';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatStaffName = (name?: string): string => {
  if (!name) return '';
  return name.replace(/[-_]?(admin|operativo|pos|delivery)$/i, '').replace(/[._]/g, ' ').trim() || name;
};

const PublicBooking: React.FC = () => {
  const { openImage } = useImageViewer();
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
  const [bookingOriginBank, setBookingOriginBank] = useState<string>('');

  const rateBs = Number(tenantInfo?.exchangeRateBs || 40.0);
  const minDepositPercentage = Number(tenantInfo?.minDepositPercentage || 0);

  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState<boolean>(false);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      presentToast({ message: `${label} copiado al portapapeles`, duration: 2000, color: 'success' });
    }
  };

  const copyAllPagoMovil = () => {
    if (!tenantInfo) return;
    const payAmtNum = parseFloat(bookingPaymentAmount) || 0;
    const amountBs = payAmtNum > 0 ? (Math.round(payAmtNum * rateBs * 100) / 100).toFixed(2) : '';
    const lines = [
      tenantInfo.bankInfo ? `Banco: ${tenantInfo.bankInfo}` : '',
      tenantInfo.companyCedula ? `Cédula: ${tenantInfo.companyCedula}` : '',
      tenantInfo.companyPhone ? `Teléfono: ${tenantInfo.companyPhone}` : '',
      amountBs ? `Monto: Bs. ${amountBs}` : '',
    ].filter(Boolean).join('\n');
    copyToClipboard(lines, 'Datos de Pago Móvil');
  };

  const handleUploadPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${apiBase}/public/reservations/appointment/upload-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.url) {
        setPaymentProofUrl(res.data.url);
        presentToast({ message: 'Comprobante adjuntado con éxito', duration: 2500, color: 'success' });
      }
    } catch (err) {
      console.error(err);
      presentToast({ message: 'Error al subir comprobante', duration: 3000, color: 'danger' });
    } finally {
      setUploadingProof(false);
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
        setErrorMsg(null);
        const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}`);
        if (res.data?.isSuspended) {
          setTenantInfo(res.data);
          setLoading(false);
          return;
        }
        if (res.data.featureCustomerSchedules === false) {
          setErrorMsg('El sistema de citas y reservaciones se encuentra temporalmente desactivado');
          setLoading(false);
          return;
        }
        setTenantInfo(res.data);
        
        // If business is pure retail/recipes without customer schedules, redirect to online store (if catalog is active)
        if ((res.data.featureBuySell || res.data.featureRecipes) && res.data.featureShowCatalog !== false && !res.data.featureCustomerSchedules) {
          window.location.replace(`/store/${tenantId}`);
          return;
        }

        // Select first active payment method dynamically
        const minDep = Number(res.data.minDepositPercentage || 0);
        let defaultMethod = 'PAGO_MOVIL';
        if (res.data.acceptPagoMovil !== false) {
          defaultMethod = 'PAGO_MOVIL';
        } else if (res.data.acceptTransfer === true) {
          defaultMethod = 'TRANSFER';
        } else if (res.data.acceptBinance === true) {
          defaultMethod = 'BINANCE';
        } else if (minDep === 0 && res.data.acceptCashUsd !== false) {
          defaultMethod = 'CASH';
        }
        setBookingPaymentMethod(defaultMethod);

        // If require service is NOT enabled, skip step 1 directly to date/time selection (step 2)
        if (res.data.bookingRequireService === false) {
          setStep(2);
        } else {
          setStep(1);
        }
      } catch (e: any) {
        setErrorMsg(e.response?.data?.message || 'Error cargando información');
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
        if (payNum > totalServicePrice) {
          presentToast({ 
            message: `El monto a pagar no puede superar el total del servicio ($${totalServicePrice.toFixed(2)})`, 
            duration: 3500, 
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
        date: (selectedDate ? formatDateLocal(selectedDate) : undefined), 
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
        paymentProofUrl: paymentProofUrl || undefined,
        paymentNotes: totalServicePrice > 0 ? (
          [
            bookingOriginBank ? `Banco origen: ${bookingOriginBank}` : '',
            bookingPaymentNotes.trim()
          ].filter(Boolean).join(' | ') || undefined
        ) : undefined,
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

      // Web Push notification subscription
      const identifier = customerPhone || identification;
      if (identifier) {
        requestAndSubscribePush(identifier.trim(), tenantId).catch((e) =>
          console.warn('Web push subscription failed:', e),
        );
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error procesando tu reservación. Intenta de nuevo.';
      presentToast({ message: msg, duration: 3000, color: 'danger' });
    }
  };

  const maxAdvanceDays = Number(tenantInfo?.bookingMaxAdvanceDays || 365);
  const [dateViewMode, setDateViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [visibleDaysCount, setVisibleDaysCount] = useState<number>(14);

  const todayMidnight = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const maxBookingDate = useMemo(() => {
    const m = new Date();
    m.setDate(m.getDate() + maxAdvanceDays);
    m.setHours(23, 59, 59, 999);
    return m;
  }, [maxAdvanceDays]);

  const isDateOpen = (d: Date): boolean => {
    const bHours = tenantInfo?.businessHours || {};
    if (Object.keys(bHours).length === 0) return true;
    const dayStr = d.getDay().toString();
    const dayConfig = bHours[dayStr];
    return !!(dayConfig && dayConfig.isOpen);
  };

  const getUpcomingDates = (count: number) => {
    const dates: Date[] = [];
    let dayOffset = 0;
    while (dates.length < count && dayOffset <= maxAdvanceDays) {
      const d = new Date(todayMidnight);
      d.setDate(todayMidnight.getDate() + dayOffset);
      if (isDateOpen(d)) {
        dates.push(d);
      }
      dayOffset++;
    }
    return dates;
  };

  const currentMonthLabel = useMemo(() => {
    const raw = calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [calendarMonth]);

  const canGoPrevMonth = useMemo(() => {
    const currentMonthStart = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), 1);
    const viewMonthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    return viewMonthStart.getTime() > currentMonthStart.getTime();
  }, [calendarMonth, todayMidnight]);

  const canGoNextMonth = useMemo(() => {
    const maxMonthStart = new Date(maxBookingDate.getFullYear(), maxBookingDate.getMonth(), 1);
    const viewMonthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    return viewMonthStart.getTime() < maxMonthStart.getTime();
  }, [calendarMonth, maxBookingDate]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    if (selectedDate) {
      setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const daysArray: ({
      dayNumber: number;
      date: Date;
      isOpen: boolean;
      isPast: boolean;
      isTooFar: boolean;
      isToday: boolean;
      isSelected: boolean;
    } | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      daysArray.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      const isPast = dateObj.getTime() < todayMidnight.getTime();
      const isTooFar = dateObj.getTime() > maxBookingDate.getTime();
      const isOpen = isDateOpen(dateObj);
      const isToday = dateObj.getTime() === todayMidnight.getTime();
      const isSelected = selectedDate ? formatDateLocal(dateObj) === formatDateLocal(selectedDate) : false;

      daysArray.push({
        dayNumber: d,
        date: dateObj,
        isOpen,
        isPast,
        isTooFar,
        isToday,
        isSelected
      });
    }

    return daysArray;
  }, [calendarMonth, todayMidnight, maxBookingDate, tenantInfo?.businessHours, selectedDate]);

  const handleDirectDateChange = (val: string) => {
    if (!val) return;
    const [year, month, day] = val.split('-').map(Number);
    const pickedDate = new Date(year, month - 1, day);
    pickedDate.setHours(0, 0, 0, 0);

    if (pickedDate < todayMidnight) {
      presentToast({ message: 'No puedes reservar en fechas pasadas.', duration: 2500, color: 'warning' });
      return;
    }
    if (pickedDate > maxBookingDate) {
      presentToast({
        message: `Solo se permiten reservas con hasta ${maxAdvanceDays} días de anticipación.`,
        duration: 3000,
        color: 'warning'
      });
      return;
    }
    if (!isDateOpen(pickedDate)) {
      const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
      presentToast({
        message: `El local no atiende los ${dayNames[pickedDate.getDay()]}. Por favor elige otro día disponible.`,
        duration: 3500,
        color: 'warning'
      });
      return;
    }

    setSelectedDate(pickedDate);
    setStep(3);
  };

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !tenantId) return;
      setLoadingSlots(true);
      try {
        const dStr = formatDateLocal(selectedDate);
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

  const isServiceRequired = tenantInfo?.bookingRequireService !== false;

  // Ensure step 1 is never active if bookingRequireService is disabled
  useEffect(() => {
    if (tenantInfo && !isServiceRequired && step === 1) {
      setStep(2);
    }
  }, [tenantInfo, isServiceRequired, step]);

  if (loading) return <IonPage><IonContent className="ion-padding ion-text-center"><IonSpinner /></IonContent></IonPage>;

  if (tenantInfo?.isSuspended) {
    const rawPhone = tenantInfo?.companyPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('58')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `58${cleanPhone.slice(1)}`
      : cleanPhone;

    const waMsg = encodeURIComponent(
      `Hola, me gustaría consultar información directamente con ${tenantInfo?.name || 'su negocio'}.`
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
              {tenantInfo?.name || 'Negocio'}
            </h2>

            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', margin: '0 0 14px 0' }}>
              Tienda temporalmente en pausa
            </h1>

            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              En este momento {tenantInfo?.name || 'este negocio'} no está recibiendo pedidos en línea. Estaremos de vuelta muy pronto.
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
          </div>
        </IonContent>
      </IonPage>
    );
  }

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
                    <p><b>Especialista:</b> {formatStaffName(selectedStaff.name)}</p>
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
  const hasStore = Boolean(tenantInfo?.hasStore ?? ((tenantInfo?.featureBuySell || tenantInfo?.featureRecipes) && tenantInfo?.featureShowCatalog !== false));
  const companyPhone = tenantInfo?.companyPhone || tenantInfo?.settings?.companyPhone || '';
  const headerColor = tenantInfo?.settings?.themeHeaderColor || '#0f172a';

  const goBack = () => {
    if (step === 2 && isServiceRequired) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };

  return (
    <IonPage>
      {/* Header matching PublicStore */}
      <IonHeader>
        <IonToolbar style={{ ['--background' as any]: headerColor, color: '#fff' }}>
          {step > (isServiceRequired ? 1 : 2) ? (
            <IonButtons slot="start">
              <IonButton fill="clear" onClick={goBack} style={{ color: '#fff' }} title="Regresar">
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            </IonButtons>
          ) : hasStore ? (
            <IonButtons slot="start">
              <IonButton fill="clear" onClick={() => (window.location.href = `/store/${tenantId}`)} style={{ color: '#fff' }} title="Volver a la Tienda">
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            </IonButtons>
          ) : null}
          <IonTitle style={{ fontWeight: 'bold' }}>{tenantInfo?.name || 'Agendar Cita'}</IonTitle>
          <IonButtons slot="end">
            {companyPhone && (
              <IonButton
                fill="clear"
                onClick={() => {
                  let clean = companyPhone.replace(/\D/g, '');
                  if (clean.startsWith('0')) clean = `58${clean.slice(1)}`;
                  window.open(`https://wa.me/${clean}`, '_blank');
                }}
              >
                <IonIcon slot="icon-only" icon={logoWhatsapp} style={{ color: '#25D366', fontSize: '1.5rem' }} />
              </IonButton>
            )}
            {hasStore && (
              <IonButton
                fill="clear"
                onClick={() => (window.location.href = `/store/${tenantId}`)}
                title="Ir al Catálogo / Tienda"
              >
                <IonIcon slot="icon-only" icon={cartOutline} style={{ color: '#fff', fontSize: '1.5rem' }} />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', paddingBottom: '40px' }}>
          
          {/* Banner / Store Info matching PublicStore */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                {tenantInfo?.name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                Reserva de citas y atención personalizada
              </p>
            </div>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.95rem',
              color: '#0f172a'
            }}>
              Tasa BCV: <b>Bs. {rateBs.toFixed(2)}</b>
            </div>
          </div>

          {/* Navigation Switcher matching PublicStore */}
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
                <span>📅</span> Agendar Citas Online
              </button>
            </div>
          )}

          {tenantInfo?.featureShowCatalog && (
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={openCatalog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  border: '1px solid #10B981',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(16,185,129,0.1)'
                }}
              >
                <IonIcon icon={imagesOutline} style={{ fontSize: '16px', color: '#10B981' }} />
                Ver Portafolio de Trabajos
              </button>
            </div>
          )}

          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', padding: '24px' }}>
              
              {/* STEP 1: SERVICES & SPECIALIST */}
              {step === 1 && isServiceRequired && (
                <div>
                  <h3 style={{ fontWeight: '800', marginBottom: '4px', textAlign: 'center', fontSize: '18px', color: '#0F172A' }}>
                    Selecciona tu(s) Servicio(s)
                  </h3>
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>
                    Puedes seleccionar uno o varios servicios para agendarlos en una sola cita
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
                              padding: '14px 16px', 
                              border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0', 
                              backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                              borderRadius: '14px', 
                              marginBottom: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              {svc.image ? (
                                <img 
                                  src={svc.image} 
                                  alt={svc.name} 
                                  onClick={(e) => { e.stopPropagation(); openImage(svc.image, svc.name); }}
                                  title="Toca para ver en grande"
                                  style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid #E2E8F0' }} 
                                />
                              ) : (
                                <div style={{ width: '54px', height: '54px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '20px' }}>
                                  ✨
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: '800', fontSize: '15px', color: '#0F172A' }}>{svc.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <IonIcon icon={timeOutline} style={{ fontSize: '14px', color: '#94A3B8' }} /> 
                                  <span>{svc.durationMinutes} min</span>
                                  {svc.category && svc.category !== 'Servicios' && <span>• {svc.category}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '900', fontSize: '17px', color: '#10B981' }}>
                                ${Number(svc.price).toFixed(2)}
                              </div>
                              {isSelected ? (
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ECFDF5', padding: '3px 8px', borderRadius: '6px' }}>
                                  <IonIcon icon={checkmarkCircleOutline} /> Seleccionado
                                </div>
                              ) : (
                                <div style={{ fontSize: '12px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
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
                                {formatStaffName(st.name)} {st.jobTitle ? `(${st.jobTitle})` : ''}
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

                      <button
                        type="button"
                        disabled={isServiceRequired && selectedServices.length === 0}
                        onClick={() => setStep(2)}
                        style={{
                          width: '100%',
                          marginTop: '20px',
                          padding: '14px 20px',
                          backgroundColor: (isServiceRequired && selectedServices.length === 0) ? '#cbd5e1' : '#10B981',
                          color: (isServiceRequired && selectedServices.length === 0) ? '#64748b' : '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: (isServiceRequired && selectedServices.length === 0) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: (isServiceRequired && selectedServices.length === 0) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>Continuar a Fecha y Hora</span>
                        {selectedServices.length > 0 && (
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
                            {totalDurationMinutes} min
                          </span>
                        )}
                        <span>→</span>
                      </button>
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
                                {formatStaffName(st.name)} {st.jobTitle ? `(${st.jobTitle})` : ''}
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
                  <h3 style={{ fontWeight: '800', marginBottom: '4px', textAlign: 'center', fontSize: '18px', color: '#0F172A' }}>
                    Elige una Fecha
                  </h3>
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
                    Selecciona el día de tu cita para ver los horarios disponibles
                  </p>

                  {selectedServices.length > 0 && (
                    <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                      <div>
                        <b>{selectedServiceNames}</b> • ⏱️ {totalDurationMinutes} min
                        {selectedStaff && <div><span style={{ color: '#64748b' }}>Especialista:</span> <b>{formatStaffName(selectedStaff.name)}</b></div>}
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#10B981', fontSize: '15px' }}>
                        ${totalServicePrice.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Direct Date Picker & Quick Jump Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={calendarNumberOutline} style={{ color: '#10B981', fontSize: '20px' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        ¿Buscas una fecha lejana? Elige aquí:
                      </span>
                    </div>
                    <input
                      type="date"
                      value={selectedDate ? formatDateLocal(selectedDate) : ''}
                      min={formatDateLocal(todayMidnight)}
                      max={formatDateLocal(maxBookingDate)}
                      onChange={(e) => handleDirectDateChange(e.target.value)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* View Mode Toggle: Calendario Mensual vs Próximos Turnos */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '16px',
                    backgroundColor: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setDateViewMode('calendar')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: dateViewMode === 'calendar' ? '#ffffff' : 'transparent',
                        color: dateViewMode === 'calendar' ? '#0f172a' : '#64748b',
                        fontWeight: dateViewMode === 'calendar' ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: dateViewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <IonIcon icon={calendarOutline} /> Vista Calendario
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateViewMode('list')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: dateViewMode === 'list' ? '#ffffff' : 'transparent',
                        color: dateViewMode === 'list' ? '#0f172a' : '#64748b',
                        fontWeight: dateViewMode === 'list' ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: dateViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <IonIcon icon={flashOutline} /> Próximos Turnos
                    </button>
                  </div>

                  {/* VIEW 1: INTERACTIVE MONTHLY CALENDAR */}
                  {dateViewMode === 'calendar' && (
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px',
                      backgroundColor: '#ffffff'
                    }}>
                      {/* Month Navigation */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <button
                          type="button"
                          disabled={!canGoPrevMonth}
                          onClick={handlePrevMonth}
                          aria-label="Mes anterior"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: canGoPrevMonth ? '#f8fafc' : '#f1f5f9',
                            color: canGoPrevMonth ? '#0f172a' : '#cbd5e1',
                            cursor: canGoPrevMonth ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}
                        >
                          <IonIcon icon={chevronBackOutline} />
                        </button>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', textTransform: 'capitalize' }}>
                            {currentMonthLabel}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canGoNextMonth}
                          onClick={handleNextMonth}
                          aria-label="Mes siguiente"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: canGoNextMonth ? '#f8fafc' : '#f1f5f9',
                            color: canGoNextMonth ? '#0f172a' : '#cbd5e1',
                            cursor: canGoNextMonth ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}
                        >
                          <IonIcon icon={chevronForwardOutline} />
                        </button>
                      </div>

                      {/* Weekdays Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(w => (
                          <div key={w} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                            {w}
                          </div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {calendarDays.map((cell, idx) => {
                          if (!cell) {
                            return <div key={`empty-${idx}`} style={{ height: '42px' }} />;
                          }

                          const isAvailable = !cell.isPast && !cell.isTooFar && cell.isOpen;

                          return (
                            <button
                              key={`day-${cell.dayNumber}`}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => {
                                if (isAvailable) {
                                  setSelectedDate(cell.date);
                                  setStep(3);
                                }
                              }}
                              title={
                                cell.isPast ? 'Fecha pasada' :
                                cell.isTooFar ? 'Fuera del rango permitido' :
                                !cell.isOpen ? 'Local cerrado este día' :
                                `Reservar para el ${cell.date.toLocaleDateString()}`
                              }
                              style={{
                                height: '42px',
                                borderRadius: '10px',
                                border: isAvailable 
                                  ? (cell.isSelected ? '2px solid #059669' : '1.5px solid #10B981')
                                  : '1px solid #f1f5f9',
                                backgroundColor: isAvailable
                                  ? (cell.isSelected ? '#10B981' : '#ecfdf5')
                                  : '#f8fafc',
                                color: isAvailable
                                  ? (cell.isSelected ? '#ffffff' : '#065f46')
                                  : '#cbd5e1',
                                fontWeight: isAvailable ? 700 : 500,
                                fontSize: '13px',
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                position: 'relative',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{cell.dayNumber}</span>
                              {cell.isToday && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  backgroundColor: isAvailable ? '#059669' : '#94a3b8'
                                }} />
                              )}
                              {!cell.isOpen && !cell.isPast && !cell.isTooFar && (
                                <span style={{ fontSize: '8px', color: '#94a3b8', lineHeight: 1 }}>Cerrado</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '16px',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '11px',
                        color: '#64748b'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#ecfdf5', border: '1px solid #10B981' }} />
                          Disponible
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }} />
                          Cerrado / No disponible
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 2: LIST OF UPCOMING AVAILABLE DAYS */}
                  {dateViewMode === 'list' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        {getUpcomingDates(visibleDaysCount).map((d, i) => (
                          <div 
                            key={i}
                            onClick={() => { setSelectedDate(d); setStep(3); }}
                            style={{
                              padding: '14px 10px',
                              border: '1.5px solid #10B981',
                              borderRadius: '12px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              fontWeight: '700',
                              fontSize: '13px',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.08)'
                            }}
                          >
                            {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                          </div>
                        ))}
                      </div>

                      {visibleDaysCount < maxAdvanceDays && (
                        <div style={{ textAlign: 'center', marginTop: '14px' }}>
                          <button
                            type="button"
                            onClick={() => setVisibleDaysCount(prev => prev + 14)}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '10px',
                              border: '1px dashed #10B981',
                              backgroundColor: '#ffffff',
                              color: '#065f46',
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            + Ver más fechas (+14 días)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: TIME */}
              {step === 3 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '6px', textAlign: 'center'}}>Horas Disponibles</h3>
                  <div style={{textAlign: 'center', marginBottom: '14px', color: '#64748b', fontSize: '13px'}}>
                    Para el <b>{selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</b> {selectedServices.length > 0 ? `(${totalDurationMinutes} min)` : ''}
                    {selectedStaff && ` con ${formatStaffName(selectedStaff.name)}`}
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
                          padding: '12px 6px',
                          border: '1px solid #10B981',
                          borderRadius: '10px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: '#f0fdf4',
                          color: '#065f46',
                          fontWeight: '600',
                          fontSize: '13px',
                          boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
                          transition: 'all 0.15s ease'
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
                        <>👤 <b>Atendido por:</b> {formatStaffName(selectedStaff.name)} {selectedStaff.jobTitle ? `(${selectedStaff.jobTitle})` : ''}<br/></>
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

                      {/* Type of payment: Full vs Deposit (if electronic) */}
                      {bookingPaymentMethod !== 'CASH' && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
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
                          <div>
                            <IonLabel style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                              Monto a pagar (USD): <span style={{ color: '#64748b', fontWeight: 'normal' }}>(Máx: ${totalServicePrice.toFixed(2)})</span>
                            </IonLabel>
                            <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                              <IonInput 
                                type="number"
                                max={totalServicePrice}
                                min={0}
                                value={bookingPaymentAmount}
                                disabled={bookingPaymentOption === 'FULL'}
                                onIonInput={e => {
                                  const val = e.detail.value || '';
                                  const num = parseFloat(val);
                                  if (!isNaN(num) && num > totalServicePrice) {
                                    setBookingPaymentAmount(totalServicePrice.toString());
                                    presentToast({ message: `El monto no puede superar el total ($${totalServicePrice.toFixed(2)})`, duration: 2500, color: 'warning' });
                                  } else {
                                    setBookingPaymentAmount(val);
                                  }
                                }}
                                placeholder="0.00"
                              />
                            </IonItem>
                            {parseFloat(bookingPaymentAmount) > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                                Equivalente: <strong>Bs. {(Math.round((parseFloat(bookingPaymentAmount) || 0) * rateBs * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bank Coordinates */}
                      {bookingPaymentMethod !== 'CASH' && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '14px', fontSize: '13px', color: '#334155', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                          <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={businessOutline} style={{ color: '#10B981', fontSize: '16px' }} /> 
                            {bookingPaymentMethod === 'PAGO_MOVIL' && 'Datos para Pago Móvil:'}
                            {bookingPaymentMethod === 'TRANSFER' && 'Datos de Cuenta Bancaria:'}
                            {bookingPaymentMethod === 'BINANCE' && 'Datos Binance Pay:'}
                          </div>

                          {bookingPaymentMethod === 'PAGO_MOVIL' && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                                  Datos de Pago Móvil:
                                </span>
                                <button
                                  type="button"
                                  onClick={copyAllPagoMovil}
                                  style={{
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
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
                                  <IonIcon icon={copyOutline} />
                                  Copiar todo
                                </button>
                              </div>
                              {tenantInfo?.bankInfo && <div style={{ marginBottom: '4px' }}><strong>Banco:</strong> {tenantInfo.bankInfo}</div>}
                              {tenantInfo?.companyPhone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span><strong>Teléfono:</strong> {tenantInfo.companyPhone}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(tenantInfo.companyPhone, 'Teléfono')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {tenantInfo?.companyCedula && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span><strong>Cédula/RIF:</strong> {tenantInfo.companyCedula}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(tenantInfo.companyCedula, 'Cédula')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {parseFloat(bookingPaymentAmount) > 0 && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  padding: '10px 12px', 
                                  backgroundColor: '#ecfdf5', 
                                  border: '1.5px solid #10B981', 
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 600 }}>Monto exacto a transferir:</div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#047857' }}>
                                      Bs. {(Math.round((parseFloat(bookingPaymentAmount) || 0) * rateBs * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#059669', marginLeft: '5px' }}>(${parseFloat(bookingPaymentAmount).toFixed(2)})</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard((Math.round((parseFloat(bookingPaymentAmount) || 0) * rateBs * 100) / 100).toFixed(2), 'Monto en Bs.')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 12px',
                                      backgroundColor: '#10B981',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)'
                                    }}
                                  >
                                    <IonIcon icon={copyOutline} style={{ fontSize: '14px' }} />
                                    Copiar Bs
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {bookingPaymentMethod === 'TRANSFER' && (
                            <div>
                              {tenantInfo?.bankInfo && <div style={{ marginBottom: '4px' }}><strong>Banco:</strong> {tenantInfo.bankInfo}</div>}
                              {tenantInfo?.companyAccountHolder && <div style={{ marginBottom: '4px' }}><strong>Titular:</strong> {tenantInfo.companyAccountHolder}</div>}
                              {tenantInfo?.companyCedula && <div style={{ marginBottom: '4px' }}><strong>Cédula/RIF:</strong> {tenantInfo.companyCedula}</div>}
                              {tenantInfo?.companyAccountNumber && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span style={{ wordBreak: 'break-all' }}><strong>Cuenta:</strong> {tenantInfo.companyAccountNumber}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(tenantInfo.companyAccountNumber, 'Número de cuenta')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {parseFloat(bookingPaymentAmount) > 0 && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  padding: '10px 12px', 
                                  backgroundColor: '#ecfdf5', 
                                  border: '1.5px solid #10B981', 
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 600 }}>Monto exacto a transferir:</div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#047857' }}>
                                      Bs. {(Math.round((parseFloat(bookingPaymentAmount) || 0) * rateBs * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard((Math.round((parseFloat(bookingPaymentAmount) || 0) * rateBs * 100) / 100).toFixed(2), 'Monto en Bs.')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 12px',
                                      backgroundColor: '#10B981',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)'
                                    }}
                                  >
                                    <IonIcon icon={copyOutline} style={{ fontSize: '14px' }} />
                                    Copiar Bs
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {bookingPaymentMethod === 'BINANCE' && (
                            <div>
                              {tenantInfo?.binancePayId && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span><strong>Binance Pay ID:</strong> {tenantInfo.binancePayId}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(tenantInfo.binancePayId, 'Binance Pay ID')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {tenantInfo?.binanceEmail && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                  <span><strong>Email:</strong> {tenantInfo.binanceEmail}</span>
                                  <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(tenantInfo.binanceEmail, 'Binance Email')}>
                                    <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                                  </IonButton>
                                </div>
                              )}
                              {parseFloat(bookingPaymentAmount) > 0 && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  padding: '10px 12px', 
                                  backgroundColor: '#fef9c3', 
                                  border: '1.5px solid #eab308', 
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#854d0e', fontWeight: 600 }}>Monto a transferir en USDT:</div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#a16207' }}>
                                      ${parseFloat(bookingPaymentAmount).toFixed(2)} USDT
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(parseFloat(bookingPaymentAmount).toFixed(2), 'Monto USDT')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '6px 12px',
                                      backgroundColor: '#ca8a04',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <IonIcon icon={copyOutline} style={{ fontSize: '14px' }} />
                                    Copiar USDT
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {bookingPaymentMethod !== 'CASH' && (
                        <>
                          {(bookingPaymentMethod === 'PAGO_MOVIL' || bookingPaymentMethod === 'TRANSFER') && (
                            <div style={{ marginBottom: '12px' }}>
                              <BankSelect
                                label="Banco Emisor / Origen (Desde donde pagas)"
                                value={bookingOriginBank}
                                onChange={val => setBookingOriginBank(val)}
                                placeholder="Selecciona tu banco de origen..."
                              />
                            </div>
                          )}

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
                          <div style={{ marginBottom: '12px' }}>
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

                          {/* Adjuntar comprobante / foto opcional */}
                          <div style={{ marginBottom: '14px', background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                            <IonLabel style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                              📸 Captura o Foto del Comprobante (Opcional):
                            </IonLabel>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleUploadPaymentProof} 
                              style={{ fontSize: '12px', width: '100%' }}
                            />
                            {uploadingProof && (
                              <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '6px' }}>
                                ⏳ Subiendo imagen del comprobante...
                              </div>
                            )}
                            {paymentProofUrl && (
                              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px', fontWeight: 'bold' }}>
                                ✅ Comprobante adjuntado con éxito
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    style={{
                      width: '100%',
                      marginTop: '20px',
                      padding: '16px 20px',
                      backgroundColor: '#10B981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>✓ CONFIRMAR CITA</span>
                  </button>
                </div>
              )}

            </div>
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
              💅 Servicios ({catalogItems.filter(i => i.type === 'service' || i.productId).length})
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
                if (portfolioTab === 'SERVICE') return item.type === 'service' || item.productId || item.type === 'work';
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
                      {item.type === 'service' ? '💅 Servicio Disponible' : '✨ Trabajo Realizado'}
                    </div>
                  </div>
                  <IonCardContent style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', lineHeight: '1.3' }}>{item.title}</h3>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{item.subtitle}</p>
                    </div>
                    {item.productId && isServiceRequired && (
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
