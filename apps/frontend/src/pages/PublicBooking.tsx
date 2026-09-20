import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonCard, IonCardContent, IonInput, IonLabel, IonItem, IonButton, useIonToast, IonSpinner, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { checkmarkCircleOutline, calendarOutline, timeOutline, personOutline, chevronBackOutline } from 'ionicons/icons';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DAYS_OF_WEEK = ['0', '1', '2', '3', '4', '5', '6'];

const PublicBooking: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [magicLink, setMagicLink] = useState('');

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}`);
        setTenantInfo(res.data);
        
        // If no services are defined, skip step 1
        if (!res.data.services || res.data.services.length === 0) {
          setStep(2);
        }
      } catch (e) {
        presentToast({ message: 'Error cargando información', duration: 3000, color: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) fetchTenant();
  }, [tenantId]);

  const handleSubmit = async () => {
    if (!customerName) {
      presentToast({ message: 'Por favor, ingresa tu nombre', duration: 2000, color: 'warning' });
      return;
    }

    try {
      const res = await axios.post(`${apiBase}/public/reservations/${tenantId}`, {
        customerName, 
        customerPhone, 
        date: (selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined), 
        time: selectedTime, 
        numberOfPeople, 
        notes,
        serviceId: selectedService?.id,
        serviceName: selectedService?.name
      });
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
        const res = await axios.get(`${apiBase}/public/reservations/tenant/${tenantId}/availability?date=${dStr}${sId}`);
        setAvailableSlots(res.data);
      } catch (e) {
        presentToast({ message: 'Error cargando horarios', duration: 2000, color: 'danger' });
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedService, tenantId]);

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
    if (step === 2 && tenantInfo?.services?.length > 0) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
        <div style={{ maxWidth: '500px', margin: '20px auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            {step > 1 && (step !== 2 || tenantInfo?.services?.length > 0) && (
              <IonButton fill="clear" onClick={goBack} style={{ margin: 0 }}>
                <IonIcon slot="icon-only" icon={chevronBackOutline} />
              </IonButton>
            )}
            <h2 style={{ fontWeight: 'bold', color: '#333', margin: '0 auto', paddingRight: step > 1 ? '48px' : '0' }}>
              {tenantInfo?.name}
            </h2>
          </div>

          <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <IonCardContent style={{ padding: '20px' }}>
              
              {/* STEP 1: SERVICES */}
              {step === 1 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center'}}>Selecciona un Servicio</h3>
                  {tenantInfo?.services?.map((svc: any) => (
                    <div 
                      key={svc.id} 
                      onClick={() => { setSelectedService(svc); setStep(2); }}
                      style={{ 
                        padding: '15px', 
                        border: '1px solid #ddd', 
                        borderRadius: '8px', 
                        marginBottom: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{fontWeight: 'bold', fontSize: '16px', color: '#333'}}>{svc.name}</div>
                        <div style={{fontSize: '13px', color: '#666', marginTop: '4px'}}><IonIcon icon={timeOutline} style={{verticalAlign:'middle', marginRight:'4px'}}/> {svc.durationMinutes} min</div>
                      </div>
                      {svc.price > 0 && <div style={{fontWeight: 'bold', color: 'var(--ion-color-primary)'}}>${svc.price}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 2: DATE */}
              {step === 2 && (
                <div>
                  <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center'}}>Elige una Fecha</h3>
                  {selectedService && (
                    <div style={{textAlign: 'center', marginBottom: '15px', color: '#666', fontSize: '14px'}}>
                      Servicio: <b>{selectedService.name}</b>
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
                  <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center'}}>Horas Disponibles</h3>
                  <div style={{textAlign: 'center', marginBottom: '15px', color: '#666', fontSize: '14px'}}>
                    Para el <b>{selectedDate?.toLocaleDateString()}</b>
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
                  
                  <div style={{ backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                    <b>Resumen:</b><br/>
                    {selectedDate?.toLocaleDateString()} a las {selectedTime}<br/>
                    {selectedService ? `Servicio: ${selectedService.name}` : ''}
                  </div>

                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Nombre Completo *</IonLabel>
                    <IonInput value={customerName} onIonInput={e => setCustomerName(e.detail.value!)} placeholder="Ej. Ana Pérez" />
                  </IonItem>
                  
                  <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Teléfono *</IonLabel>
                    <IonInput value={customerPhone} onIonInput={e => setCustomerPhone(e.detail.value!)} placeholder="Ej. +58 414..." />
                  </IonItem>

                  {!tenantInfo?.services?.length && (
                    <IonItem lines="none" style={{ marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                      <IonLabel position="stacked">Cantidad de Personas</IonLabel>
                      <IonInput type="number" value={numberOfPeople} onIonInput={e => setNumberOfPeople(parseInt(e.detail.value!, 10))} min={1} />
                    </IonItem>
                  )}
                  
                  <IonItem lines="none" style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <IonLabel position="stacked">Notas Especiales</IonLabel>
                    <IonInput value={notes} onIonInput={e => setNotes(e.detail.value!)} placeholder="Ej. Retiro de acrílico..." />
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
    </IonPage>
  );
};

export default PublicBooking;
