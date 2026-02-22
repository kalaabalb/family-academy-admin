import axiosInstance from './axiosConfig';

const notesApi = {
  
  getAllNotes: (params) => 
    axiosInstance.get('/notes', { params }),
  
  
  getNotesForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/notes`),
  
  
  createNote: (data) => axiosInstance.post('/notes', data),
  
  
  updateNote: (id, data) => axiosInstance.put(`/notes/${id}`, data),
  
  
  deleteNote: (id) => axiosInstance.delete(`/notes/${id}`),
};

export default notesApi;