import axios from 'axios';
import { getAuthToken } from './authToken';

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export const httpClient = axios.create({
  baseURL: backendBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

