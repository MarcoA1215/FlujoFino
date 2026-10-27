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
import {
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
} from 'ionicons/icons';

export interface FinoDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
  disabled?: boolean;
  quickPresets?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export const FinoDatePicker: React.FC<FinoDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar fecha',
  minDate,
  maxDate,
  disabled = false,
  quickPresets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Inicializar fecha visualizada
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  const handleOpen = () => {
    if (disabled) return;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Formato YYYY-MM-DD
  const formatYmd = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatYmd(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Cuadrícula de días del mes
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: Array<{ day: number; ymd: string; isCurrentMonth: boolean }> = [];

    // Relleno días mes anterior
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ day: d, ymd: formatYmd(y, m, d), isCurrentMonth: false });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, ymd: formatYmd(viewYear, viewMonth, d), isCurrentMonth: true });
    }

    // Relleno días mes siguiente hasta completar múltiplos de 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, ymd: formatYmd(y, m, d), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleSelectDate = (ymd: string) => {
    if (minDate && ymd < minDate) return;
    if (maxDate && ymd > maxDate) return;
    onChange(ymd);
    setIsOpen(false);
  };

  // Texto legible para el disparador
  const displayLabel = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return placeholder;
    const [y, m, d] = value.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return placeholder;
    return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
  }, [value, placeholder]);

  const setPreset = (type: 'today' | 'yesterday' | 'monthStart' | 'monthEnd') => {
    const now = new Date();
    if (type === 'today') {
      onChange(formatYmd(now.getFullYear(), now.getMonth(), now.getDate()));
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      onChange(formatYmd(y.getFullYear(), y.getMonth(), y.getDate()));
    } else if (type === 'monthStart') {
      onChange(formatYmd(now.getFullYear(), now.getMonth(), 1));
    } else if (type === 'monthEnd') {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      onChange(formatYmd(now.getFullYear(), now.getMonth(), lastDay));
    }
    setIsOpen(false);
  };

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
          <IonIcon icon={calendarOutline} style={{ color: 'var(--theme-primary, #10B981)', fontSize: '18px' }} />
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
        {value === todayStr && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'var(--theme-primary-soft, #ECFDF5)',
              color: 'var(--theme-primary-readable, #065F46)',
            }}
          >
            Hoy
          </span>
        )}
      </button>

      {/* Modal Bottom Sheet / Popover FinoWork */}
      <IonModal
        isOpen={isOpen}
        onDidDismiss={() => setIsOpen(false)}
        initialBreakpoint={0.7}
        breakpoints={[0, 0.7, 0.9]}
        className="ff-bottom-sheet"
      >
        <div className="ff-drag-handle" />
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': '#FFFFFF', borderBottom: '1px solid #E2E8F0' } as any}>
            <IonTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              {label || 'Seleccionar Fecha'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)} style={{ color: '#64748B' }}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as any}>
          <div style={{ padding: '16px 16px 40px 16px', maxWidth: '400px', margin: '0 auto' }}>
            {/* Presets Rápidos */}
            {quickPresets && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreset('today')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('yesterday')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ayer
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('monthStart')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  1º del Mes
                </button>
              </div>
            )}

            {/* Cabecera del Mes con Flechas */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 4px',
                marginBottom: '10px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IonIcon icon={chevronBackOutline} style={{ color: '#0F172A', fontSize: '18px' }} />
              </button>

              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IonIcon icon={chevronForwardOutline} style={{ color: '#0F172A', fontSize: '18px' }} />
              </button>
            </div>

            {/* Días de la Semana */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                marginBottom: '6px',
              }}
            >
              {WEEKDAY_NAMES.map((name) => (
                <div
                  key={name}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    padding: '4px 0',
                  }}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                background: '#FFFFFF',
                padding: '10px',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: 'var(--ff-shadow-sm)',
              }}
            >
              {calendarDays.map((item, idx) => {
                const isSelected = item.ymd === value;
                const isToday = item.ymd === todayStr;
                const isOutOfRange =
                  (minDate && item.ymd < minDate) ||
                  (maxDate && item.ymd > maxDate);

                return (
                  <button
                    key={`${item.ymd}-${idx}`}
                    type="button"
                    disabled={Boolean(isOutOfRange)}
                    onClick={() => handleSelectDate(item.ymd)}
                    style={{
                      height: '40px',
                      borderRadius: '10px',
                      border: isSelected
                        ? 'none'
                        : isToday
                        ? '1.5px solid var(--theme-primary, #10B981)'
                        : 'none',
                      background: isSelected
                        ? 'var(--theme-primary, #10B981)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--theme-primary-contrast, #ffffff)'
                        : isOutOfRange
                        ? '#CBD5E1'
                        : item.isCurrentMonth
                        ? '#0F172A'
                        : '#94A3B8',
                      fontWeight: isSelected || isToday ? 800 : 500,
                      fontSize: '13px',
                      cursor: isOutOfRange ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default FinoDatePicker;
