export function hexToRgb(hexColor: string): [number, number, number] {
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return [r, g, b];
}

export function getYIQ(hexColor: string): number {
  const [r, g, b] = hexToRgb(hexColor);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function getContrastColor(hexColor: string): '#ffffff' | '#0f172a' {
  const yiq = getYIQ(hexColor);
  return yiq >= 140 ? '#0f172a' : '#ffffff';
}

/**
 * Returns true if the color is too light to be safely used as foreground text/buttons on white backgrounds.
 */
export function isColorTooLight(hexColor: string): boolean {
  if (!hexColor) return false;
  return getYIQ(hexColor) >= 180;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}

/**
 * Ensures a color is dark enough to be clearly legible as text or outline on white (#FFFFFF).
 * If the color is too light, darkens its luminance while preserving its hue.
 */
export function ensureReadableColor(hexColor: string): string {
  if (!hexColor) return '#0F172A';
  const [r, g, b] = hexToRgb(hexColor);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (yiq < 175) {
    return hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  }

  let [h, s, light] = rgbToHsl(r, g, b);
  // If grayscale or white, return dark slate
  if (s < 0.1) return '#0F172A';

  // Darken until YIQ is safely under 160
  while (light > 0.25) {
    light -= 0.05;
    const [nr, ng, nb] = hslToRgb(h, s, light);
    const nyiq = (nr * 299 + ng * 587 + nb * 114) / 1000;
    if (nyiq < 160) {
      return rgbToHex(nr, ng, nb);
    }
  }

  const [fr, fg, fb] = hslToRgb(h, s, 0.35);
  return rgbToHex(fr, fg, fb);
}

export const PRESET_THEME_COLORS = [
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Índigo', hex: '#6366F1' },
  { name: 'Azul Real', hex: '#2563EB' },
  { name: 'Cian Profundo', hex: '#0891B2' },
  { name: 'Púrpura', hex: '#8B5CF6' },
  { name: 'Rosa Vibrante', hex: '#EC4899' },
  { name: 'Ámbar Intenso', hex: '#D97706' },
  { name: 'Grafito', hex: '#334155' }
];

export const FINOWORK_DEFAULT_THEME = {
  primary: '#10B981',
  primaryRgb: '16, 185, 129',
  primaryContrast: '#ffffff',
  primaryContrastRgb: '255, 255, 255',
  primaryShade: '#059669',
  primaryTint: '#34D399',
  primaryReadable: '#065F46',
  primarySoftBg: '#ECFDF5',
  header: '#ffffff',
  headerContrast: '#0F172A',
};

export function applyThemeToDom(primaryColor?: string | null, headerColor?: string | null): void {
  if (typeof document === 'undefined') return;

  const validHex = (c?: string | null) => (c && /^#[0-9A-Fa-f]{6}$/i.test(c.trim()) ? c.trim() : null);

  const primary = validHex(primaryColor) || FINOWORK_DEFAULT_THEME.primary;
  const header = validHex(headerColor) || primary;

  const [r, g, b] = hexToRgb(primary);
  const contrast = getContrastColor(primary);
  const [cr, cg, cb] = hexToRgb(contrast);
  const readable = ensureReadableColor(primary);
  const headerContrast = getContrastColor(header);

  const [h, s, l] = rgbToHsl(r, g, b);
  const shade = rgbToHex(...hslToRgb(h, s, Math.max(0, l - 0.08)));
  const tint = rgbToHex(...hslToRgb(h, s, Math.min(1, l + 0.1)));
  const softBg = (primary.startsWith('#') ? primary : `#${primary}`) + '18';

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-primary-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--theme-primary-contrast', contrast);
  root.style.setProperty('--theme-primary-contrast-rgb', `${cr}, ${cg}, ${cb}`);
  root.style.setProperty('--theme-primary-readable', readable);
  root.style.setProperty('--theme-primary-shade', shade);
  root.style.setProperty('--theme-primary-tint', tint);
  root.style.setProperty('--theme-primary-soft', softBg);
  root.style.setProperty('--theme-header', header);
  root.style.setProperty('--theme-header-contrast', headerContrast);

  // Ionic global palette tokens
  root.style.setProperty('--ion-color-primary', primary);
  root.style.setProperty('--ion-color-primary-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--ion-color-primary-contrast', contrast);
  root.style.setProperty('--ion-color-primary-contrast-rgb', `${cr}, ${cg}, ${cb}`);
  root.style.setProperty('--ion-color-primary-shade', shade);
  root.style.setProperty('--ion-color-primary-tint', tint);

  // FinoWork CSS tokens (so .ff-btn-primary, .ff-chip.active, etc. adapt automatically)
  root.style.setProperty('--ff-emerald', primary);
  root.style.setProperty('--ff-emerald-dark', shade);
  root.style.setProperty('--ff-emerald-light', softBg);
}

export function resetToDefaultTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const d = FINOWORK_DEFAULT_THEME;

  root.style.setProperty('--theme-primary', d.primary);
  root.style.setProperty('--theme-primary-rgb', d.primaryRgb);
  root.style.setProperty('--theme-primary-contrast', d.primaryContrast);
  root.style.setProperty('--theme-primary-contrast-rgb', d.primaryContrastRgb);
  root.style.setProperty('--theme-primary-readable', d.primaryReadable);
  root.style.setProperty('--theme-primary-shade', d.primaryShade);
  root.style.setProperty('--theme-primary-tint', d.primaryTint);
  root.style.setProperty('--theme-primary-soft', d.primarySoftBg);
  root.style.setProperty('--theme-header', d.header);
  root.style.setProperty('--theme-header-contrast', d.headerContrast);

  root.style.setProperty('--ion-color-primary', d.primary);
  root.style.setProperty('--ion-color-primary-rgb', d.primaryRgb);
  root.style.setProperty('--ion-color-primary-contrast', d.primaryContrast);
  root.style.setProperty('--ion-color-primary-contrast-rgb', d.primaryContrastRgb);
  root.style.setProperty('--ion-color-primary-shade', d.primaryShade);
  root.style.setProperty('--ion-color-primary-tint', d.primaryTint);

  root.style.setProperty('--ff-emerald', d.primary);
  root.style.setProperty('--ff-emerald-dark', d.primaryShade);
  root.style.setProperty('--ff-emerald-light', d.primarySoftBg);
}

