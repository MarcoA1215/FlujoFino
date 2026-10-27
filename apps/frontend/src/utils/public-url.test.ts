import { describe, it, expect, afterEach } from 'vitest';
import { getPublicBaseUrl } from './public-url';

describe('Public Base URL Resolution (getPublicBaseUrl)', () => {
  const originalLocation = window.location;

  afterEach(() => {
    // Restaurar original
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    delete (window as any).Capacitor;
  });

  it('debe devolver https://www.finowork.com en Capacitor si no hay URL remota', () => {
    (window as any).Capacitor = {
      isNativePlatform: () => true,
    };
    const url = getPublicBaseUrl();
    expect(url).toBe('https://www.finowork.com');
  });

  it('debe devolver window.location.origin cuando estamos en un dominio web real', () => {
    delete (window as any).Capacitor;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hostname: 'finowork.vercel.app',
        origin: 'https://finowork.vercel.app',
        protocol: 'https:',
      },
      writable: true,
    });

    const url = getPublicBaseUrl();
    expect(url).toBe('https://finowork.vercel.app');
  });

  it('debe devolver la IP de LAN local (ej. http://192.168.0.32:5173) en el celular cuando navega por Wi-Fi', () => {
    delete (window as any).Capacitor;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hostname: '192.168.0.32',
        origin: 'http://192.168.0.32:5173',
        protocol: 'http:',
      },
      writable: true,
    });

    const url = getPublicBaseUrl();
    expect(url).toBe('http://192.168.0.32:5173');
  });

  it('debe devolver localhost cuando se navega en localhost desde el navegador', () => {
    delete (window as any).Capacitor;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hostname: 'localhost',
        origin: 'http://localhost:5173',
        protocol: 'http:',
      },
      writable: true,
    });

    const url = getPublicBaseUrl();
    expect(url).toBe('http://localhost:5173');
  });

  it('debe resolver a un valor no vacío y válido en cualquier entorno', () => {
    const url = getPublicBaseUrl();
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
