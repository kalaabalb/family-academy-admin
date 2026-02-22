import axiosInstance from './axiosConfig';

const authApi = {
  
  register: (data) => axiosInstance.post('/auth/register', data),
  
  
  adminLogin: (username, password) => 
    axiosInstance.post('/auth/admin-login', { username, password }),
  
  

  
  logout: () => axiosInstance.post('/auth/logout'),
  
  
  validateToken: () => axiosInstance.get('/auth/validate'),
  
  
  refreshToken: (refreshToken) => 
    axiosInstance.post('/auth/refresh', { refreshToken }),
uploadImage: (formData) => 
    axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export default authApi;