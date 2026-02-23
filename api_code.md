## auth.js

```javascript
import axiosInstance from './axiosConfig';

const authApi = {
  
  register: (data) => axiosInstance.post('/auth/register', data),
  
  
  adminLogin: (username, password) => 
    axiosInstance.post('/auth/admin-login', { username, password }),
  
  

  
  logout: () => axiosInstance.post('/auth/logout'),
  
  
  validateToken: () => axiosInstance.get('/auth/validate'),
  
  
  refreshToken: (refreshToken) => 
    axiosInstance.post('/auth/refresh', { refreshToken }),
uploadImage: (formData) => 
    axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export default authApi;```

---

## axiosConfig.js

```javascript
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

export default axiosInstance;```

---

## categories.js

```javascript
import axiosInstance from './axiosConfig';

const categoriesApi = {
  getAllCategories: () => axiosInstance.get('/categories/all'),
  
  getCategoriesForStudent: () => axiosInstance.get('/categories'),
  
  createCategory: (data) => axiosInstance.post('/categories', data),
  
  updateCategory: (id, data) => axiosInstance.put(`/categories/${id}`, data),
  
  deleteCategory: (id) => axiosInstance.delete(`/categories/${id}`),
  
  getCategoryDetails: (id) => axiosInstance.get(`/categories/${id}`),
  
  // Upload category image
  uploadCategoryImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default categoriesApi;```

---

## chapters.js

```javascript
import axiosInstance from './axiosConfig';

const chaptersApi = {
  
  getAllChapters: (params) => 
    axiosInstance.get('/chapters', { params }),
  
  
  getChaptersForStudent: (courseId) => 
    axiosInstance.get(`/courses/${courseId}/chapters`),
  
  
  createChapter: (data) => axiosInstance.post('/chapters', data),
  
  
  updateChapter: (id, data) => axiosInstance.put(`/chapters/${id}`, data),
  
  
  deleteChapter: (id) => axiosInstance.delete(`/chapters/${id}`),
};

export default chaptersApi;```

---

## courses.js

```javascript
import axiosInstance from './axiosConfig';

const coursesApi = {
  
  getAllCourses: (categoryId) => 
    axiosInstance.get('/courses', { params: { category_id: categoryId } }),
  
  
  getCoursesForStudent: (categoryId) => 
    axiosInstance.get(`/categories/${categoryId}/courses`),
  
  
  createCourse: (data) => axiosInstance.post('/courses', data),
  
  
  updateCourse: (id, data) => axiosInstance.put(`/courses/${id}`, data),
  
  
  deleteCourse: (id) => axiosInstance.delete(`/courses/${id}`),
  
  
  assignTeacher: (courseId, teacherId) => 
    axiosInstance.post('/courses/assign-teacher', { course_id: courseId, teacher_id: teacherId }),
};

export default coursesApi;```

---

## devices.js

```javascript
import axiosInstance from './axiosConfig';

const devicesApi = {
  
  getAllDevices: (params = {}) => 
    axiosInstance.get('/devices', { params }),
  
  
  getDevice: (id) => 
    axiosInstance.get(`/devices/${id}`),
  
  
  forceRemoveDevice: (id, data) => 
    axiosInstance.delete(`/devices/${id}/force`, { data }),
  
  
  getUserDevices: (userId) => 
    axiosInstance.get(`/users/${userId}/devices`),
  
  
  updateDevice: (id, data) => 
    axiosInstance.put(`/devices/${id}`, data),
  
  
  getDeviceStats: () => 
    axiosInstance.get('/devices/stats'),
  
  
  bulkRemoveDevices: (deviceIds) => 
    axiosInstance.post('/devices/bulk-remove', {
      device_ids: deviceIds
    }),
  
  
  searchDevices: (query, params = {}) => 
    axiosInstance.get('/devices/search', {
      params: { q: query, ...params }
    }),
  
  
  getDeviceActivity: (deviceId, params = {}) => 
    axiosInstance.get(`/devices/${deviceId}/activity`, { params }),
  
  
  exportDevices: (format = 'csv') => 
    axiosInstance.get('/devices/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default devicesApi;```

---

## examResults.js

