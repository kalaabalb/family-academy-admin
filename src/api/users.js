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

export default usersApi;