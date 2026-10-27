import React, { useState, useMemo } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/react';
import { timeOutline, closeOutline } from 'ionicons/icons';

export interface FinoTimePickerProps {
  value: string; // 'HH:mm' en formato 24 horas (ej. '08:30', '14:00')
  onChange: (timeStr: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_COMMON = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const QUICK_SHIFTS = [
  { label: '08:00 AM', time24: '08:00' },
  { label: '09:00 AM', time24: '09:00' },
  { label: '12:00 PM', time24: '12:00' },
  { label: '01:00 PM', time24: '13:00' },
  { label: '05:00 PM', time24: '17:00' },
  { label: '07:00 PM', time24: '19:00' },
  { label: '09:00 PM', time24: '21:00' },
];

export const FinoTimePicker: React.FC<FinoTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar hora',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Descomponer 'HH:mm' a 12h
  const parsed = useMemo(() => {
    if (!value || !value.includes(':')) {
      return { hour12: 8, minute: 0, period: 'AM' as 'AM' | 'PM' };
    }
    const [hStr, mStr] = value.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (isNaN(h)) h = 8;
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute: m, period };
  }, [value]);

  const [tempHour, setTempHour] = useState<number>(parsed.hour12);
  const [tempMinute, setTempMinute] = useState<number>(parsed.minute);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>(parsed.period);

  const handleOpen = () => {
    if (disabled) return;
    setTempHour(parsed.hour12);
    setTempMinute(parsed.minute);
    setTempPeriod(parsed.period);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    let h24 = tempHour;
    if (tempPeriod === 'PM' && h24 < 12) h24 += 12;
    if (tempPeriod === 'AM' && h24 === 12) h24 = 0;

    const formatted24 = `${String(h24).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    onChange(formatted24);
    setIsOpen(false);
  };

  const handleQuickSelect = (time24: string) => {
    onChange(time24);
    setIsOpen(false);
  };

  // Texto legible para el disparador
  const displayLabel = useMemo(() => {
    if (!value || !value.includes(':')) return placeholder;
    const { hour12, minute, period } = parsed;
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  }, [value, parsed, placeholder]);

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            color: '#475569',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </label>
      )}

      {/* Disparador estilo FinoWork */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '42px',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid #CBD5E1',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IonIcon icon={timeOutline} style={{ color: 'var(--theme-primary, #10B981)', fontSize: '18px' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: value ? 700 : 500,
              color: value ? '#0F172A' : '#94A3B8',
            }}
          >
            {displayLabel}
          </span>
        </div>
        {value && (
          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
            ({value})
          </span>
        )}
      </button>

      {/* Modal Bottom Sheet Oficial FinoWork */}
      <IonModal
        isOpen={isOpen}
        onDidDismiss={() => setIsOpen(false)}
        initialBreakpoint={0.75}
        breakpoints={[0, 0.75, 0.95]}
        className="ff-bottom-sheet"
      >
        <div className="ff-drag-handle" />
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': '#FFFFFF', borderBottom: '1px solid #E2E8F0' } as any}>
            <IonTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              {label || 'Seleccionar Hora'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)} style={{ color: '#64748B' }}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as any}>
          <div style={{ padding: '16px 16px 40px 16px', maxWidth: '420px', margin: '0 auto' }}>
            {/* Visualizador Principal de la Hora */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                textAlign: 'center',
                boxShadow: 'var(--ff-shadow-sm)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                {String(tempHour).padStart(2, '0')} : {String(tempMinute).padStart(2, '0')}{' '}
                <span style={{ color: 'var(--theme-primary-readable, #065F46)', fontSize: '24px' }}>
                  {tempPeriod}
                </span>
              </div>

              {/* Conmutador AM / PM */}
              <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTempPeriod('AM')}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: tempPeriod === 'AM' ? 'var(--theme-primary, #10B981)' : 'transparent',
                    color: tempPeriod === 'AM' ? 'var(--theme-primary-contrast, #ffffff)' : '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                >
                  AM (Mañana)
                </button>
                <button
                  type="button"
                  onClick={() => setTempPeriod('PM')}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: tempPeriod === 'PM' ? 'var(--theme-primary, #10B981)' : 'transparent',
                    color: tempPeriod === 'PM' ? 'var(--theme-primary-contrast, #ffffff)' : '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                >
                  PM (Tarde/Noche)
                </button>
              </div>
            </div>

            {/* Accesos rápidos de turnos */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                Horas Habituales
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }}>
                {QUICK_SHIFTS.map((q) => (
                  <button
                    key={q.time24}
                    type="button"
                    onClick={() => handleQuickSelect(q.time24)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Horas (1-12) */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                Hora:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {HOURS_12.map((h) => {
                  const isSel = tempHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTempHour(h)}
                      style={{
                        height: '38px',
                        borderRadius: '10px',
                        border: isSel ? 'none' : '1px solid #E2E8F0',
                        background: isSel ? 'var(--theme-primary, #10B981)' : '#FFFFFF',
                        color: isSel ? 'var(--theme-primary-contrast, #ffffff)' : '#0F172A',
                        fontWeight: isSel ? 800 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Minutos */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                Minutos:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {MINUTES_COMMON.map((m) => {
                  const isSel = tempMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTempMinute(m)}
                      style={{
                        height: '38px',
                        borderRadius: '10px',
                        border: isSel ? 'none' : '1px solid #E2E8F0',
                        background: isSel ? 'var(--theme-primary, #10B981)' : '#FFFFFF',
                        color: isSel ? 'var(--theme-primary-contrast, #ffffff)' : '#0F172A',
                        fontWeight: isSel ? 800 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      :{String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botón de Confirmación */}
            <button
              type="button"
              onClick={handleConfirm}
              className="ff-btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)',
              }}
            >
              Confirmar Hora
            </button>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default FinoTimePicker;
