import axiosInstance from './axiosConfig';

const categoriesApi = {
  // Get all categories (admin)
  getAllCategories: () => axiosInstance.get('/categories/all'),
  
  // Get categories for student
  getCategoriesForStudent: () => axiosInstance.get('/categories'),
  
  // Create category
  createCategory: (data) => axiosInstance.post('/categories', data),
  
  // Update category
  updateCategory: (id, data) => axiosInstance.put(`/categories/${id}`, data),
  
  // Delete category
  deleteCategory: (id) => axiosInstance.delete(`/categories/${id}`),
  
  // Get category details
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