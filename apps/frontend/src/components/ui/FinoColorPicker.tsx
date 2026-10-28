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
import { closeOutline, colorPaletteOutline, checkmarkOutline } from 'ionicons/icons';
import {
  PRESET_THEME_COLORS,
  getContrastColor,
  ensureReadableColor,
  isColorTooLight,
} from '../../utils/colors';

export interface FinoColorPickerProps {
  value: string;
  onChange: (hexColor: string) => void;
  label?: string;
  disabled?: boolean;
}

const EXTENDED_SWATCHES = [
  ...PRESET_THEME_COLORS,
  { name: 'Negro Carbón', hex: '#0F172A' },
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Rojo Carmesí', hex: '#DC2626' },
  { name: 'Esmeralda Oscuro', hex: '#047857' },
  { name: 'Teal Océano', hex: '#0D9488' },
  { name: 'Azul Cielo', hex: '#0284C7' },
  { name: 'Fucsia', hex: '#D946EF' },
  { name: 'Oro / Mostaza', hex: '#EAB308' },
];

export const FinoColorPicker: React.FC<FinoColorPickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempHex, setTempHex] = useState(value || '#10B981');
  const [customInput, setCustomInput] = useState(value || '#10B981');

  const normalizedCurrent = (value || '#10B981').toUpperCase();

  const handleOpen = () => {
    if (disabled) return;
    setTempHex(normalizedCurrent);
    setCustomInput(normalizedCurrent);
    setIsOpen(true);
  };

  const handleSelectPreset = (hex: string) => {
    const upper = hex.toUpperCase();
    setTempHex(upper);
    setCustomInput(upper);
  };

  const handleConfirm = () => {
    let finalHex = customInput.trim();
    if (!finalHex.startsWith('#')) finalHex = `#${finalHex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(finalHex)) {
      onChange(finalHex.toUpperCase());
    } else {
      onChange(tempHex);
    }
    setIsOpen(false);
  };

  const contrast = useMemo(() => getContrastColor(tempHex), [tempHex]);
  const readable = useMemo(() => ensureReadableColor(tempHex), [tempHex]);
  const isLight = useMemo(() => isColorTooLight(tempHex), [tempHex]);

  return (
    <>
      {/* Disparador Visual Personalizado FinoWork */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px 6px 8px',
          borderRadius: '12px',
          border: '1px solid #CBD5E1',
          background: '#FFFFFF',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          minHeight: '44px',
        }}
      >
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            backgroundColor: normalizedCurrent,
            border: normalizedCurrent === '#FFFFFF' ? '1px solid #CBD5E1' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          {label && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              {label}
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
            {normalizedCurrent}
          </span>
        </div>
        <IonIcon icon={colorPaletteOutline} style={{ fontSize: '16px', color: '#64748B', marginLeft: 'auto' }} />
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
              {label || 'Seleccionar Color'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)} style={{ color: '#64748B' }}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as any}>
          <div style={{ padding: '16px 16px 40px 16px', maxWidth: '480px', margin: '0 auto' }}>
            {/* Vista Previa en Vivo */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '14px',
                marginBottom: '16px',
                boxShadow: 'var(--ff-shadow-sm)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                Vista Previa del Color
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    backgroundColor: tempHex,
                    color: contrast,
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  Botón Primario
                </div>
                <div
                  style={{
                    backgroundColor: `${tempHex}20`,
                    color: readable,
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  Insignia Suave
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: readable }}>
                  Texto de Marca
                </span>
              </div>
              {isLight && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#B45309', background: '#FFFBEB', padding: '6px 10px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  ⚠️ Color claro: FinoWork usará texto oscuro para proteger la legibilidad.
                </div>
              )}
            </div>

            {/* Paleta de Colores Recomendados */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Colores Recomendados
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
                  gap: '8px',
                }}
              >
                {EXTENDED_SWATCHES.map((swatch) => {
                  const isSelected = tempHex.toUpperCase() === swatch.hex.toUpperCase();
                  const isSwatchWhite = swatch.hex.toUpperCase() === '#FFFFFF';
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.name}
                      onClick={() => handleSelectPreset(swatch.hex)}
                      style={{
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: swatch.hex,
                        border: isSelected
                          ? '3px solid #0F172A'
                          : isSwatchWhite
                          ? '1px solid #CBD5E1'
                          : '1px solid rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease',
                        boxShadow: isSelected ? '0 0 0 2px #FFFFFF, 0 4px 8px rgba(0,0,0,0.2)' : 'none',
                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      }}
                    >
                      {isSelected && (
                        <IonIcon
                          icon={checkmarkOutline}
                          style={{
                            color: getContrastColor(swatch.hex),
                            fontSize: '20px',
                            fontWeight: 800,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Entrada Manual de Código HEX */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                O escribe tu código HEX exacto:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={7}
                  value={customInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCustomInput(val);
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setTempHex(val);
                    }
                  }}
                  placeholder="#10B981"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
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
              Aplicar Color
            </button>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default FinoColorPicker;
