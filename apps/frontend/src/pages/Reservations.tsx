// @ts-nocheck
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  useIonToast,
  useIonAlert,
  IonModal,
  useIonRouter,
  IonSpinner,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  addOutline,
  trashOutline,
  cashOutline,
  saveOutline,
  refreshOutline,
  timeOutline,
  logoWhatsapp,
  personOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cutOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  closeOutline,
  arrowForwardOutline,
  cameraOutline,
  imageOutline
} from 'ionicons/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { apiClient } from '../api/client';
import { ReservationStatus } from '@finowork/shared-types';
import { offlineDb } from '../services/offline-db';
import { AuthContext } from '../context/AuthContext';
import { useImageViewer } from '../context/ImageViewerContext';
import AppHeader from '../components/AppHeader';
import { formatWhatsAppUrl } from '../utils/whatsapp';

export const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Reservations: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { openImage } = useImageViewer();
  const router = useIonRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [presentToast] = useIonToast();
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatDateLocal(new Date());
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [tableNumber, setTableNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTimeFrom, setShiftTimeFrom] = useState('');
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [shiftAffected, setShiftAffected] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [notifyingDelayId, setNotifyingDelayId] = useState<string | null>(null);

  const handleNotifyDelay = async (id: string, minutes: number = 15, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifyingDelayId(id);
      const res = await apiClient.post(`/reservations/${id}/notify-delay`, { minutes });
      presentToast({
        message: res.data?.message || `Notificación de retraso (+${minutes}m) enviada al cliente.`,
        duration: 3500,
        color: res.data?.sent > 0 ? 'success' : 'warning',
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al enviar la notificación de retraso.';
      presentToast({ message: msg, duration: 3500, color: 'danger' });
    } finally {
      setNotifyingDelayId(null);
    }
  };

  const handleApprovePayment = async (reservationId: string) => {
    try {
      await apiClient.patch(`/reservations/${reservationId}/approve-payment`);
      presentToast({ message: '✅ Pago de cita verificado y aprobado con éxito', duration: 2500, color: 'success' });
      fetchReservations();
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error aprobando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleRejectPayment = (reservationId: string) => {
    presentAlert({
      header: 'Rechazar Comprobante de Cita',
      message: 'Indica el motivo por el cual no se validó el pago:',
      inputs: [
        { name: 'reason', type: 'text', placeholder: 'Ej. No se refleja en cuenta / Monto incorrecto' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar Pago',
          role: 'destructive',
          handler: async (data: any) => {
            const reason = data.reason?.trim() || 'Comprobante no válido o no recibido';
            try {
              await apiClient.patch(`/reservations/${reservationId}/reject-payment`, { reason });
              presentToast({ message: 'Comprobante marcado como rechazado', duration: 2500, color: 'warning' });
              fetchReservations();
            } catch (e: any) {
              console.error(e);
              presentToast({ message: 'Error rechazando pago: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const fetchReservations = async () => {
    try {
      const cached = await offlineDb.cachedReservations.toArray();
      if (cached && cached.length > 0) {
        setReservations(cached);
      }
    } catch (cacheErr) {}

    if (!navigator.onLine) {
      setIsOfflineMode(true);
      return;
    }

    try {
      const res = await apiClient.get('/reservations');
      const serverReservations = res.data || [];
      setReservations(serverReservations);
      setIsOfflineMode(false);

      try {
        await offlineDb.cachedReservations.clear();
        if (serverReservations.length > 0) {
          await offlineDb.cachedReservations.bulkPut(serverReservations);
        }
      } catch (saveErr) {}
    } catch (e) {
      setIsOfflineMode(true);
      try {
        const cached = await offlineDb.cachedReservations.toArray();
        if (cached && cached.length > 0) {
          setReservations(cached);
          presentToast({
            message: '⚡ Modo Sin Conexión: Visualizando agenda guardada localmente.',
            duration: 3000,
            color: 'warning'
          });
        }
      } catch (err) {}
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products');
      setProducts(res.data);
    } catch (e) {
      try {
        const cached = await offlineDb.cachedProducts.toArray();
        if (cached && cached.length > 0) setProducts(cached);
      } catch (err) {}
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data || {});
    } catch (e) {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/users');
      setEmployees(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchReservations();
    fetchProducts();
    fetchSettings();
    fetchEmployees();

    const handleOnline = () => {
      setIsOfflineMode(false);
      fetchReservations();
    };
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleMassShift = async () => {
    if (!shiftTimeFrom || !shiftMinutes) return;
    try {
      const res = await apiClient.post('/reservations/shift', {
        date: selectedDate,
        timeFrom: shiftTimeFrom,
        minutes: shiftMinutes
      });
      setShiftAffected(res.data);
      fetchReservations();
      presentToast({ message: `Se reprogramaron ${res.data.length} citas`, duration: 3000, color: 'success' });
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error en desplazamiento';
      presentToast({ message: msg, duration: 4000, color: 'danger' });
    }
  };

  const openShiftModal = () => {
    setShiftTimeFrom('');
    setShiftAffected([]);
    setShowShiftModal(true);
  };

  const openNew = () => {
    setEditingId(null);
    setCustomerName('');
    setCustomerPhone('');
    setDate(selectedDate);
    setTime('09:00');
    setServiceId('');
    setEmployeeId('');
    setNumberOfPeople(1);
    setTableNumber('');
    setTotalAmount(0);
    setNotes('');
    setShowModal(true);
  };

  const handleServiceChange = (sId: string) => {
    setServiceId(sId);
    const found = products.find(p => p.id === sId);
    if (found && (!totalAmount || totalAmount === 0)) {
      setTotalAmount(found.salePrice || 0);
    }

    if (sId && found && found.assignedStaffIds) {
      const assignedIds = Array.isArray(found.assignedStaffIds)
        ? found.assignedStaffIds
        : (typeof found.assignedStaffIds === 'string'
            ? found.assignedStaffIds.split(',').map((s: string) => s.trim())
            : []);

      if (assignedIds.length > 0 && employeeId && !assignedIds.includes(employeeId)) {
        setEmployeeId('');
      }
    }
  };

  const handleSave = async (force: boolean = false) => {
    if (!customerName || !date || !time) {
      presentToast({ message: 'Nombre, fecha y hora son obligatorios', duration: 2000, color: 'warning' });
      return;
    }

    const selectedProd = products.find(p => p.id === serviceId);
    const payload = {
      customerName,
      customerPhone,
      date,
      time,
      serviceId: serviceId || undefined,
      serviceName: selectedProd?.name || undefined,
      employeeId: employeeId || undefined,
      numberOfPeople,
      tableNumber,
      totalAmount,
      notes,
      force
    };

    try {
      if (editingId) {
        await apiClient.put(`/reservations/${editingId}`, payload);
        presentToast({ message: 'Cita actualizada con éxito', duration: 2000, color: 'success' });
      } else {
        await apiClient.post('/reservations', payload);
        presentToast({ message: 'Cita agendada con éxito', duration: 2000, color: 'success' });
      }
      setShowModal(false);
      fetchReservations();
    } catch (e: any) {
      const errMsg = e.response?.data?.message || '';
      const isWarningSchedule = 
        errMsg.includes('choca con la cita') || 
        errMsg.includes('horario laboral') || 
        errMsg.includes('cierra a las') ||
        errMsg.includes('fuera de los turnos') ||
        errMsg.includes('almuerzo');

      if (isWarningSchedule) {
        presentAlert({
          header: '⚠️ Cita fuera de horario / Solapada',
          message: `${errMsg}\n\n¿Deseas autorizar la excepción y agendar esta cita de todas formas?`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Sí, Agendar Excepción',
              handler: () => {
                handleSave(true); // Reintenta con force = true
              }
            }
          ]
        });
      } else {
        presentToast({ message: errMsg || 'Error guardando reservación', duration: 3500, color: 'danger' });
      }
    }
  };

  const changeStatus = async (id: string, status: ReservationStatus) => {
    try {
      await apiClient.put(`/reservations/${id}/status`, { status });
      fetchReservations();
      setShowDetails(false);
      presentToast({ message: 'Estado actualizado', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error al cambiar estado', duration: 3000, color: 'danger' });
    }
  };

  const handlePayFull = async () => {
    if (!selectedEvent) return;
    try {
      await apiClient.post(`/reservations/${selectedEvent.id}/pay-full`);
      presentToast({ message: 'Servicio marcado como pagado', duration: 2000, color: 'success' });
      const res = await apiClient.get('/reservations');
      const updated = res.data.find((r: any) => r.id === selectedEvent.id);
      setSelectedEvent(updated);
      setReservations(res.data);
    } catch (e) {
      presentToast({ message: 'Error', duration: 2000, color: 'danger' });
    }
  };

  const handleAddAbono = async () => {
    if (!selectedEvent || !abonoAmount || parseFloat(abonoAmount) <= 0) return;
    try {
      await apiClient.post(`/reservations/${selectedEvent.id}/abono`, {
        amount: parseFloat(abonoAmount)
      });
      setAbonoAmount('');
      presentToast({ message: 'Abono registrado', duration: 2000, color: 'success' });
      const res = await apiClient.get('/reservations');
      const updated = res.data.find((r: any) => r.id === selectedEvent.id);
      setSelectedEvent(updated);
      setReservations(res.data);
    } catch (e) {
      presentToast({ message: 'Error registrando abono', duration: 2000, color: 'danger' });
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      await apiClient.delete(`/reservations/${id}`);
      fetchReservations();
      setShowDetails(false);
      presentToast({ message: 'Reservación eliminada', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error eliminando reservación', duration: 3000, color: 'danger' });
    }
  };

  const handleUploadPhoto = async (reservationId: string, file: File) => {
    try {
      setUploadingPhotoId(reservationId);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/reservations/${reservationId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUrl = res.data.url;
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, imageUrl: updatedUrl } : r));
      setSelectedEvent(prev => (prev && prev.id === reservationId ? { ...prev, imageUrl: updatedUrl } : prev));
      presentToast({ message: 'Foto del servicio guardada con éxito', duration: 2500, color: 'success' });
    } catch (err: any) {
      console.error(err);
      presentToast({ message: 'Error al subir la foto', duration: 3000, color: 'danger' });
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleRemovePhoto = async (reservationId: string) => {
    try {
      await apiClient.delete(`/reservations/${reservationId}/media`);
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, imageUrl: null } : r));
      setSelectedEvent(prev => (prev && prev.id === reservationId ? { ...prev, imageUrl: null } : prev));
      presentToast({ message: 'Foto eliminada del servicio', duration: 2000, color: 'warning' });
    } catch (err: any) {
      console.error(err);
      presentToast({ message: 'Error al eliminar foto', duration: 3000, color: 'danger' });
    }
  };

  const openEdit = (res: any) => {
    setEditingId(res.id);
    setCustomerName(res.customerName);
    setCustomerPhone(res.customerPhone || '');
    setDate(res.date);
    setTime(res.time);
    setServiceId(res.serviceId || '');
    setEmployeeId(res.employeeId || '');
    setNumberOfPeople(res.numberOfPeople);
    setTableNumber(res.tableNumber || '');
    setTotalAmount(res.totalAmount || 0);
    setNotes(res.notes || '');
    setShowDetails(false);
    setShowModal(true);
  };

  // Filter day's appointments and sort by time
  const dayReservations = useMemo(() => {
    return reservations
      .filter(r => r.date === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [reservations, selectedDate]);

  // Date formatted for header e.g. "Viernes, 26 de Septiembre"
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

  const changeDay = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + offset);
    setSelectedDate(formatDateLocal(dateObj));
  };

  const resetToToday = () => {
    setSelectedDate(formatDateLocal(new Date()));
  };

  // FullCalendar event items for week view
  const events = useMemo(() => {
    return reservations.map(r => {
      let color = '#10B981';
      if (r.status === ReservationStatus.PENDING) color = '#F59E0B';
      if (r.status === ReservationStatus.CANCELED) color = '#EF4444';
      if (r.status === ReservationStatus.COMPLETED) color = '#64748B';

      return {
        id: r.id,
        title: `${r.customerName} - ${r.serviceName || 'Cita'}`,
        start: `${r.date}T${r.time}`,
        color,
        extendedProps: { ...r }
      };
    });
  }, [reservations]);

  const tenantInitials = useMemo(() => {
    const name = user?.tenantName || 'FinoWork';
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }, [user?.tenantName]);

  const servicesList = useMemo(() => {
    return products.filter(p => {
      if (p.product_type === 'SERVICIO') return true;
      if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
      return p.is_service === true || p.category?.toLowerCase() === 'servicios';
    });
  }, [products]);

  const availableSpecialists = useMemo(() => {
    // 1. Descartar usuarios que solo sean DELIVERY u OPERATIVO
    const qualifiedStaff = employees.filter(emp => {
      const roles: string[] = emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role];
      const isDeliveryOnly = roles.every(r => r === 'DELIVERY' || r === 'Repartidor');
      const isOperativoOnly = roles.every(r => r === 'OPERATIVO');
      if (isDeliveryOnly || isOperativoOnly) return false;
      if (emp.username?.toLowerCase() === 'delivery' || emp.name?.toLowerCase() === 'delivery') return false;
      return true;
    });

    // 2. Si hay un servicio seleccionado, filtrar por sus especialistas capacitadas si están definidas
    if (serviceId) {
      const selectedProd = products.find(p => p.id === serviceId);
      if (selectedProd && selectedProd.assignedStaffIds) {
        const assignedIds = Array.isArray(selectedProd.assignedStaffIds)
          ? selectedProd.assignedStaffIds
          : (typeof selectedProd.assignedStaffIds === 'string'
              ? selectedProd.assignedStaffIds.split(',').map((s: string) => s.trim())
              : []);

        if (assignedIds.length > 0) {
          return qualifiedStaff.filter(st => assignedIds.includes(st.id));
        }
      }
    }

    return qualifiedStaff;
  }, [employees, serviceId, products]);

  return (
    <IonPage>
      <AppHeader title="Agenda" onRefresh={fetchReservations} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>

          {/* 1. Header Banner (Figma: Title "Agenda", Subtitle & Avatar FF) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' }}>
                Agenda
              </h1>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748B', marginTop: '2px' }}>
                {user?.tenantName || 'FinoWork • Barbería & Estética'}
              </div>
            </div>

            {/* Tenant Logo Badge */}
            <img 
              src="/assets/logo.png" 
              alt="FinoWork" 
              className="w-12 h-12 rounded-2xl object-cover shadow-sm" 
              style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
          </div>

          {/* 2. Segmented Pill Switch: [ Hoy ] vs [ Semana ] */}
          <div
            style={{
              background: '#F1F5F9',
              borderRadius: '999px',
              padding: '4px',
              display: 'flex',
              marginBottom: '16px',
              maxWidth: '300px'
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={viewMode === 'day' ? 'bg-theme-primary' : ''}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                background: viewMode === 'day' ? 'var(--theme-primary)' : 'transparent',
                color: viewMode === 'day' ? 'var(--theme-primary-contrast, #ffffff)' : '#64748B',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-theme-primary' : ''}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                background: viewMode === 'week' ? 'var(--theme-primary)' : 'transparent',
                color: viewMode === 'week' ? 'var(--theme-primary-contrast, #ffffff)' : '#64748B',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Semana
            </button>
          </div>

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div>
              {/* Date Subheader with arrows */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => changeDay(-1)}
                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <IonIcon icon={chevronBackOutline} style={{ color: '#0F172A' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeDay(1)}
                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <IonIcon icon={chevronForwardOutline} style={{ color: '#0F172A' }} />
                  </button>

                  <div style={{ marginLeft: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', textTransform: 'capitalize' }}>
                      {formattedSelectedDate}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>
                      {dayReservations.length} {dayReservations.length === 1 ? 'cita asignada' : 'citas asignadas'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={openShiftModal}
                    title="Registrar retraso"
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#92400E',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ⏱️ Retraso
                  </button>
                  <button
                    type="button"
                    onClick={resetToToday}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      color: '#0F172A',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Hoy
                  </button>
                </div>
              </div>

              {/* Timeline Cards (Figma Modern Timeline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '90px' }}>
                {dayReservations.map(res => {
                  const duration = res.serviceDuration || 45;
                  const isConfirmed = res.status === ReservationStatus.CONFIRMED;
                  const isPending = res.status === ReservationStatus.PENDING;
                  const isCanceled = res.status === ReservationStatus.CANCELED;

                  return (
                    <div
                      key={res.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Left: Time Pill */}
                      <div
                        style={{
                          width: '68px',
                          flexShrink: 0,
                          background: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '8px 4px',
                          textAlign: 'center',
                          boxShadow: 'var(--ff-shadow-sm)'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                          {res.time ? res.time.substring(0, 5) : ''}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>
                          {duration} min
                        </div>
                      </div>

                      {/* Right: Appointment Card */}
                      <div
                        className="ff-card ff-card-interactive"
                        onClick={() => {
                          setSelectedEvent(res);
                          setShowDetails(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '14px',
                          background: '#ffffff'
                        }}
                      >
                        {/* Top: Customer & Status Pill */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                              {res.customerName}
                            </span>
                            {res.tableNumber && (
                              <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '6px' }}>
                                &bull; Mesa {res.tableNumber}
                              </span>
                            )}
                          </div>

                          {/* Status Pill */}
                          <div
                            className={`ff-pill ${isConfirmed ? 'ff-pill-online' : (isPending ? 'ff-pill-sync' : 'ff-pill-danger')}`}
                            style={{ fontSize: '11px', padding: '3px 10px' }}
                          >
                            <span
                              className="ff-pill-dot"
                              style={{ background: isConfirmed ? '#10B981' : (isPending ? '#F59E0B' : '#EF4444') }}
                            />
                            <span>{res.status}</span>
                          </div>
                        </div>

                        {/* Service Name & Optional Photo */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                            <span>✂️</span>
                            <span>{res.serviceName || 'Servicio Agendado'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            {res.imageUrl && (
                              <img
                                src={res.imageUrl}
                                alt="Foto servicio"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openImage(res.imageUrl, res.serviceName || 'Servicio Realizado');
                                }}
                                title="Ver foto del servicio realizado"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '1px solid #E2E8F0',
                                  cursor: 'zoom-in',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              />
                            )}
                            {res.totalAmount > 0 && (
                              <span style={{ color: '#10B981', fontWeight: '800', fontSize: '13px' }}>
                                ${Number(res.totalAmount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Specialist & Station */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                          <IonIcon icon={personOutline} style={{ fontSize: '14px' }} />
                          <span>{res.employee?.name || res.employee?.username || 'Especialista Asignado'}</span>
                        </div>

                        {/* TAREA 1: Pago Reportado Por Verificar en Cita */}
                        {!isConfirmed && res.paymentStatus !== 'PAID' && (res.paymentReported || res.paymentProofUrl || (Array.isArray(res.abonosHistory) && res.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📱 PAGO REPORTADO POR VERIFICAR</span>
                              {res.paymentProofUrl && (
                                <a
                                  href={res.paymentProofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#B45309', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                                >
                                  Ver Capture ↗
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#78350F', marginTop: '2px' }}>
                              Total Cita: <b>${Number(res.totalAmount || 0).toFixed(2)}</b>
                              {res.paymentRejectedReason && (
                                <div style={{ color: '#DC2626', fontWeight: '700', marginTop: '2px' }}>
                                  Motivo rechazo: {res.paymentRejectedReason}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(res.id)}
                                style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                ✅ Confirmar Pago en Cuenta
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(res.id)}
                                style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                ❌ No Cayó / Inválido
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons footer */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                          {/* WhatsApp */}
                          {res.customerPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const text = `Hola ${res.customerName}, te escribimos de ${user?.tenantName || 'FinoWork'} respecto a tu cita para ${res.serviceName || 'nuestro servicio'} el ${res.date} a las ${res.time}.`;
                                window.open(formatWhatsAppUrl(res.customerPhone, text), '_blank');
                              }}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '13px' }} />
                              WhatsApp
                            </button>
                          )}

                          {/* Avisar Retraso Push */}
                          <button
                            type="button"
                            disabled={notifyingDelayId === res.id}
                            onClick={(e) => handleNotifyDelay(res.id, 15, e)}
                            style={{
                              background: '#FFFBEB',
                              border: '1px solid #FCD34D',
                              color: '#B45309',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="Avisar retraso (+15 min) vía Web Push"
                          >
                            <IonIcon icon={timeOutline} style={{ fontSize: '13px' }} />
                            {notifyingDelayId === res.id ? 'Avisando...' : 'Retraso (+15m)'}
                          </button>

                          {/* Subir / Cambiar Foto */}
                          <input
                            type="file"
                            id={`card-upload-${res.id}`}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadPhoto(res.id, f);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            disabled={uploadingPhotoId === res.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`card-upload-${res.id}`)?.click();
                            }}
                            style={{
                              background: res.imageUrl ? '#F0FDF4' : '#F8FAFC',
                              border: res.imageUrl ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                              color: res.imageUrl ? '#15803D' : '#475569',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title={res.imageUrl ? 'Cambiar foto del servicio realizado' : 'Subir foto del servicio realizado'}
                          >
                            <IonIcon icon={res.imageUrl ? imageOutline : cameraOutline} style={{ fontSize: '13px' }} />
                            {uploadingPhotoId === res.id ? 'Subiendo...' : (res.imageUrl ? 'Cambiar foto' : '+ Foto')}
                          </button>

                          {/* Enviar a Caja */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push('/pos', 'root', 'replace');
                              sessionStorage.setItem('reservation_to_bill', JSON.stringify(res));
                              window.location.href = `/pos?reservationId=${res.id}`;
                            }}
                            className="ff-btn-primary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              marginLeft: 'auto',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <IonIcon icon={cashOutline} style={{ fontSize: '13px' }} />
                            Enviar a Caja
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dayReservations.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <IonIcon icon={calendarOutline} style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '8px' }} />
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                      Sin citas para este día
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
                      No hay citas agendadas para el {formattedSelectedDate}.
                    </p>
                    <button
                      type="button"
                      onClick={openNew}
                      className="ff-btn-primary bg-theme-primary"
                      style={{ padding: '10px 20px', backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
                    >
                      <IonIcon icon={addOutline} />
                      Agendar Cita
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WEEK VIEW (FullCalendar) */}
          {viewMode === 'week' && (
            <div className="fc-wrapper">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridWeek,dayGridMonth'
                }}
                locale="es"
                events={events}
                eventClick={(info) => {
                  const res = reservations.find(r => r.id === info.event.id);
                  if (res) {
                    setSelectedEvent(res);
                    setShowDetails(true);
                  }
                }}
                height="auto"
                allDaySlot={false}
                slotDuration="00:30:00"
              />
            </div>
          )}
        </div>

        {/* Floating Action Button (FAB [ + ]) */}
        <div
          onClick={openNew}
          className="bg-theme-primary"
          style={{
            position: 'fixed',
            bottom: '78px',
            right: '20px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'var(--theme-primary)',
            color: 'var(--theme-primary-contrast, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            zIndex: 900
          }}
          title="Agendar nueva cita"
        >
          <IonIcon icon={addOutline} style={{ fontSize: '28px', strokeWidth: '32' }} />
        </div>

        {/* 3. New / Edit Appointment Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                {editingId ? 'Editar Cita' : 'Agendar Nueva Cita'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Teléfono del Cliente
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0414-1234567"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Hora *
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Servicio
                  </label>
                  <select
                    value={serviceId}
                    onChange={e => handleServiceChange(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#ffffff', color: '#0F172A', outline: 'none' }}
                  >
                    <option value="">Sin servicio específico</option>
                    {servicesList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationMinutes || 30} min) - ${Number(p.salePrice || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {servicesList.length === 0 && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#DC2626' }}>
                      No hay servicios registrados. Ve a "Servicios / Productos" y crea uno de tipo Servicio.
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Especialista Asignado
                  </label>
                  <select
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#ffffff', color: '#0F172A', outline: 'none' }}
                  >
                    <option value="">Sin asignar / Cualquiera</option>
                    {availableSpecialists.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.username || emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Mesa / Silla
                    </label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      placeholder="Silla 1 / Mesa 3"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Monto a Cobrar ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={totalAmount}
                      onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="ff-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '14px', marginTop: '10px' }}
                >
                  <IonIcon icon={saveOutline} />
                  {editingId ? 'Guardar Cambios' : 'Confirmar Cita ✓'}
                </button>
            </div>
          </div>
        </IonModal>

        {/* 4. Details Modal (Details, Status & Abonos) */}
        <IonModal isOpen={showDetails} onDidDismiss={() => setShowDetails(false)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                Detalles de la Cita
              </h2>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
              {selectedEvent && (
                <div>
                  {/* Customer Card */}
                  <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '4px' }}>
                      {selectedEvent.customerName}
                    </div>
                    {selectedEvent.customerPhone && (
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                        📞 {selectedEvent.customerPhone}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      📅 {selectedEvent.date} a las <b>{selectedEvent.time}</b>
                    </div>
                    {selectedEvent.serviceName && (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#047857', marginTop: '6px' }}>
                        ✂️ {selectedEvent.serviceName}
                      </div>
                    )}
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Total Servicio:</span>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>
                        ${Number(selectedEvent.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* TAREA 1: Pago Reportado Por Verificar en Modal */}
                  {selectedEvent.paymentStatus !== 'PAID' && (selectedEvent.paymentReported || selectedEvent.paymentProofUrl || (Array.isArray(selectedEvent.abonosHistory) && selectedEvent.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) && (
                    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📱 PAGO REPORTADO POR VERIFICAR</span>
                        {selectedEvent.paymentProofUrl && (
                          <a
                            href={selectedEvent.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#B45309', textDecoration: 'underline', fontSize: '12px', fontWeight: '700' }}
                          >
                            Ver Comprobante ↗
                          </a>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350F', marginTop: '4px' }}>
                        El cliente reportó un pago electrónico para esta cita. Confirma que los fondos hayan ingresado en tu cuenta bancaria.
                      </div>
                      {selectedEvent.paymentProofUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <img
                            src={selectedEvent.paymentProofUrl}
                            alt="Capture de pago"
                            style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid #CBD5E1', objectFit: 'contain', width: '100%' }}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleApprovePayment(selectedEvent.id);
                            setShowDetails(false);
                          }}
                          style={{ flex: 1, background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          ✅ Confirmar que cayó en Cuenta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleRejectPayment(selectedEvent.id);
                            setShowDetails(false);
                          }}
                          style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          ❌ Inválido
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Selection Buttons */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>
                      CAMBIAR ESTADO
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => changeStatus(selectedEvent.id, ReservationStatus.CONFIRMED)}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: selectedEvent.status === ReservationStatus.CONFIRMED ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: selectedEvent.status === ReservationStatus.CONFIRMED ? '#ECFDF5' : '#ffffff',
                          color: '#065F46',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus(selectedEvent.id, ReservationStatus.COMPLETED)}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: selectedEvent.status === ReservationStatus.COMPLETED ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                          background: selectedEvent.status === ReservationStatus.COMPLETED ? '#EFF6FF' : '#ffffff',
                          color: '#1D4ED8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Completada
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus(selectedEvent.id, ReservationStatus.CANCELED)}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: selectedEvent.status === ReservationStatus.CANCELED ? '2px solid #EF4444' : '1px solid #E2E8F0',
                          background: selectedEvent.status === ReservationStatus.CANCELED ? '#FEF2F2' : '#ffffff',
                          color: '#991B1B',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>

                  {/* Foto del Servicio Realizado */}
                  <div style={{ marginBottom: '16px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={cameraOutline} style={{ color: '#10B981', fontSize: '16px' }} />
                        Foto del Servicio Realizado
                      </span>
                      {selectedEvent.imageUrl && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                          ✓ En Catálogo Público
                        </span>
                      )}
                    </div>

                    {selectedEvent.imageUrl ? (
                      <div>
                        <img
                          src={selectedEvent.imageUrl}
                          alt="Servicio realizado"
                          onClick={() => openImage(selectedEvent.imageUrl, selectedEvent.serviceName || 'Servicio Realizado')}
                          title="Toca para ver en grande"
                          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', cursor: 'zoom-in', border: '1px solid #CBD5E1', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="file"
                            id={`detail-upload-${selectedEvent.id}`}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadPhoto(selectedEvent.id, f);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            disabled={uploadingPhotoId === selectedEvent.id}
                            onClick={() => document.getElementById(`detail-upload-${selectedEvent.id}`)?.click()}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <IonIcon icon={cameraOutline} />
                            {uploadingPhotoId === selectedEvent.id ? 'Subiendo...' : 'Cambiar Foto'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(selectedEvent.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #FCA5A5',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title="Eliminar foto"
                          >
                            <IonIcon icon={trashOutline} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                          Sube una foto del trabajo completado para exhibirla en el catálogo y portafolio público de reservas.
                        </p>
                        <input
                          type="file"
                          id={`detail-upload-${selectedEvent.id}`}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadPhoto(selectedEvent.id, f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploadingPhotoId === selectedEvent.id}
                          onClick={() => document.getElementById(`detail-upload-${selectedEvent.id}`)?.click()}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px dashed #10B981',
                            background: '#ECFDF5',
                            color: '#065F46',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <IonIcon icon={cameraOutline} style={{ fontSize: '16px' }} />
                          {uploadingPhotoId === selectedEvent.id ? 'Subiendo foto...' : '+ Cargar Foto del Servicio'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: Enviar a Caja, Avisar Retraso & Editar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetails(false);
                          window.location.href = `/pos?reservationId=${selectedEvent.id}`;
                        }}
                        className="ff-btn-primary"
                        style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                      >
                        <IonIcon icon={cashOutline} />
                        Enviar a Caja para Cobrar
                      </button>

                      <button
                        type="button"
                        disabled={notifyingDelayId === selectedEvent.id}
                        onClick={() => handleNotifyDelay(selectedEvent.id, 15)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '10px',
                          border: '1px solid #FCD34D',
                          background: '#FFFBEB',
                          color: '#92400E',
                          fontSize: '13px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <IonIcon icon={timeOutline} style={{ fontSize: '16px' }} />
                        {notifyingDelayId === selectedEvent.id ? 'Avisando retraso...' : 'Avisar retraso (+15 min) al Cliente'}
                      </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(selectedEvent)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          background: '#ffffff',
                          color: '#0F172A',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Editar Datos
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReservation(selectedEvent.id)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: '1px solid #FCA5A5',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar Cita
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </IonModal>

        {/* Retraso Modal */}
        <IonModal isOpen={showShiftModal} onDidDismiss={() => setShowShiftModal(false)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ padding: '20px', background: '#ffffff' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
              ⏱️ Retraso Imprevisto de Jornada
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4' }}>
              Todas las citas del día de hoy a partir de la hora seleccionada se desplazarán automáticamente.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>A partir de (Hora):</label>
              <input type="time" value={shiftTimeFrom} onChange={e => setShiftTimeFrom(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Minutos a desplazar:</label>
              <IonSelect
                interface="popover"
                value={shiftMinutes}
                onIonChange={e => setShiftMinutes(Number(e.detail.value))}
                style={{ width: '100%', minHeight: '42px', padding: '2px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#ffffff', '--padding-start': '0px', '--padding-end': '0px' }}
              >
                <IonSelectOption value={15}>15 minutos</IonSelectOption>
                <IonSelectOption value={30}>30 minutos</IonSelectOption>
                <IonSelectOption value={60}>1 hora (60 min)</IonSelectOption>
              </IonSelect>
            </div>
            <button type="button" onClick={handleMassShift} className="ff-btn-primary" style={{ width: '100%', padding: '12px', background: '#F59E0B' }}>
              Aplicar Desplazamiento
            </button>
          </div>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default Reservations;
