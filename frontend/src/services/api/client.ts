import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../../config/api';

/**
 * Global Axios Client configured for Spring Boot REST API
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT Authorization Bearer header
apiClient.interceptors.request.use(
  (config) => {
    // Login is public: a saved expired token must not block a new session.
    if (config.url === '/api/auth/login') {
      config.headers.delete('Authorization');
      return config;
    }
    const token = localStorage.getItem('urbanroute_jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error message formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    let customMessage = 'Lỗi kết nối máy chủ';
    if (error.response?.data?.message) {
      customMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      customMessage = error.response.data.error;
    } else if (error.message) {
      customMessage = error.message;
    }
    return Promise.reject(new Error(customMessage));
  }
);
