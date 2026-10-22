import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { getGlobalLoadingHandler } from '../context/LoadingContext';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalLoading?: boolean;
    loadingMessage?: string;
  }
}

const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    // Si estamos navegando desde el celular o cualquier dispositivo en la red local
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Usar el mismo origen (proxy de Vite en puerto 5173) para que todas las peticiones
      // fluyan sin bloqueos de firewall en puertos secundarios ni conflictos de host
      return window.location.origin;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

const MUTATION_METHODS = ['post', 'put', 'delete', 'patch'];

// Contador interno estricto de peticiones en vuelo con overlay activo
let activeRequestsCount = 0;

export const getActiveRequestsCount = () => activeRequestsCount;

export const PUBLIC_AUTH_EXEMPT_ROUTES = ['/login', '/public', '/store', '/tienda', '/book', '/appointment', '/landing', '/terms', '/privacy', '/delete-account', '/solicitud-eliminacion'];

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
    if (MUTATION_METHODS.includes(method) && !response.config.skipGlobalLoading) {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
      if (activeRequestsCount === 0) {
        getGlobalLoadingHandler()?.hide();
      }
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

