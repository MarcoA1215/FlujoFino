import React, { useMemo } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
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

      <div style={{ position: 'relative', width: '100%' }}>
        <select
          id={id}
          name={name}
          value={normalizedValue}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            height: isSmall ? '38px' : '44px',
            minHeight: isSmall ? '38px' : '44px',
            padding: isSmall ? '6px 30px 6px 12px' : '10px 36px 10px 14px',
            borderRadius: isSmall ? '8px' : '10px',
            border: '1px solid #CBD5E1',
            background: disabled ? '#F1F5F9' : '#FFFFFF',
            color: normalizedValue ? '#0F172A' : '#64748B',
            fontWeight: 600,
            fontSize: isSmall ? '13px' : '14px',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            ...style,
          }}
        >
          <option value="" disabled={required}>
            {placeholder}
          </option>

          {isCustomOrLegacy && normalizedValue && (
            <option value={normalizedValue}>
              {normalizedValue} (Actual)
            </option>
          )}

          <optgroup label="🏦 Bancos Principales">
            {VENEZUELAN_BANKS.slice(0, 6).map((bank) => {
              const formatted = formatBankOptionLabel(bank);
              return (
                <option key={bank.code} value={formatted}>
                  {formatted}
                </option>
              );
            })}
          </optgroup>

          <optgroup label="🏛️ Todos los Bancos (Pago Móvil)">
            {VENEZUELAN_BANKS.slice(6).map((bank) => {
              const formatted = formatBankOptionLabel(bank);
              return (
                <option key={bank.code} value={formatted}>
                  {formatted}
                </option>
              );
            })}
          </optgroup>
        </select>

        {/* Flecha personalizada chevron */}
        <div
          style={{
            position: 'absolute',
            right: isSmall ? '8px' : '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#64748B',
            fontSize: isSmall ? '10px' : '12px',
            lineHeight: 1,
          }}
        >
          ▼
        </div>
      </div>
    </div>
  );
};
