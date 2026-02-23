import axiosInstance from './axiosConfig';

const chaptersApi = {
  // Get all chapters (admin/teacher)
  getAllChapters: (params) => 
    axiosInstance.get('/chapters', { params }),
  
  // Get chapters for student
  getChaptersForStudent: (courseId) => 
    axiosInstance.get(`/courses/${courseId}/chapters`),
  
  // Create chapter
  createChapter: (data) => axiosInstance.post('/chapters', data),
  
  // Update chapter
  updateChapter: (id, data) => axiosInstance.put(`/chapters/${id}`, data),
  
  // Delete chapter
  deleteChapter: (id) => axiosInstance.delete(`/chapters/${id}`),
};

export default chaptersApi;