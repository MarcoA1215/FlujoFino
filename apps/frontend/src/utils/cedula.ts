export type CedulaPrefix = 'V' | 'E' | 'J' | 'G' | 'P';

export interface CedulaValidationResult {
  raw: string;
  normalized: string;
  prefix: CedulaPrefix | null;
  digits: string;
  hasExplicitPrefix: boolean;
  isValidFormat: boolean;
  warningMessage: string | null;
}

/**
 * Normaliza cualquier documento de identidad o RIF venezolano a un formato canónico tipo "slug"
 * (ej. "v 31.075.846" -> "V-31075846", "31075846" -> "V-31075846", "j-40.123.456-7" -> "J-401234567").
 */
export function normalizeCedula(input?: string | null, defaultPrefix: CedulaPrefix = 'V'): string {
  if (!input) return '';
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return '';

  // Extraer primera letra si comienza con letra
  const prefixMatch = trimmed.match(/^([A-Z])/);
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return prefixMatch && ['V', 'E', 'J', 'G', 'P'].includes(prefixMatch[1])
      ? `${prefixMatch[1]}-`
      : '';
  }

  const rawPrefix = prefixMatch ? prefixMatch[1] : null;
  const validPrefix: CedulaPrefix =
    rawPrefix && (['V', 'E', 'J', 'G', 'P'] as string[]).includes(rawPrefix)
      ? (rawPrefix as CedulaPrefix)
      : defaultPrefix;

  return `${validPrefix}-${digits}`;
}

/**
 * Analiza en vivo lo que el usuario está escribiendo en el campo de Cédula / RIF
 * para mostrar alertas preventivas si omitió el indicador (V-, E-, J-, G-, P-),
 * si usó una letra inválida o si escribió puntos/espacios.
 */
export function analyzeCedulaInput(input?: string | null): CedulaValidationResult {
  const raw = (input || '').trim();
  if (!raw) {
    return {
      raw: '',
      normalized: '',
      prefix: null,
      digits: '',
      hasExplicitPrefix: false,
      isValidFormat: true,
      warningMessage: null,
    };
  }

  const upper = raw.toUpperCase();
  const digits = upper.replace(/\D/g, '');
  const firstLetterMatch = upper.match(/^([A-Z])/);
  const firstLetter = firstLetterMatch ? firstLetterMatch[1] : null;
  const isValidLetter = firstLetter ? ['V', 'E', 'J', 'G', 'P'].includes(firstLetter) : false;

  const normalized = digits ? `${isValidLetter ? firstLetter : 'V'}-${digits}` : (isValidLetter ? `${firstLetter}-` : '');

  if (firstLetter && !isValidLetter) {
    return {
      raw,
      normalized,
      prefix: 'V',
      digits,
      hasExplicitPrefix: false,
      isValidFormat: false,
      warningMessage: `El indicador "${firstLetter}-" no es válido. Usa V- (Venezolano), E- (Extranjero), J- (Jurídico/RIF), G- o P-. Se guardará como ${normalized || 'V-'}.`,
    };
  }

  if (!firstLetter && digits.length > 0) {
    return {
      raw,
      normalized,
      prefix: 'V',
      digits,
      hasExplicitPrefix: false,
      isValidFormat: digits.length >= 5 && digits.length <= 10,
      warningMessage: `Recuerda incluir el indicador (V-, E-, J-, G- o P-). Lo normalizaremos automáticamente como: ${normalized}`,
    };
  }

  if (digits.length > 0 && (digits.length < 5 || digits.length > 10)) {
    return {
      raw,
      normalized,
      prefix: (firstLetter as CedulaPrefix) || 'V',
      digits,
      hasExplicitPrefix: true,
      isValidFormat: false,
      warningMessage: `Verifica la cantidad de dígitos de tu documento (${normalized}). Debe tener entre 5 y 10 números.`,
    };
  }

  if (raw !== normalized && digits.length >= 5) {
    return {
      raw,
      normalized,
      prefix: (firstLetter as CedulaPrefix) || 'V',
      digits,
      hasExplicitPrefix: true,
      isValidFormat: true,
      warningMessage: `Formato estandarizado automáticamente a: ${normalized} (sin puntos ni espacios).`,
    };
  }

  return {
    raw,
    normalized,
    prefix: (firstLetter as CedulaPrefix) || 'V',
    digits,
    hasExplicitPrefix: true,
    isValidFormat: true,
    warningMessage: null,
  };
}
