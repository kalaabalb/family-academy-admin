import axios from 'axios';
import Cookies from 'js-cookie';

// Base URL from your backend
const API_BASE_URL = 'https://family-academy-backend-a12l.onrender.com/api/v1';

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

// Get token from multiple sources
const getToken = () => {
  return Cookies.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Get refresh token from multiple sources
const getRefreshToken = () => {
  return Cookies.get('refreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
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
        
        // Update token in all storage
        Cookies.set('token', token, { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, { expires: 7, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
          localStorage.setItem('refreshToken', newRefreshToken);
          sessionStorage.setItem('refreshToken', newRefreshToken);
        }
        
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        processQueue(null, token);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Clear all storage
        Cookies.remove('token', { path: '/' });
        Cookies.remove('user', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
        
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
      return Promise.reject({
        ...error,
        userMessage: 'You do not have permission to perform this action.'
      });
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url);
      return Promise.reject({
        ...error,
        userMessage: 'The requested resource was not found.'
      });
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      return Promise.reject({
        ...error,
        userMessage: 'Too many requests. Please try again later.'
      });
    }

    // Handle 500+ Server Errors
    if (error.response?.status >= 500) {
      console.error('Server error:', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data
      });
      return Promise.reject({
        ...error,
        userMessage: 'A server error occurred. Please try again later.'
      });
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        ...error,
        userMessage: 'Request timeout. Please check your connection.'
      });
    }

    if (!error.response) {
      return Promise.reject({
        ...error,
        userMessage: 'Network error. Please check your internet connection.'
      });
    }

    // Log error details
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;