import axiosInstance from './axiosConfig';

const examsApi = {
  // ==================== EXAM MANAGEMENT ====================
  
  getAllExams: (params) => 
    axiosInstance.get('/exams', { params }),
  
  getExamById: (id) => 
    axiosInstance.get(`/exams/${id}`),
  
  createExam: (data) => axiosInstance.post('/exams', data),
  
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  
  deleteExam: (id) => axiosInstance.delete(`/exams/${id}`),
  
  // ==================== EXAM QUESTIONS - FIXED ENDPOINTS ====================
  
  getExamQuestions: (examId) => 
    axiosInstance.get(`/exam-questions/exam/${examId}`),
  
  createExamQuestion: (examId, data) => 
    axiosInstance.post(`/exam-questions/exam/${examId}/questions`, data),
  
  updateExamQuestion: (examQuestionId, data) => 
    axiosInstance.put(`/exam-questions/${examQuestionId}`, data),
  
  deleteExamQuestion: (examQuestionId) => 
    axiosInstance.delete(`/exam-questions/${examQuestionId}`),
  
  addQuestionToExam: (examId, questionIds) => 
    axiosInstance.post('/exam-questions/add', { 
      exam_id: examId, 
      question_ids: questionIds 
    }),
  
  removeQuestionFromExam: (examId, questionId) => 
    axiosInstance.delete(`/exam-questions/exam/${examId}/question/${questionId}`),
  
  reorderQuestions: (examId, questionOrder) => 
    axiosInstance.put(`/exam-questions/exam/${examId}/reorder`, { 
      question_order: questionOrder 
    }),
  
  bulkUpdateMarks: (examId, questions) => 
    axiosInstance.put(`/exam-questions/exam/${examId}/bulk-marks`, { 
      questions 
    }),
  
  // ==================== STUDENT EXAM ROUTES ====================
  
  getAvailableExams: (courseId) => 
    axiosInstance.get('/exams/available', { params: { course_id: courseId } }),
  
  startExam: (examId) => axiosInstance.post(`/exams/start/${examId}`),
  
  submitExam: (examResultId, answers) => 
    axiosInstance.post(`/exams/submit/${examResultId}`, { answers }),
  
  getMyExamResults: () => axiosInstance.get('/exams/my-results'),
};

export default examsApi;