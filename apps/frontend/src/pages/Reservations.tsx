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
  IonSpinner
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
  arrowForwardOutline
} from 'ionicons/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { apiClient } from '../api/client';
import { ReservationStatus } from '@nutrideli/shared-types';
import { offlineDb } from '../services/offline-db';
import { AuthContext } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';

const Reservations: React.FC = () => {
  const { user } = useContext(AuthContext);
  const router = useIonRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [presentToast] = useIonToast();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
        presentToast({ message: 'Reservación actualizada', duration: 2000, color: 'success' });
      } else {
        await apiClient.post('/reservations', payload);
        presentToast({ message: 'Reservación creada con éxito', duration: 2000, color: 'success' });
      }
      setShowModal(false);
      fetchReservations();
    } catch (e: any) {
      const errMsg = e.response?.data?.message || '';
      if (errMsg.includes('choca con la cita') || errMsg.includes('horario laboral')) {
        if (window.confirm(errMsg + '\n\n¿Deseas forzar y agendar de todas formas?')) {
          handleSave(true);
        }
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
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const resetToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
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
    const name = user?.tenantName || 'Flujo Fino';
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }, [user?.tenantName]);

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
                {user?.tenantName || 'Flujo Fino • Barbería & Estética'}
              </div>
            </div>

            {/* Tenant Avatar Badge */}
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: '800',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}
            >
              {tenantInitials}
            </div>
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
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                background: viewMode === 'day' ? '#10B981' : 'transparent',
                color: viewMode === 'day' ? '#ffffff' : '#64748B',
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
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                background: viewMode === 'week' ? '#10B981' : 'transparent',
                color: viewMode === 'week' ? '#ffffff' : '#64748B',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                          minWidth: '92px',
                          background: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '8px 10px',
                          textAlign: 'center',
                          boxShadow: 'var(--ff-shadow-sm)'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                          {res.time}
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

                        {/* Service Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                          <span>✂️</span>
                          <span>{res.serviceName || 'Servicio Agendado'}</span>
                          {res.totalAmount > 0 && (
                            <span style={{ color: '#10B981', fontWeight: '800', marginLeft: 'auto' }}>
                              ${Number(res.totalAmount).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Specialist & Station */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                          <IonIcon icon={personOutline} style={{ fontSize: '14px' }} />
                          <span>{res.employee?.name || res.employee?.username || 'Especialista Asignado'}</span>
                        </div>

                        {/* Action buttons footer */}
                        <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                          {/* WhatsApp */}
                          {res.customerPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanPhone = res.customerPhone.replace(/\D/g, '');
                                const text = encodeURIComponent(`Hola ${res.customerName}, te escribimos de ${user?.tenantName || 'Flujo Fino'} respecto a tu cita para ${res.serviceName || 'nuestro servicio'} el ${res.date} a las ${res.time}.`);
                                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                              }}
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '14px' }} />
                              WhatsApp
                            </button>
                          )}

                          {/* Enviar a Caja */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push('/pos', 'root', 'replace');
                              // Also write to session storage so POS loads it
                              sessionStorage.setItem('reservation_to_bill', JSON.stringify(res));
                              window.location.href = `/pos?reservationId=${res.id}`;
                            }}
                            className="ff-btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              marginLeft: 'auto',
                              borderRadius: '8px'
                            }}
                          >
                            <IonIcon icon={cashOutline} style={{ fontSize: '14px' }} />
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
                      className="ff-btn-primary"
                      style={{ padding: '10px 20px' }}
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
          style={{
            position: 'fixed',
            bottom: '78px',
            right: '20px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#10B981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
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
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#ffffff' }}
                  >
                    <option value="">Sin servicio específico</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationMinutes || 30} min) - ${Number(p.salePrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Especialista Asignado
                  </label>
                  <select
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#ffffff' }}
                  >
                    <option value="">Sin asignar / Cualquiera</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.username || emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
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

                  {/* Actions: Enviar a Caja & Editar */}
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
              <select value={shiftMinutes} onChange={e => setShiftMinutes(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora (60 min)</option>
              </select>
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
