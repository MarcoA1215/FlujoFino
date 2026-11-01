import React, { useState } from 'react';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonIcon, 
  IonRow, 
  IonCol, 
  IonToggle,
  useIonToast
} from '@ionic/react';
import { 
  checkmarkCircleOutline, 
  flashOutline, 
  addOutline, 
  trashOutline 
} from 'ionicons/icons';
import { FinoTimePicker } from './ui/FinoTimePicker';
import { FinoSelect } from './ui/FinoSelect';

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
  const [presentToast] = useIonToast();
  const businessHours = settings.businessHours || {};
  const slotInterval = settings.slotInterval || 30;

  const [bulkStart, setBulkStart] = useState('08:00');
  const [bulkEnd, setBulkEnd] = useState('12:00');
  const [hasBulkSecondShift, setHasBulkSecondShift] = useState(false);
  const [bulkSecondStart, setBulkSecondStart] = useState('14:00');
  const [bulkSecondEnd, setBulkSecondEnd] = useState('18:00');

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
    presentToast({
      message: 'Horarios aplicados a los días activos',
      duration: 2500,
      color: 'success',
    });
  };

  return (
    <>
      <IonRow>
        <IonCol size="12">
          <IonCard style={{ margin: '0 0 12px 0', borderRadius: '16px', overflow: 'hidden' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Configuración de Reservaciones
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <FinoSelect
                    label="Intervalos de Horario de Citas"
                    value={String(slotInterval)}
                    onChange={val => setSettings({ ...settings, slotInterval: Number(val) })}
                    options={[
                      { value: '15', label: 'Cada 15 minutos' },
                      { value: '30', label: 'Cada 30 minutos (Recomendado)' },
                      { value: '45', label: 'Cada 45 minutos' },
                      { value: '60', label: 'Cada 1 hora' },
                      { value: '120', label: 'Cada 2 horas' },
                    ]}
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 2px 0 2px', lineHeight: 1.4 }}>
                    Define los bloques de turno en tu calendario (ej. 8:00, 8:30, 9:00).
                  </p>
                </div>

                <div style={{ minWidth: 0 }}>
                  <FinoSelect
                    label="Anticipación Máxima de Reservas"
                    value={String(settings.bookingMaxAdvanceDays ?? 365)}
                    onChange={val => setSettings({ ...settings, bookingMaxAdvanceDays: Number(val) })}
                    options={[
                      { value: '15', label: 'Hasta 15 días' },
                      { value: '30', label: 'Hasta 30 días (1 mes)' },
                      { value: '60', label: 'Hasta 60 días (2 meses)' },
                      { value: '90', label: 'Hasta 90 días (3 meses)' },
                      { value: '180', label: 'Hasta 180 días (6 meses)' },
                      { value: '365', label: 'Hasta 1 año (Recomendado)' },
                      { value: '730', label: 'Hasta 2 años' },
                    ]}
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 2px 0 2px', lineHeight: 1.4 }}>
                    Define con cuánta antelación pueden agendar tus clientes.
                  </p>
                </div>
              </div>

              <IonItem lines="none" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <IonLabel className="ion-text-wrap">
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>¿Desea que el cliente reserve un servicio/producto de antemano?</h2>
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
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Permitir al cliente elegir el especialista que lo atenderá</h2>
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

              <IonItem lines="none" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '12px' }}>
                <IonLabel className="ion-text-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Atención Simultánea (Modo a Cuatro Manos)
                    </h2>
                    <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--theme-primary-readable, #065F46)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      NUEVO
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                    Permite que 2 o más especialistas atiendan al mismo cliente en paralelo cuando reserva servicios distintos (ej. manos y pies al mismo tiempo). Optimiza el tiempo total de la cita a la duración del servicio más largo en lugar de sumarlos.
                  </p>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.allowSimultaneousServices === true} 
                  onIonChange={e => setSettings({ ...settings, allowSimultaneousServices: e.detail.checked })} 
                  color="primary" 
                />
              </IonItem>

              <IonItem lines="none" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '12px' }}>
                <IonLabel className="ion-text-wrap">
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Exigir Seña / Anticipo para Reservas Online</h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Requiere que el cliente pague un abono previo obligatorio para apartar su turno y evitar inasistencias (no-shows). Si lo desactivas, los clientes podrán agendar pagando completo o pagando al ser atendidos.
                  </p>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.bookingRequireDeposit === true} 
                  onIonChange={e => {
                    const checked = e.detail.checked;
                    setSettings({ 
                      ...settings, 
                      bookingRequireDeposit: checked,
                      bookingDepositPercentage: checked ? (Number(settings.bookingDepositPercentage) || 30) : 0
                    });
                  }} 
                  color="primary" 
                />
              </IonItem>

              {settings.bookingRequireDeposit === true && (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                  <IonLabel style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Porcentaje de Seña Requerido (%)
                  </IonLabel>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.bookingDepositPercentage !== undefined && settings.bookingDepositPercentage !== null ? settings.bookingDepositPercentage : 30}
                    onChange={e => setSettings({ ...settings, bookingDepositPercentage: Math.max(1, Math.min(100, parseFloat(e.target.value) || 0)) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ej. 30"
                  />
                  <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Ejemplo: 30% o 50% del costo total del servicio seleccionado.
                  </small>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>

      <IonRow>
        <IonCol size="12">
          <IonCard style={{ margin: '0 0 12px 0', borderRadius: '16px', overflow: 'hidden' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Horario de Trabajo y Apertura del Negocio
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
                Define los días en que el local abre y sus horas de atención. Las citas públicas solo podrán agendarse dentro de estos turnos.
              </p>

              {/* Ajuste masivo rápido */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IonIcon icon={flashOutline} style={{ fontSize: '18px' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                      Ajuste Rápido de Horario
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Aplica la misma jornada a todos los días abiertos con un solo toque.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Turno 1 */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    boxSizing: 'border-box',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      Turno Principal (T1)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <FinoTimePicker
                          label="Apertura"
                          value={bulkStart}
                          onChange={val => setBulkStart(val)}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <FinoTimePicker
                          label="Cierre"
                          value={bulkEnd}
                          onChange={val => setBulkEnd(val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Turno 2 (opcional) */}
                  {hasBulkSecondShift ? (
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '12px',
                      boxSizing: 'border-box',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Segundo Turno (T2)
                        </span>
                        <button
                          type="button"
                          onClick={() => setHasBulkSecondShift(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0
                          }}
                        >
                          <IonIcon icon={trashOutline} /> Quitar 2do turno
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <FinoTimePicker
                            label="Apertura T2"
                            value={bulkSecondStart}
                            onChange={val => setBulkSecondStart(val)}
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <FinoTimePicker
                            label="Cierre T2"
                            value={bulkSecondEnd}
                            onChange={val => setBulkSecondEnd(val)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasBulkSecondShift(true)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <IonIcon icon={addOutline} style={{ fontSize: '16px', color: '#b45309' }} />
                      <span>+ Agregar 2do Turno (Tarde / Receso)</span>
                    </button>
                  )}

                  <div style={{ paddingTop: '4px' }}>
                    <IonButton 
                      expand="block" 
                      color="primary" 
                      onClick={handleApplyBulkHours}
                      style={{ margin: 0, fontWeight: 700, height: '42px', '--border-radius': '10px' }}
                    >
                      <IonIcon slot="start" icon={checkmarkCircleOutline} />
                      Aplicar Horario a Días Abiertos
                    </IonButton>
                  </div>
                </div>
              </div>

              {/* Listado de días de la semana */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Horarios individuales por día
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Activa o desactiva días según disponibilidad
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
                {DAYS_OF_WEEK.map(day => {
                  const dayData = businessHours[day.id] || { isOpen: false, startTime: '08:00', endTime: '18:00' };
                  const isOpen = !!dayData.isOpen;

                  return (
                    <div 
                      key={day.id} 
                      className="ff-card"
                      style={{
                        padding: '14px',
                        backgroundColor: isOpen ? '#ffffff' : '#f8fafc',
                        border: isOpen ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                        borderRadius: '14px',
                        boxShadow: isOpen ? 'var(--ff-shadow-sm)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div>
                        {/* Cabecera del día */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? '12px' : '4px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: isOpen ? '#0f172a' : '#64748b' }}>
                              {day.name}
                            </span>
                            <span 
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: isOpen ? '#ecfdf5' : '#f1f5f9',
                                color: isOpen ? '#065f46' : '#64748b',
                                border: isOpen ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                              }}
                            >
                              {isOpen ? 'Abierto' : 'Cerrado'}
                            </span>
                          </div>

                          <IonToggle 
                            checked={isOpen} 
                            onIonChange={e => handleDayChange(day.id, 'isOpen', e.detail.checked)} 
                            color="success" 
                          />
                        </div>

                        {!isOpen ? (
                          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                            Cerrado todo el día (no se agendarán citas)
                          </div>
                        ) : (
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Turno 1 */}
                            <div style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '10px',
                              boxSizing: 'border-box',
                            }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                                Turno 1
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 115px), 1fr))', gap: '8px' }}>
                                <div style={{ minWidth: 0 }}>
                                  <FinoTimePicker
                                    label="Abre"
                                    value={dayData.startTime || '08:00'}
                                    onChange={val => handleDayChange(day.id, 'startTime', val)}
                                  />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <FinoTimePicker
                                    label="Cierra"
                                    value={dayData.endTime || '12:00'}
                                    onChange={val => handleDayChange(day.id, 'endTime', val)}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Turno 2 (opcional) */}
                            {dayData.hasSecondShift ? (
                              <div style={{
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '10px',
                                padding: '10px',
                                boxSizing: 'border-box',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Turno 2
                                  </span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const newHours = { ...businessHours };
                                      if (!newHours[day.id]) {
                                        newHours[day.id] = { isOpen: true, startTime: '08:00', endTime: '12:00' };
                                      }
                                      newHours[day.id].hasSecondShift = false;
                                      setSettings({ ...settings, businessHours: newHours });
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: 0
                                    }}
                                  >
                                    <IonIcon icon={trashOutline} /> Quitar
                                  </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 115px), 1fr))', gap: '8px' }}>
                                  <div style={{ minWidth: 0 }}>
                                    <FinoTimePicker
                                      label="Abre"
                                      value={dayData.secondStartTime || '14:00'}
                                      onChange={val => handleDayChange(day.id, 'secondStartTime', val)}
                                    />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <FinoTimePicker
                                      label="Cierra"
                                      value={dayData.secondEndTime || '18:00'}
                                      onChange={val => handleDayChange(day.id, 'secondEndTime', val)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const newHours = { ...businessHours };
                                  if (!newHours[day.id]) {
                                    newHours[day.id] = { isOpen: true, startTime: '08:00', endTime: '12:00' };
                                  }
                                  newHours[day.id].hasSecondShift = true;
                                  if (!newHours[day.id].secondStartTime) newHours[day.id].secondStartTime = '14:00';
                                  if (!newHours[day.id].secondEndTime) newHours[day.id].secondEndTime = '18:00';
                                  setSettings({ ...settings, businessHours: newHours });
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px dashed #cbd5e1',
                                  borderRadius: '8px',
                                  backgroundColor: '#ffffff',
                                  color: '#0284c7',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <IonIcon icon={addOutline} style={{ color: '#0284c7' }} />
                                <span>+ Agregar 2do Turno (Tarde)</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>
    </>
  );
};
