import axios from 'axios';
import { getAuthToken } from './authToken';
import { resolveBackendBaseUrl } from './resolveBackendUrl';

export const httpClient = axios.create({
  baseURL: resolveBackendBaseUrl(),
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

