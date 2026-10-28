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
  chevronDownOutline,
  closeOutline,
  checkmarkCircle,
  searchOutline,
} from 'ionicons/icons';

export interface FinoSelectOption<T = string | number> {
  value: T;
  label: string;
  description?: string;
  icon?: string | React.ReactNode;
  badge?: string;
}

export interface FinoSelectProps<T = string | number> {
  value: T;
  onChange: (val: T) => void;
  options: FinoSelectOption<T>[];
  label?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function FinoSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Selecciona una opción...',
  title,
  disabled = false,
  searchable,
}: FinoSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 6;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
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
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '42px',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #CBD5E1',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {selectedOption?.icon && typeof selectedOption.icon === 'string' ? (
            <span style={{ fontSize: '16px' }}>{selectedOption.icon}</span>
          ) : selectedOption?.icon ? (
            selectedOption.icon
          ) : null}

          <span
            style={{
              fontSize: '13px',
              fontWeight: selectedOption ? 700 : 500,
              color: selectedOption ? '#0F172A' : '#94A3B8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <IonIcon icon={chevronDownOutline} style={{ color: '#64748B', fontSize: '16px', flexShrink: 0 }} />
      </button>

      {/* Modal Bottom Sheet Oficial FinoWork */}
      <IonModal
        isOpen={isOpen}
        onDidDismiss={() => {
          setIsOpen(false);
          setSearchTerm('');
        }}
        initialBreakpoint={0.65}
        breakpoints={[0, 0.65, 0.9]}
        className="ff-bottom-sheet"
      >
        <div className="ff-drag-handle" />
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': '#FFFFFF', borderBottom: '1px solid #E2E8F0' } as any}>
            <IonTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              {title || label || 'Selecciona una opción'}
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
            {/* Buscador Integrado si hay varias opciones */}
            {isSearchEnabled && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                }}
              >
                <IonIcon icon={searchOutline} style={{ color: '#64748B', fontSize: '18px' }} />
                <input
                  type="text"
                  placeholder="Buscar opción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    width: '100%',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#0F172A',
                  }}
                />
              </div>
            )}

            {/* Lista de Opciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748B' }}>
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: isSelected
                          ? '1.5px solid var(--theme-primary, #10B981)'
                          : '1px solid #E2E8F0',
                        background: isSelected
                          ? 'var(--theme-primary-soft, #ECFDF5)'
                          : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: 'var(--ff-shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {opt.icon && typeof opt.icon === 'string' ? (
                          <span style={{ fontSize: '20px' }}>{opt.icon}</span>
                        ) : opt.icon ? (
                          opt.icon
                        ) : null}
                        <div>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected
                                ? 'var(--theme-primary-readable, #065F46)'
                                : '#0F172A',
                            }}
                          >
                            {opt.label}
                          </div>
                          {opt.description && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <IonIcon
                          icon={checkmarkCircle}
                          style={{
                            color: 'var(--theme-primary, #10B981)',
                            fontSize: '20px',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
}

export default FinoSelect;
