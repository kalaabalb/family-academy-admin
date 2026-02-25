import axiosInstance from './axiosConfig';

const settingsApi = {
  
  // Get all settings (admin)
  getAllSettings: () => axiosInstance.get('/settings'),
  
  // Get settings by category
  getSettingsByCategory: (category, includePrivate = false) => 
    axiosInstance.get(`/settings/category/${category}`, { 
      params: { include_private: includePrivate } 
    }),
  
  // Get public settings (for students/teachers)
  getPublicSettings: () => axiosInstance.get('/settings/public'),
  
  // Get single setting
  getSetting: (key) => axiosInstance.get(`/settings/${key}`),
  
  // Get all categories
  getCategories: () => axiosInstance.get('/settings/categories'),
  
  // Create or update setting (admin)
  upsertSetting: (data) => axiosInstance.post('/settings', data),
  
  // Update multiple settings (admin)
  updateMultipleSettings: (settings) => 
    axiosInstance.put('/settings/multiple', { settings }),
  
  // Delete setting (admin)
  deleteSetting: (key) => axiosInstance.delete(`/settings/${key}`),
  
  // Initialize default settings (admin)
  initializeDefaultSettings: () => 
    axiosInstance.post('/settings/initialize-defaults'),
  
  
  // Get notification templates as settings
  getNotificationTemplates: () => 
    axiosInstance.get('/settings/category/notification_templates', { 
      params: { include_private: true } 
    }),
  
  // Update notification template setting
  updateNotificationTemplate: (key, value) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ setting_key: key, setting_value: value }] 
    }),
  
  
  // Get payment methods
  getPaymentMethods: () => 
    axiosInstance.get('/settings/category/payment', { 
      params: { include_private: true } 
    }),
  
  // Update payment method
  updatePaymentMethod: (methodKey, data) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [
        { setting_key: `payment_method_${methodKey}_name`, setting_value: data.name },
        { setting_key: `payment_method_${methodKey}_number`, setting_value: data.number },
        { setting_key: `payment_method_${methodKey}_instructions`, setting_value: data.instructions }
      ] 
    }),
  
  // Enable/disable payment method
  togglePaymentMethod: (methodKey, enabled) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ 
        setting_key: `payment_method_${methodKey}_enabled`, 
        setting_value: enabled 
      }] 
    }),
  
  // Get payment instructions
  getPaymentInstructions: () => 
    axiosInstance.get('/settings/key/payment_instructions'),
  
  // Update payment instructions
  updatePaymentInstructions: (instructions) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ setting_key: 'payment_instructions', setting_value: instructions }] 
    }),
  
  
  // Get contact settings
  getContactSettings: () => 
    axiosInstance.get('/settings/category/contact', { 
      params: { include_private: true } 
    }),
  
  // Update contact setting
  updateContactSetting: (key, value) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ setting_key: key, setting_value: value }] 
    }),
  
  
  // Get system settings
  getSystemSettings: () => 
    axiosInstance.get('/settings/category/system', { 
      params: { include_private: true } 
    }),
  
  // Update system setting
  updateSystemSetting: (key, value) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ setting_key: key, setting_value: value }] 
    }),
  
  
  // Get telegram settings
  getTelegramSettings: () => 
    axiosInstance.get('/settings/category/telegram', { 
      params: { include_private: true } 
    }),
  
  // Update telegram settings
  updateTelegramSettings: (settings) => 
    axiosInstance.put('/settings/multiple', { settings }),
  
  
  // Get parent link settings
  getParentLinkSettings: () => 
    axiosInstance.get('/settings/category/parent_link', { 
      params: { include_private: true } 
    }),
  
  // Update parent link setting
  updateParentLinkSetting: (key, value) => 
    axiosInstance.put('/settings/multiple', { 
      settings: [{ setting_key: key, setting_value: value }] 
    }),
  
  // ==================== EXPORT/IMPORT ====================
  
  // Export all settings
  exportSettings: () => 
    axiosInstance.get('/settings/export', { responseType: 'blob' }),
  
  // Import settings
  importSettings: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/settings/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  
  // Bulk update settings by category
  bulkUpdateByCategory: (category, settings) => 
    axiosInstance.put('/settings/multiple', { 
      settings: settings.map(s => ({ ...s, category }))
    }),
  
  // Reset category to defaults
  resetCategoryToDefaults: (category) => 
    axiosInstance.post('/settings/reset-category', { category }),
};

export default settingsApi;