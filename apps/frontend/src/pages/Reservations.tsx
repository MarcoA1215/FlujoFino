import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  useIonToast,
  useIonAlert,
  IonModal,
  useIonRouter,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/react';
import {
  addOutline,
  trashOutline,
  cashOutline,
  saveOutline,
  timeOutline,
  logoWhatsapp,
  personOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  cameraOutline,
  imageOutline,
  copyOutline,
  linkOutline
} from 'ionicons/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { apiClient } from '../api/client';
import { ReservationStatus } from '@finowork/shared-types';
import { offlineDb } from '../services/offline-db';
import { AuthContext } from '../context/AuthContext';
import { useImageViewer } from '../context/ImageViewerContext';
import AppHeader from '../components/AppHeader';
import { formatWhatsAppUrl } from '../utils/whatsapp';
import { formatTime12h } from '../utils/time';

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
  const [presentAlert] = useIonAlert();
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
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [employeeId, setEmployeeId] = useState('');
  const [serviceSpecialistMap, setServiceSpecialistMap] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTimeFrom, setShiftTimeFrom] = useState('');
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [, setShiftAffected] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [notifyingDelayId, setNotifyingDelayId] = useState<string | null>(null);

  // States for Abono Modal
  const [selectedReservationForAbono, setSelectedReservationForAbono] = useState<any>(null);
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoMethod, setAbonoMethod] = useState<string>('USD');
  const [abonoRef, setAbonoRef] = useState<string>('');
  const [abonoBank, setAbonoBank] = useState<string>('');
  const [isSubmittingAbono, setIsSubmittingAbono] = useState<boolean>(false);

  const openAbonoModal = (res: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedReservationForAbono(res);
    setAbonoAmount('');
    setAbonoMethod('USD');
    setAbonoRef('');
    setAbonoBank('');
  };

  // States for Reschedule Modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const openReschedule = (res: any) => {
    setRescheduleDate(res.date || formatDateLocal(new Date()));
    setRescheduleTime(res.time ? res.time.substring(0, 5) : '10:00');
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async (force: boolean = false) => {
    if (!selectedEvent || !rescheduleDate || !rescheduleTime) {
      presentToast({ message: 'Selecciona fecha y hora para reprogramar', duration: 2000, color: 'warning' });
      return;
    }
    setIsRescheduling(true);
    try {
      const res = await apiClient.post(`/reservations/${selectedEvent.id}/reschedule`, {
        date: rescheduleDate,
        time: rescheduleTime,
        reason: rescheduleReason,
        force
      });
      setShowRescheduleModal(false);
      setShowDetails(false);
      fetchReservations();

      const whatsappLink = res.data?.whatsappLink;
      if (whatsappLink) {
        presentAlert({
          header: '✅ Cita Reprogramada',
          message: `${res.data?.message || 'Cita actualizada con éxito.'}\n\n¿Deseas enviar el aviso directo al cliente por WhatsApp?`,
          buttons: [
            { text: 'Listo', role: 'cancel' },
            {
              text: 'Enviar WhatsApp 💬',
              handler: () => {
                window.open(whatsappLink, '_blank');
              }
            }
          ]
        });
      } else {
        presentToast({
          message: res.data?.message || 'Cita reprogramada con éxito.',
          duration: 3500,
          color: 'success'
        });
      }
    } catch (e: any) {
      const rawMsg = e.response?.data?.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join('. ')
        : (typeof rawMsg === 'string' ? rawMsg : (e.message || 'Error al reprogramar la cita'));

      const isWarningSchedule = 
        msg.includes('choca con la cita') || 
        msg.includes('horario laboral') || 
        msg.includes('jornada laboral') ||
        msg.includes('horario de atención') ||
        msg.includes('cierra a las') ||
        msg.includes('abre a las') ||
        msg.includes('iniciaría a las') ||
        msg.includes('terminaría a las') ||
        msg.includes('fuera de los turnos') ||
        msg.includes('cerrado') ||
        msg.includes('almuerzo') ||
        msg.includes('receso') ||
        msg.includes('cita asignada') ||
        msg.includes('confirma para forzar') ||
        msg.includes('capacidad disponible') ||
        msg.includes('especialistas disponibles') ||
        msg.includes('copados');

      if (isWarningSchedule) {
        presentAlert({
          header: '⚠️ Reprogramación fuera de horario / Solapada',
          message: `${msg}\n\n¿Deseas autorizar la excepción y reprogramar esta cita de todas formas?`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Sí, Forzar Reprogramación',
              handler: () => {
                handleConfirmReschedule(true);
              }
            }
          ]
        });
      } else {
        presentToast({ message: msg, duration: 4000, color: 'danger' });
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleNotifyDelay = async (id: string, minutes: number = 15, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifyingDelayId(id);
      const res = await apiClient.post(`/reservations/${id}/notify-delay`, { minutes });
      fetchReservations();
      if (selectedEvent && selectedEvent.id === id && res.data?.reservation) {
        setSelectedEvent(res.data.reservation);
      }
      const whatsappLink = res.data?.whatsappLink;
      if (whatsappLink) {
        presentAlert({
          header: '⏱️ Horario de Cita Desplazado',
          message: `${res.data?.message || `Cita desplazada (+${minutes}m).`}\n\n¿Deseas avisar al cliente por WhatsApp?`,
          buttons: [
            { text: 'Cerrar', role: 'cancel' },
            {
              text: 'Enviar WhatsApp 💬',
              handler: () => {
                window.open(whatsappLink, '_blank');
              }
            }
          ]
        });
      } else {
        presentToast({
          message: res.data?.message || `Cita desplazada (+${minutes}m).`,
          duration: 3500,
          color: 'success',
        });
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al desplazar la cita.';
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

  const handleRegisterAbono = async () => {
    if (!selectedReservationForAbono) return;
    const rawAmount = parseFloat(abonoAmount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      presentToast({ message: 'Ingresa un monto de abono válido mayor a 0', duration: 2500, color: 'warning' });
      return;
    }

    const rate = Number(settings?.exchangeRateBs || 40);
    const isBsMethod = ['PAGO_MOVIL', 'TRANSFER', 'PUNTO', 'CASH_BS'].includes(abonoMethod);
    const amountUsd = isBsMethod && rate > 0
      ? Math.round((rawAmount / rate) * 100) / 100
      : Math.round(rawAmount * 100) / 100;

    setIsSubmittingAbono(true);
    try {
      const res = await apiClient.post(`/reservations/${selectedReservationForAbono.id}/abono`, {
        amount: amountUsd,
        method: abonoMethod,
        ref: abonoRef.trim() || undefined,
        bank: abonoBank.trim() || undefined,
      });
      presentToast({
        message: `✅ Abono de $${amountUsd.toFixed(2)} USD registrado con éxito`,
        duration: 3000,
        color: 'success',
      });
      if (selectedEvent && selectedEvent.id === selectedReservationForAbono.id && res.data) {
        setSelectedEvent(res.data);
      }
      setSelectedReservationForAbono(null);
      fetchReservations();
    } catch (e: any) {
      console.error(e);
      presentToast({
        message: e.response?.data?.message || 'Error al registrar abono en la reserva',
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setIsSubmittingAbono(false);
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

      if (user?.tenantId && serverReservations.length > 0) {
        try {
          await offlineDb.saveReservationsForTenant(user.tenantId, serverReservations);
        } catch (saveErr) {}
      }
    } catch (e) {
      setIsOfflineMode(true);
      try {
        if (user?.tenantId) {
          const cached = await offlineDb.getReservationsByTenant(user.tenantId);
          if (cached && cached.length > 0) {
            setReservations(cached);
            presentToast({
              message: '⚡ Modo Sin Conexión: Visualizando agenda guardada localmente.',
              duration: 3000,
              color: 'warning'
            });
            return;
          }
        }
        setReservations([]);
      } catch (err) {}
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products');
      setProducts(res.data);
      if (user?.tenantId && res.data && res.data.length > 0) {
        try {
          await offlineDb.saveProductsForTenant(user.tenantId, res.data);
        } catch (e) {}
      }
    } catch (e) {
      try {
        if (user?.tenantId) {
          const cached = await offlineDb.getProductsByTenant(user.tenantId);
          if (cached && cached.length > 0) setProducts(cached);
        }
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
      const res = await apiClient.get('/users/employees');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setEmployees(res.data);
        return;
      }
    } catch (e) {}

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
    setSelectedServiceIds([]);
    setServiceSpecialistMap({});
    setEmployeeId('');
    setNumberOfPeople(1);
    setTableNumber('');
    setTotalAmount(0);
    setNotes('');
    setAvailableSlots([]);
    setShowModal(true);
  };

  const toggleService = (sId: string) => {
    setSelectedServiceIds(prev => {
      const isSelected = prev.includes(sId);
      const next = isSelected ? prev.filter(id => id !== sId) : [...prev, sId];

      if (isSelected) {
        setServiceSpecialistMap(prevMap => {
          const copy = { ...prevMap };
          delete copy[sId];
          return copy;
        });
      }

      const newSelected = products.filter(p => next.includes(p.id));
      const newSum = newSelected.reduce((sum, p) => sum + (Number(p.salePrice) || 0), 0);
      setTotalAmount(newSum);

      if (employeeId && next.length > 0) {
        const requiredStaffIdSets = newSelected
          .map(s => {
            const raw = s.assignedStaffIds;
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string') return raw.split(',').map((x: string) => x.trim()).filter(Boolean);
            return [];
          })
          .filter(arr => arr.length > 0);
        if (requiredStaffIdSets.length > 0 && !requiredStaffIdSets.every(arr => arr.includes(employeeId))) {
          // Si el especialista general no aplica a todos, no lo borramos si hay especialistas por servicio
        }
      }

      return next;
    });
  };

  const handleSave = async (force: boolean = false) => {
    if (!customerName || !date || !time) {
      presentToast({ message: 'Nombre, fecha y hora son obligatorios', duration: 2000, color: 'warning' });
      return;
    }

    const sIds = selectedServiceIds.join(',');
    const sNames = selectedServices.length > 0
      ? selectedServices.map(s => s.name).join(', ')
      : undefined;
    const durationMinutes = totalDurationMinutes;

    const serviceSpecialists = selectedServices.map(s => {
      const empId = serviceSpecialistMap[s.id] || employeeId || undefined;
      const empObj = employees.find(e => e.id === empId || e.userId === empId);
      return {
        serviceId: s.id,
        serviceName: s.name,
        employeeId: empId,
        employeeName: empObj ? (empObj.name || empObj.username) : undefined,
        durationMinutes: Number(s.durationMinutes) || 30,
        price: Number(s.salePrice) || 0,
      };
    });

    const primaryEmployeeId = employeeId || serviceSpecialists.find(s => s.employeeId)?.employeeId || undefined;

    const payload = {
      customerName,
      customerPhone,
      date,
      time,
      serviceId: sIds || undefined,
      serviceName: sNames,
      durationMinutes,
      employeeId: primaryEmployeeId,
      serviceSpecialists,
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
        const createRes = await apiClient.post('/reservations', payload);
        const newReservation = createRes.data;
        presentToast({ message: 'Cita agendada con éxito', duration: 2000, color: 'success' });

        if (newReservation?.id) {
          const appointmentUrl = `${window.location.origin}/appointment/${newReservation.id}`;
          if (customerPhone) {
            const msg = `Hola ${customerName}, tu cita para ${sNames || 'nuestro servicio'} ha sido agendada con éxito en ${user?.tenantName || 'FinoWork'} para el ${date} a las ${formatTime12h(time)}.\n\nPuedes ver los detalles, gestionar tu cita o reportar tu pago aquí:\n${appointmentUrl}`;
            const waUrl = formatWhatsAppUrl(customerPhone, msg);

            presentAlert({
              header: '✅ Cita Agendada Exitosamente',
              message: `¿Deseas enviar el enlace de control de la cita a ${customerName} por WhatsApp?`,
              buttons: [
                {
                  text: 'Copiar Enlace 📋',
                  handler: () => {
                    navigator.clipboard.writeText(appointmentUrl);
                    presentToast({ message: '📋 Enlace copiado al portapapeles', duration: 2500, color: 'success' });
                  }
                },
                {
                  text: 'Enviar WhatsApp 📲',
                  handler: () => {
                    window.open(waUrl, '_blank');
                  }
                },
                { text: 'Listo', role: 'cancel' }
              ]
            });
          } else {
            presentAlert({
              header: '✅ Cita Agendada Exitosamente',
              message: `Puedes copiar el enlace de control para que el cliente gestione su cita:`,
              buttons: [
                {
                  text: 'Copiar Enlace 📋',
                  handler: () => {
                    navigator.clipboard.writeText(appointmentUrl);
                    presentToast({ message: '📋 Enlace copiado al portapapeles', duration: 2500, color: 'success' });
                  }
                },
                { text: 'Listo', role: 'cancel' }
              ]
            });
          }
        }
      }
      setShowModal(false);
      fetchReservations();
    } catch (e: any) {
      const rawMsg = e.response?.data?.message;
      const errMsg = Array.isArray(rawMsg)
        ? rawMsg.join('. ')
        : (typeof rawMsg === 'string' ? rawMsg : (e.message || ''));

      const isWarningSchedule = 
        errMsg.includes('choca con la cita') || 
        errMsg.includes('horario laboral') || 
        errMsg.includes('jornada laboral') ||
        errMsg.includes('horario de atención') ||
        errMsg.includes('cierra a las') ||
        errMsg.includes('abre a las') ||
        errMsg.includes('iniciaría a las') ||
        errMsg.includes('terminaría a las') ||
        errMsg.includes('fuera de los turnos') ||
        errMsg.includes('cerrado') ||
        errMsg.includes('almuerzo') ||
        errMsg.includes('receso') ||
        errMsg.includes('cita asignada') ||
        errMsg.includes('confirma para forzar') ||
        errMsg.includes('capacidad disponible') ||
        errMsg.includes('especialistas disponibles') ||
        errMsg.includes('copados');

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
      setReservations((prev: any[]) => prev.map(r => r.id === reservationId ? { ...r, imageUrl: updatedUrl } : r));
      setSelectedEvent((prev: any) => (prev && prev.id === reservationId ? { ...prev, imageUrl: updatedUrl } : prev));
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
      setReservations((prev: any[]) => prev.map(r => r.id === reservationId ? { ...r, imageUrl: null } : r));
      setSelectedEvent((prev: any) => (prev && prev.id === reservationId ? { ...prev, imageUrl: null } : prev));
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
    setTime(res.time ? res.time.substring(0, 5) : '09:00');
    const rawSId = res.serviceId || '';
    const parsedIds = rawSId
      ? rawSId.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    setSelectedServiceIds(parsedIds);

    const specMap: Record<string, string> = {};
    if (Array.isArray(res.serviceSpecialists) && res.serviceSpecialists.length > 0) {
      for (const item of res.serviceSpecialists) {
        if (item.serviceId && item.employeeId) {
          specMap[item.serviceId] = item.employeeId;
        }
      }
    } else if (res.employeeId && parsedIds.length === 1) {
      specMap[parsedIds[0]] = res.employeeId;
    }
    setServiceSpecialistMap(specMap);

    setEmployeeId(res.employeeId || '');
    setNumberOfPeople(res.numberOfPeople || 1);
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

      const [th, tm] = (r.time || '00:00').split(':').map(Number);
      const startMins = (th || 0) * 60 + (tm || 0);
      const dur = Number(r.durationMinutes) || 30;
      const endMins = startMins + dur;
      const eh = Math.floor(endMins / 60);
      const em = endMins % 60;
      const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

      return {
        id: r.id,
        title: `${r.customerName} - ${r.serviceName || 'Cita'}`,
        start: `${r.date}T${r.time}`,
        end: `${r.date}T${endTimeStr}`,
        color,
        extendedProps: { ...r }
      };
    });
  }, [reservations]);

  const servicesList = useMemo(() => {
    return products.filter(p => {
      if (p.product_type === 'SERVICIO') return true;
      if (p.product_type === 'REVENTA' || p.product_type === 'FORMULA') return false;
      return p.is_service === true || p.category?.toLowerCase() === 'servicios';
    });
  }, [products]);

  const selectedServices = useMemo(() => {
    return products.filter(p => selectedServiceIds.includes(p.id));
  }, [products, selectedServiceIds]);

  const totalDurationMinutes = useMemo(() => {
    if (selectedServices.length === 0) return 30;
    return selectedServices.reduce((sum, s) => sum + (Number(s.durationMinutes) || 30), 0);
  }, [selectedServices]);

  const totalCalculatedPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.salePrice) || 0), 0);
  }, [selectedServices]);

  const availableSpecialists = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    // 1. Descartar únicamente usuarios que sean estrictamente DELIVERY / Repartidor
    const qualifiedStaff = employees.filter(emp => {
      const roles: string[] = emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role];
      const isDeliveryOnly = roles.every(r => r === 'DELIVERY' || r === 'Repartidor');
      if (isDeliveryOnly) return false;
      if (emp.username?.toLowerCase() === 'delivery' || emp.name?.toLowerCase() === 'delivery') return false;
      return true;
    });

    const basePool = qualifiedStaff.length > 0 ? qualifiedStaff : employees;

    // 2. Si hay servicios seleccionados, intentar filtrar por sus especialistas asignados
    if (selectedServiceIds.length > 0) {
      const selectedProds = products.filter(p => selectedServiceIds.includes(p.id));
      const requiredStaffIdSets = selectedProds
        .map(p => {
          const raw = p.assignedStaffIds;
          if (!raw) return [];
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string') return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
          return [];
        })
        .filter(arr => arr.length > 0);

      if (requiredStaffIdSets.length > 0) {
        // Coincidencia con todos los servicios seleccionados (intersección)
        const intersection = basePool.filter(st =>
          requiredStaffIdSets.every(set => set.includes(st.id) || set.includes(st.userId))
        );
        if (intersection.length > 0) return intersection;

        // Coincidencia con al menos uno de los servicios seleccionados (unión)
        const union = basePool.filter(st =>
          requiredStaffIdSets.some(set => set.includes(st.id) || set.includes(st.userId))
        );
        if (union.length > 0) return union;
      }
    }

    return basePool;
  }, [employees, selectedServiceIds, products]);

  const getStaffForSingleService = useCallback((service: any) => {
    if (!employees || employees.length === 0) return [];
    const nonDelivery = employees.filter(emp => {
      const roles: string[] = emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role];
      const isDeliveryOnly = roles.every(r => r === 'DELIVERY' || r === 'Repartidor');
      if (isDeliveryOnly) return false;
      if (emp.username?.toLowerCase() === 'delivery' || emp.name?.toLowerCase() === 'delivery') return false;
      return true;
    });

    const basePool = nonDelivery.length > 0 ? nonDelivery : employees;
    const raw = service?.assignedStaffIds;
    let staffIds: string[] = [];
    if (Array.isArray(raw)) staffIds = raw;
    else if (typeof raw === 'string') staffIds = raw.split(',').map((s: string) => s.trim()).filter(Boolean);

    if (staffIds.length > 0) {
      const qualified = basePool.filter(emp => staffIds.includes(emp.id) || staffIds.includes(emp.userId));
      if (qualified.length > 0) return qualified;
    }
    return basePool;
  }, [employees]);

  // Fetch availability slots whenever modal is open and date/services/employee/editingId change
  useEffect(() => {
    if (!showModal || !date) return;
    let isCancelled = false;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const sIds = selectedServiceIds.join(',');
        const queryParams = new URLSearchParams();
        queryParams.append('date', date);
        if (sIds) queryParams.append('serviceId', sIds);
        if (employeeId) queryParams.append('employeeId', employeeId);
        if (editingId) queryParams.append('exclude', editingId);

        const res = await apiClient.get(`/reservations/availability?${queryParams.toString()}`);
        if (!isCancelled) {
          setAvailableSlots(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error('Error fetching availability slots:', err);
        if (!isCancelled) {
          setAvailableSlots([]);
        }
      } finally {
        if (!isCancelled) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      isCancelled = true;
    };
  }, [showModal, date, selectedServiceIds, employeeId, editingId]);

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
                  const duration = Number(res.durationMinutes) || 30;
                  const isConfirmed = res.status === ReservationStatus.CONFIRMED;
                  const isPending = res.status === ReservationStatus.PENDING;

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
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap' }}>
                          {res.time ? formatTime12h(res.time) : ''}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                                {res.customerName}
                              </span>
                              {res.tableNumber && (
                                <span style={{ fontSize: '12px', color: '#64748B' }}>
                                  &bull; Mesa {res.tableNumber}
                                </span>
                              )}
                              {res.rescheduleStatus === 'DELAYED' && (
                                <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                  ⏱️ Retrasada
                                </span>
                              )}
                              {res.rescheduleStatus === 'PENDING_ACCEPTANCE' && (
                                <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                  ⏳ Reprogramada (Por Aceptar)
                                </span>
                              )}
                              {res.rescheduleStatus === 'ACCEPTED' && (
                                <span style={{ fontSize: '10px', background: '#ECFDF5', color: '#065F46', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                  ✓ Reprogramación Aceptada
                                </span>
                              )}
                              {res.rescheduleStatus === 'RESCHEDULED_BY_ADMIN' && (
                                <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                  🗓️ Reprogramada
                                </span>
                              )}
                            </div>
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
                        {Array.isArray(res.serviceSpecialists) && res.serviceSpecialists.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                            {res.serviceSpecialists.map((ss: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                                <IonIcon icon={personOutline} style={{ fontSize: '12px', color: '#10B981' }} />
                                <span style={{ fontWeight: '600', color: '#0F172A' }}>{ss.serviceName || 'Servicio'}:</span>
                                <span style={{ color: '#047857', fontWeight: '700' }}>{ss.employeeName || 'Sin asignar'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                            <IonIcon icon={personOutline} style={{ fontSize: '14px' }} />
                            <span>{res.employee?.name || res.employee?.username || 'Especialista Asignado'}</span>
                          </div>
                        )}

                        {/* TAREA 1: Pago Reportado Por Verificar en Cita */}
                        {res.paymentStatus !== 'PAID' && (Boolean(res.paymentReported) || (Array.isArray(res.abonosHistory) && res.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) && (
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
                              Abono reportado: <b style={{ color: '#047857' }}>${Number(res.abonosTotal || res.totalAmount || 0).toFixed(2)}</b> (Total: ${Number(res.totalAmount || 0).toFixed(2)})
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
                          {/* WhatsApp con Enlace de Control */}
                          {res.customerPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const appointmentUrl = `${window.location.origin}/appointment/${res.id}`;
                                const text = `Hola ${res.customerName}, te escribimos de ${user?.tenantName || 'FinoWork'} respecto a tu cita para ${res.serviceName || 'nuestro servicio'} el ${res.date} a las ${formatTime12h(res.time)}.\n\nPuedes ver los detalles, gestionar tu cita o reportar tu pago aquí:\n${appointmentUrl}`;
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
                              title="Enviar recordatorio y enlace de cita por WhatsApp"
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '13px' }} />
                              WhatsApp
                            </button>
                          )}

                          {/* Copiar Enlace de Control */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const appointmentUrl = `${window.location.origin}/appointment/${res.id}`;
                              navigator.clipboard.writeText(appointmentUrl);
                              presentToast({ message: '📋 Enlace de control de cita copiado', duration: 2000, color: 'success' });
                            }}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
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
                            title="Copiar enlace de control de cita del cliente"
                          >
                            <IonIcon icon={copyOutline} style={{ fontSize: '13px', color: '#10B981' }} />
                            Copiar Enlace
                          </button>

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

                          {/* Registrar Abono Directo */}
                          {res.paymentStatus !== 'PAID' && res.status !== ReservationStatus.CANCELED && (
                            <button
                              type="button"
                              onClick={(e) => openAbonoModal(res, e)}
                              style={{
                                background: '#FEF3C7',
                                border: '1px solid #FCD34D',
                                color: '#92400E',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="Registrar un abono parcial o pago en esta cita"
                            >
                              ➕ Abonar
                            </button>
                          )}

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
                locales={[esLocale]}
                locale="es"
                buttonText={{
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  list: 'Agenda'
                }}
                allDayText="Todo el día"
                slotLabelFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  omitZeroMinute: false,
                  meridiem: 'short',
                  hour12: true
                }}
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short',
                  hour12: true
                }}
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

                {/* 1. Selección Múltiple de Servicios */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                      Servicios a Realizar
                    </label>
                    {selectedServiceIds.length > 0 && (
                      <span style={{ background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        {selectedServiceIds.length} selec. • {totalDurationMinutes} min
                      </span>
                    )}
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '8px', background: '#F8FAFC' }}>
                    {servicesList.length === 0 ? (
                      <p style={{ margin: '8px', fontSize: '12px', color: '#DC2626' }}>
                        No hay servicios registrados. Ve a "Servicios / Productos" y crea servicios para seleccionarlos aquí.
                      </p>
                    ) : (
                      servicesList.map(p => {
                        const isSelected = selectedServiceIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleService(p.id)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              marginBottom: '6px',
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #10B981' : '1px solid #CBD5E1',
                              background: isSelected ? '#ECFDF5' : '#FFFFFF',
                              color: isSelected ? '#065F46' : '#0F172A',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '6px',
                                  border: isSelected ? '2px solid #10B981' : '1px solid #94A3B8',
                                  background: isSelected ? '#10B981' : 'transparent',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: '900',
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected ? '✓' : ''}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: isSelected ? '800' : '600' }}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: '11px', color: isSelected ? '#047857' : '#64748B' }}>
                                  ⏱️ {p.durationMinutes || 30} min
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? '#059669' : '#0F172A' }}>
                              ${Number(p.salePrice || 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedServiceIds.length > 0 && (
                    <div style={{ marginTop: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                        ⏱️ Duración total: <b>{totalDurationMinutes} min</b>
                      </div>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: '800' }}>
                        Total servicios: <b>${totalCalculatedPrice.toFixed(2)}</b>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Especialista Asignado */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    {selectedServices.length > 1 ? 'Especialistas por Servicio' : 'Especialista Asignado'}
                  </label>

                  {selectedServices.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedServices.map(srv => {
                        const qualifiedStaff = getStaffForSingleService(srv);
                        const assignedEmpId = serviceSpecialistMap[srv.id] || '';
                        return (
                          <div
                            key={srv.id}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                                ✂️ {srv.name}
                              </span>
                              <span style={{ fontSize: '11px', color: '#047857', fontWeight: '700', background: '#ECFDF5', padding: '2px 8px', borderRadius: '8px' }}>
                                ⏱️ {srv.durationMinutes || 30}m &bull; ${Number(srv.salePrice || 0).toFixed(2)}
                              </span>
                            </div>

                            <IonSelect
                              interface="popover"
                              value={assignedEmpId}
                              placeholder="Sin asignar / Cualquiera disponible"
                              onIonChange={e => {
                                const val = e.detail.value ?? '';
                                setServiceSpecialistMap(prev => ({ ...prev, [srv.id]: val }));
                              }}
                              style={{
                                width: '100%',
                                minHeight: '40px',
                                padding: '2px 10px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#0F172A',
                                background: '#F8FAFC',
                                '--padding-start': '0px',
                                '--padding-end': '0px',
                                '--placeholder-color': '#64748B',
                                '--placeholder-opacity': '1'
                              } as any}
                            >
                              <IonSelectOption value="">Sin asignar / Cualquiera disponible</IonSelectOption>
                              {qualifiedStaff.map((emp: any) => (
                                <IonSelectOption key={emp.id} value={emp.id}>
                                  👤 {emp.name || emp.username} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <IonSelect
                      interface="popover"
                      value={employeeId}
                      placeholder="Sin asignar / Cualquiera disponible"
                      onIonChange={e => {
                        const val = e.detail.value ?? '';
                        setEmployeeId(val);
                        if (selectedServices.length === 1) {
                          setServiceSpecialistMap({ [selectedServices[0].id]: val });
                        }
                      }}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '4px 14px',
                        borderRadius: '12px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        '--padding-start': '0px',
                        '--padding-end': '0px',
                        '--placeholder-color': '#64748B',
                        '--placeholder-opacity': '1'
                      } as any}
                    >
                      <IonSelectOption value="">Sin asignar / Cualquiera disponible</IonSelectOption>
                      {(selectedServices.length === 1 ? getStaffForSingleService(selectedServices[0]) : availableSpecialists).map(emp => (
                        <IonSelectOption key={emp.id} value={emp.id}>
                          👤 {emp.name || emp.username} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  )}
                </div>

                {/* 3. Fecha */}
                <div style={{ marginBottom: '14px' }}>
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

                {/* 4. Recuadro de Horarios Disponibles (Online) */}
                <div style={{ marginBottom: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={timeOutline} style={{ color: '#10B981', fontSize: '16px' }} />
                      Horarios Disponibles ({date || 'Elige fecha'})
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                      Bloques de {totalDurationMinutes} min
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <IonSpinner name="crescent" color="primary" />
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>Calculando cupos libres...</div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ padding: '10px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', fontSize: '12px', color: '#92400E', lineHeight: '1.4' }}>
                      ⚠️ No hay cupos automáticos calculados para esta fecha o especialista. Si deseas autorizar una excepción, ajusta la hora manual a continuación.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '2px' }}>
                      {availableSlots.map((slot, idx) => {
                        const isChosen = time === slot || time.substring(0, 5) === slot;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTime(slot)}
                            style={{
                              padding: '10px 4px',
                              borderRadius: '8px',
                              border: isChosen ? '2px solid #10B981' : '1px solid #A7F3D0',
                              background: isChosen ? '#10B981' : '#F0FDF4',
                              color: isChosen ? '#FFFFFF' : '#065F46',
                              fontSize: '12px',
                              fontWeight: isChosen ? '800' : '600',
                              cursor: 'pointer',
                              boxShadow: isChosen ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {formatTime12h(slot)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                      Hora Seleccionada: {time ? <b style={{ color: '#047857' }}>{formatTime12h(time)}</b> : <span style={{ color: '#94A3B8' }}>(Ninguna)</span>}
                    </span>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700', color: '#0F172A', background: '#FFFFFF' }}
                    />
                  </div>
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
                    <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>📅 {selectedEvent.date} a las <b>{selectedEvent.time ? formatTime12h(selectedEvent.time) : ''}</b> ({Number(selectedEvent.durationMinutes) || 30} min)</span>
                      {selectedEvent.rescheduleStatus === 'DELAYED' && (
                        <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          ⏱️ Retrasada {selectedEvent.originalTime ? `(Original: ${formatTime12h(selectedEvent.originalTime)})` : ''}
                        </span>
                      )}
                      {selectedEvent.rescheduleStatus === 'PENDING_ACCEPTANCE' && (
                        <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          ⏳ Reprogramada (Por Aceptar por Cliente) {selectedEvent.originalDate ? `(Orig: ${selectedEvent.originalDate} ${formatTime12h(selectedEvent.originalTime)})` : ''}
                        </span>
                      )}
                      {selectedEvent.rescheduleStatus === 'ACCEPTED' && (
                        <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          ✓ Aceptada por el Cliente {selectedEvent.originalDate ? `(Orig: ${selectedEvent.originalDate} ${selectedEvent.originalTime || ''})` : ''}
                        </span>
                      )}
                      {selectedEvent.rescheduleStatus === 'RESCHEDULED_BY_ADMIN' && (
                        <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          🗓️ Reprogramada {selectedEvent.originalDate ? `(Orig: ${selectedEvent.originalDate} ${selectedEvent.originalTime || ''})` : ''}
                        </span>
                      )}
                    </div>
                    {Array.isArray(selectedEvent.serviceSpecialists) && selectedEvent.serviceSpecialists.length > 0 ? (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                          Servicios y Especialistas Asignados:
                        </div>
                        {selectedEvent.serviceSpecialists.map((ss: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                            <span style={{ fontWeight: '700', color: '#0F172A' }}>✂️ {ss.serviceName || 'Servicio'}</span>
                            <span style={{ color: '#047857', fontWeight: '700', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                              👤 {ss.employeeName || 'Sin asignar'} {ss.price ? `($${Number(ss.price).toFixed(2)})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {selectedEvent.serviceName && (
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#047857', marginTop: '6px' }}>
                            ✂️ {selectedEvent.serviceName}
                          </div>
                        )}
                        {selectedEvent.employee && (
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                            👤 Especialista: <b>{selectedEvent.employee.name || selectedEvent.employee.username}</b>
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Total Servicio:</span>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981' }}>
                        ${Number(selectedEvent.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Desglose de Cuenta Abierta / Abonos en Reserva */}
                    {(Number(selectedEvent.abonosTotal || 0) > 0 || selectedEvent.paymentStatus !== 'PAID') && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748B', fontWeight: '600' }}>Total Abonado:</span>
                          <span style={{ fontWeight: '800', color: '#059669' }}>
                            ${Number(selectedEvent.abonosTotal || 0).toFixed(2)} USD
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#64748B', fontWeight: '700' }}>Saldo Pendiente:</span>
                          <span style={{ fontWeight: '900', color: '#D97706' }}>
                            ${Math.max(0, Number(selectedEvent.totalAmount || 0) - Number(selectedEvent.abonosTotal || 0)).toFixed(2)} USD
                          </span>
                        </div>
                        {Array.isArray(selectedEvent.abonosHistory) && selectedEvent.abonosHistory.length > 0 && (
                          <div style={{ marginTop: '8px', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                            <div style={{ fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Historial de Abonos:</div>
                            {selectedEvent.abonosHistory.map((ab: any, idx: number) => (
                              <div key={ab.id || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#334155' }}>
                                <span>
                                  #{idx + 1} ({ab.date ? new Date(ab.date).toLocaleDateString() : 'Hoy'})
                                  {ab.method ? ` • ${ab.method}` : ''}
                                  {ab.reference || ab.ref ? ` (Ref: ${ab.reference || ab.ref})` : ''}
                                </span>
                                <b style={{ color: '#059669' }}>${Number(ab.amount || 0).toFixed(2)}</b>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* TAREA 1: Pago Reportado Por Verificar en Modal */}
                  {selectedEvent.paymentStatus !== 'PAID' && (Boolean(selectedEvent.paymentReported) || (Array.isArray(selectedEvent.abonosHistory) && selectedEvent.abonosHistory.some((a: any) => a.status === 'REPORTED' || a.status === 'REPORTED_PENDING_APPROVAL'))) && (
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
                        El cliente reportó un pago electrónico para esta cita: <b style={{ color: '#047857' }}>${Number(selectedEvent.abonosTotal || selectedEvent.totalAmount || 0).toFixed(2)}</b> (Total Cita: ${Number(selectedEvent.totalAmount || 0).toFixed(2)}). Confirma que los fondos hayan ingresado en tu cuenta bancaria.
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

                  {/* Actions: Abonar, Cobrar, Reprogramar, Avisar Retraso & Editar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: selectedEvent.paymentStatus !== 'PAID' ? '1fr 1fr' : '1fr', gap: '8px' }}>
                      {selectedEvent.paymentStatus !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => openAbonoModal(selectedEvent)}
                          style={{
                            width: '100%',
                            padding: '12px 10px',
                            borderRadius: '10px',
                            border: '1px solid #FCD34D',
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '13px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ➕ Registrar Abono
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetails(false);
                          window.location.href = `/pos?reservationId=${selectedEvent.id}`;
                        }}
                        className="ff-btn-primary"
                        style={{ width: '100%', padding: '12px 10px', fontSize: '13px' }}
                      >
                        <IonIcon icon={cashOutline} />
                        Enviar a Caja
                      </button>
                    </div>

                      {/* Tarjeta Enlace de Control de Cita para el Cliente */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <IonIcon icon={linkOutline} style={{ color: '#10B981', fontSize: '15px' }} />
                            Enlace de Control del Cliente
                          </span>
                          <span style={{ fontSize: '10px', background: '#ECFDF5', color: '#065F46', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                            Autogestión
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
                          Tu cliente puede ver su especialista asignado, reportar su pago o reprogramar su cita desde este enlace.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: selectedEvent.customerPhone ? '1fr 1fr' : '1fr', gap: '8px', marginTop: '2px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/appointment/${selectedEvent.id}`;
                              navigator.clipboard.writeText(url);
                              presentToast({ message: '📋 Enlace copiado al portapapeles', duration: 2500, color: 'success' });
                            }}
                            style={{
                              padding: '9px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#0F172A',
                              fontSize: '12px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                            title="Copiar enlace para el cliente"
                          >
                            <IonIcon icon={copyOutline} style={{ fontSize: '14px', color: '#10B981' }} />
                            Copiar Enlace
                          </button>
                          {selectedEvent.customerPhone && (
                            <button
                              type="button"
                              onClick={() => {
                                const appointmentUrl = `${window.location.origin}/appointment/${selectedEvent.id}`;
                                const msg = `Hola ${selectedEvent.customerName}, te escribimos de ${user?.tenantName || 'FinoWork'} respecto a tu cita para ${selectedEvent.serviceName || 'nuestro servicio'} el ${selectedEvent.date} a las ${formatTime12h(selectedEvent.time)}.\n\nPuedes ver los detalles, gestionar tu cita o reportar tu pago aquí:\n${appointmentUrl}`;
                                window.open(formatWhatsAppUrl(selectedEvent.customerPhone, msg), '_blank');
                              }}
                              style={{
                                padding: '9px 10px',
                                borderRadius: '8px',
                                border: '1px solid #A7F3D0',
                                background: '#ECFDF5',
                                color: '#065F46',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                              }}
                              title="Enviar recordatorio y enlace por WhatsApp"
                            >
                              <IonIcon icon={logoWhatsapp} style={{ fontSize: '14px' }} />
                              WhatsApp
                            </button>
                          )}
                        </div>
                      </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openReschedule(selectedEvent)}
                        style={{
                          padding: '11px 8px',
                          borderRadius: '10px',
                          border: '1px solid #10B981',
                          background: '#ECFDF5',
                          color: '#065F46',
                          fontSize: '13px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <IonIcon icon={calendarOutline} style={{ fontSize: '16px' }} />
                        Reprogramar Cita
                      </button>

                      <button
                        type="button"
                        disabled={notifyingDelayId === selectedEvent.id}
                        onClick={() => handleNotifyDelay(selectedEvent.id, 15)}
                        style={{
                          padding: '11px 8px',
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
                        {notifyingDelayId === selectedEvent.id ? 'Avisando...' : 'Retraso (+15m)'}
                      </button>
                    </div>

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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                A partir de (Hora): {shiftTimeFrom ? <b style={{ color: '#D97706' }}>({formatTime12h(shiftTimeFrom)})</b> : ''}
              </label>
              <input type="time" value={shiftTimeFrom} onChange={e => setShiftTimeFrom(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Minutos a desplazar:</label>
              <IonSelect
                interface="popover"
                value={shiftMinutes}
                onIonChange={e => setShiftMinutes(Number(e.detail.value))}
                style={{ width: '100%', minHeight: '42px', padding: '2px 10px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#ffffff', '--padding-start': '0px', '--padding-end': '0px' } as any}
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

        {/* Modal de Reprogramación Directa para Administrador */}
        <IonModal isOpen={showRescheduleModal} onDidDismiss={() => setShowRescheduleModal(false)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                🗓️ Reprogramar Cita
              </h2>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
              {selectedEvent && (
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{selectedEvent.customerName}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Horario Actual: 📅 {selectedEvent.date} a las <b>{selectedEvent.time ? formatTime12h(selectedEvent.time) : ''}</b> ({Number(selectedEvent.durationMinutes) || 30} min)
                  </div>
                  {selectedEvent.serviceName && (
                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                      ✂️ {selectedEvent.serviceName}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                  Nueva Fecha *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                  Nueva Hora * {rescheduleTime ? <b style={{ color: '#047857' }}>({formatTime12h(rescheduleTime)})</b> : ''}
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                  Motivo de Reprogramación (Opcional)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="Ej. Solicitud del cliente / Imprevisto en salón"
                  style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Se notificará automáticamente al cliente vía Push y se generará enlace de WhatsApp.
                </span>
              </div>

              <button
                type="button"
                disabled={isRescheduling}
                onClick={() => handleConfirmReschedule(false)}
                className="ff-btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '14px', borderRadius: '12px' }}
              >
                {isRescheduling ? 'Reprogramando...' : 'Confirmar Nueva Hora ✓'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* Modal de Registrar Abono en Reserva */}
        <IonModal isOpen={Boolean(selectedReservationForAbono)} onDidDismiss={() => setSelectedReservationForAbono(null)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                ➕ Registrar Abono de Cita
              </h2>
              <button
                type="button"
                onClick={() => setSelectedReservationForAbono(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            {selectedReservationForAbono && (() => {
              const rate = Number(settings?.exchangeRateBs || 40);
              const totalResUsd = Number(selectedReservationForAbono.totalAmount || 0);
              const abonosResUsd = Number(selectedReservationForAbono.abonosTotal || 0);
              const remainingResUsd = Math.max(0, totalResUsd - abonosResUsd);
              const isBsMethod = ['PAGO_MOVIL', 'TRANSFER', 'PUNTO', 'CASH_BS'].includes(abonoMethod);
              const parsedInput = parseFloat(abonoAmount) || 0;
              const equivalentUsd = isBsMethod && rate > 0 ? parsedInput / rate : parsedInput;

              return (
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                      {selectedReservationForAbono.customerName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#92400E', fontWeight: '600' }}>Total Servicio:</span>
                      <span style={{ fontWeight: '800', color: '#0F172A' }}>${totalResUsd.toFixed(2)} USD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#92400E', fontWeight: '600' }}>Abonado Previamente:</span>
                      <span style={{ fontWeight: '800', color: '#10B981' }}>${abonosResUsd.toFixed(2)} USD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', borderTop: '1px dashed #FCD34D' }}>
                      <span style={{ color: '#92400E', fontWeight: '700' }}>Saldo Pendiente:</span>
                      <span style={{ fontWeight: '900', color: '#D97706' }}>
                        ${remainingResUsd.toFixed(2)} USD (~Bs. {(remainingResUsd * rate).toFixed(2)})
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Método del Abono
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'USD', label: '💵 USD' },
                        { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' },
                        { id: 'PUNTO', label: '💳 Punto' },
                        { id: 'TRANSFER', label: '🏦 Transf.' },
                        { id: 'BINANCE', label: '🟡 Binance' },
                        { id: 'CASH_BS', label: '🇻🇪 Efec. Bs' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setAbonoMethod(m.id);
                            setAbonoAmount('');
                          }}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '10px',
                            border: abonoMethod === m.id ? '2px solid #10B981' : '1px solid #E2E8F0',
                            background: abonoMethod === m.id ? '#ECFDF5' : '#F8FAFC',
                            color: abonoMethod === m.id ? '#065F46' : '#334155',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                        Monto a Abonar ({isBsMethod ? 'Bolívares Bs.' : 'Dólares USD'}) *
                      </label>
                      {remainingResUsd > 0 && (
                        <button
                          type="button"
                          onClick={() => setAbonoAmount((isBsMethod ? remainingResUsd * rate : remainingResUsd).toFixed(2))}
                          style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Saldo Total ({isBsMethod ? `Bs. ${(remainingResUsd * rate).toFixed(2)}` : `$${remainingResUsd.toFixed(2)}`})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={abonoAmount}
                      onChange={e => setAbonoAmount(e.target.value)}
                      placeholder={isBsMethod ? `Ej. ${(remainingResUsd * rate || 100).toFixed(2)}` : `Ej. ${(remainingResUsd || 10).toFixed(2)}`}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '16px', fontWeight: '800', color: '#0F172A', boxSizing: 'border-box' }}
                    />
                    {parsedInput > 0 && (
                      <div style={{ fontSize: '12px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                        ✓ Se acreditarán ${equivalentUsd.toFixed(2)} USD a la reserva (Tasa: Bs. {rate.toFixed(2)})
                      </div>
                    )}
                  </div>

                  {abonoMethod !== 'USD' && abonoMethod !== 'CASH_BS' && (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          N° de Referencia / Comprobante
                        </label>
                        <input
                          type="text"
                          value={abonoRef}
                          onChange={e => setAbonoRef(e.target.value)}
                          placeholder="Últimos 4-6 dígitos"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Banco / Terminal (Opcional)
                        </label>
                        <input
                          type="text"
                          value={abonoBank}
                          onChange={e => setAbonoBank(e.target.value)}
                          placeholder="Ej. Banesco / Mercantil"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={isSubmittingAbono}
                    onClick={handleRegisterAbono}
                    className="ff-btn-primary"
                    style={{ width: '100%', padding: '13px', fontSize: '14px', borderRadius: '12px' }}
                  >
                    {isSubmittingAbono ? <IonSpinner name="crescent" /> : 'Confirmar Abono ✓'}
                  </button>
                </div>
              );
            })()}
          </div>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default Reservations;
