import axiosInstance from './axiosConfig';

const devicesApi = {
  // Get all devices with filters
  getAllDevices: (params = {}) => 
    axiosInstance.get('/devices', { params }),
  
  // Get single device
  getDevice: (id) => 
    axiosInstance.get(`/devices/${id}`),
  
  // Force remove device
  forceRemoveDevice: (id, data) => 
    axiosInstance.delete(`/devices/${id}/force`, { data }),
  
  // Get user devices
  getUserDevices: (userId) => 
    axiosInstance.get(`/users/${userId}/devices`),
  
  // Update device
  updateDevice: (id, data) => 
    axiosInstance.put(`/devices/${id}`, data),
  
  // Get device statistics
  getDeviceStats: () => 
    axiosInstance.get('/devices/stats'),
  
  // Bulk remove devices
  bulkRemoveDevices: (deviceIds) => 
    axiosInstance.post('/devices/bulk-remove', {
      device_ids: deviceIds
    }),
  
  // Search devices
  searchDevices: (query, params = {}) => 
    axiosInstance.get('/devices/search', {
      params: { q: query, ...params }
    }),
  
  // Get device activity
  getDeviceActivity: (deviceId, params = {}) => 
    axiosInstance.get(`/devices/${deviceId}/activity`, { params }),
  
  // Export devices
  exportDevices: (format = 'csv') => 
    axiosInstance.get('/devices/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default devicesApi;