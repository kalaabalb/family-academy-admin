import axiosInstance from './axiosConfig';
import { devLog } from '../utils/devLogger';

const videosApi = {
  /**
   * Get all videos with optional filters
   */
  getAllVideos: (params = {}) => 
    axiosInstance.get('/videos', { params }),

  /**
   * Get videos for a specific chapter
   */
  getVideosForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/videos`),

  /**
   * Create a new video
   * @param {FormData} formData - Contains title, chapter_id, video file
   * @param {Function} onProgress - Progress callback
   */
  createVideo: (formData, onProgress) => {
    devLog('Sending video upload request');
    for (const pair of formData.entries()) {
      if (pair[0] === 'video') {
        devLog(
          `  - ${pair[0]}: [FILE: ${pair[1].name}, ${(pair[1].size / 1024 / 1024).toFixed(2)}MB, ${pair[1].type}]`
        );
      } else {
        devLog(`  - ${pair[0]}: ${pair[1]}`);
      }
    }
    
    return axiosInstance.post('/videos', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
      timeout: 10 * 60 * 1000, // 10 minutes for large files
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },

  /**
   * Update video details
   */
  updateVideo: (id, data) => 
    axiosInstance.put(`/videos/${id}`, data),

  /**
   * Delete a video
   */
  deleteVideo: (id) => 
    axiosInstance.delete(`/videos/${id}`),

  /**
   * Increment video view count
   */
  incrementViewCount: (id) => 
    axiosInstance.post(`/videos/${id}/view`),
};

export default videosApi;
