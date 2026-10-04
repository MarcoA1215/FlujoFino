import React, { useState } from 'react';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption, 
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
          <IonCard className="shadow-xs rounded-2xl border border-slate-200/80">
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '18px', fontWeight: 700 }}>Configuración de Reservaciones</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem lines="none" className="rounded-xl border border-slate-200 bg-slate-50/50">
                <IonLabel>Intervalos de Horario de Citas</IonLabel>
                <IonSelect value={slotInterval} onIonChange={e => setSettings({...settings, slotInterval: e.detail.value})}>
                  <IonSelectOption value={15}>Cada 15 minutos</IonSelectOption>
                  <IonSelectOption value={30}>Cada 30 minutos (Recomendado)</IonSelectOption>
                  <IonSelectOption value={45}>Cada 45 minutos</IonSelectOption>
                  <IonSelectOption value={60}>Cada 1 hora</IonSelectOption>
                  <IonSelectOption value={120}>Cada 2 horas</IonSelectOption>
                </IonSelect>
              </IonItem>
              <p style={{fontSize: '13px', color: '#64748b', marginLeft: '8px', marginTop: '6px'}}>
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
          <IonCard className="shadow-xs rounded-2xl border border-slate-200/80">
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '18px', fontWeight: 700 }}>Horario de Trabajo y Apertura del Negocio</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
                Define los días en que el local abre y sus horas de atención. Las citas públicas solo podrán agendarse dentro de estos turnos.
              </p>

              {/* Ajuste masivo rápido */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <IonIcon icon={flashOutline} style={{ fontSize: '18px' }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base m-0 leading-tight">
                      Ajuste Rápido de Horario
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                      Aplica la misma jornada a todos los días abiertos con un solo toque.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Turno 1 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wide">
                        Turno Principal (T1)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Apertura</label>
                        <input 
                          type="time" 
                          value={bulkStart} 
                          onChange={e => setBulkStart(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cierre</label>
                        <input 
                          type="time" 
                          value={bulkEnd} 
                          onChange={e => setBulkEnd(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Turno 2 (opcional) */}
                  {hasBulkSecondShift ? (
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wide">
                          Segundo Turno (T2)
                        </span>
                        <button
                          type="button"
                          onClick={() => setHasBulkSecondShift(false)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                        >
                          <IonIcon icon={trashOutline} /> Quitar 2do turno
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Apertura</label>
                          <input 
                            type="time" 
                            value={bulkSecondStart} 
                            onChange={e => setBulkSecondStart(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" 
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cierre</label>
                          <input 
                            type="time" 
                            value={bulkSecondEnd} 
                            onChange={e => setBulkSecondEnd(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasBulkSecondShift(true)}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/50 text-slate-600 hover:text-amber-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <IonIcon icon={addOutline} />
                      <span>+ Agregar 2do Turno Masivo (Tarde / Receso)</span>
                    </button>
                  )}

                  <div className="pt-1">
                    <IonButton 
                      expand="block" 
                      color="primary" 
                      fill="solid" 
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
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Horarios individuales por día</span>
                <span className="text-xs text-slate-400">Activa o desactiva días según disponibilidad</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DAYS_OF_WEEK.map(day => {
                  const dayData = businessHours[day.id] || { isOpen: false, startTime: '08:00', endTime: '18:00' };
                  const isOpen = !!dayData.isOpen;

                  return (
                    <div 
                      key={day.id} 
                      className={`rounded-2xl border transition-all duration-200 p-3.5 sm:p-4 flex flex-col justify-between ${
                        isOpen ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/70 border-slate-200/60'
                      }`}
                    >
                      <div>
                        {/* Cabecera del día */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-base font-bold truncate ${isOpen ? 'text-slate-800' : 'text-slate-500'}`}>
                              {day.name}
                            </span>
                            <span 
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                isOpen 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-slate-200 text-slate-500'
                              }`}
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
                          <p className="text-xs text-slate-400 mt-2 mb-0 italic">
                            Cerrado todo el día (no se agendarán citas).
                          </p>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                            {/* Turno 1 */}
                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wide">
                                  Turno 1
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Abre</label>
                                  <input 
                                    type="time" 
                                    value={dayData.startTime || '08:00'} 
                                    onChange={e => handleDayChange(day.id, 'startTime', e.target.value)} 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cierra</label>
                                  <input 
                                    type="time" 
                                    value={dayData.endTime || '12:00'} 
                                    onChange={e => handleDayChange(day.id, 'endTime', e.target.value)} 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500" 
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Turno 2 (opcional) */}
                            {dayData.hasSecondShift ? (
                              <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-200/60">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wide">
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
                                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                                  >
                                    <IonIcon icon={trashOutline} /> Quitar
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Abre</label>
                                    <input 
                                      type="time" 
                                      value={dayData.secondStartTime || '14:00'} 
                                      onChange={e => handleDayChange(day.id, 'secondStartTime', e.target.value)} 
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cierra</label>
                                    <input 
                                      type="time" 
                                      value={dayData.secondEndTime || '18:00'} 
                                      onChange={e => handleDayChange(day.id, 'secondEndTime', e.target.value)} 
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" 
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
                                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <IonIcon icon={addOutline} /> + Agregar 2do Turno (Tarde)
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

