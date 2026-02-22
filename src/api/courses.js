import axiosInstance from './axiosConfig';

const coursesApi = {
  
  getAllCourses: (categoryId) => 
    axiosInstance.get('/courses', { params: { category_id: categoryId } }),
  
  
  getCoursesForStudent: (categoryId) => 
    axiosInstance.get(`/categories/${categoryId}/courses`),
  
  
  createCourse: (data) => axiosInstance.post('/courses', data),
  
  
  updateCourse: (id, data) => axiosInstance.put(`/courses/${id}`, data),
  
  
  deleteCourse: (id) => axiosInstance.delete(`/courses/${id}`),
  
  
  assignTeacher: (courseId, teacherId) => 
    axiosInstance.post('/courses/assign-teacher', { course_id: courseId, teacher_id: teacherId }),
};

export default coursesApi;