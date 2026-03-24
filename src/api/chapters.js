import axiosInstance from './axiosConfig';
import { devError, devLog } from '../utils/devLogger';

const chaptersApi = {
  /**
   * Get all chapters with optional filters
   * @param {Object} params - Query parameters (course_id, category_id, status, created_by, etc.)
   * @returns {Promise} Axios response
   */
  getAllChapters: (params = {}) => {
    devLog('Fetching chapters with params:', params);
    return axiosInstance.get('/chapters', { params });
  },
  
  /**
   * Get chapters for a specific course (student view)
   * @param {number} courseId - Course ID
   * @returns {Promise} Axios response
   */
  getChaptersForStudent: (courseId) => {
    devLog('Fetching chapters for student, course:', courseId);
    return axiosInstance.get(`/courses/${courseId}/chapters`);
  },
  
  /**
   * Create a new chapter
   * @param {Object} data - Chapter data { name, course_id, status, release_date }
   * @returns {Promise} Axios response
   */
  createChapter: async (data) => {
    try {
      devLog('Creating chapter with data:', data);
      devLog('Chapter data types:', {
        name: typeof data.name,
        course_id: typeof data.course_id,
        status: typeof data.status,
        release_date: typeof data.release_date
      });
      
      const response = await axiosInstance.post('/chapters', data);
      devLog('Chapter created successfully:', response.data);
      return response;
    } catch (error) {
      devError('Chapter creation failed:', error.response?.data || error.message);
      
      if (error.response?.data?.errors) {
        devError('Chapter validation errors:', error.response.data.errors);
        error.validationErrors = error.response.data.errors;
      }
      
      throw error;
    }
  },
  
  /**
   * Update an existing chapter
   * @param {number} id - Chapter ID
   * @param {Object} data - Updated chapter data
   * @returns {Promise} Axios response
   */
  updateChapter: async (id, data) => {
    try {
      devLog('Updating chapter:', id, 'with data:', data);
      const response = await axiosInstance.put(`/chapters/${id}`, data);
      devLog('Chapter updated successfully:', response.data);
      return response;
    } catch (error) {
      devError('Chapter update failed:', error.response?.data || error.message);
      throw error;
    }
  },
  
  /**
   * Delete a chapter
   * @param {number} id - Chapter ID
   * @returns {Promise} Axios response
   */
  deleteChapter: async (id) => {
    try {
      devLog('Deleting chapter:', id);
      const response = await axiosInstance.delete(`/chapters/${id}`);
      devLog('Chapter deleted successfully:', response.data);
      return response;
    } catch (error) {
      devError('Chapter deletion failed:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default chaptersApi;
