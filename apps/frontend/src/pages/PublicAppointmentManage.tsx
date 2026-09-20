import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonSpinner, IonCard, IonCardContent, IonButton, IonIcon, useIonToast, IonItem, IonLabel, IonSelect, IonSelectOption, IonGrid, IonRow, IonCol } from '@ionic/react';
import { useParams } from 'react-router-dom';
import { calendarOutline, closeCircleOutline, timeOutline, checkmarkCircleOutline, walletOutline } from 'ionicons/icons';
import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PublicAppointmentManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [presentToast] = useIonToast();

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

  const handleCancel = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    try {
      await axios.put(`${apiBase}/public/reservations/appointment/${id}/cancel`);
      presentToast({ message: 'Cita cancelada con éxito', duration: 3000, color: 'success' });
      fetchAppointment();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Error al cancelar', duration: 3000, color: 'danger' });
    }
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

  const generateFutureDates = () => {
    const dates = [];
    const today = new Date();
    for(let i=0; i<14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      dates.push(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    }
    return dates;
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ 'backgroundColor': '#f4f5f8' }}>
        <div style={{ maxWidth: '500px', margin: '20px auto' }}>
          
          <h2 style={{ fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: '20px' }}>
            {appointment.tenantName}
          </h2>

          {!showReschedule ? (
            <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {appointment.status === 'CANCELED' ? (
                    <IonIcon icon={closeCircleOutline} style={{ fontSize: '48px', color: 'var(--ion-color-danger)' }} />
                  ) : appointment.status === 'COMPLETED' ? (
                    <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '48px', color: 'var(--ion-color-success)' }} />
                  ) : (
                    <IonIcon icon={calendarOutline} style={{ fontSize: '48px', color: 'var(--ion-color-primary)' }} />
                  )}
                  <h2 style={{ fontWeight: 'bold', marginTop: '10px', color: '#333' }}>Detalles de tu Cita</h2>
                  
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    backgroundColor: appointment.status === 'CANCELED' ? '#ffdddd' : '#ddffdd',
                    color: appointment.status === 'CANCELED' ? '#d00' : '#0a0',
                    marginTop: '10px'
                  }}>
                    {appointment.status}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px 0' }}><b>Cliente:</b> {appointment.customerName}</p>
                  <p style={{ margin: '0 0 10px 0' }}><b>Servicio:</b> {appointment.serviceName || 'Reserva Estándar'}</p>
                  <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center' }}>
                    <IonIcon icon={calendarOutline} style={{ marginRight: '8px' }}/> {appointment.date}
                  </p>
                  <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                    <IonIcon icon={timeOutline} style={{ marginRight: '8px' }}/> {appointment.time}
                  </p>
                </div>

                {appointment.servicePrice > 0 && !isPastOrClosed && (
                  <div style={{ backgroundColor: '#eef8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '16px', color: 'var(--ion-color-primary)' }}>
                      <IonIcon icon={walletOutline} style={{ marginRight: '8px' }}/> Inversión: ${appointment.servicePrice}
                    </h3>
                    {appointment.bankInfo && (
                      <div style={{ fontSize: '13px', color: '#555' }}>
                        <b>Datos para pago / seña:</b><br/>
                        Banco: {appointment.bankInfo}<br/>
                        Cédula/RIF: {appointment.companyCedula}<br/>
                        Teléfono: {appointment.companyPhone}
                      </div>
                    )}
                  </div>
                )}

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

              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <IonCardContent style={{ padding: '20px' }}>
                <h3 style={{fontWeight: 'bold', marginBottom: '15px', textAlign: 'center'}}>Reprogramar Cita</h3>
                
                <IonItem lines="none" style={{ border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px' }}>
                  <IonLabel position="stacked">Selecciona Nueva Fecha</IonLabel>
                  <IonSelect value={selectedDate} onIonChange={e => setSelectedDate(e.detail.value)} placeholder="Elige un día">
                    {generateFutureDates().map(d => (
                      <IonSelectOption key={d} value={d}>{d}</IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

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
                  color="primary" 
                  disabled={!selectedDate || !selectedTime} 
                  onClick={handleReschedule}
                  style={{ marginBottom: '10px' }}
                >
                  Confirmar Reprogramación
                </IonButton>
                <IonButton expand="block" color="medium" fill="clear" onClick={() => setShowReschedule(false)}>
                  Cancelar
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}
          
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicAppointmentManage;

