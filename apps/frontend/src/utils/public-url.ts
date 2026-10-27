export const getPublicBaseUrl = (): string => {
  const envPublicUrl = (import.meta.env.VITE_PUBLIC_URL as string)?.trim();
  const isProd = Boolean(import.meta.env.PROD);
  const isEnvLocal =
    !envPublicUrl ||
    envPublicUrl.includes('localhost') ||
    envPublicUrl.includes('127.0.0.1');

  if (typeof window !== 'undefined' && window.location) {
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      Boolean((window as any).Capacitor?.isNativePlatform?.());

    // 1. En Capacitor (APK Android / iOS nativo):
    // La app corre bajo 'capacitor://localhost', nunca compartimos localhost a clientes.
    if (isCapacitor) {
      if (envPublicUrl && !isEnvLocal) {
        return envPublicUrl.replace(/\/$/, '');
      }
      return 'https://www.finowork.com';
    }

    // 2. En cualquier navegador web (móvil vía LAN IP, desktop en localhost o dominio en producción):
    // window.location.origin siempre es la dirección real y accesible desde donde se abrió la app.
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.startsWith('capacitor:')) {
      // Protección extra: En producción estricta nunca permitimos 'localhost' o '127.0.0.1'
      if (isProd && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return envPublicUrl && !isEnvLocal ? envPublicUrl.replace(/\/$/, '') : 'https://www.finowork.com';
      }
      return origin.replace(/\/$/, '');
    }

    // 3. Fallback de navegador si origin no estuviera disponible
    if (envPublicUrl && (!isProd || !isEnvLocal)) {
      return envPublicUrl.replace(/\/$/, '');
    }
    return isProd ? 'https://www.finowork.com' : 'http://localhost:5173';
  }

  // 4. Fuera del navegador (SSR/Node/Tests)
  if (envPublicUrl && (!isProd || !isEnvLocal)) {
    return envPublicUrl.replace(/\/$/, '');
  }
  return 'https://www.finowork.com';
};

