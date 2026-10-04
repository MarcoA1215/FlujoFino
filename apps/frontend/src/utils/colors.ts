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
