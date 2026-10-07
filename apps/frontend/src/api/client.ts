import axios from 'axios';
import { Preferences } from '@capacitor/preferences';
import { getGlobalLoadingHandler } from '../context/LoadingContext';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalLoading?: boolean;
    loadingMessage?: string;
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

const MUTATION_METHODS = ['post', 'put', 'delete', 'patch'];

// Contador interno estricto de peticiones en vuelo con overlay activo
let activeRequestsCount = 0;

export const getActiveRequestsCount = () => activeRequestsCount;

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
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/public')) {
        await Preferences.remove({ key: 'token' });
        await Preferences.remove({ key: 'user' });
        delete apiClient.defaults.headers.common['Authorization'];
        window.location.href = '/login';
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