```javascript
import axiosInstance from './axiosConfig';

const examResultsApi = {
  
  getAllExamResults: (params) => 
    axiosInstance.get('/exam-results', { params }),
  
  
  getExamResultById: (id) => axiosInstance.get(`/exam-results/${id}`),
  
  
  getExamResultsByUser: (userId) => 
    axiosInstance.get(`/exam-results/user/${userId}`),
  
  
  getExamResultsByExam: (examId) => 
    axiosInstance.get(`/exam-results/exam/${examId}`),
  
  
  updateExamResult: (id, data) => axiosInstance.put(`/exam-results/${id}`, data),
  
  
  deleteExamResult: (id) => axiosInstance.delete(`/exam-results/${id}`),
};

export default examResultsApi;```

---

## exams.js

```javascript

import axiosInstance from './axiosConfig';

const examsApi = {
  
  getAllExams: (params) => 
    axiosInstance.get('/exams', { params }),
  
  
  getExamById: (id) => 
    axiosInstance.get(`/exams/${id}`),
  
  
  getExamQuestions: (examId) => 
    axiosInstance.get(`/exams/${examId}/questions`),
  
  
  createExam: (data) => axiosInstance.post('/exams', data),
  
  
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  
  
  deleteExam: (id) => axiosInstance.delete(`/exams/${id}`),
  
  
  createExamQuestion: (examId, data) => 
    axiosInstance.post(`/exams/${examId}/questions`, data),
  
  
  updateExamQuestion: (examQuestionId, data) => 
    axiosInstance.put(`/exams/questions/${examQuestionId}`, data),
  
  
  deleteExamQuestion: (examQuestionId) => 
    axiosInstance.delete(`/exams/questions/${examQuestionId}`),
  
  
  addQuestionToExam: (examId, questionIds) => 
    axiosInstance.post('/exams/add-question', { exam_id: examId, question_ids: questionIds }),
  
  
  getAvailableExams: (courseId) => 
    axiosInstance.get('/exams/available', { params: { course_id: courseId } }),
  
  startExam: (examId) => axiosInstance.post(`/exams/start/${examId}`),
  
  submitExam: (examResultId, answers) => 
    axiosInstance.post(`/exams/submit/${examResultId}`, { answers }),
  
  getMyExamResults: () => axiosInstance.get('/exams/my-results'),
};

export default examsApi;
```

---

## notes.js

```javascript
import axiosInstance from './axiosConfig';

const notesApi = {
  
  getAllNotes: (params) => 
    axiosInstance.get('/notes', { params }),
  
  
  getNotesForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/notes`),
  
  
  createNote: (data) => axiosInstance.post('/notes', data),
  
  
  updateNote: (id, data) => axiosInstance.put(`/notes/${id}`, data),
  
  
  deleteNote: (id) => axiosInstance.delete(`/notes/${id}`),
};

export default notesApi;```

---

## notifications.js

```javascript
import axiosInstance from './axiosConfig';

const notificationsApi = {
  
  
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  
  getNotificationHistory: (params) => 
    axiosInstance.get('/notifications/history', { params }),
  
  getMyNotifications: () => axiosInstance.get('/notifications/my-notifications'),
  
  markAsRead: (notificationId) => 
    axiosInstance.put(`/notifications/${notificationId}/read`),
  
  markAllAsRead: () => 
    axiosInstance.put('/notifications/mark-all-read'),
  
  deleteNotification: (notificationId) => 
    axiosInstance.delete(`/notifications/${notificationId}`),
  
  deleteAllNotifications: () => 
    axiosInstance.delete('/notifications/delete-all'),
  
  getUnreadCount: () => 
    axiosInstance.get('/notifications/unread-count'),

  

  /**
   * Send notification to all linked parents
   */
  sendToAllParents: (data) => 
    axiosInstance.post('/notifications/send-to-parents', data),

  /**
   * Send weekly progress report to all parents
   */
  sendWeeklyReports: () => 
    axiosInstance.post('/notifications/send-weekly-reports'),

  /**
   * Send achievement notification to specific parent
   */
  sendAchievementToParent: (userId, achievement) => 
    axiosInstance.post(`/notifications/parent/${userId}/achievement`, { achievement }),

  /**
   * Send streak update to parent
   */
  sendStreakUpdateToParent: (userId) => 
    axiosInstance.post(`/notifications/parent/${userId}/streak-update`),

  /**
   * Get parent notification settings
   */
  getParentNotificationSettings: () => 
    axiosInstance.get('/notifications/parent-settings'),

  /**
   * Update parent notification settings
   */
  updateParentNotificationSettings: (settings) => 
    axiosInstance.put('/notifications/parent-settings', settings),

  /**
   * Get parent notification history
   */
  getParentNotificationHistory: (params = {}) => 
    axiosInstance.get('/notifications/parent-history', { params }),

  /**
   * Schedule weekly report for parents
   */
  scheduleWeeklyReport: (day, time) => 
    axiosInstance.post('/notifications/schedule-weekly', { day, time }),
};

