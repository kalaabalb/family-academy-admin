import axiosInstance from './axiosConfig';

const notificationsApi = {
  
  // Get all notification templates
  getTemplates: (params) => 
    axiosInstance.get('/notifications/templates', { params }),
  
  // Get single template
  getTemplate: (id) => 
    axiosInstance.get(`/notifications/templates/${id}`),
  
  // Create new template
  createTemplate: (data) => 
    axiosInstance.post('/notifications/templates', data),
  
  // Update template
  updateTemplate: (id, data) => 
    axiosInstance.put(`/notifications/templates/${id}`, data),
  
  // Delete template
  deleteTemplate: (id) => 
    axiosInstance.delete(`/notifications/templates/${id}`),
  
  
  // Get all scheduled notifications
  getSchedules: () => 
    axiosInstance.get('/notifications/schedules'),
  
  // Get single schedule
  getSchedule: (id) => 
    axiosInstance.get(`/notifications/schedules/${id}`),
  
  // Create schedule
  createSchedule: (data) => 
    axiosInstance.post('/notifications/schedules', data),
  
  // Update schedule
  updateSchedule: (id, data) => 
    axiosInstance.put(`/notifications/schedules/${id}`, data),
  
  // Delete schedule
  deleteSchedule: (id) => 
    axiosInstance.delete(`/notifications/schedules/${id}`),
  
  // Toggle schedule active status
  toggleSchedule: (id, isActive) => 
    axiosInstance.patch(`/notifications/schedules/${id}`, { is_active: isActive }),
  
  
  // Get user notification preferences
  getUserPreferences: (userId) => 
    axiosInstance.get(`/notifications/users/${userId}/preferences`),
  
  // Update user notification preference
  updateUserPreference: (userId, data) => 
    axiosInstance.put(`/notifications/users/${userId}/preferences`, data),
  
  // Get current user's preferences (from token)
  getMyPreferences: () => 
    axiosInstance.get('/notifications/my-preferences'),
  
  // Update current user's preference
  updateMyPreference: (data) => 
    axiosInstance.put('/notifications/my-preferences', data),
  
  
  // Get parent notification preferences
  getParentPreferences: (parentTelegramId) => 
    axiosInstance.get('/notifications/parents/preferences', { 
      params: { parent_telegram_id: parentTelegramId } 
    }),
  
  // Update parent notification preference
  updateParentPreference: (parentTelegramId, data) => 
    axiosInstance.put('/notifications/parents/preferences', { 
      parent_telegram_id: parentTelegramId,
      ...data 
    }),
  
  
  // Get notification statistics
  getStats: (params) => 
    axiosInstance.get('/notifications/stats', { params }),
  
  // Get parent engagement stats
  getParentStats: () => 
    axiosInstance.get('/notifications/parents/stats'),
  
  
  // Send notification using template
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  
  // Get notification history (admin)
  getNotificationHistory: (params) => 
    axiosInstance.get('/notifications/history', { params }),
  
  
  // Get my notifications (for current user)
  getMyNotifications: () => axiosInstance.get('/notifications/my-notifications'),
  
  // Mark notification as read
  markAsRead: (notificationId) => 
    axiosInstance.put(`/notifications/${notificationId}/read`),
  
  // Mark all as read
  markAllAsRead: () => 
    axiosInstance.put('/notifications/mark-all-read'),
  
  // Delete notification
  deleteNotification: (notificationId) => 
    axiosInstance.delete(`/notifications/${notificationId}`),
  
  // Delete all notifications
  deleteAllNotifications: () => 
    axiosInstance.delete('/notifications/delete-all'),
  
  // Get unread count
  getUnreadCount: () => 
    axiosInstance.get('/notifications/unread-count'),
  
  
  // Send notification to all linked parents
  sendToAllParents: (data) => 
    axiosInstance.post('/notifications/send-to-parents', data),

  // Send weekly progress reports to all parents
  sendWeeklyReports: () => 
    axiosInstance.post('/notifications/send-weekly-reports'),

  // Send achievement notification to specific parent
  sendAchievementToParent: (userId, achievement) => 
    axiosInstance.post(`/notifications/parent/${userId}/achievement`, { achievement }),

  // Send streak update to parent
  sendStreakUpdateToParent: (userId) => 
    axiosInstance.post(`/notifications/parent/${userId}/streak-update`),

  // Get parent notification settings
  getParentNotificationSettings: () => 
    axiosInstance.get('/notifications/parent-settings'),

  // Update parent notification settings
  updateParentNotificationSettings: (settings) => 
    axiosInstance.put('/notifications/parent-settings', settings),

  // Get parent notification history
  getParentNotificationHistory: (params = {}) => 
    axiosInstance.get('/notifications/parent-history', { params }),

  // Schedule weekly report for parents
  scheduleWeeklyReport: (day, time) => 
    axiosInstance.post('/notifications/schedule-weekly', { day, time }),
};

export default notificationsApi;