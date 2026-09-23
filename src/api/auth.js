import axiosInstance from './axiosConfig';

const authApi = {
  // Admin login
  // A Render instance may still be waking up when the dashboard is opened on
  // a new device. Let this authentication request wait long enough to finish.
  adminLogin: (username, password) =>
    axiosInstance.post('/auth/admin-login', { username, password }, { timeout: 60000 }),
  
  // Logout
  logout: () => axiosInstance.post('/auth/logout'),
  
  // Validate token
  validateToken: () => axiosInstance.get('/auth/admin/validate'),
  
  // Refresh token
  refreshToken: (refreshToken) => 
    axiosInstance.post('/auth/refresh', { refreshToken }),
  
  // Upload image
  uploadImage: (formData) => 
    axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export default authApi;
