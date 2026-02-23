import axiosInstance from './axiosConfig';

const examsApi = {
  // Get all exams
  getAllExams: (params) => 
    axiosInstance.get('/exams', { params }),
  
  // Get exam by ID
  getExamById: (id) => 
    axiosInstance.get(`/exams/${id}`),
  
  // Get exam questions
  getExamQuestions: (examId) => 
    axiosInstance.get(`/exams/${examId}/questions`),
  
  // Create exam
  createExam: (data) => axiosInstance.post('/exams', data),
  
  // Update exam
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  
  // Delete exam
  deleteExam: (id) => axiosInstance.delete(`/exams/${id}`),
  
  // Create exam question
  createExamQuestion: (examId, data) => 
    axiosInstance.post(`/exams/${examId}/questions`, data),
  
  // Update exam question
  updateExamQuestion: (examQuestionId, data) => 
    axiosInstance.put(`/exams/questions/${examQuestionId}`, data),
  
  // Delete exam question
  deleteExamQuestion: (examQuestionId) => 
    axiosInstance.delete(`/exams/questions/${examQuestionId}`),
  
  // Add question to exam
  addQuestionToExam: (examId, questionIds) => 
    axiosInstance.post('/exams/add-question', { 
      exam_id: examId, 
      question_ids: questionIds 
    }),
  
  // Get available exams for course
  getAvailableExams: (courseId) => 
    axiosInstance.get('/exams/available', { params: { course_id: courseId } }),
  
  // Start exam
  startExam: (examId) => axiosInstance.post(`/exams/start/${examId}`),
  
  // Submit exam
  submitExam: (examResultId, answers) => 
    axiosInstance.post(`/exams/submit/${examResultId}`, { answers }),
  
  // Get my exam results
  getMyExamResults: () => axiosInstance.get('/exams/my-results'),
};

export default examsApi;