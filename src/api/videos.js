import axiosInstance from './axiosConfig';

const videosApi = {
  
  getAllVideos: (params) => 
    axiosInstance.get('/videos', { params }), 
  
  
  getVideosForChapter: (chapterId) => 
    axiosInstance.get(`/chapters/${chapterId}/videos`),
  
  
  createVideo: (formData) => 
    axiosInstance.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  
  updateVideo: (id, data) => axiosInstance.put(`/videos/${id}`, data),
  
  
  deleteVideo: (id) => axiosInstance.delete(`/videos/${id}`),
};

export default videosApi;