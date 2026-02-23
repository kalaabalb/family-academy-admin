import axiosInstance from './axiosConfig';

const telegramApi = {
  // Generate parent token (for user)
  generateParentToken: () => axiosInstance.post('/telegram/generate-token'),
  
  // Get parent link status (for user)
  getParentLinkStatus: () => axiosInstance.get('/telegram/status'),
  
  // Unlink parent (for user)
  unlinkParent: () => axiosInstance.post('/telegram/unlink'),
  
  // Get bot status (admin)
  getBotStatus: () => axiosInstance.get('/telegram/bot-status'),
  
  // Test bot connection (admin)
  testBotConnection: () => axiosInstance.post('/telegram/test-connection'),
  
  // Update bot settings (admin)
  updateBotSettings: (settings) => axiosInstance.put('/telegram/settings', settings),
  
  // Validate parent token (for Telegram bot)
  validateParentToken: (token, telegramUserId, telegramUsername) => 
    axiosInstance.post('/telegram/validate-token', { 
      token, 
      telegramUserId, 
      telegramUsername 
    }),

  // Send custom message to a specific parent (admin)
  sendMessageToParent: (parentTelegramId, message) => 
    axiosInstance.post('/telegram/send-to-parent', { 
      parent_telegram_id: parentTelegramId, 
      message 
    }),

  // Send progress report to a specific parent (admin)
  sendProgressToParent: (userId) => 
    axiosInstance.post(`/telegram/send-progress/${userId}`),

  // Send progress report to all parents (admin)
  sendProgressToAllParents: () => 
    axiosInstance.post('/telegram/send-progress-all'),

  // Get all linked parents (admin)
  getLinkedParents: (params = {}) => 
    axiosInstance.get('/telegram/parents', { params }),

  // Get parent details by user ID (admin)
  getParentByUserId: (userId) => 
    axiosInstance.get(`/telegram/parent/${userId}`),

  // Get parent statistics (admin)
  getParentStats: () => 
    axiosInstance.get('/telegram/parent-stats'),

  // Send broadcast message to all parents (admin)
  sendBroadcastToParents: (message, includeImages = false) => 
    axiosInstance.post('/telegram/broadcast', { 
      message, 
      include_images: includeImages 
    }),

  // Schedule a message to be sent to parents (admin)
  scheduleParentMessage: (message, scheduledTime, targetType = 'all') => 
    axiosInstance.post('/telegram/schedule-message', {
      message,
      scheduled_time: scheduledTime,
      target_type: targetType
    }),

  // Get parent message history (admin)
  getParentMessageHistory: (params = {}) => 
    axiosInstance.get('/telegram/message-history', { params }),

  // Test parent notification (admin)
  testParentNotification: (parentTelegramId) => 
    axiosInstance.post('/telegram/test-notification', { 
      parent_telegram_id: parentTelegramId 
    }),

  // Get parent engagement statistics (admin)
  getParentEngagementStats: () => 
    axiosInstance.get('/telegram/engagement-stats'),
};

export default telegramApi;