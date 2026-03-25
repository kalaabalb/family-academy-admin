import axiosInstance from './axiosConfig';

const authApi = {
  // Admin login
  adminLogin: (username, password) => 
    axiosInstance.post('/auth/admin-login', { username, password }),
  
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
