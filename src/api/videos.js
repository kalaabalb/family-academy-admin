import axiosInstance from './axiosConfig';

const videosApi = {
  // Get all videos (admin/teacher)
  getAllVideos: (params) => 
    axiosInstance.get('/videos', { params }), 
  
  // Get videos for chapter (student)
  getVideosForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/videos`),
  
  // Create video with file upload (admin/teacher)
  createVideo: (formData) => 
    axiosInstance.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // Update video metadata (admin/teacher)
  updateVideo: (id, data) => axiosInstance.put(`/videos/${id}`, data),
  
  // Delete video (admin/teacher)
  deleteVideo: (id) => axiosInstance.delete(`/videos/${id}`),
  
  // Get video by ID
  getVideo: (id) => axiosInstance.get(`/videos/${id}`),
  
  // Increment view count
  incrementViewCount: (id) => axiosInstance.post(`/videos/${id}/view`),
  
  // Get video statistics
  getVideoStats: (id) => axiosInstance.get(`/videos/${id}/stats`),
};

export default videosApi;