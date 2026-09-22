import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach a unique request ID to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  },
  (error) => Promise.reject(error)
);

// Surface API errors as toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;
      const message = (data?.message as string) ?? 'An error occurred';
      if (status === 400) toast.error(message);
      else if (status === 404) toast.error(`Not found: ${message}`);
      else if (status === 503) toast.error(`Service unavailable: ${message}`);
      else if (status >= 500) toast.error('Server error. Please try again later.');
      else toast.error(message);
    } else if (error.request) {
      toast.error('Network error. Is the backend running?');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
