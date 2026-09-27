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

apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toLowerCase() || '';
    if (MUTATION_METHODS.includes(method) && !config.skipGlobalLoading) {
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
      getGlobalLoadingHandler()?.hide();
    }
    return response;
  },
  async (error) => {
    if (error.config) {
      const method = error.config.method?.toLowerCase() || '';
      if (MUTATION_METHODS.includes(method) && !error.config.skipGlobalLoading) {
        getGlobalLoadingHandler()?.hide();
      }
    }

    if (error.response && error.response.status === 401) {
      // Evitar loop infinito si ya estamos en /login
      if (!window.location.pathname.includes('/login')) {
        await Preferences.remove({ key: 'token' });
        await Preferences.remove({ key: 'user' });
        delete apiClient.defaults.headers.common['Authorization'];
        // Limpieza total del estado local (forzamos unmount completo)
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

