import axiosInstance from './axiosConfig';

const notesApi = {
  // Get all notes (admin/teacher)
  getAllNotes: (params) => 
    axiosInstance.get('/notes', { params }),
  
  // Get notes for chapter (student)
  getNotesForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/notes`),
  
  // Create note
  createNote: (data) => axiosInstance.post('/notes', data),
  
  // Update note
  updateNote: (id, data) => axiosInstance.put(`/notes/${id}`, data),
  
  // Delete note
  deleteNote: (id) => axiosInstance.delete(`/notes/${id}`),
};

export default notesApi;