import axiosInstance from './axiosConfig';
import { devError } from '../utils/devLogger';

const teacherCoursesApi = {
  getMyAssignedCourses: async () => {
    try {
      const response = await axiosInstance.get('/teachers/me/courses');
      return response;
    } catch (error) {
      devError('Failed to fetch teacher courses:', error);
      throw error;
    }
  },
  
  getCourseWithDetails: async (courseId) => {
    try {
      const response = await axiosInstance.get(`/teachers/courses/${courseId}`);
      return response;
    } catch (error) {
      devError(`Failed to fetch course ${courseId}:`, error);
      throw error;
    }
  },
  
  getMyChapters: async () => {
    try {
      const response = await axiosInstance.get('/teachers/me/chapters');
      return response;
    } catch (error) {
      devError('Failed to fetch teacher chapters:', error);
      throw error;
    }
  },
  
  getCourseStats: async (courseId) => {
    try {
      const response = await axiosInstance.get(`/teachers/courses/${courseId}/stats`);
      return response;
    } catch (error) {
      devError(`Failed to fetch stats for course ${courseId}:`, error);
      throw error;
    }
  },
  
  checkCourseAccess: async (courseId) => {
    try {
      const response = await axiosInstance.get(`/teachers/courses/${courseId}/access`);
      return response;
    } catch (error) {
      devError(`Failed to check access for course ${courseId}:`, error);
      throw error;
    }
  },
};

export default teacherCoursesApi;
