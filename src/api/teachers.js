import axiosInstance from './axiosConfig';

const teachersApi = {
  // Get all teachers (admin)
  getAllTeachers: () => axiosInstance.get('/teachers'),
  
  // Create teacher (admin)
  createTeacher: (data) => axiosInstance.post('/teachers', data),
  
  // Update teacher (admin)
  updateTeacher: (id, data) => axiosInstance.put(`/teachers/${id}`, data),
  
  // Delete teacher (admin)
  deleteTeacher: (id) => axiosInstance.delete(`/teachers/${id}`),
  
  // Reset teacher password (admin)
  resetTeacherPassword: (id, data) => 
    axiosInstance.post(`/teachers/${id}/reset-password`, data),
  
  // Get teacher courses (admin/teacher)
  getTeacherCourses: (teacherId) => 
    axiosInstance.get(`/teachers/${teacherId}/courses`),
  
  // Get teacher details (admin)
  getTeacherDetails: (id) => axiosInstance.get(`/teachers/${id}`),
};

export default teachersApi;