export default notificationsApi;```

---

## payments.js

```javascript
import axiosInstance from './axiosConfig';

const paymentsApi = {
  submitPayment: (data) => axiosInstance.post('/payments/submit', data),
  
  getMyPayments: () => axiosInstance.get('/payments/my-payments'),
  
  getPendingPayments: () => axiosInstance.get('/payments/pending'),
  
  getAllPayments: () => axiosInstance.get('/payments/all'),
  
  verifyPayment: (id, adminNotes = '') => 
    axiosInstance.post(`/payments/verify/${id}`, { admin_notes: adminNotes }),
  
  rejectPayment: (id, rejectionReason) => 
    axiosInstance.post(`/payments/reject/${id}`, { rejection_reason: rejectionReason }),
};

export default paymentsApi;```

---

## questions.js

```javascript

import axiosInstance from './axiosConfig';

const questionsApi = {
  
  getAllQuestions: (params) => 
    axiosInstance.get('/questions', { params }),
  
  
  getPracticeQuestions: (chapterId) => 
    axiosInstance.get(`/questions/practice/${chapterId}`),
  
  
  checkAnswer: (questionId, selectedOption) => 
    axiosInstance.post('/questions/check-answer', { question_id: questionId, selected_option: selectedOption }),
  
  
  createQuestion: (data) => axiosInstance.post('/questions', data),
  
  
  createBatchQuestions: (chapterId, questions) => 
    axiosInstance.post('/questions/batch', { chapter_id: chapterId, questions }),
  
  
  updateQuestion: (id, data) => axiosInstance.put(`/questions/${id}`, data),
  
  
  deleteQuestion: (id) => axiosInstance.delete(`/questions/${id}`),
  
  
  getQuestionsForExam: (courseId, filters = {}) =>
    axiosInstance.get('/questions/for-exam', { 
      params: { course_id: courseId, ...filters } 
    }),
};

export default questionsApi;
```

---

## schools.js

```javascript
import axiosInstance from './axiosConfig';

const schoolsApi = {
  
  getAllSchools: () => axiosInstance.get('/schools'),
  
  
  createSchool: (name) => axiosInstance.post('/schools', { name }),
  
  
  updateSchool: (id, name) => axiosInstance.put(`/schools/${id}`, { name }),
  
  
  deleteSchool: (id) => axiosInstance.delete(`/schools/${id}`),
};

export default schoolsApi;```

---

## settings.js

```javascript
import axiosInstance from './axiosConfig';

const settingsApi = {
  
  getAllSettings: () => axiosInstance.get('/settings'),
  
  
  getSettingsByCategory: (category, includePrivate = false) => 
    axiosInstance.get(`/settings/category/${category}`, { 
      params: { include_private: includePrivate } 
    }),
  
  
  getPublicSettings: () => axiosInstance.get('/settings/public'),
  
  
  getSetting: (key) => axiosInstance.get(`/settings/${key}`),
  
  
  getCategories: () => axiosInstance.get('/settings/categories'),
  
  
  upsertSetting: (data) => axiosInstance.post('/settings', data),
  
  
  updateMultipleSettings: (settings) => 
    axiosInstance.put('/settings/multiple', { settings }),
  
  
  deleteSetting: (key) => axiosInstance.delete(`/settings/${key}`),
  
  
  initializeDefaultSettings: () => 
    axiosInstance.post('/settings/initialize-defaults'),
};

export default settingsApi;```

---

## subscriptions.js

```javascript
import axiosInstance from './axiosConfig';

