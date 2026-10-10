import React, { useMemo, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSearchbar,
} from '@ionic/react';
import {
  chevronDownOutline,
  closeOutline,
  checkmarkCircle,
  businessOutline,
  flashOutline,
} from 'ionicons/icons';
import { VENEZUELAN_BANKS, formatBankOptionLabel, normalizeBankName } from '../constants/banks';

export interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  size?: 'small' | 'normal';
  id?: string;
  name?: string;
}

export const BankSelect: React.FC<BankSelectProps> = ({
  value,
  onChange,
  placeholder = 'Selecciona un banco...',
  label,
  required = false,
  disabled = false,
  style,
  containerStyle,
  size = 'normal',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Normalizar valor para emparejar si viene de formatos anteriores ("Banesco", "0102", "venezuela")
  const normalizedValue = useMemo(() => {
    if (!value) return '';
    return normalizeBankName(value);
  }, [value]);

  // Si el valor actual no coincide con ningún banco de la lista oficial, lo conservamos como opción válida
  const isCustomOrLegacy = useMemo(() => {
    if (!normalizedValue) return false;
    return !VENEZUELAN_BANKS.some((b) => formatBankOptionLabel(b) === normalizedValue);
  }, [normalizedValue]);

  // Filtrar bancos por término de búsqueda (nombre o código de 4 dígitos)
  const filteredBanks = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return VENEZUELAN_BANKS;
    return VENEZUELAN_BANKS.filter(
      (b) =>
        b.code.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.shortName && b.shortName.toLowerCase().includes(q))
    );
  }, [searchText]);

  const handleSelect = (formattedValue: string) => {
    onChange(formattedValue);
    setIsOpen(false);
    setSearchText('');
  };

  const isSmall = size === 'small';

  return (
    <div style={{ width: '100%', ...containerStyle }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontSize: isSmall ? '11px' : '12px',
            fontWeight: 700,
            color: '#475569',
            marginBottom: isSmall ? '2px' : '4px',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Input oculto para compatibilidad con formularios */}
      {name && <input type="hidden" name={name} value={normalizedValue} />}

      {/* Botón trigger estilo input táctil moderno */}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        aria-label={label || placeholder}
        style={{
          width: '100%',
          height: isSmall ? '38px' : '44px',
          minHeight: isSmall ? '38px' : '44px',
          padding: isSmall ? '6px 12px' : '10px 14px',
          borderRadius: isSmall ? '8px' : '10px',
          border: '1px solid #CBD5E1',
          background: disabled ? '#F1F5F9' : '#FFFFFF',
          color: normalizedValue ? '#0F172A' : '#64748B',
          fontWeight: 600,
          fontSize: isSmall ? '13px' : '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          textAlign: 'left',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <IonIcon
            icon={businessOutline}
            style={{
              fontSize: isSmall ? '16px' : '18px',
              color: normalizedValue ? '#10B981' : '#94A3B8',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              color: normalizedValue ? '#0F172A' : '#64748B',
            }}
          >
            {normalizedValue || placeholder}
          </span>
        </div>
        <IonIcon
          icon={chevronDownOutline}
          style={{
            fontSize: isSmall ? '14px' : '16px',
            color: '#64748B',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        />
      </button>

      {/* Bottom Sheet Modal Searchable con diseño Emerald & Slate */}
      <IonModal
        isOpen={isOpen}
        onDidDismiss={() => {
          setIsOpen(false);
          setSearchText('');
        }}
        initialBreakpoint={0.75}
        breakpoints={[0, 0.5, 0.75, 1]}
      >
        <IonHeader>
          <IonToolbar style={{ '--background': '#FFFFFF', borderBottom: '1px solid #E2E8F0' } as any}>
            <IonTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              🏦 Seleccionar Banco
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsOpen(false)} style={{ color: '#64748B' }}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
          <div style={{ padding: '8px 16px 12px 16px', background: '#FFFFFF' }}>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value || '')}
              placeholder="Buscar banco o código (ej: 0102, Banesco)..."
              debounce={50}
              style={{
                padding: 0,
                '--background': '#F8FAFC',
                '--border-radius': '10px',
                '--box-shadow': 'none',
                '--placeholder-color': '#94A3B8',
                '--color': '#0F172A',
                fontSize: '13px',
              } as any}
            />
          </div>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as any}>
          {/* Quick Access Chips para los 6 bancos más frecuentes de Venezuela */}
          {!searchText && (
            <div style={{ padding: '8px 16px 12px 16px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748B',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IonIcon icon={flashOutline} style={{ color: '#10B981', fontSize: '13px' }} />
                Bancos Frecuentes (Acceso Rápido)
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {VENEZUELAN_BANKS.slice(0, 6).map((bank) => {
                  const formatted = formatBankOptionLabel(bank);
                  const isSelected = normalizedValue === formatted;
                  return (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => handleSelect(formatted)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '20px',
                        border: isSelected ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                        background: isSelected ? '#ECFDF5' : '#FFFFFF',
                        color: isSelected ? '#065F46' : '#1E293B',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#059669',
                          background: '#D1FAE5',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {bank.code}
                      </span>
                      {bank.shortName || bank.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opción personalizada o previa si no coincide con lista oficial */}
          {isCustomOrLegacy && normalizedValue && !searchText && (
            <div style={{ padding: '0 16px 8px 16px' }}>
              <button
                type="button"
                onClick={() => handleSelect(normalizedValue)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #10B981',
                  background: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>
                  {normalizedValue} (Actual)
                </span>
                <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px' }} />
              </button>
            </div>
          )}

          {/* Lista Completa de Bancos Filtrada */}
          <div style={{ padding: '0 16px 24px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748B',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              {searchText ? `Resultados (${filteredBanks.length})` : 'Todos los Bancos'}
            </div>

            {filteredBanks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: '#64748B',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  No se encontró ningún banco
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Intenta buscar por el código de 4 dígitos o por otro nombre
                </div>
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const formatted = formatBankOptionLabel(bank);
                const isSelected = normalizedValue === formatted;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleSelect(formatted)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isSelected ? '#047857' : '#0F172A',
                          background: isSelected ? '#D1FAE5' : '#F1F5F9',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {bank.code}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#065F46' : '#1E293B',
                        }}
                      >
                        {bank.name}
                      </span>
                    </div>
                    {isSelected && (
                      <IonIcon
                        icon={checkmarkCircle}
                        style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};
