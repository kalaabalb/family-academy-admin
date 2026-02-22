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

export default telegramApi;