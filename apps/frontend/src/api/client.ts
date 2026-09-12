import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://nutrideli.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});
