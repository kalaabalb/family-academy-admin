import axiosInstance from './axiosConfig';

const devicesApi = {
  
  getAllDevices: (params = {}) => 
    axiosInstance.get('/devices', { params }),
  
  
  getDevice: (id) => 
    axiosInstance.get(`/devices/${id}`),
  
  
  forceRemoveDevice: (id, data) => 
    axiosInstance.delete(`/devices/${id}/force`, { data }),
  
  
  getUserDevices: (userId) => 
    axiosInstance.get(`/users/${userId}/devices`),
  
  
  updateDevice: (id, data) => 
    axiosInstance.put(`/devices/${id}`, data),
  
  
  getDeviceStats: () => 
    axiosInstance.get('/devices/stats'),
  
  
  bulkRemoveDevices: (deviceIds) => 
    axiosInstance.post('/devices/bulk-remove', {
      device_ids: deviceIds
    }),
  
  
  searchDevices: (query, params = {}) => 
    axiosInstance.get('/devices/search', {
      params: { q: query, ...params }
    }),
  
  
  getDeviceActivity: (deviceId, params = {}) => 
    axiosInstance.get(`/devices/${deviceId}/activity`, { params }),
  
  
  exportDevices: (format = 'csv') => 
    axiosInstance.get('/devices/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default devicesApi;