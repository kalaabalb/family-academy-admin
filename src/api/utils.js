/**
 * Handle API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Context for the error message
 * @returns {Object} Standardized error response
 */
export const handleApiError = (error, context = 'API request') => {
  console.error(`❌ ${context} failed:`, error);
  
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
    console.error('Failed to copy:', error);
    return false;
  }
};

export default {
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
};