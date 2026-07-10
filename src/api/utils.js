import { useState, useCallback, useEffect } from 'react';
import { devError } from '../utils/devLogger';

/**
 * Handle API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Context for the error message
 * @returns {Object} Standardized error response
 */
export const handleApiError = (error, context = 'API request') => {
  devError(`${context} failed:`, error);
  
  // Check if it's a custom error with userMessage
  if (error.userMessage) {
    return {
      success: false,
      message: error.userMessage,
      isNetworkError: error.code === 'ECONNABORTED' || !error.response,
      status: error.response?.status,
    };
  }
  
  if (error.response) {
    const { data, status } = error.response;
    
    let message = data?.message || `Server error (${status})`;
    
    if (status === 401) {
      message = 'Authentication required. Please login again.';
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'Resource not found.';
    } else if (status === 409) {
      message = data?.message || 'Conflict occurred.';
    } else if (status >= 500) {
      message = 'Server error. Please try again later.';
    }
    
    return {
      success: false,
      message,
      status,
      data,
      isNetworkError: false,
    };
  }
  
  if (error.request) {
    return {
      success: false,
      message: 'Network error. Please check your internet connection.',
      isNetworkError: true,
    };
  }
  
  return {
    success: false,
    message: error.message || 'An unexpected error occurred.',
    isNetworkError: false,
  };
};

/**
 * Format successful API responses
 * @param {Object} response - Axios response object
 * @param {string} context - Context for the success message
 * @returns {Object} Standardized success response
 */
export const formatSuccessResponse = (response, context = 'Operation') => {
  return {
    success: true,
    message: response.data?.message || `${context} successful`,
    data: response.data?.data || response.data,
    status: response.status,
  };
};

/**
 * Validate required fields in form data
 * @param {Object} data - Form data to validate
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} Validation result with errors if any
 */
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors[field] = `${field.replace(/_/g, ' ')} is required`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format price for display
 * @param {number} price - Price amount
 * @param {string} currency - Currency code (default: 'Birr')
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = 'Birr') => {
  if (!price && price !== 0) return 'Free';
  return `${parseFloat(price).toFixed(2)} ${currency}`;
};

/**
 * Parse price from string
 * @param {string} priceString - Price string (e.g., "100.00 Birr")
 * @returns {number} Parsed price number
 */
export const parsePrice = (priceString) => {
  if (!priceString || priceString === 'Free') return null;
  return parseFloat(priceString.replace(/[^0-9.]/g, ''));
};

/**
 * Debounce function for API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '-';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to calculate relative time from
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Resolve a promise with a timeout guard.
 * @param {Promise<any>} promise - Promise to guard
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} label - Debug label for the timed-out operation
 * @returns {Promise<any>}
 */
