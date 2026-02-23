import axiosInstance from './axiosConfig';

const coursesApi = {
  // Get all courses (admin/teacher)
  getAllCourses: (categoryId) => 
    axiosInstance.get('/courses', { params: { category_id: categoryId } }),
  
  // Get courses for student
  getCoursesForStudent: (categoryId) => 
    axiosInstance.get(`/categories/${categoryId}/courses`),
  
  // Create course
  createCourse: (data) => axiosInstance.post('/courses', data),
  
  // Update course
  updateCourse: (id, data) => axiosInstance.put(`/courses/${id}`, data),
  
  // Delete course
  deleteCourse: (id) => axiosInstance.delete(`/courses/${id}`),
  
  // Assign teacher to course
  assignTeacher: (courseId, teacherId) => 
    axiosInstance.post('/courses/assign-teacher', { 
      course_id: courseId, 
      teacher_id: teacherId 
    }),
};

export default coursesApi;