import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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
