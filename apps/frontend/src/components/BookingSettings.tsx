import React, { useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon, IonRow, IonCol, IonGrid, IonToggle } from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';

const DAYS_OF_WEEK = [
  { id: '1', name: 'Lunes' },
  { id: '2', name: 'Martes' },
  { id: '3', name: 'Miércoles' },
  { id: '4', name: 'Jueves' },
  { id: '5', name: 'Viernes' },
  { id: '6', name: 'Sábado' },
  { id: '0', name: 'Domingo' }
];

interface BookingSettingsProps {
  settings: any;
  setSettings: (s: any) => void;
}

export const BookingSettings: React.FC<BookingSettingsProps> = ({ settings, setSettings }) => {
  const businessHours = settings.businessHours || {};
  const slotInterval = settings.slotInterval || 30;

  const [bulkStart, setBulkStart] = useState('08:00');
  const [bulkEnd, setBulkEnd] = useState('18:00');

  const handleDayChange = (dayId: string, field: string, value: any) => {
    const newHours = { ...businessHours };
    if (!newHours[dayId]) {
      newHours[dayId] = { isOpen: false, startTime: '08:00', endTime: '18:00' };
    }
    newHours[dayId][field] = value;
    setSettings({ ...settings, businessHours: newHours });
  };

  const handleApplyBulkHours = () => {
    const newHours = { ...businessHours };
    DAYS_OF_WEEK.forEach(day => {
      if (!newHours[day.id]) {
        newHours[day.id] = { isOpen: true, startTime: bulkStart, endTime: bulkEnd };
      } else if (newHours[day.id].isOpen) {
        newHours[day.id].startTime = bulkStart;
        newHours[day.id].endTime = bulkEnd;
      }
    });
    setSettings({ ...settings, businessHours: newHours });
  };

  return (
    <>
      <IonRow>
        <IonCol size="12">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Configuración de Reservaciones</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>Intervalos de Horario de Citas</IonLabel>
                <IonSelect value={slotInterval} onIonChange={e => setSettings({...settings, slotInterval: e.detail.value})}>
                  <IonSelectOption value={15}>Cada 15 minutos</IonSelectOption>
                  <IonSelectOption value={30}>Cada 30 minutos (Recomendado)</IonSelectOption>
                  <IonSelectOption value={45}>Cada 45 minutos</IonSelectOption>
                  <IonSelectOption value={60}>Cada 1 hora</IonSelectOption>
                  <IonSelectOption value={120}>Cada 2 horas</IonSelectOption>
                </IonSelect>
              </IonItem>
              <p style={{fontSize: '13px', color: '#64748b', marginLeft: '16px', marginTop: '8px', marginBottom: '16px'}}>
                Esto define los bloques de turno en tu calendario (ej. si eliges 30 mins, las citas solo se agendarán a las 8:00, 8:30, 9:00, etc.).
              </p>

              <IonItem>
                <IonLabel className="ion-text-wrap">
                  <h2>Requerir selección de servicio de antemano</h2>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                    Ideal para Salones de Belleza, Spas, Barberías y Consultorios. El cliente elegirá primero qué servicio desea y su duración. (Desactívalo si es un restaurante que solo reserva mesas).
                  </p>
                </IonLabel>
                <IonToggle 
                  checked={settings.bookingRequireService || false} 
                  onIonChange={e => setSettings({...settings, bookingRequireService: e.detail.checked})} 
                />
              </IonItem>

              <IonItem>
                <IonLabel className="ion-text-wrap">
                  <h2>Permitir elegir Profesional / Especialista</h2>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                    El cliente podrá elegir qué manicurista, estilista o barbero lo atenderá según la agenda individual de cada empleado.
                  </p>
                </IonLabel>
                <IonToggle 
                  checked={settings.bookingAllowStaffSelection || false} 
                  onIonChange={e => setSettings({...settings, bookingAllowStaffSelection: e.detail.checked})} 
                />
              </IonItem>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>

      <IonRow>
        <IonCol size="12">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Horario de Trabajo y Apertura del Negocio</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{marginBottom: '16px', fontSize: '14px', color: '#64748b'}}>
                Define los días en que el local abre y sus horas reales de atención. El motor de reservaciones públicas solo permitirá agendar dentro de estos rangos.
              </p>

              {/* Ajuste masivo rápido */}
              <div style={{ backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px', fontSize: '13px' }}>
                  ⚡ Ajuste Rápido de Horario (Aplica a todos los días abiertos):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>Apertura:</span>
                    <IonInput 
                      type="time" 
                      value={bulkStart} 
                      onIonInput={e => setBulkStart(e.detail.value!)} 
                      style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '110px' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>Cierre:</span>
                    <IonInput 
                      type="time" 
                      value={bulkEnd} 
                      onIonInput={e => setBulkEnd(e.detail.value!)} 
                      style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '110px' }} 
                    />
                  </div>
                  <IonButton size="small" color="primary" fill="outline" onClick={handleApplyBulkHours}>
                    <IonIcon slot="start" icon={checkmarkCircleOutline} />
                    Aplicar a Días Activos
                  </IonButton>
                </div>
              </div>

              {/* Tabla detallada de días */}
              <IonGrid className="ion-no-padding">
                <IonRow style={{ fontWeight: '600', color: '#64748b', fontSize: '13px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                  <IonCol size="4" sizeMd="3">Día de la Semana</IonCol>
                  <IonCol size="8" sizeMd="9">Horario de Atención (Apertura - Cierre)</IonCol>
                </IonRow>

                {DAYS_OF_WEEK.map(day => {
                  const dayData = businessHours[day.id] || { isOpen: false, startTime: '08:00', endTime: '18:00' };
                  return (
                    <IonRow key={day.id} className="ion-align-items-center" style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}>
                      <IonCol size="12" sizeSm="4" sizeMd="3">
                        <IonToggle checked={dayData.isOpen} onIonChange={e => handleDayChange(day.id, 'isOpen', e.detail.checked)}>
                          <span style={{ fontSize: '14px', fontWeight: dayData.isOpen ? '600' : 'normal', color: dayData.isOpen ? '#0f172a' : '#64748b' }}>
                            {day.name}
                          </span>
                        </IonToggle>
                      </IonCol>
                      <IonCol size="12" sizeSm="8" sizeMd="9">
                        {dayData.isOpen ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>Abre:</span>
                              <IonInput 
                                type="time" 
                                value={dayData.startTime || '08:00'} 
                                onIonInput={e => handleDayChange(day.id, 'startTime', e.detail.value)} 
                                style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '120px' }} 
                              />
                            </div>
                            <span>-</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>Cierra:</span>
                              <IonInput 
                                type="time" 
                                value={dayData.endTime || '18:00'} 
                                onIonInput={e => handleDayChange(day.id, 'endTime', e.detail.value)} 
                                style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '120px' }} 
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Cerrado todo el día
                          </span>
                        )}
                      </IonCol>
                    </IonRow>
                  );
                })}
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>
    </>
  );
};
