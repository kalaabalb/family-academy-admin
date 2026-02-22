import axiosInstance from './axiosConfig';

const examResultsApi = {
  
  getAllExamResults: (params) => 
    axiosInstance.get('/exam-results', { params }),
  
  
  getExamResultById: (id) => axiosInstance.get(`/exam-results/${id}`),
  
  
  getExamResultsByUser: (userId) => 
    axiosInstance.get(`/exam-results/user/${userId}`),
  
  
  getExamResultsByExam: (examId) => 
    axiosInstance.get(`/exam-results/exam/${examId}`),
  
  
  updateExamResult: (id, data) => axiosInstance.put(`/exam-results/${id}`, data),
  
  
  deleteExamResult: (id) => axiosInstance.delete(`/exam-results/${id}`),
};

export default examResultsApi;