import axiosInstance from './axiosConfig';

const teachersApi = {
  
  getAllTeachers: () => axiosInstance.get('/teachers'),
  
  
  createTeacher: (data) => axiosInstance.post('/teachers', data),
  
  
  updateTeacher: (id, data) => axiosInstance.put(`/teachers/${id}`, data),
  
  
  deleteTeacher: (id) => axiosInstance.delete(`/teachers/${id}`),
  
  
  resetTeacherPassword: (id, data) => 
    axiosInstance.post(`/teachers/${id}/reset-password`, data),
  
  
  getTeacherCourses: (teacherId) => 
    axiosInstance.get(`/teachers/${teacherId}/courses`),
  
  
  getTeacherDetails: (id) => axiosInstance.get(`/teachers/${id}`),
};

export default teachersApi;