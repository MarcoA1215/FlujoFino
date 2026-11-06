import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { getGlobalLoadingHandler } from '../context/LoadingContext';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalLoading?: boolean;
    loadingMessage?: string;
    staleTime?: number;
    skipCache?: boolean;
  }
}

export const PROD_API_FALLBACK = 'https://flujofino.onrender.com';

export const isLocalAddress = (hostOrUrl?: string): boolean => {
  if (!hostOrUrl) return false;
  const clean = hostOrUrl.toLowerCase().trim();
  return (
    clean.includes('localhost') ||
    clean.includes('127.0.0.1') ||
    clean.includes('0.0.0.0') ||
    /^https?:\/\/192\.168\./.test(clean) ||
    /^192\.168\./.test(clean) ||
    /^https?:\/\/10\./.test(clean) ||
    /^10\./.test(clean) ||
    /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\./.test(clean) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean) ||
    clean.endsWith('.local')
  );
};

export const getBaseURL = () => {
  const envApiUrl = (import.meta.env.VITE_API_URL as string)?.trim();
  const isProdBuild = !!import.meta.env.PROD;

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || '';
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      Boolean((window as any).Capacitor?.isNativePlatform?.());

    // 1. En Capacitor (Android / iOS): Nunca debe consultar a localhost en producción
    if (isCapacitor) {
      if (envApiUrl && !isLocalAddress(envApiUrl)) {
        return envApiUrl;
      }
      return PROD_API_FALLBACK;
    }

    const isCurrentHostLocal = isLocalAddress(hostname);

    // 2. Si estamos en un dominio web real de producción (Vercel, dominio propio, etc.)
    if (!isCurrentHostLocal) {
      // Si la variable de entorno es remota y válida, se respeta; de lo contrario, fallback a producción
      if (envApiUrl && !isLocalAddress(envApiUrl)) {
        return envApiUrl;
      }
      return PROD_API_FALLBACK;
    }

    // 3. Si estamos en desarrollo local accediendo desde celular/tablet en red local (LAN)
    const isLocalLan =
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.endsWith('.local');

    if (isLocalLan) {
      // Usar el mismo origen para canalizar mediante el proxy inverso de Vite en puerto 5173
      return window.location.origin;
    }
  }

  // 4. Compilación de producción fuera del navegador o sin window
  if (isProdBuild) {
    if (envApiUrl && !isLocalAddress(envApiUrl)) {
      return envApiUrl;
    }
    return PROD_API_FALLBACK;
  }

  // 5. Entorno de desarrollo local puro en localhost
  return envApiUrl || 'http://localhost:3001';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiCacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  staleAt: number;
}

