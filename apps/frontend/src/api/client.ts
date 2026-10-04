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
    return Promise.reject(error);
  }
);

