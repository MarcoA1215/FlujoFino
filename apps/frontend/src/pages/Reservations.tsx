import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonContent, IonFab, IonFabButton, IonIcon, useIonToast, IonModal, IonItem, IonLabel, IonInput, IonButton, IonSelect, IonSelectOption, IonText, IonGrid, IonRow, IonCol, IonCard, IonCardContent } from '@ionic/react';
import { addOutline, trashOutline, cashOutline, saveOutline, refreshOutline, timeOutline, logoWhatsapp } from 'ionicons/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { apiClient } from '../api/client';
import { ReservationStatus, PaymentStatus } from '@nutrideli/shared-types';

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [presentToast] = useIonToast();
  
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
  const [products, setProducts] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTimeFrom, setShiftTimeFrom] = useState('');
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [shiftAffected, setShiftAffected] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  const fetchReservations = async () => {
    try {
      const res = await apiClient.get('/reservations');
      setReservations(res.data);
    } catch (e) {
      presentToast({ message: 'Error al cargar reservaciones', duration: 3000, color: 'danger' });
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data || {});
    } catch (e) {
      console.error('Error fetching settings', e);
    }
  };

  useEffect(() => {
    fetchReservations();
    fetchProducts();
    fetchSettings();
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
  }, []);

  const handleMassShift = async () => {
    if (!shiftTimeFrom || !shiftMinutes) return;
    const dateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; // Current day by default
    
    try {
      const res = await apiClient.post('/reservations/shift', {
        date: dateStr,
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
    setDate('');
    setTime('');
    setServiceId('');
    setNumberOfPeople(1);
    setTableNumber('');
    setTotalAmount(0);
    setNotes('');
    setShowModal(true);
  };

  const handleServiceChange = (sId: string) => {
    setServiceId(sId);
    const found = products.find(p => p.id === sId);
    if (found) {
      if (!totalAmount || totalAmount === 0) {
        setTotalAmount(found.salePrice || 0);
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
        presentToast({ message: 'Reservación creada', duration: 2000, color: 'success' });
      }
      setShowModal(false);
      fetchReservations();
    } catch (e: any) {
      const errMsg = e.response?.data?.message || '';
      if (errMsg.includes('choca con la cita') || errMsg.includes('horario laboral')) {
        if (window.confirm(errMsg + '\n\n¿Estás seguro de que deseas forzar y agendar esta reservación de todas formas?')) {
          handleSave(true);
        }
      } else {
        presentToast({ message: errMsg || 'Error guardando reservación', duration: 3500, color: 'danger' });
      }
    }
  };

  const handleEventClick = (info: any) => {
    const res = reservations.find(r => r.id === info.event.id);
    if (res) {
      setSelectedEvent(res);
      setShowDetails(true);
    }
  };

  const changeStatus = async (id: string, status: ReservationStatus) => {
    try {
      await apiClient.put(`/reservations/${id}/status`, { status });
      fetchReservations();
      setShowDetails(false);
      presentToast({ message: 'Estado actualizado', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error', duration: 3000, color: 'danger' });
    }
  };

  const handleAddAbono = async () => {
    if (!selectedEvent || !abonoAmount || isNaN(Number(abonoAmount))) return;
    try {
      await apiClient.post(`/reservations/${selectedEvent.id}/abono`, { amount: Number(abonoAmount) });
      presentToast({ message: 'Abono registrado', duration: 2000, color: 'success' });
      setAbonoAmount('');
      fetchReservations();
      
      // Update selectedEvent locally to show changes immediately
      const res = await apiClient.get('/reservations');
      const updated = res.data.find((r: any) => r.id === selectedEvent.id);
      setSelectedEvent(updated);
      setReservations(res.data);
    } catch (e) {
      presentToast({ message: 'Error registrando abono', duration: 2000, color: 'danger' });
    }
  };

  const handleRevertAbono = async (index: number) => {
    if (!selectedEvent) return;
    try {
      await apiClient.delete(`/reservations/${selectedEvent.id}/abono/${index}`);
      presentToast({ message: 'Abono revertido', duration: 2000, color: 'success' });
      const res = await apiClient.get('/reservations');
      const updated = res.data.find((r: any) => r.id === selectedEvent.id);
      setSelectedEvent(updated);
      setReservations(res.data);
    } catch (e) {
      presentToast({ message: 'Error revirtiendo abono', duration: 2000, color: 'danger' });
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      await apiClient.delete(`/reservations/${id}`);
      fetchReservations();
      setShowDetails(false);
      presentToast({ message: 'Reservación eliminada', duration: 2000, color: 'success' });
    } catch (e) {
      presentToast({ message: 'Error eliminando', duration: 3000, color: 'danger' });
    }
  };

  const openEdit = (res: any) => {
    setEditingId(res.id);
    setCustomerName(res.customerName);
    setCustomerPhone(res.customerPhone || '');
    setDate(res.date);
    setTime(res.time);
    setServiceId(res.serviceId || '');
    setNumberOfPeople(res.numberOfPeople);
    setTableNumber(res.tableNumber || '');
    setTotalAmount(res.totalAmount || 0);
    setNotes(res.notes || '');
    setShowDetails(false);
    setShowModal(true);
  };

  const events = reservations.map(r => {
    let color = '#3880ff'; // primary
    if (r.status === ReservationStatus.CONFIRMED) color = '#2dd36f'; // success
    if (r.status === ReservationStatus.CANCELED) color = '#eb445a'; // danger
    if (r.status === ReservationStatus.COMPLETED) color = '#92949c'; // medium

    let dur = 30;
    const prod = products.find(p => p.id === r.serviceId || (r.serviceName && p.name.trim().toLowerCase() === r.serviceName.trim().toLowerCase()));
    if (prod && prod.durationMinutes) {
      dur = Number(prod.durationMinutes);
    }

    const [rh, rm] = (r.time || '00:00').split(':').map(Number);
    const endMins = rh * 60 + rm + dur;
    const endH = String(Math.floor(endMins / 60)).padStart(2, '0');
    const endM = String(endMins % 60).padStart(2, '0');

    return {
      id: r.id,
      title: r.serviceName ? `${r.customerName} - ${r.serviceName}` : `${r.customerName} (${r.numberOfPeople || 1} pax) ${r.tableNumber ? 'Mesa ' + r.tableNumber : ''}`,
      start: `${r.date}T${r.time}`,
      end: `${r.date}T${endH}:${endM}:00`,
      color
    };
  });

  // Calculate calendar visible hours based on business hours with 1h grace before and after
  const { slotMinTime, slotMaxTime, scrollTime } = React.useMemo(() => {
    const bHours = settings?.businessHours;
    let minHour = 8;
    let maxHour = 19;
    let foundOpenDay = false;

    if (bHours && typeof bHours === 'object') {
      let earliestMinutes = 24 * 60;
      let latestMinutes = 0;

      Object.values(bHours).forEach((d: any) => {
        if (d && d.isOpen && d.startTime && d.endTime) {
          foundOpenDay = true;
          const [sh, sm] = String(d.startTime).split(':').map(Number);
          const [eh, em] = String(d.endTime).split(':').map(Number);
          const startM = (sh || 0) * 60 + (sm || 0);
          const endM = (eh || 0) * 60 + (em || 0);
          if (startM < earliestMinutes) earliestMinutes = startM;
          if (endM > latestMinutes) latestMinutes = endM;
        }
      });

      if (foundOpenDay) {
        minHour = Math.floor(earliestMinutes / 60);
        maxHour = Math.ceil(latestMinutes / 60);
      }
    }

    // 1 hora de antelación y 1 hora de margen posterior
    let slotMin = Math.max(0, minHour - 1);
    let slotMax = Math.min(24, maxHour + 1);

    // Si existen citas fuera de este rango, expandir dinámicamente para no ocultar nada
    reservations.forEach(r => {
      if (r.time) {
        const [h] = String(r.time).split(':').map(Number);
        if (!isNaN(h)) {
          if (h < slotMin) slotMin = Math.max(0, h - 1);
          if (h + 1 > slotMax) slotMax = Math.min(24, h + 2);
        }
      }
    });

    return {
      slotMinTime: `${String(slotMin).padStart(2, '0')}:00:00`,
      slotMaxTime: `${String(slotMax).padStart(2, '0')}:00:00`,
      scrollTime: `${String(Math.max(slotMin, minHour)).padStart(2, '0')}:00:00`
    };
  }, [settings?.businessHours, reservations]);

  const calendarRef = React.useRef<FullCalendar>(null);
  const isMobile = window.innerWidth < 768;
  const [mobileView, setMobileView] = useState('listWeek');

  const handleMobileViewChange = (e: any) => {
    const newView = e.detail.value;
    setMobileView(newView);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(newView);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Reservaciones</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openShiftModal} color="warning" fill="solid" style={{ marginRight: '10px', fontWeight: 'bold' }}>
              <IonIcon icon={timeOutline} slot="start" />
              Retraso
            </IonButton>
            <IonButton onClick={fetchReservations}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {isMobile && (
          <IonToolbar color="light">
            <div style={{ padding: '0 10px', width: '100%' }}>
              <IonSelect value={mobileView} onIonChange={handleMobileViewChange} interface="popover" style={{ width: '100%', minHeight: '40px' }}>
                <IonSelectOption value="timeGridDay">Vista de Hoy (Agenda)</IonSelectOption>
                <IonSelectOption value="listWeek">Lista de la Semana</IonSelectOption>
              </IonSelect>
            </div>
          </IonToolbar>
        )}
      </IonHeader>
      
      <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
        <div className="fc-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            headerToolbar={isMobile ? {
              left: 'prev,next',
              center: 'title',
              right: ''
            } : {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            locale="es"
            events={events}
            eventClick={handleEventClick}
            height="80vh"
            allDaySlot={false}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            scrollTime={scrollTime}
            slotDuration="00:30:00"
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
          />
        </div>

        <IonModal isOpen={showShiftModal} onDidDismiss={() => setShowShiftModal(false)}>
          <IonHeader>
            <IonToolbar color="warning">
              <IonTitle>Retraso Imprevisto</IonTitle>
              <IonButtons slot="end"><IonButton onClick={() => setShowShiftModal(false)}>Cerrar</IonButton></IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <p style={{ fontSize: '14px', color: '#666' }}>
              Usa esta herramienta si el local sufre un retraso. Todas las citas pendientes del día de hoy a partir de la hora seleccionada se desplazarán automáticamente.
            </p>
            <IonItem>
              <IonLabel position="stacked">A partir de (Hora) *</IonLabel>
              <IonInput type="time" value={shiftTimeFrom} onIonInput={e => setShiftTimeFrom(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Minutos a desplazar *</IonLabel>
              <IonSelect value={shiftMinutes} onIonChange={e => setShiftMinutes(e.detail.value)}>
                <IonSelectOption value={15}>15 minutos</IonSelectOption>
                <IonSelectOption value={30}>30 minutos</IonSelectOption>
                <IonSelectOption value={60}>1 hora (60 min)</IonSelectOption>
                <IonSelectOption value={90}>1.5 horas (90 min)</IonSelectOption>
                <IonSelectOption value={120}>2 horas (120 min)</IonSelectOption>
              </IonSelect>
            </IonItem>
            
            <IonButton expand="block" color="warning" className="ion-margin-top" onClick={handleMassShift}>
              <IonIcon icon={timeOutline} slot="start" />
              Aplicar Retraso
            </IonButton>

            {shiftAffected.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontWeight: 'bold' }}>Citas Reprogramadas ({shiftAffected.length}):</h3>
                {shiftAffected.map(a => (
                  <IonCard key={a.id} style={{ margin: '10px 0' }}>
                    <IonCardContent>
                      <b>{a.customerName}</b><br/>
                      <span style={{ color: '#888', textDecoration: 'line-through' }}>{a.oldTime}</span>
                      <span style={{ color: 'var(--ion-color-danger)', fontWeight: 'bold', marginLeft: '10px' }}>{a.newTime}</span>
                      {a.whatsappLink && (
                        <IonButton size="small" fill="outline" color="success" style={{ marginTop: '10px' }} onClick={() => window.open(a.whatsappLink, '_blank')}>
                          <IonIcon icon={logoWhatsapp} slot="start" />
                          Avisar
                        </IonButton>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </IonContent>
        </IonModal>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openNew} color="tertiary">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Create/Edit Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar color="tertiary">
              <IonTitle>{editingId ? 'Editar Reservación' : 'Nueva Reservación'}</IonTitle>
              <IonButtons slot="end"><IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton></IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Nombre del Cliente *</IonLabel>
              <IonInput value={customerName} onIonInput={e => setCustomerName(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Teléfono</IonLabel>
              <IonInput value={customerPhone} onIonInput={e => setCustomerPhone(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Fecha *</IonLabel>
              <IonInput type="date" value={date} onIonInput={e => setDate(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Hora *</IonLabel>
              <IonInput type="time" value={time} onIonInput={e => setTime(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Servicio (Opcional)</IonLabel>
              <IonSelect value={serviceId} onIonChange={e => handleServiceChange(e.detail.value)} interface="popover" placeholder="Selecciona un servicio">
                <IonSelectOption value="">Sin servicio específico</IonSelectOption>
                {products.map(p => (
                  <IonSelectOption key={p.id} value={p.id}>
                    {p.name} ({p.durationMinutes || 30} min) - ${Number(p.salePrice).toFixed(2)}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Cantidad de Personas</IonLabel>
              <IonInput type="number" min="0" value={numberOfPeople} onIonInput={e => setNumberOfPeople(parseInt(e.detail.value!, 10) || 1)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Número de Mesa (Opcional)</IonLabel>
              <IonInput value={tableNumber} onIonInput={e => setTableNumber(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Total a Cobrar ($) (Opcional)</IonLabel>
              <IonInput type="number" min="0" value={totalAmount} onIonInput={e => setTotalAmount(parseFloat(e.detail.value!) || 0)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Notas</IonLabel>
              <IonInput value={notes} onIonInput={e => setNotes(e.detail.value!)} />
            </IonItem>
            
            <IonButton expand="block" color="tertiary" className="ion-margin-top" onClick={() => handleSave(false)}>
              <IonIcon icon={saveOutline} slot="start" />
              Guardar Reservación
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Details & Payment Modal */}
        <IonModal isOpen={showDetails} onDidDismiss={() => setShowDetails(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Detalles de la Reservación</IonTitle>
              <IonButtons slot="end"><IonButton onClick={() => setShowDetails(false)}>Cerrar</IonButton></IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedEvent && (
              <>
                <IonCard>
                  <IonCardContent>
                    <h2><b>Cliente:</b> {selectedEvent.customerName}</h2>
                    {selectedEvent.customerPhone && <p><b>Teléfono:</b> {selectedEvent.customerPhone}</p>}
                    <p><b>Fecha/Hora:</b> {selectedEvent.date} a las {selectedEvent.time}</p>
                    <p><b>Personas:</b> {selectedEvent.numberOfPeople}</p>
                    {selectedEvent.tableNumber && <p><b>Mesa:</b> {selectedEvent.tableNumber}</p>}
                    {selectedEvent.notes && <p><b>Notas:</b> {selectedEvent.notes}</p>}
                    {selectedEvent.referralSource && <p><b>Origen:</b> {selectedEvent.referralSource}</p>}
                    <p><b>Estado Actual:</b> {selectedEvent.status}</p>
                    <p><b>Monto Total:</b> ${selectedEvent.totalAmount.toFixed(2)}</p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <IonButton size="small" color="success" onClick={() => changeStatus(selectedEvent.id, ReservationStatus.CONFIRMED)}>Confirmar</IonButton>
                      <IonButton size="small" color="medium" onClick={() => changeStatus(selectedEvent.id, ReservationStatus.COMPLETED)}>Completada</IonButton>
                      <IonButton size="small" color="danger" fill="outline" onClick={() => changeStatus(selectedEvent.id, ReservationStatus.CANCELED)}>Cancelar</IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* Pagos / Abonos */}
                {selectedEvent.totalAmount > 0 && (
                  <IonCard>
                    <IonCardContent>
                      <h3>Abonos y Pagos</h3>
                      <IonText color={selectedEvent.paymentStatus === PaymentStatus.PAID ? 'success' : 'warning'}>
                        <b>Estado de Pago:</b> {selectedEvent.paymentStatus}
                      </IonText>
                      <p>Total Abonado: ${selectedEvent.abonosTotal.toFixed(2)}</p>
                      <p>Restante: ${(selectedEvent.totalAmount - selectedEvent.abonosTotal).toFixed(2)}</p>

                      <IonItem className="ion-margin-top">
                        <IonLabel position="stacked">Monto a abonar ($)</IonLabel>
                        <IonInput type="number" min="0" value={abonoAmount} onIonInput={e => setAbonoAmount(e.detail.value!)} />
                      </IonItem>
                      <IonButton expand="block" size="small" color="primary" onClick={handleAddAbono}>
                        <IonIcon icon={cashOutline} slot="start" /> Registrar Abono
                      </IonButton>

                      {selectedEvent.abonosHistory && selectedEvent.abonosHistory.length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                          <h4>Historial:</h4>
                          {selectedEvent.abonosHistory.map((ab: any, i: number) => (
                            <IonItem key={i}>
                              <IonLabel>
                                ${ab.amount.toFixed(2)} - {new Date(ab.date).toLocaleString()}
                              </IonLabel>
                              <IonButton fill="clear" color="danger" onClick={() => handleRevertAbono(i)}>
                                <IonIcon icon={trashOutline} slot="icon-only" />
                              </IonButton>
                            </IonItem>
                          ))}
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                )}

                  {/* Acciones Generales */}
                  <IonGrid>
                    <IonRow>
                      <IonCol>
                        <IonButton expand="block" color="tertiary" onClick={() => {
                          setShowDetails(false);
                          window.location.href = `/pos?reservationId=${selectedEvent.id}`;
                        }}>
                          <IonIcon icon={cashOutline} slot="start" /> Enviar a Caja
                        </IonButton>
                      </IonCol>
                    </IonRow>
                    <IonRow>
                      <IonCol>
                        <IonButton expand="block" color="primary" fill="outline" onClick={() => openEdit(selectedEvent)}>Editar Detalles</IonButton>
                      </IonCol>
                      <IonCol>
                        <IonButton expand="block" color="danger" fill="clear" onClick={() => deleteReservation(selectedEvent.id)}>
                          <IonIcon icon={trashOutline} slot="start" /> Eliminar
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Reservations;