const subscriptionsApi = {
  
  getAllSubscriptions: (params = {}) => 
    axiosInstance.get('/subscriptions', { params }),
  
  
  getSubscription: (id) => 
    axiosInstance.get(`/subscriptions/${id}`),
  
  
  extendSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}/extend`, data),
  
  
  cancelSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/cancel`),
  
  
  reactivateSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/reactivate`),
  
  
  createSubscription: (data) => 
    axiosInstance.post('/subscriptions', data),
  
  
  getUserSubscriptions: (userId) => 
    axiosInstance.get(`/users/${userId}/subscriptions`),
  
  
  updateSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}`, data),
  
  
  deleteSubscription: (id) => 
    axiosInstance.delete(`/subscriptions/${id}`),
  
  
  getSubscriptionStats: () => 
    axiosInstance.get('/subscriptions/stats'),
  
  
  bulkUpdateSubscriptions: (subscriptionIds, data) => 
    axiosInstance.put('/subscriptions/bulk-update', {
      subscription_ids: subscriptionIds,
      data
    }),
  
  
  checkSubscriptionStatus: (userId, categoryId) => 
    axiosInstance.get('/subscriptions/check-status', {
      params: { user_id: userId, category_id: categoryId }
    }),
  
  
  getUpcomingExpirations: (days = 7) => 
    axiosInstance.get('/subscriptions/upcoming-expirations', {
      params: { days }
    }),
  
  
  exportSubscriptions: (format = 'csv') => 
    axiosInstance.get('/subscriptions/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default subscriptionsApi;```

---

## systemLogs.js

```javascript
import axiosInstance from './axiosConfig';

const systemLogsApi = {
  // Get system logs with filters
  getSystemLogs: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/system-logs', { params });
      return response;
    } catch (error) {
      console.error('Error fetching system logs:', error);
      throw error;
    }
  },
  
  // Get log statistics
  getLogStats: async () => {
    try {
      const response = await axiosInstance.get('/system-logs/stats');
      return response;
    } catch (error) {
      console.error('Error fetching log stats:', error);
      // Return default stats object instead of throwing
      return {
        data: {
          success: true,
          data: {
            counts: { total: 0, info: 0, warn: 0, error: 0, debug: 0 },
            recent_actions: [],
            error_trends: [],
            summary: {
              days_with_logs: 0,
              latest_log: null,
              oldest_log: null,
              logs_per_day: 0
            }
          }
        }
      };
    }
  },
  
  // Clear old logs
  clearOldLogs: async (days = 30) => {
    try {
      const response = await axiosInstance.delete('/system-logs/clear', { params: { days } });
      return response;
    } catch (error) {
      console.error('Error clearing old logs:', error);
      throw error;
    }
  },
  
  // Export logs
  exportLogs: async (format = 'csv', params = {}) => {
    try {
      const response = await axiosInstance.get('/system-logs/export', {
        params: { format, ...params },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting logs:', error);
      throw error;
    }
  },
  
  // Get single log details
  getLogDetails: async (id) => {
    try {
      const response = await axiosInstance.get(`/system-logs/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching log details:', error);
      throw error;
    }
  }
};

export default systemLogsApi;```

---

## teachers.js

```javascript
import axiosInstance from './axiosConfig';

const teachersApi = {
  
  getAllTeachers: () => axiosInstance.get('/teachers'),
  
  
  createTeacher: (data) => axiosInstance.post('/teachers', data),
  
  
  updateTeacher: (id, data) => axiosInstance.put(`/teachers/${id}`, data),
  
  
  deleteTeacher: (id) => axiosInstance.delete(`/teachers/${id}`),
  
  
  resetTeacherPassword: (id, data) => 
    axiosInstance.post(`/teachers/${id}/reset-password`, data),
  
  
  getTeacherCourses: (teacherId) => 
    axiosInstance.get(`/teachers/${teacherId}/courses`),
  
  
  getTeacherDetails: (id) => axiosInstance.get(`/teachers/${id}`),
};

export default teachersApi;```

---

## telegram.js

```javascript
import axiosInstance from './axiosConfig';

