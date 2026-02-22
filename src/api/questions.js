
import axiosInstance from './axiosConfig';

const questionsApi = {
  
  getAllQuestions: (params) => 
    axiosInstance.get('/questions', { params }),
  
  
  getPracticeQuestions: (chapterId) => 
    axiosInstance.get(`/questions/practice/${chapterId}`),
  
  
  checkAnswer: (questionId, selectedOption) => 
    axiosInstance.post('/questions/check-answer', { question_id: questionId, selected_option: selectedOption }),
  
  
  createQuestion: (data) => axiosInstance.post('/questions', data),
  
  
  createBatchQuestions: (chapterId, questions) => 
    axiosInstance.post('/questions/batch', { chapter_id: chapterId, questions }),
  
  
  updateQuestion: (id, data) => axiosInstance.put(`/questions/${id}`, data),
  
  
  deleteQuestion: (id) => axiosInstance.delete(`/questions/${id}`),
  
  
  getQuestionsForExam: (courseId, filters = {}) =>
    axiosInstance.get('/questions/for-exam', { 
      params: { course_id: courseId, ...filters } 
    }),
};

export default questionsApi;
