import axiosInstance from './axiosConfig';

const notificationsApi = {
  // Send notification
  sendNotification: (data) => axiosInstance.post('/notifications/send', data),
  
  // Get notification history (admin)
  getNotificationHistory: (params) => 
    axiosInstance.get('/notifications/history', { params }),
  
  // Get my notifications (user)
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