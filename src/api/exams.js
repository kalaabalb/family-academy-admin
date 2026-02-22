
import axiosInstance from './axiosConfig';

const examsApi = {
  
  getAllExams: (params) => 
    axiosInstance.get('/exams', { params }),
  
  
  getExamById: (id) => 
    axiosInstance.get(`/exams/${id}`),
  
  
  getExamQuestions: (examId) => 
    axiosInstance.get(`/exams/${examId}/questions`),
  
  
  createExam: (data) => axiosInstance.post('/exams', data),
  
  
  updateExam: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  
  
  deleteExam: (id) => axiosInstance.delete(`/exams/${id}`),
  
  
  createExamQuestion: (examId, data) => 
    axiosInstance.post(`/exams/${examId}/questions`, data),
  
  
  updateExamQuestion: (examQuestionId, data) => 
    axiosInstance.put(`/exams/questions/${examQuestionId}`, data),
  
  
  deleteExamQuestion: (examQuestionId) => 
    axiosInstance.delete(`/exams/questions/${examQuestionId}`),
  
  
  addQuestionToExam: (examId, questionIds) => 
    axiosInstance.post('/exams/add-question', { exam_id: examId, question_ids: questionIds }),
  
  
  getAvailableExams: (courseId) => 
    axiosInstance.get('/exams/available', { params: { course_id: courseId } }),
  
  startExam: (examId) => axiosInstance.post(`/exams/start/${examId}`),
  
  submitExam: (examResultId, answers) => 
    axiosInstance.post(`/exams/submit/${examResultId}`, { answers }),
  
  getMyExamResults: () => axiosInstance.get('/exams/my-results'),
};

export default examsApi;
