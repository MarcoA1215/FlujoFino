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
  const [hasBulkSecondShift, setHasBulkSecondShift] = useState(false);
  const [bulkSecondStart, setBulkSecondStart] = useState('14:00');
  const [bulkSecondEnd, setBulkSecondEnd] = useState('19:00');

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
        newHours[day.id] = {
          isOpen: true,
          startTime: bulkStart,
          endTime: bulkEnd,
          hasSecondShift: hasBulkSecondShift,
          secondStartTime: hasBulkSecondShift ? bulkSecondStart : undefined,
          secondEndTime: hasBulkSecondShift ? bulkSecondEnd : undefined,
        };
      } else if (newHours[day.id].isOpen) {
        newHours[day.id].startTime = bulkStart;
        newHours[day.id].endTime = bulkEnd;
        newHours[day.id].hasSecondShift = hasBulkSecondShift;
        if (hasBulkSecondShift) {
          newHours[day.id].secondStartTime = bulkSecondStart;
          newHours[day.id].secondEndTime = bulkSecondEnd;
        }
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
              <p style={{fontSize: '13px', color: '#64748b', marginLeft: '16px', marginTop: '8px'}}>
                Esto define los bloques de turno en tu calendario (ej. si eliges 30 mins, las citas solo se agendarán a las 8:00, 8:30, 9:00, etc.).
              </p>

              <IonItem lines="none" style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <IonLabel className="ion-text-wrap">
                  <h2><strong>¿Desea que el cliente reserve un servicio/producto de antemano?</strong></h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Ideal para spas, salones o clínicas donde el cliente escoge primero el servicio que desea, con quién y conoce el costo de una vez. (Desactívalo si es un restaurante que solo reserva mesas).
                  </p>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.bookingRequireService ?? true} 
                  onIonChange={e => setSettings({ ...settings, bookingRequireService: e.detail.checked })} 
                  color="primary" 
                />
              </IonItem>

              <IonItem lines="none" style={{ marginTop: '12px' }}>
                <IonLabel className="ion-text-wrap">
                  <h2><strong>Permitir al cliente elegir el especialista que lo atenderá</strong></h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Permite que el cliente seleccione con qué especialista desea agendarse, mostrando solo la disponibilidad y ocupación real de esa persona.
                  </p>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.bookingAllowStaffSelection ?? true} 
                  onIonChange={e => setSettings({ ...settings, bookingAllowStaffSelection: e.detail.checked })} 
                  color="primary" 
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
              <div style={{ backgroundColor: '#f1f5f9', padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '10px', fontSize: '13px' }}>
                  ⚡ Ajuste Rápido de Horario (Aplica a todos los días abiertos):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>T1 Abre:</span>
                    <IonInput 
                      type="time" 
                      value={bulkStart} 
                      onIonInput={e => setBulkStart(e.detail.value!)} 
                      style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>T1 Cierra:</span>
                    <IonInput 
                      type="time" 
                      value={bulkEnd} 
                      onIonInput={e => setBulkEnd(e.detail.value!)} 
                      style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                    />
                  </div>

                  <IonButton
                    size="small"
                    fill={hasBulkSecondShift ? 'solid' : 'outline'}
                    color={hasBulkSecondShift ? 'warning' : 'medium'}
                    onClick={() => setHasBulkSecondShift(!hasBulkSecondShift)}
                    style={{ height: '32px', fontSize: '12px', textTransform: 'none' }}
                  >
                    {hasBulkSecondShift ? '✓ Con 2do Turno' : '+ Agregar 2do Turno'}
                  </IonButton>

                  {hasBulkSecondShift && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>T2 Abre:</span>
                        <IonInput 
                          type="time" 
                          value={bulkSecondStart} 
                          onIonInput={e => setBulkSecondStart(e.detail.value!)} 
                          style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>T2 Cierra:</span>
                        <IonInput 
                          type="time" 
                          value={bulkSecondEnd} 
                          onIonInput={e => setBulkSecondEnd(e.detail.value!)} 
                          style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                        />
                      </div>
                    </>
                  )}

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
                    <IonRow key={day.id} className="ion-align-items-center" style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                      <IonCol size="12" sizeSm="4" sizeMd="3">
                        <IonToggle checked={dayData.isOpen} onIonChange={e => handleDayChange(day.id, 'isOpen', e.detail.checked)} justify="space-between">
                          <span slot="label" style={{ fontSize: '14px', fontWeight: dayData.isOpen ? '600' : 'normal', color: dayData.isOpen ? '#0f172a' : '#64748b' }}>
                            {day.name}
                          </span>
                        </IonToggle>
                      </IonCol>
                      <IonCol size="12" sizeSm="8" sizeMd="9">
                        {dayData.isOpen ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Turno 1 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                                Turno 1
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Abre:</span>
                                <IonInput 
                                  type="time" 
                                  value={dayData.startTime || '08:00'} 
                                  onIonInput={e => handleDayChange(day.id, 'startTime', e.detail.value)} 
                                  style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                                />
                              </div>
                              <span>-</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Cierra:</span>
                                <IonInput 
                                  type="time" 
                                  value={dayData.endTime || '12:00'} 
                                  onIonInput={e => handleDayChange(day.id, 'endTime', e.detail.value)} 
                                  style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                                />
                              </div>

                              <IonButton 
                                size="small" 
                                fill={dayData.hasSecondShift ? 'solid' : 'outline'}
                                color={dayData.hasSecondShift ? 'warning' : 'medium'}
                                style={{ height: '28px', fontSize: '11px', textTransform: 'none' }}
                                onClick={() => {
                                  const nextVal = !dayData.hasSecondShift;
                                  const newHours = { ...businessHours };
                                  if (!newHours[day.id]) {
                                    newHours[day.id] = { isOpen: true, startTime: '08:00', endTime: '12:00' };
                                  }
                                  newHours[day.id].hasSecondShift = nextVal;
                                  if (nextVal) {
                                    if (!newHours[day.id].secondStartTime) newHours[day.id].secondStartTime = '14:00';
                                    if (!newHours[day.id].secondEndTime) newHours[day.id].secondEndTime = '18:00';
                                  }
                                  setSettings({ ...settings, businessHours: newHours });
                                }}
                              >
                                {dayData.hasSecondShift ? '✓ 2do Turno Activo' : '+ 2do Turno (Tarde)'}
                              </IonButton>
                            </div>

                            {/* Turno 2 (opcional) */}
                            {dayData.hasSecondShift && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingLeft: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                                  Turno 2
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>Abre:</span>
                                  <IonInput 
                                    type="time" 
                                    value={dayData.secondStartTime || '14:00'} 
                                    onIonInput={e => handleDayChange(day.id, 'secondStartTime', e.detail.value)} 
                                    style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                                  />
                                </div>
                                <span>-</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>Cierra:</span>
                                  <IonInput 
                                    type="time" 
                                    value={dayData.secondEndTime || '18:00'} 
                                    onIonInput={e => handleDayChange(day.id, 'secondEndTime', e.detail.value)} 
                                    style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', maxWidth: '135px' }} 
                                  />
                                </div>
                              </div>
                            )}
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
