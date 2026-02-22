import axiosInstance from './axiosConfig';

const categoriesApi = {
  getAllCategories: () => axiosInstance.get('/categories/all'),
  
  getCategoriesForStudent: () => axiosInstance.get('/categories'),
  
  createCategory: (data) => axiosInstance.post('/categories', data),
  
  updateCategory: (id, data) => axiosInstance.put(`/categories/${id}`, data),
  
  deleteCategory: (id) => axiosInstance.delete(`/categories/${id}`),
  
  getCategoryDetails: (id) => axiosInstance.get(`/categories/${id}`),
  
  // Upload category image
  uploadCategoryImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosInstance.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default categoriesApi;