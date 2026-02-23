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
};

export default settingsApi;