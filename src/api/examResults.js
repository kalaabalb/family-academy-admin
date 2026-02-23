import axiosInstance from './axiosConfig';

const examResultsApi = {
  // Get all exam results
  getAllExamResults: (params) => 
    axiosInstance.get('/exam-results', { params }),
  
  // Get exam result by ID
  getExamResultById: (id) => axiosInstance.get(`/exam-results/${id}`),
  
  // Get exam results by user
  getExamResultsByUser: (userId) => 
    axiosInstance.get(`/exam-results/user/${userId}`),
  
  // Get exam results by exam
  getExamResultsByExam: (examId) => 
    axiosInstance.get(`/exam-results/exam/${examId}`),
  
  // Update exam result
  updateExamResult: (id, data) => axiosInstance.put(`/exam-results/${id}`, data),
  
  // Delete exam result
  deleteExamResult: (id) => axiosInstance.delete(`/exam-results/${id}`),
};

export default examResultsApi;