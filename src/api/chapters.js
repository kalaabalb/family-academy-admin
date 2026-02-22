import axiosInstance from './axiosConfig';

const chaptersApi = {
  
  getAllChapters: (params) => 
    axiosInstance.get('/chapters', { params }),
  
  
  getChaptersForStudent: (courseId) => 
    axiosInstance.get(`/courses/${courseId}/chapters`),
  
  
  createChapter: (data) => axiosInstance.post('/chapters', data),
  
  
  updateChapter: (id, data) => axiosInstance.put(`/chapters/${id}`, data),
  
  
  deleteChapter: (id) => axiosInstance.delete(`/chapters/${id}`),
};

export default chaptersApi;