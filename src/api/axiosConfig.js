import axios from 'axios';
import Cookies from 'js-cookie';
import { devError } from '../utils/devLogger';

const isProduction = process.env.NODE_ENV === 'production';
const envApiBaseUrl = process.env.REACT_APP_API_URL?.trim();
const API_BASE_URL = envApiBaseUrl || (isProduction ? '/api/v1' : 'http://localhost:3000/api/v1');

const logDevError = (message, payload) => {
  if (!isProduction) {
    devError(message, payload);
  }
};

const FRIENDLY_STATUS_MESSAGES = {
  400: 'We could not complete that request. Please review the information and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'We could not find what you were looking for.',
  409: 'This action could not be completed because the data has changed. Please refresh and try again.',
  422: 'Please review the form details and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const getFriendlyApiErrorMessage = (error) => {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;

  if (status && FRIENDLY_STATUS_MESSAGES[status]) {
    return FRIENDLY_STATUS_MESSAGES[status];
  }

  if (typeof backendMessage === 'string') {
    const trimmed = backendMessage.trim();
    if (/route not found/i.test(trimmed)) {
      return 'That page or action is not available right now.';
    }
    if (/network|socket|connection|failed to fetch/i.test(trimmed)) {
      return 'Unable to connect right now. Please check the connection and try again.';
    }
    if (/validation failed|invalid input/i.test(trimmed)) {
      return 'Please review the information and try again.';
    }
  }

  if (error?.code === 'ECONNABORTED') {
    return 'Request timeout. Please check your connection and try again.';
  }

  if (!error?.response) {
    return 'Unable to connect right now. Please check the connection and try again.';
  }

  if (status >= 500) {
    return 'A server error occurred. Please try again in a moment.';
  }

  return 'Something went wrong. Please try again.';
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies!
});

// Token refresh state
let isRefreshing = false;
let failedQueue = [];
const STORAGE_KEYS = {
  token: 'fa_admin_token',
  user: 'fa_admin_user',
  refreshToken: 'fa_admin_refresh_token',
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Get token from cookies only (simplified)
const getToken = () => {
  return Cookies.get('token') ||
    localStorage.getItem(STORAGE_KEYS.token) ||
    sessionStorage.getItem(STORAGE_KEYS.token);
};

// Get refresh token from cookies only
const getRefreshToken = () => {
  return Cookies.get('refreshToken') ||
    localStorage.getItem(STORAGE_KEYS.refreshToken) ||
    sessionStorage.getItem(STORAGE_KEYS.refreshToken);
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh')) {
        // Refresh token failed - logout
        Cookies.remove('token', { path: '/' });
        Cookies.remove('user', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        sessionStorage.removeItem(STORAGE_KEYS.token);
        sessionStorage.removeItem(STORAGE_KEYS.user);
        sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        // Update token in cookies only
        Cookies.set('token', token, { 
          expires: 7, 
          secure: isProduction, 
          sameSite: 'lax', 
          path: '/' 
        });
        
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, { 
            expires: 7, 
            secure: isProduction, 
            sameSite: 'lax', 
            path: '/' 
          });
        }

        if (localStorage.getItem(STORAGE_KEYS.token)) {
          localStorage.setItem(STORAGE_KEYS.token, token);
          if (newRefreshToken) {
            localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);
          }
        } else if (sessionStorage.getItem(STORAGE_KEYS.token)) {
          sessionStorage.setItem(STORAGE_KEYS.token, token);
          if (newRefreshToken) {
            sessionStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);
          }
        }
        
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        processQueue(null, token);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Clear all cookies
        Cookies.remove('token', { path: '/' });
        Cookies.remove('user', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        sessionStorage.removeItem(STORAGE_KEYS.token);
        sessionStorage.removeItem(STORAGE_KEYS.user);
        sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
        
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      logDevError('Access forbidden:', error.response.data);
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      logDevError('Resource not found:', error.config?.url);
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    // Handle 500+ Server Errors
    if (error.response?.status >= 500) {
      logDevError('Server error:', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data
      });
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    if (!error.response) {
      return Promise.reject({
        ...error,
        userMessage: getFriendlyApiErrorMessage(error)
      });
    }

    logDevError('API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    return Promise.reject({
      ...error,
      userMessage: getFriendlyApiErrorMessage(error)
    });
  }
);

export default axiosInstance;
