import React, { useState, useEffect } from 'react';
import { 
  IonPage, 
  IonContent, 
  IonSpinner, 
  IonCard, 
  IonCardContent, 
  IonButton, 
  IonIcon, 
  useIonToast, 
  useIonAlert,
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonTextarea,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonInput,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { 
  calendarOutline, 
  closeCircleOutline, 
  timeOutline, 
  checkmarkCircleOutline, 
  walletOutline,
  cardOutline,
  copyOutline,
  cashOutline,
  businessOutline,
  closeOutline,
  shareSocialOutline,
  checkmarkOutline,
  sparklesOutline,
  linkOutline,
  logoWhatsapp
} from 'ionicons/icons';
import axios from 'axios';
import { BankSelect } from '../components/BankSelect';
import { CustomerNotificationPrompt } from '../components/CustomerNotificationPrompt';
import { getContrastColor, ensureReadableColor } from '../utils/colors';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PublicAppointmentManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Payment reporting states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PAGO_MOVIL');
  const [paymentOriginBank, setPaymentOriginBank] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const location = useLocation();
  const isNewBooking = new URLSearchParams(location.search).get('new') === '1';
  const [isCopied, setIsCopied] = useState(false);

  const primaryColor = appointment?.themePrimaryColor || '#10b981';
  const headerColor = appointment?.themeHeaderColor || primaryColor;
  const headerContrast = getContrastColor(headerColor);
  const primaryContrast = getContrastColor(primaryColor);
  const primaryReadable = ensureReadableColor(primaryColor);
  const primarySoftBg = (primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`) + '18';
  const companyLogoUrl = appointment?.companyLogoUrl || null;
  const logoShape = appointment?.logoShape || appointment?.settings?.logoShape || 'ROUNDED';
  const logoFit = appointment?.logoFit || appointment?.settings?.logoFit || 'contain';

  useEffect(() => {
    if (appointment) {
      const pColor = appointment?.themePrimaryColor || '#10b981';
      const hColor = appointment?.themeHeaderColor || pColor;
      const pContrast = getContrastColor(pColor);
      const hContrast = getContrastColor(hColor);
      const pReadable = ensureReadableColor(pColor);

      document.documentElement.style.setProperty('--theme-primary', pColor);
      document.documentElement.style.setProperty('--theme-primary-contrast', pContrast);
      document.documentElement.style.setProperty('--theme-primary-readable', pReadable);
      document.documentElement.style.setProperty('--theme-header', hColor);
      document.documentElement.style.setProperty('--theme-header-contrast', hContrast);
      document.documentElement.style.setProperty('--ion-color-primary', pColor);
      document.documentElement.style.setProperty('--ion-color-primary-contrast', pContrast);
    }
  }, [appointment]);

  const fetchAppointment = async () => {
    try {
      const res = await axios.get(`${apiBase}/public/reservations/appointment/${id}`);
      setAppointment(res.data);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setAppointment(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  useEffect(() => {
    if (isNewBooking) {
      presentToast({
        message: '🎉 ¡Cita agendada con éxito! Guarda o comparte tu enlace.',
        duration: 4000,
        color: 'success',
      });
    }
  }, [isNewBooking]);

  const appointmentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/appointment/${id}`
    : `https://www.finowork.com/appointment/${id}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(appointmentUrl);
      setIsCopied(true);
      presentToast({
        message: '¡Enlace de tu cita copiado al portapapeles!',
        duration: 2500,
        color: 'success',
      });
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleShareLink = async () => {
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: `Cita en ${appointment?.tenantName || 'FinoWork'}`,
          text: `Consulta o gestiona los detalles de mi cita (${appointment?.date || ''} - ${appointment?.time || ''}):`,
          url: appointmentUrl,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Hola! Aquí tengo el enlace para consultar y gestionar mi cita en ${appointment?.tenantName || 'el negocio'} (${appointment?.date || ''} - ${appointment?.time || ''}):\n${appointmentUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  useEffect(() => {
    if (showReschedule && selectedDate && appointment?.tenantId) {
      const fetchSlots = async () => {
        setLoadingSlots(true);
        try {
          const sId = appointment.serviceId ? `&serviceId=${appointment.serviceId}` : '';
          const res = await axios.get(`${apiBase}/public/reservations/tenant/${appointment.tenantId}/availability?date=${selectedDate}${sId}&exclude=${id}`);
          setAvailableSlots(res.data);
          setSelectedTime('');
        } catch (e) {
          presentToast({ message: 'Error cargando horarios', duration: 2000, color: 'danger' });
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate, showReschedule]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      presentToast({ message: `${label} copiado al portapapeles`, duration: 2000, color: 'success' });
    }
  };

  const openPaymentModal = () => {
    const remaining = Number(appointment?.remainingAmount ?? (appointment?.totalAmount || appointment?.servicePrice || 0));
    if (remaining > 0) {
      setPaymentType('FULL');
      setPaymentAmount(remaining.toFixed(2));
    } else {
      setPaymentType('PARTIAL');
      setPaymentAmount('');
    }
    setPaymentRef('');
    setPaymentNotes('');
    if (appointment?.acceptPagoMovil !== false) {
      setPaymentMethod('PAGO_MOVIL');
    } else if (appointment?.acceptTransfer) {
      setPaymentMethod('TRANSFER');
    } else if (appointment?.acceptBinance) {
      setPaymentMethod('BINANCE');
    } else {
      setPaymentMethod('PAGO_MOVIL');
    }
    setShowPaymentModal(true);
  };

  const handlePaymentTypeChange = (type: 'FULL' | 'PARTIAL') => {
    setPaymentType(type);
    const remaining = Number(appointment?.remainingAmount ?? (appointment?.totalAmount || appointment?.servicePrice || 0));
    if (type === 'FULL' && remaining > 0) {
      setPaymentAmount(remaining.toFixed(2));
    } else {
      const minPercentage = appointment?.minDepositPercentage || 30;
      const minDeposit = Math.round((remaining * (minPercentage / 100)) * 100) / 100;
      setPaymentAmount(minDeposit > 0 ? minDeposit.toFixed(2) : '');
    }
  };

  const handlePaymentSubmit = async () => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      presentToast({ message: 'Ingresa un monto válido mayor a 0', duration: 3000, color: 'warning' });
      return;
    }
    if (!paymentRef.trim()) {
      presentToast({ message: 'Por favor, ingresa el número de referencia del comprobante', duration: 3000, color: 'warning' });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const rate = Number(appointment?.exchangeRateBs || 1);
      const amtBs = Math.round(amt * rate * 100) / 100;
      const combinedNotes = [
        paymentOriginBank ? `Banco origen: ${paymentOriginBank}` : '',
        paymentNotes.trim()
      ].filter(Boolean).join(' | ');

      await axios.post(`${apiBase}/public/reservations/appointment/${id}/payment`, {
        amount: amt,
        amountBs: amtBs,
        method: paymentMethod,
        reference: paymentRef.trim(),
        notes: combinedNotes || undefined
      });

      presentToast({ 
        message: '¡Pago reportado con éxito! Se ha registrado en tu reserva.', 
        duration: 4000, 
        color: 'success' 
      });
      setShowPaymentModal(false);
      setPaymentRef('');
      setPaymentNotes('');
      setPaymentOriginBank('');
      await fetchAppointment();
    } catch (e: any) {
      presentToast({ 
        message: e.response?.data?.message || 'Error al reportar pago', 
        duration: 3500, 
        color: 'danger' 
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancel = () => {
    presentAlert({
      header: 'Cancelar Cita',
      message: '¿Estás seguro de que deseas cancelar esta cita?',
      buttons: [
        { text: 'No, mantener', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            try {
              await axios.put(`${apiBase}/public/reservations/appointment/${id}/cancel`);
              presentToast({ message: 'Cita cancelada con éxito', duration: 3000, color: 'success' });
              fetchAppointment();
            } catch (e: any) {
              presentToast({ message: e.response?.data?.message || 'Error al cancelar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    try {
      await axios.put(`${apiBase}/public/reservations/appointment/${id}/reschedule`, {
        date: selectedDate,
        time: selectedTime
      });
      presentToast({ message: 'Cita reprogramada con éxito', duration: 3000, color: 'success' });
      setShowReschedule(false);
      fetchAppointment();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Error al reprogramar', duration: 3000, color: 'danger' });
    }
  };

  const handleAcceptReschedule = async () => {
    try {
      await axios.put(`${apiBase}/public/reservations/appointment/${id}/accept-reschedule`);
      presentToast({ message: '¡Has confirmado y aceptado el nuevo horario!', duration: 3000, color: 'success' });
      fetchAppointment();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Error al aceptar', duration: 3000, color: 'danger' });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      await axios.post(`${apiBase}/public/reservations/appointment/${id}/feedback`, {
        content: feedbackText,
        clientName: appointment.customerName,
      });
      setFeedbackSent(true);
      presentToast({ message: '¡Gracias por tus comentarios!', duration: 3000, color: 'success' });
    } catch (e: any) {
      presentToast({ message: 'Error al enviar comentarios', duration: 3000, color: 'danger' });
    }
  };

  if (loading) return <IonPage><IonContent className="ion-padding ion-text-center"><IonSpinner /></IonContent></IonPage>;

  if (!appointment) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <h2>Cita no encontrada</h2>
        <p>El enlace es inválido o la cita ya no existe.</p>
      </IonContent>
    </IonPage>
  );

  const isPastOrClosed = appointment.status === 'COMPLETED' || appointment.status === 'CANCELED';
  const totalAmount = Number(appointment.totalAmount || appointment.servicePrice || 0);
  const abonosTotal = Number(appointment.abonosTotal || 0);
  const remainingAmount = Number(appointment.remainingAmount ?? Math.max(0, totalAmount - abonosTotal));
  const rateBs = Number(appointment.exchangeRateBs || 40.0);
  const totalBs = Math.round(totalAmount * rateBs * 100) / 100;
  const remainingBs = Math.round(remainingAmount * rateBs * 100) / 100;
  const isPaidComplete = appointment.paymentStatus === 'PAID';
  const isPartialPaid = appointment.paymentStatus === 'PARTIAL' || (abonosTotal > 0 && !isPaidComplete);


  // Convert current input to Bs for live feedback
  const inputAmt = parseFloat(paymentAmount) || 0;
  const inputAmtBs = Math.round(inputAmt * rateBs * 100) / 100;

  return (
    <IonPage>
      {/* Header */}
      <IonHeader className="ion-no-border" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <IonToolbar style={{ ['--background' as any]: headerColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
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
              {appointment.tenantName || 'Gestión de Cita'}
            </span>
          </div>
          <IonButtons slot="end" style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '8px', flexShrink: 0 }}>
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
              <span>Bs. {rateBs.toFixed(2)}</span>
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ ['--background' as any]: '#F8FAFC' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto', paddingBottom: '40px' }}>
          
          {/* Hero Card / Store Info matching PublicStore & PublicBooking */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '18px 22px',
              marginBottom: '18px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle accent highlight bar on top of card */}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={appointment.tenantName}
                  style={{
                    width: logoShape === 'NATURAL' ? 'auto' : '84px',
                    maxWidth: logoShape === 'NATURAL' ? '160px' : '84px',
                    height: '84px',
                    borderRadius: logoShape === 'CIRCLE' ? '50%' : logoShape === 'NATURAL' ? '12px' : '16px',
                    objectFit: (logoFit === 'cover' ? 'cover' : 'contain') as any,
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                    padding: logoFit === 'contain' ? '4px' : '0',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: logoShape === 'CIRCLE' ? '50%' : '16px',
                    backgroundColor: primarySoftBg,
                    color: primaryReadable,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    border: `1.5px solid ${primaryReadable}30`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    flexShrink: 0,
                  }}
                >
                  📅
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>
                    {appointment.tenantName}
                  </h2>
                  <span
                    style={{
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    ● Verificado
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, margin: '3px 0 0 0' }}>
                  Portal oficial de gestión de cita
                </p>
              </div>
            </div>

            <IonButton
              fill="clear"
              size="small"
              onClick={() => (window.location.href = `/book/${appointment.tenantId}`)}
              style={{ fontWeight: 700, '--color': primaryReadable, fontSize: '13px' }}
            >
              Nueva Cita →
            </IonButton>
          </div>

          {/* Widget / Card: Enlace de tu Cita */}
          <div
            style={{
              backgroundColor: isNewBooking ? '#ECFDF5' : '#ffffff',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '18px',
              border: isNewBooking ? '1.5px solid #10B981' : '1px solid #E2E8F0',
              boxShadow: isNewBooking
                ? '0 4px 16px rgba(16, 185, 129, 0.12)'
                : '0 2px 8px rgba(15, 23, 42, 0.04)',
            }}
          >
            {isNewBooking && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#D1FAE5',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  color: '#065F46',
                }}
              >
                <IonIcon icon={sparklesOutline} style={{ fontSize: '20px', color: '#059669', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  ¡Cita confirmada! Te redirigimos a tu panel para tenerla siempre a mano.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={linkOutline} style={{ fontSize: '18px', color: primaryReadable }} />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                  Enlace de tu Cita
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Acceso Privado
              </span>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              Guarda este enlace en tus favoritos o notas. Podrás consultar el estado, reportar pagos o reprogramar en cualquier momento:
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isNewBooking ? '#ffffff' : '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                marginBottom: '12px',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'monospace',
                }}
                title={appointmentUrl}
              >
                {appointmentUrl}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <IonButton
                fill="solid"
                style={{
                  flex: 1,
                  minWidth: '140px',
                  '--background': isCopied ? '#059669' : primaryColor,
                  '--color': primaryContrast,
                  fontWeight: 700,
                  fontSize: '13px',
                  '--border-radius': '10px',
                  height: '40px',
                }}
                onClick={handleCopyLink}
              >
                <IonIcon slot="start" icon={isCopied ? checkmarkOutline : copyOutline} />
                {isCopied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
              </IonButton>

              <IonButton
                fill="outline"
                style={{
                  flex: 1,
                  minWidth: '110px',
                  '--color': primaryReadable,
                  '--border-color': primaryColor,
                  fontWeight: 600,
                  fontSize: '13px',
                  '--border-radius': '10px',
                  height: '40px',
                }}
                onClick={handleShareLink}
              >
                <IonIcon slot="start" icon={shareSocialOutline} />
                Compartir
              </IonButton>

              <IonButton
                fill="outline"
                style={{
                  '--color': '#16A34A',
                  '--border-color': '#86EFAC',
                  fontWeight: 600,
                  fontSize: '13px',
                  '--border-radius': '10px',
                  height: '40px',
                }}
                onClick={handleShareWhatsApp}
                title="Compartir por WhatsApp"
              >
                <IonIcon slot="icon-only" icon={logoWhatsapp} />
              </IonButton>
            </div>
          </div>

          {!showReschedule ? (
            <IonCard style={{ margin: 0, borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {appointment.status === 'CANCELED' ? (
                    <IonIcon icon={closeCircleOutline} style={{ fontSize: '48px', color: 'var(--ion-color-danger)' }} />
                  ) : appointment.status === 'COMPLETED' ? (
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '48px', color: 'var(--ion-color-success)' }} />
                  ) : (
                    <IonIcon icon={calendarOutline} style={{ fontSize: '48px', color: 'var(--ion-color-primary)' }} />
                  )}
                  <h2 style={{ fontWeight: 'bold', marginTop: '10px', color: '#1e293b', fontSize: '20px' }}>Detalles de tu Cita</h2>
                  
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '4px 14px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    backgroundColor: appointment.status === 'CANCELED' ? '#fee2e2' : '#dcfce7',
                    color: appointment.status === 'CANCELED' ? '#b91c1c' : '#15803d',
                    marginTop: '8px'
                  }}>
                    {appointment.status === 'CONFIRMED' ? 'CONFIRMADA' : appointment.status}
                  </span>
                </div>

                {(appointment.rescheduleStatus === 'PENDING_ACCEPTANCE' || appointment.rescheduleStatus === 'RESCHEDULED_BY_ADMIN') && (
                  <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: 'bold', fontSize: '15px' }}>
                      <IonIcon icon={timeOutline} style={{ fontSize: '20px' }} />
                      Tu cita ha sido reprogramada
                    </div>
                    <p style={{ fontSize: '13px', color: '#7c2d12', margin: '8px 0 8px 0', lineHeight: '1.4' }}>
                      Tu cita que originalmente era el <strong>{appointment.originalDate || appointment.date}</strong> a las <strong>{appointment.originalTime || 'hora anterior'}</strong> ha sido reprogramada para el <strong>{appointment.date}</strong> a las <strong>{appointment.time}</strong>.
                    </p>
                    {appointment.rescheduleReason && (
                      <div style={{ fontSize: '12px', background: '#ffedd5', padding: '6px 10px', borderRadius: '8px', color: '#9a3412', marginBottom: '10px', fontWeight: '500' }}>
                        💬 Motivo: {appointment.rescheduleReason}
                      </div>
                    )}
                    <p style={{ fontSize: '13px', color: '#7c2d12', margin: '0 0 12px 0', fontWeight: '600' }}>
                      ¿Estás de acuerdo con este nuevo horario?
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <IonButton expand="block" color="success" style={{ flex: 1, minWidth: '140px' }} onClick={handleAcceptReschedule}>
                        Aceptar Nuevo Horario ✓
                      </IonButton>
                      <IonButton expand="block" color="warning" fill="outline" style={{ flex: 1, minWidth: '140px' }} onClick={() => setShowReschedule(true)}>
                        Elegir Otro Horario 🗓️
                      </IonButton>
                    </div>
                  </div>
                )}

                {appointment.rescheduleStatus === 'ACCEPTED' && (appointment.originalTime || appointment.originalDate) && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '18px', color: '#16a34a' }} />
                    Horario reprogramado ({appointment.date} a las {appointment.time}) aceptado y confirmado.
                  </div>
                )}

                {/* Appointment Info Box */}
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 10px 0', color: '#334155' }}>
                    <strong style={{ color: '#0f172a' }}>Cliente:</strong> {appointment.customerName}
                  </p>
                  <p style={{ margin: '0 0 10px 0', color: '#334155' }}>
                    <strong style={{ color: '#0f172a' }}>Servicio:</strong> {appointment.serviceName || 'Reserva Estándar'} ({Number(appointment.durationMinutes) || 30} min)
                  </p>
                  {Array.isArray(appointment.serviceSpecialists) && appointment.serviceSpecialists.length > 1 ? (
                    <div style={{ margin: '8px 0 12px 0', background: '#ffffff', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Desglose de Servicios
                      </div>
                      {appointment.serviceSpecialists.map((s: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: idx < appointment.serviceSpecialists.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <span style={{ fontWeight: '600' }}>• {s.serviceName || 'Servicio'} ({s.durationMinutes || 30} min)</span>
                          {s.employeeName && (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                              👤 {s.employeeName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : appointment.employeeName ? (
                    <p style={{ margin: '0 0 10px 0', color: '#334155' }}>
                      <strong style={{ color: '#0f172a' }}>Especialista:</strong> {appointment.employeeName}
                    </p>
                  ) : null}
                  {appointment.rescheduleStatus === 'DELAYED' && (
                    <div style={{ backgroundColor: '#fffbe8', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#92400e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={timeOutline} style={{ fontSize: '16px', color: '#d97706' }} />
                      Horario ajustado por retraso en sala: {appointment.time} {appointment.originalTime ? `(Original: ${appointment.originalTime})` : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                      <IonIcon icon={calendarOutline} style={{ marginRight: '6px', color: 'var(--ion-color-primary)' }}/> {appointment.date}
                    </p>
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                      <IonIcon icon={timeOutline} style={{ marginRight: '6px', color: 'var(--ion-color-primary)' }}/> {appointment.time}
                    </p>
                  </div>
                </div>

                {/* Financial and Payment Section */}
                {(totalAmount > 0 || !isPaidComplete || abonosTotal > 0) && (
                  <div style={{ 
                    backgroundColor: isPaidComplete ? '#f0fdf4' : '#eff6ff', 
                    border: `1px solid ${isPaidComplete ? '#bbf7d0' : '#bfdbfe'}`,
                    padding: '16px', 
                    borderRadius: '12px', 
                    marginBottom: '20px' 
                  }}>
                    {/* Header with Status Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '16px', color: appointment.paymentStatus === 'PAID' ? '#15803d' : '#1d4ed8' }}>
                        <IonIcon icon={walletOutline} style={{ marginRight: '8px', fontSize: '18px' }}/> Inversión & Pago
                      </h3>
                      {appointment.paymentStatus === 'PAID' ? (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '10px' }}>
                          ✅ Verificado y Aprobado
                        </span>
                      ) : (appointment.paymentReported || (appointment.abonosHistory && appointment.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) ? (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '10px' }}>
                          ⏳ En Verificación
                        </span>
                      ) : isPartialPaid ? (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '10px' }}>
                          Abono Registrado
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '10px' }}>
                          Pendiente
                        </span>
                      )}
                    </div>

                    {/* Payment Verification Callout Badge */}
                    <div style={{ marginBottom: '12px' }}>
                      {appointment.paymentStatus === 'PAID' ? (
                        <div style={{
                          backgroundColor: '#ecfdf5',
                          border: '1.5px solid #10b981',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#065f46',
                          fontSize: '13px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ✅ Pago Verificado y Aprobado (${totalAmount.toFixed(2)})
                        </div>
                      ) : (appointment.paymentReported || (appointment.abonosHistory && appointment.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) ? (
                        <div style={{
                          backgroundColor: '#fef3c7',
                          border: '1.5px solid #fcd34d',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#92400e',
                          fontSize: '13px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ⏳ Pago Reportado: En proceso de verificación por el negocio
                        </div>
                      ) : null}
                    </div>

                    {/* Amount & Exchange Rate Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Servicio</span>
                        <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>${totalAmount.toFixed(2)}</span>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          ≈ Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Tasa Oficial (BCV)</span>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>Bs. {rateBs.toFixed(2)}</span>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>por cada $1.00 USD</div>
                      </div>

                      {abonosTotal > 0 && (
                        <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>Abonos Recibidos:</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', marginLeft: '6px', color: '#15803d' }}>${abonosTotal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold' }}>Por Pagar:</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', marginLeft: '6px', color: '#b91c1c' }}>
                              ${remainingAmount.toFixed(2)} (~Bs. {remainingBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bank Info preview */}
                    {(appointment.bankInfo || appointment.companyCedula || appointment.companyPhone || appointment.companyAccountNumber || appointment.binancePayId) && (
                      <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#475569', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={businessOutline} /> Cuentas para Pago / Abono:
                        </div>
                        {appointment.companyPhone && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span><strong>Pago Móvil:</strong> {appointment.bankInfo ? `${appointment.bankInfo} - ` : ''}{appointment.companyPhone} ({appointment.companyCedula})</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(appointment.companyPhone, 'Teléfono')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                        {appointment.companyAccountNumber && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ wordBreak: 'break-all' }}><strong>Cuenta:</strong> {appointment.companyAccountNumber}</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(appointment.companyAccountNumber, 'Número de cuenta')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                        {appointment.binancePayId && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span><strong>Binance Pay:</strong> {appointment.binancePayId}</span>
                            <IonButton fill="clear" size="small" style={{ margin: 0, height: '24px' }} onClick={() => copyToClipboard(appointment.binancePayId, 'Binance Pay ID')}>
                              <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '14px' }} />
                            </IonButton>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Abonos History List */}
                    {appointment.abonosHistory && appointment.abonosHistory.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <IonButton 
                          fill="clear" 
                          size="small" 
                          style={{ textTransform: 'none', padding: 0, fontSize: '12px' }} 
                          onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                        >
                          {showPaymentHistory ? 'Ocultar historial de pagos' : `Ver comprobantes registrados (${appointment.abonosHistory.length})`}
                        </IonButton>
                        {showPaymentHistory && (
                          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {appointment.abonosHistory.map((ab: any, idx: number) => (
                              <div key={ab.id || idx} style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <strong>${Number(ab.amount).toFixed(2)}</strong> {ab.amountBs ? `(~Bs. ${Number(ab.amountBs).toFixed(2)})` : ''} - 
                                  <span style={{ color: '#64748b', marginLeft: '4px' }}>{ab.method} (Ref: {ab.reference})</span>
                                </div>
                                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Report Payment Action Button */}
                    {!isPastOrClosed && !isPaidComplete && (
                      <IonButton 
                        expand="block" 
                        color="success" 
                        style={{ marginTop: '10px', fontWeight: 'bold' }} 
                        onClick={openPaymentModal}
                      >
                        <IonIcon icon={cardOutline} slot="start" />
                        Registrar Abono o Pago Completo
                      </IonButton>
                    )}

                    {isPaidComplete && (
                      <div style={{ textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: 600, padding: '6px 0' }}>
                        🎉 Tu cita se encuentra totalmente pagada.
                      </div>
                    )}
                  </div>
                )}

                {/* Web Push Notification Prompt for Customers */}
                {!isPastOrClosed && (
                  <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                    <CustomerNotificationPrompt
                      tenantId={appointment.tenantId}
                      identifier={appointment.customerPhone || appointment.customerDocument || appointment.customerEmail}
                      type="booking"
                    />
                  </div>
                )}

                {/* Reschedule & Cancel actions */}
                {!isPastOrClosed && (
                  <IonGrid style={{ padding: 0 }}>
                    <IonRow>
                      <IonCol>
                        <IonButton expand="block" color="primary" fill="outline" onClick={() => setShowReschedule(true)}>
                          Reprogramar
                        </IonButton>
                      </IonCol>
                      <IonCol>
                        <IonButton expand="block" color="danger" fill="clear" onClick={handleCancel}>
                          Cancelar Cita
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                )}

                {/* Completed / Past appointments actions */}
                {isPastOrClosed && (
                  <div style={{ marginTop: '20px' }}>
                    <IonButton expand="block" color="primary" fill="outline" onClick={() => window.location.href = `/book/${appointment.tenantId}`}>
                      Reservar de nuevo
                    </IonButton>
                    
                    {!feedbackSent ? (
                      <div style={{ marginTop: '30px', backgroundColor: '#fff', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>¿Qué te pareció el servicio?</h3>
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666' }}>Ayúdanos a mejorar dejándonos un comentario o queja.</p>
                        <IonTextarea 
                          value={feedbackText} 
                          onIonInput={e => setFeedbackText(e.detail.value!)} 
                          placeholder="Escribe tu comentario aquí..." 
                          rows={4}
                          style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px', marginBottom: '10px' }}
                        />
                        <IonButton expand="block" onClick={handleSubmitFeedback} disabled={!feedbackText.trim()}>
                          Enviar Comentario
                        </IonButton>
                      </div>
                    ) : (
                      <div style={{ marginTop: '30px', backgroundColor: '#ddffdd', border: '1px solid #0a0', padding: '15px', borderRadius: '8px', textAlign: 'center', color: '#0a0' }}>
                        <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '32px' }} />
                        <h3 style={{ margin: '10px 0 0 0', fontSize: '15px', fontWeight: 'bold' }}>¡Comentario enviado!</h3>
                      </div>
                    )}
                  </div>
                )}

              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard style={{ margin: 0, borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center', color: '#1e293b'}}>Reprogramar Cita</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Selecciona Nueva Fecha
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={formatDateLocal(new Date())}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {selectedDate && (
                  <div style={{ marginBottom: '20px' }}>
                    <IonLabel style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>Horarios Disponibles:</IonLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {loadingSlots ? (
                        <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '10px' }}><IonSpinner name="dots" /></div>
                      ) : availableSlots.length === 0 ? (
                        <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#999', fontSize: '14px', padding: '10px' }}>No hay turnos.</div>
                      ) : availableSlots.map(t => (
                        <div 
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          style={{
                            padding: '10px 5px',
                            border: selectedTime === t ? '2px solid var(--ion-color-primary)' : '1px solid #ddd',
                            backgroundColor: selectedTime === t ? '#eef8ff' : '#fff',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: selectedTime === t ? 'var(--ion-color-primary)' : '#333'
                          }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <IonButton 
                  expand="block" 
                  disabled={!selectedDate || !selectedTime} 
                  onClick={handleReschedule}
                  style={{ marginBottom: '10px', fontWeight: 'bold', '--background': primaryColor, '--color': primaryContrast }}
                >
                  Confirmar Reprogramación
                </IonButton>
                <IonButton expand="block" color="medium" fill="clear" onClick={() => setShowReschedule(false)}>
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}

          {/* Modal for Reporting Payment / Deposit */}
          <IonModal isOpen={showPaymentModal} onDidDismiss={() => setShowPaymentModal(false)}>
            <IonHeader>
              <IonToolbar style={{ ['--background' as any]: headerColor }}>
                <IonTitle style={{ color: headerContrast, fontWeight: 700 }}>Registrar Pago / Abono</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowPaymentModal(false)} style={{ color: headerContrast }}>
                    <IonIcon icon={closeOutline} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding" style={{ backgroundColor: '#f8fafc' }}>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                {/* Rate alert / info banner */}
                <div style={{ 
                  backgroundColor: '#f0f9ff', 
                  border: '1px solid #bae6fd', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#0369a1', display: 'block', fontWeight: 600 }}>Tasa Oficial de Cambio (BCV):</span>
                    <strong style={{ fontSize: '16px', color: '#0c4a6e' }}>Bs. {rateBs.toFixed(2)} / USD</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: '#0369a1', display: 'block', fontWeight: 600 }}>Saldo Restante:</span>
                    <strong style={{ fontSize: '16px', color: '#0c4a6e' }}>${remainingAmount.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Payment Option Segment */}
                <IonSegment 
                  value={paymentType} 
                  onIonChange={e => handlePaymentTypeChange(e.detail.value as any)}
                  style={{ marginBottom: '16px' }}
                >
                  <IonSegmentButton value="FULL">
                    <IonLabel>Pago Completo (${remainingAmount.toFixed(2)})</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="PARTIAL">
                    <IonLabel>Abono Parcial</IonLabel>
                  </IonSegmentButton>
                </IonSegment>

                {/* Amount to Pay */}
                <div style={{ marginBottom: '16px' }}>
                  <IonLabel style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Monto a Reportar (USD):
                  </IonLabel>
                  <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <IonInput 
                      type="number" 
                      value={paymentAmount} 
                      placeholder="0.00"
                      disabled={paymentType === 'FULL' && remainingAmount > 0}
                      onIonInput={e => setPaymentAmount(e.detail.value!)}
                    />
                  </IonItem>
                  {inputAmt > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IonIcon icon={cashOutline} /> 
                      Equivalente en Bolívares: <strong>Bs. {inputAmtBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                  {paymentType === 'PARTIAL' && appointment.minDepositPercentage > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                      * Seña mínima sugerida: {appointment.minDepositPercentage}% (${(totalAmount * (appointment.minDepositPercentage / 100)).toFixed(2)})
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <IonLabel style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Método de Pago:
                  </IonLabel>
                  <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <IonSelect 
                      value={paymentMethod} 
                      onIonChange={e => setPaymentMethod(e.detail.value)}
                      placeholder="Selecciona método"
                    >
                      <IonSelectOption value="PAGO_MOVIL">Pago Móvil</IonSelectOption>
                      <IonSelectOption value="TRANSFER">Transferencia Bancaria</IonSelectOption>
                      <IonSelectOption value="BINANCE">Binance Pay (USDT)</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                </div>

                {/* Dynamic Payment Coordinates Box */}
                <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                    {paymentMethod === 'PAGO_MOVIL' && '📲 Datos para Pago Móvil:'}
                    {paymentMethod === 'TRANSFER' && '🏦 Datos de Transferencia Bancaria:'}
                    {paymentMethod === 'BINANCE' && '🟡 Datos de Binance Pay:'}
                  </div>

                  {paymentMethod === 'PAGO_MOVIL' && (
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                      {appointment.bankInfo && <div><strong>Banco:</strong> {appointment.bankInfo}</div>}
                      {appointment.companyCedula && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Cédula/RIF:</strong> {appointment.companyCedula}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.companyCedula, 'Cédula')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                      {appointment.companyPhone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Teléfono:</strong> {appointment.companyPhone}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.companyPhone, 'Teléfono')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'TRANSFER' && (
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                      {appointment.bankInfo && <div><strong>Banco:</strong> {appointment.bankInfo}</div>}
                      {appointment.companyAccountHolder && <div><strong>Titular:</strong> {appointment.companyAccountHolder}</div>}
                      {appointment.companyCedula && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Cédula/RIF:</strong> {appointment.companyCedula}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.companyCedula, 'Cédula')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                      {appointment.companyAccountNumber && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ wordBreak: 'break-all' }}><strong>Cuenta:</strong> {appointment.companyAccountNumber}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.companyAccountNumber, 'Número de cuenta')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'BINANCE' && (
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                      {appointment.binancePayId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Binance Pay ID:</strong> {appointment.binancePayId}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.binancePayId, 'Binance Pay ID')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                      {appointment.binanceEmail && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><strong>Binance Email:</strong> {appointment.binanceEmail}</span>
                          <IonButton fill="clear" size="small" style={{ margin: 0, height: '22px' }} onClick={() => copyToClipboard(appointment.binanceEmail, 'Binance Email')}>
                            <IonIcon slot="icon-only" icon={copyOutline} style={{ fontSize: '13px' }} />
                          </IonButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bank Select for Pago Movil or Transfer */}
                {(paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'TRANSFER') && (
                  <div style={{ marginBottom: '16px' }}>
                    <BankSelect
                      label="Banco Emisor / Origen (Desde donde pagaste)"
                      value={paymentOriginBank}
                      onChange={val => setPaymentOriginBank(val)}
                      placeholder="Selecciona tu banco de origen..."
                    />
                  </div>
                )}

                {/* Reference Input */}
                <div style={{ marginBottom: '16px' }}>
                  <IonLabel style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Número de Referencia / Comprobante: <span style={{ color: '#ef4444' }}>*</span>
                  </IonLabel>
                  <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <IonInput 
                      value={paymentRef} 
                      placeholder="Ej: 12345678" 
                      onIonInput={e => setPaymentRef(e.detail.value!)} 
                    />
                  </IonItem>
                </div>

                {/* Optional Note */}
                <div style={{ marginBottom: '20px' }}>
                  <IonLabel style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Notas u observaciones (Opcional):
                  </IonLabel>
                  <IonTextarea 
                    value={paymentNotes} 
                    onIonInput={e => setPaymentNotes(e.detail.value!)} 
                    placeholder="Ej: Pago realizado desde Banco Mercantil a nombre de Juan Pérez"
                    rows={2}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', backgroundColor: '#ffffff' }}
                  />
                </div>

                {/* Action Buttons */}
                <IonButton 
                  expand="block" 
                  disabled={isSubmittingPayment || !paymentRef.trim() || inputAmt <= 0}
                  onClick={handlePaymentSubmit}
                  style={{ fontWeight: 'bold', marginBottom: '10px', '--background': primaryColor, '--color': primaryContrast }}
                >
                  {isSubmittingPayment ? <IonSpinner name="crescent" /> : 'Confirmar y Enviar Comprobante'}
                </IonButton>
                <IonButton 
                  expand="block" 
                  fill="clear" 
                  color="medium" 
                  disabled={isSubmittingPayment}
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancelar
                </IonButton>
              </div>
            </IonContent>
          </IonModal>
          
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicAppointmentManage;