const telegramApi = {
  
  
  generateParentToken: () => axiosInstance.post('/telegram/generate-token'),
  getParentLinkStatus: () => axiosInstance.get('/telegram/status'),
  unlinkParent: () => axiosInstance.post('/telegram/unlink'),
  
  getBotStatus: () => axiosInstance.get('/telegram/bot-status'),
  testBotConnection: () => axiosInstance.post('/telegram/test-connection'),
  updateBotSettings: (settings) => axiosInstance.put('/telegram/settings', settings),
  
  validateParentToken: (token, telegramUserId, telegramUsername) => 
    axiosInstance.post('/telegram/validate-token', { token, telegramUserId, telegramUsername }),

  

  /**
   * Send custom message to a specific parent
   */
  sendMessageToParent: (parentTelegramId, message) => 
    axiosInstance.post('/telegram/send-to-parent', { 
      parent_telegram_id: parentTelegramId, 
      message 
    }),

  /**
   * Send progress report to a specific parent
   */
  sendProgressToParent: (userId) => 
    axiosInstance.post(`/telegram/send-progress/${userId}`),

  /**
   * Send progress report to all parents
   */
  sendProgressToAllParents: () => 
    axiosInstance.post('/telegram/send-progress-all'),

  /**
   * Get all linked parents
   */
  getLinkedParents: (params = {}) => 
    axiosInstance.get('/telegram/parents', { params }),

  /**
   * Get parent details by user ID
   */
  getParentByUserId: (userId) => 
    axiosInstance.get(`/telegram/parent/${userId}`),

  /**
   * Get parent statistics
   */
  getParentStats: () => 
    axiosInstance.get('/telegram/parent-stats'),

  /**
   * Send broadcast message to all parents
   */
  sendBroadcastToParents: (message, includeImages = false) => 
    axiosInstance.post('/telegram/broadcast', { 
      message, 
      include_images: includeImages 
    }),

  /**
   * Schedule a message to be sent to parents
   */
  scheduleParentMessage: (message, scheduledTime, targetType = 'all') => 
    axiosInstance.post('/telegram/schedule-message', {
      message,
      scheduled_time: scheduledTime,
      target_type: targetType
    }),

  /**
   * Get parent message history
   */
  getParentMessageHistory: (params = {}) => 
    axiosInstance.get('/telegram/message-history', { params }),

  /**
   * Test parent notification
   */
  testParentNotification: (parentTelegramId) => 
    axiosInstance.post('/telegram/test-notification', { 
      parent_telegram_id: parentTelegramId 
    }),

  /**
   * Get parent engagement statistics
   */
  getParentEngagementStats: () => 
    axiosInstance.get('/telegram/engagement-stats'),
};

export default telegramApi;```

---

## TestApi.js

```javascript
import React, { useEffect } from 'react';
import axiosInstance from '../api/axiosConfig';

const TestApi = () => {
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing API connection...');
        const response = await axiosInstance.get('/auth/validate');
        console.log('API Test Response:', response.data);
        
        
        const categoriesRes = await axiosInstance.get('/categories');
        console.log('Categories Response:', categoriesRes.data);
      } catch (error) {
        console.error('API Test Error:', error);
        console.error('Error details:', error.response?.data || error.message);
      }
    };
    
    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Testing API Connection</h2>
      <p>Check browser console for results</p>
    </div>
  );
};

export default TestApi;```

---

## users.js

```javascript
import axiosInstance from './axiosConfig';