export const withTimeout = (promise, timeoutMs = 45000, label = 'request') => {
  const duration = Number(timeoutMs);
  if (!Number.isFinite(duration) || duration <= 0) {
    return promise;
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Timed out while waiting for ${label}.`);
      error.code = 'ETIMEDOUT';
      error.userMessage = 'The request took too long. Please try again.';
      reject(error);
    }, duration);
  });

  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }),
    timeoutPromise,
  ]);
};

/**
 * Check if user has permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Check if user has role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean} Whether user has role
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  return user.role === role;
};

/**
 * Download file from blob
 * @param {Blob} blob - File blob
 * @param {string} filename - Name to save file as
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    devError('Failed to copy:', error);
    return false;
  }
};

// ============== CACHE UTILITIES ==============

/**
 * Cache manager for storing API responses
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if valid cache exists
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Delete all keys matching a pattern
   * @param {RegExp|string} pattern - Pattern to match
   */
  deletePattern(pattern) {
    if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
      return;
    }

    const normalizedPattern = String(pattern || '').trim();
    if (!normalizedPattern) {
      return;
    }

    for (const key of this.cache.keys()) {
      if (
        key === normalizedPattern ||
        key.startsWith(`${normalizedPattern}?`) ||
        key.startsWith(`${normalizedPattern}:`)
      ) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const stats = {
      total: this.cache.size,
      expired: 0,
      valid: 0,
      keys: []
    };
    
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiresAt) {
        stats.expired++;
      } else {
        stats.valid++;
      }
      stats.keys.push(key);
    }
    
    return stats;
  }
}

// Create and export a single instance
export const cacheManager = new CacheManager();

const CACHE_TTL_RULES = [
  { matcher: /^dashboard-/, ttl: 2 * 60 * 1000 },
  { matcher: /^system-logs/, ttl: 60 * 1000 },
  { matcher: /^devices/, ttl: 2 * 60 * 1000 },
  { matcher: /^notifications/, ttl: 2 * 60 * 1000 },
  { matcher: /^payments/, ttl: 2 * 60 * 1000 },
  { matcher: /^subscriptions/, ttl: 2 * 60 * 1000 },
  { matcher: /^settings/, ttl: 5 * 60 * 1000 },
  { matcher: /^users/, ttl: 3 * 60 * 1000 },
  { matcher: /^admins/, ttl: 3 * 60 * 1000 },
  { matcher: /^teachers/, ttl: 5 * 60 * 1000 },
  { matcher: /^schools/, ttl: 10 * 60 * 1000 },
  { matcher: /^categories/, ttl: 10 * 60 * 1000 },
  { matcher: /^courses/, ttl: 10 * 60 * 1000 },
  { matcher: /^chapters/, ttl: 10 * 60 * 1000 },
  { matcher: /^videos/, ttl: 10 * 60 * 1000 },
  { matcher: /^notes/, ttl: 10 * 60 * 1000 },
  { matcher: /^questions/, ttl: 10 * 60 * 1000 },
  { matcher: /^exams/, ttl: 10 * 60 * 1000 },
];

export const resolveCacheTTL = (key, fallbackTTL = null) => {
  if (typeof fallbackTTL === 'number' && fallbackTTL > 0) {
    return fallbackTTL;
  }

  const normalizedKey = String(key || '');
  const matchedRule = CACHE_TTL_RULES.find(({ matcher }) =>
    matcher.test(normalizedKey)
  );

  return matchedRule?.ttl || cacheManager.defaultTTL;
};

/**
 * Generate a cache key from parameters
 * @param {string} base - Base key
 * @param {Object} params - Parameters to include
 * @returns {string} Generated cache key
 */
export const generateCacheKey = (base, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        acc[key] = params[key];
      }
      return acc;
    }, {});
  
  const paramString = Object.keys(sortedParams).length > 0
    ? '?' + JSON.stringify(sortedParams)
    : '';
  
  return `${base}${paramString}`;
};

/**
 * Hook for using cached data in components
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFn - Function to fetch data
 * @param {Object} options - Options
 * @returns {Object} { data, loading, error, refresh, setData }
 */
export const useCache = (cacheKey, fetchFn, options = {}) => {
  const { ttl, initialData = null, onError, requestTimeout = 45000 } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cacheManager.has(cacheKey)) {
      setData(cacheManager.get(cacheKey));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await withTimeout(fetchFn(), requestTimeout, cacheKey);
      // Ensure we always store an array for list data
      const processedResult = Array.isArray(result) ? result : (result || []);
      cacheManager.set(cacheKey, processedResult, ttl);
      setData(processedResult);
    } catch (err) {
      setError(err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, ttl, onError, requestTimeout]);

  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  const updateData = useCallback((newData) => {
    const processedData = Array.isArray(newData) ? newData : (newData || []);
    setData(processedData);
    cacheManager.set(cacheKey, processedData, ttl);
  }, [cacheKey, ttl]);

  const clearCache = useCallback(() => {
    cacheManager.delete(cacheKey);
    setData(null);
  }, [cacheKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data: data || [], // Always return an array, never null
    loading,
    error,
    refresh,
    setData: updateData,
    clearCache
  };
};

// Export all functions as named exports AND as a default object
const utils = {
  handleApiError,
  formatSuccessResponse,
  validateRequiredFields,
  formatPrice,
  parsePrice,
  debounce,
  formatDate,
  getRelativeTime,
  truncateText,
  generateId,
  hasPermission,
  hasRole,
  downloadFile,
  copyToClipboard,
  cacheManager,
  generateCacheKey,
  resolveCacheTTL,
  useCache
};

export default utils;
