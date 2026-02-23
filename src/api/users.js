import axiosInstance from './axiosConfig';

const usersApi = {
  // Get all users (admin)
  getAllUsers: (params = {}) => 
    axiosInstance.get('/users', { 
      params,
      timeout: 30000,
    }),
  
  // Get user details (admin)
  getUserDetails: (id) => 
    axiosInstance.get(`/users/${id}`, {
      timeout: 30000,
    }),
  
  // Update user (admin)
  updateUser: (id, data) => 
    axiosInstance.put(`/users/${id}`, data, {
      timeout: 15000,
    }),
  
  // Delete user (admin)
  deleteUser: (id) => 
    axiosInstance.delete(`/users/${id}`, {
      timeout: 15000,
    }),
  
  // Get my profile (user)
  getMyProfile: () => 
    axiosInstance.get('/users/me', {
      timeout: 15000,
    }),
  
  // Update my profile (user)
  updateMyProfile: (data) => 
    axiosInstance.put('/users/me', data, {
      timeout: 15000,
    }),
  
  // Update user device (user)
  updateUserDevice: (deviceType, deviceId) => 
    axiosInstance.put('/users/device', { 
      device_type: deviceType, 
      device_id: deviceId 
    }, {
      timeout: 15000,
    }),
  
  // Get user statistics (admin)
  getUserStats: () => 
    axiosInstance.get('/users/stats', {
      timeout: 15000,
    }),
  
  // Search users (admin)
  searchUsers: (query, params = {}) => 
    axiosInstance.get('/users/search', {
      params: { q: query, ...params },
      timeout: 15000,
    }),
  
  // Bulk update users (admin)
  bulkUpdateUsers: (userIds, data) => 
    axiosInstance.put('/users/bulk-update', {
      user_ids: userIds,
      data
    }, {
      timeout: 30000,
    }),
  
  // Export users (admin)
  exportUsers: (format = 'csv', params = {}) => 
    axiosInstance.get('/users/export', {
      params: { format, ...params },
      responseType: 'blob',
      timeout: 60000,
    }),
  
  // Get user activity (admin)
  getUserActivity: (userId, params = {}) => 
    axiosInstance.get(`/users/${userId}/activity`, {
      params,
      timeout: 15000,
    }),
  
  // Update subscription (admin)
  updateSubscription: (userId, subscriptionId, data) => 
    axiosInstance.put(`/users/${userId}/subscriptions/${subscriptionId}`, data, {
      timeout: 15000,
    }),
  
  // Reset password (admin)
  resetPassword: (userId, newPassword) => 
    axiosInstance.post(`/users/${userId}/reset-password`, { 
      new_password: newPassword 
    }, {
      timeout: 15000,
    }),
  
  // Generate report (admin)
  generateReport: (userId, reportType) => 
    axiosInstance.get(`/users/${userId}/reports/${reportType}`, {
      responseType: 'blob',
      timeout: 30000,
    }),

  // Get user's progress overview (admin)
  getUserProgress: (userId) => 
    axiosInstance.get(`/progress/overview/${userId}`, {
      timeout: 15000,
    }),

  // Get user's streak details (admin)
  getUserStreak: (userId) => 
    axiosInstance.get(`/streaks/user/${userId}`, {
      timeout: 15000,
    }),

  // Get user's achievements (admin)
  getUserAchievements: (userId) => 
    axiosInstance.get(`/users/${userId}/achievements`, {
      timeout: 15000,
    }),

  // Get user's chapter progress (admin)
  getUserChapterProgress: (userId, courseId) => 
    axiosInstance.get(`/progress/user/${userId}/course/${courseId}`, {
      timeout: 15000,
    }),

  // Get user's exam results (admin)
  getUserExamResults: (userId) => 
    axiosInstance.get(`/exam-results/user/${userId}`, {
      timeout: 15000,
    }),

  // Get user's study time statistics (admin)
  getUserStudyTime: (userId, period = 'month') => 
    axiosInstance.get(`/users/${userId}/study-time`, {
      params: { period },
      timeout: 15000,
    }),

  // Get user's progress report for a specific date range (admin)
  getUserProgressReport: (userId, startDate, endDate) => 
    axiosInstance.get(`/users/${userId}/progress-report`, {
      params: { start_date: startDate, end_date: endDate },
      timeout: 20000,
    }),

  // Get top performing users (leaderboard)
  getLeaderboard: (limit = 10) => 
    axiosInstance.get('/streaks/leaderboard', {
      params: { limit },
      timeout: 15000,
    }),

  // Send progress report to parent via Telegram (admin)
  sendProgressToParent: (userId) => 
    axiosInstance.post(`/telegram/send-progress/${userId}`, {}, {
      timeout: 15000,
    }),

  // Get users with parent linking (admin)
  getUsersWithParents: (params = {}) => 
    axiosInstance.get('/users/with-parents', {
      params,
      timeout: 15000,
    }),
};

export default usersApi;