const usersApi = {
  
  getAllUsers: (params = {}) => 
    axiosInstance.get('/users', { 
      params,
      timeout: 30000,
    }),
  
  getUserDetails: (id) => 
    axiosInstance.get(`/users/${id}`, {
      timeout: 30000,
    }),
  
  updateUser: (id, data) => 
    axiosInstance.put(`/users/${id}`, data, {
      timeout: 15000,
    }),
  
  deleteUser: (id) => 
    axiosInstance.delete(`/users/${id}`, {
      timeout: 15000,
    }),
  
  getMyProfile: () => 
    axiosInstance.get('/users/me', {
      timeout: 15000,
    }),
  
  updateMyProfile: (data) => 
    axiosInstance.put('/users/me', data, {
      timeout: 15000,
    }),
  
  updateUserDevice: (deviceType, deviceId) => 
    axiosInstance.put('/users/device', { 
      device_type: deviceType, 
      device_id: deviceId 
    }, {
      timeout: 15000,
    }),
  
  getUserStats: () => 
    axiosInstance.get('/users/stats', {
      timeout: 15000,
    }),
  
  searchUsers: (query, params = {}) => 
    axiosInstance.get('/users/search', {
      params: { q: query, ...params },
      timeout: 15000,
    }),
  
  bulkUpdateUsers: (userIds, data) => 
    axiosInstance.put('/users/bulk-update', {
      user_ids: userIds,
      data
    }, {
      timeout: 30000,
    }),
  
  exportUsers: (format = 'csv', params = {}) => 
    axiosInstance.get('/users/export', {
      params: { format, ...params },
      responseType: 'blob',
      timeout: 60000,
    }),
  
  getUserActivity: (userId, params = {}) => 
    axiosInstance.get(`/users/${userId}/activity`, {
      params,
      timeout: 15000,
    }),
  
  updateSubscription: (userId, subscriptionId, data) => 
    axiosInstance.put(`/users/${userId}/subscriptions/${subscriptionId}`, data, {
      timeout: 15000,
    }),
  
  resetPassword: (userId, newPassword) => 
    axiosInstance.post(`/users/${userId}/reset-password`, { 
      new_password: newPassword 
    }, {
      timeout: 15000,
    }),
  
  generateReport: (userId, reportType) => 
    axiosInstance.get(`/users/${userId}/reports/${reportType}`, {
      responseType: 'blob',
      timeout: 30000,
    }),

  
  
  /**
   * Get user's progress overview
   */
  getUserProgress: (userId) => 
    axiosInstance.get(`/progress/overview/${userId}`, {
      timeout: 15000,
    }),

  /**
   * Get user's streak details
   */
  getUserStreak: (userId) => 
    axiosInstance.get(`/streaks/user/${userId}`, {
      timeout: 15000,
    }),

  /**
   * Get user's achievements
   */
  getUserAchievements: (userId) => 
    axiosInstance.get(`/users/${userId}/achievements`, {
      timeout: 15000,
    }),

  /**
   * Get user's chapter progress
   */
  getUserChapterProgress: (userId, courseId) => 
    axiosInstance.get(`/progress/user/${userId}/course/${courseId}`, {
      timeout: 15000,
    }),

  /**
   * Get user's exam results
   */
  getUserExamResults: (userId) => 
    axiosInstance.get(`/exam-results/user/${userId}`, {
      timeout: 15000,
    }),

  /**
   * Get user's study time statistics
   */
  getUserStudyTime: (userId, period = 'month') => 
    axiosInstance.get(`/users/${userId}/study-time`, {
      params: { period },
      timeout: 15000,
    }),

  /**
   * Get user's progress report for a specific date range
   */
  getUserProgressReport: (userId, startDate, endDate) => 
    axiosInstance.get(`/users/${userId}/progress-report`, {
      params: { start_date: startDate, end_date: endDate },
      timeout: 20000,
    }),

  /**
   * Get top performing users (leaderboard)
   */
  getLeaderboard: (limit = 10) => 
    axiosInstance.get('/streaks/leaderboard', {
      params: { limit },
      timeout: 15000,
    }),

  /**
   * Send progress report to parent via Telegram
   */
  sendProgressToParent: (userId) => 
    axiosInstance.post(`/telegram/send-progress/${userId}`, {}, {
      timeout: 15000,
    }),

  /**
   * Get users with parent linking
   */
  getUsersWithParents: (params = {}) => 
    axiosInstance.get('/users/with-parents', {
      params,
      timeout: 15000,
    }),
};

export default usersApi;```

---

## utils.js

```javascript
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
};```

---

## videos.js

```javascript
import axiosInstance from './axiosConfig';

const videosApi = {
  
  getAllVideos: (params) => 
    axiosInstance.get('/videos', { params }), 
  
  
  getVideosForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/videos`),
  
  
  createVideo: (formData) => 
    axiosInstance.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  
  updateVideo: (id, data) => axiosInstance.put(`/videos/${id}`, data),
  
  
  deleteVideo: (id) => axiosInstance.delete(`/videos/${id}`),
};

export default videosApi;```

---

