export const getPublicBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      (window as any).Capacitor?.isNativePlatform?.();
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isCapacitor || isLocalhost) {
      return (
        (import.meta.env.VITE_PUBLIC_URL as string) ||
        'https://finowork.vercel.app'
      );
    }
    return window.location.origin;
  }
  return (
    (import.meta.env.VITE_PUBLIC_URL as string) ||
    'https://finowork.vercel.app'
  );
};