const apiGetCache = new Map<string, ApiCacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function getApiCacheKey(config: any): string {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${url}?${params}`;
}

export function invalidateApiCache(pattern?: string | RegExp): void {
  if (!pattern) {
    apiGetCache.clear();
    return;
  }
  for (const key of apiGetCache.keys()) {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      apiGetCache.delete(key);
    }
  }
}

export function getApiCacheSize(): number {
  return apiGetCache.size;
}

const MUTATION_METHODS = ['post', 'put', 'delete', 'patch'];

// Contador interno estricto de peticiones en vuelo con overlay activo
let activeRequestsCount = 0;

export const getActiveRequestsCount = () => activeRequestsCount;

export const PUBLIC_AUTH_EXEMPT_ROUTES = ['/login', '/register', '/promoter/terms', '/public', '/store', '/tienda', '/book', '/appointment', '/landing', '/terms', '/privacy', '/delete-account', '/solicitud-eliminacion'];

export function isExemptFromLoginRedirect(pathname: string): boolean {
  return PUBLIC_AUTH_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}

if (apiClient?.interceptors?.request) {
  apiClient.interceptors.request.use(
    async (config) => {
      // Garantizar que toda petición lleve el token actual aunque defaults aún no haya sincronizado
      if (!config.headers.Authorization) {
        const { value: token } = await Preferences.get({ key: 'token' });
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      const method = config.method?.toLowerCase() || '';
      if (MUTATION_METHODS.includes(method) && !config.skipGlobalLoading) {
        activeRequestsCount++;
        getGlobalLoadingHandler()?.show(config.loadingMessage || 'Procesando...');
      }

      // Gestión de Smart Client Cache y Deduplicación en peticiones GET
      if (method === 'get' && !config.skipCache) {
        const cacheKey = getApiCacheKey(config);
        const now = Date.now();

        // 1. Respuesta en caché vigente (staleTime no expirado)
        const cached = apiGetCache.get(cacheKey);
        if (cached && cached.staleAt > now) {
          config.adapter = () => Promise.resolve({
            data: Array.isArray(cached.data)
              ? [...cached.data]
              : (typeof cached.data === 'object' && cached.data !== null ? { ...cached.data } : cached.data),
            status: cached.status,
            statusText: cached.statusText,
            headers: cached.headers,
            config,
            request: {},
          });
          return config;
        }

        // 2. Deduplicación de peticiones concurrentes en vuelo
        if (inFlightRequests.has(cacheKey)) {
          const sharedPromise = inFlightRequests.get(cacheKey)!;
          config.adapter = async () => {
            const sharedRes = await sharedPromise;
            return { ...sharedRes, config };
          };
          return config;
        }

        // 3. Registro de promesa diferida para llamadas simultáneas
        let resolveInFlight: (value: any) => void;
        let rejectInFlight: (reason?: any) => void;
        const sharedPromise = new Promise((resolve, reject) => {
          resolveInFlight = resolve;
          rejectInFlight = reject;
        });
        inFlightRequests.set(cacheKey, sharedPromise);

        const baseAdapter = axios.getAdapter(config.adapter || apiClient.defaults.adapter);
        config.adapter = async (cfg: any) => {
          try {
            const res = await baseAdapter(cfg);
            if (res && res.status >= 200 && res.status < 300) {
              if (apiGetCache.size > 200) {
                const first = apiGetCache.keys().next().value;
                if (first) apiGetCache.delete(first);
              }
              const staleTime = typeof cfg.staleTime === 'number' ? cfg.staleTime : 20000;
              apiGetCache.set(cacheKey, {
                data: res.data,
                status: res.status,
                statusText: res.statusText,
                headers: res.headers,
                staleAt: Date.now() + staleTime,
              });
            }
            resolveInFlight(res);
            return res;
          } catch (err) {
            rejectInFlight(err);
            throw err;
          } finally {
            inFlightRequests.delete(cacheKey);
          }
        };
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

if (apiClient?.interceptors?.response) {
  apiClient.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase() || '';
    if (MUTATION_METHODS.includes(method)) {
      if (!response.config.skipGlobalLoading) {
        activeRequestsCount = Math.max(0, activeRequestsCount - 1);
        if (activeRequestsCount === 0) {
          getGlobalLoadingHandler()?.hide();
        }
      }
      // Invalidar inmediatamente caché de consultas tras cualquier mutación
      // para garantizar que la próxima lectura financiera refleje números 100% frescos
      invalidateApiCache();
    }
    // Protección contra respuestas HTML erróneas (por ejemplo, SPA rewrites de Vercel en rutas API inexistentes)
    if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype')) {
      return Promise.reject(new Error('Respuesta inválida del servidor (se recibió documento HTML en lugar de JSON). Verifique la conexión con el backend.'));
    }
    return response;
  },
  async (error) => {
    if (error.config) {
      const method = error.config.method?.toLowerCase() || '';
      if (MUTATION_METHODS.includes(method) && !error.config.skipGlobalLoading) {
        activeRequestsCount = Math.max(0, activeRequestsCount - 1);
        if (activeRequestsCount === 0) {
          getGlobalLoadingHandler()?.hide();
        }
      }
    }

    // Manejo de expiración de token (401)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isPublicRoute = isExemptFromLoginRedirect(window.location.pathname);
        if (!isPublicRoute) {
          await Preferences.remove({ key: 'token' });
          await Preferences.remove({ key: 'user' });
          delete apiClient.defaults.headers.common['Authorization'];
          invalidateApiCache();
          window.location.href = '/login';
        }
      }
    }

    // Redirección si la suscripción del tenant está vencida o suspendida (403)
    const errorDataStr = JSON.stringify(error.response?.data || '');
    const isSuspendedOrExpired =
      error.response?.status === 403 &&
      (error.response?.data?.code === 'TENANT_SUSPENDED_OR_EXPIRED' ||
        errorDataStr.includes('TENANT_SUSPENDED_OR_EXPIRED') ||
        errorDataStr.includes('período de prueba o suscripción ha concluido') ||
        errorDataStr.includes('se encuentra suspendido'));

    if (isSuspendedOrExpired) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/subscription-expired') && !window.location.pathname.startsWith('/select-workspace')) {
        window.location.href = '/subscription-expired';
      }
    }

    return Promise.reject(error);
  }
);
}

