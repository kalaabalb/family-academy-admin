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

export default settingsApi;