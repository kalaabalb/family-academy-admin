const DEFAULT_MESSAGES = {
  success: 'Done successfully.',
  error: 'Something went wrong. Please try again.',
  warning: 'Please review this action and try again.',
  info: 'Action completed.',
};

const STATUS_MESSAGES = {
  400: 'We could not complete that request. Please review the information and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'We could not find what you were looking for.',
  409: 'This action could not be completed because the data has changed. Please refresh and try again.',
  422: 'Please review the form details and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const TECHNICAL_PATTERNS = [
  /request failed with status code/i,
  /network error/i,
  /err_bad_response/i,
  /err_network/i,
  /cannot read propert/i,
  /undefined is not/i,
  /route not found/i,
  /internal server error/i,
  /stack trace/i,
  /axioserror/i,
];

const BACKEND_MESSAGE_MAP = [
  { pattern: /route not found/i, message: 'That page or action is not available right now.' },
  { pattern: /validation failed|invalid input/i, message: 'Please review the information and try again.' },
  { pattern: /not found/i, message: 'We could not find what you were looking for.' },
  { pattern: /forbidden|permission denied/i, message: 'You do not have permission to perform this action.' },
  { pattern: /unauthorized|token expired|jwt/i, message: 'Your session has expired. Please sign in again.' },
  { pattern: /timeout/i, message: 'The request took too long. Please try again.' },
  { pattern: /network|socket|failed to fetch|connection/i, message: 'Unable to connect right now. Please check the connection and try again.' },
];

const cleanMessage = (value, severity) => {
  if (typeof value !== 'string') {
    return DEFAULT_MESSAGES[severity] || DEFAULT_MESSAGES.info;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_MESSAGES[severity] || DEFAULT_MESSAGES.info;
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return DEFAULT_MESSAGES[severity] || DEFAULT_MESSAGES.info;
  }

  const backendMatch = BACKEND_MESSAGE_MAP.find(({ pattern }) => pattern.test(trimmed));
  if (backendMatch) {
    return backendMatch.message;
  }

  return trimmed
    .replace(/^axioserror:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .replace(/\s+/g, ' ');
};

export const getNotificationMessage = (input, severity = 'info') => {
  if (!input) {
    return DEFAULT_MESSAGES[severity] || DEFAULT_MESSAGES.info;
  }

  if (typeof input === 'object' && input?.response?.status && STATUS_MESSAGES[input.response.status]) {
    if (Array.isArray(input.response?.data?.errors) && input.response.data.errors.length > 0) {
      const combined = input.response.data.errors
        .map((item) => item?.msg || item?.message || '')
        .filter(Boolean)
        .join(', ');
      if (combined) {
        return cleanMessage(combined, severity);
      }
    }
    return STATUS_MESSAGES[input.response.status];
  }

  if (typeof input === 'string') {
    return cleanMessage(input, severity);
  }

  if (input.userMessage) {
    return cleanMessage(input.userMessage, severity);
  }

  if (input.response?.data?.message) {
    return cleanMessage(input.response.data.message, severity);
  }

  if (Array.isArray(input.response?.data?.errors) && input.response.data.errors.length > 0) {
    const combined = input.response.data.errors
      .map((item) => item?.msg || item?.message || '')
      .filter(Boolean)
      .join(', ');
    return cleanMessage(combined, severity);
  }

  if (input.message) {
    return cleanMessage(input.message, severity);
  }

  return DEFAULT_MESSAGES[severity] || DEFAULT_MESSAGES.info;
};

export const getNotificationTitle = (severity = 'info') => {
  switch (severity) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Something Went Wrong';
    case 'warning':
      return 'Heads Up';
    default:
      return 'Notice';
  }
};

export default getNotificationMessage;
