import axiosInstance from './axiosConfig';

const questionsApi = {
  // Get all questions (admin/teacher)
  getAllQuestions: (params) => 
    axiosInstance.get('/questions', { params }),
  
  // Get practice questions for chapter (student)
  getPracticeQuestions: (chapterId) => 
    axiosInstance.get(`/questions/practice/${chapterId}`),
  
  // Check answer (student)
  checkAnswer: (questionId, selectedOption) => 
    axiosInstance.post('/questions/check-answer', { 
      question_id: questionId, 
      selected_option: selectedOption 
    }),
  
  // Create question (admin/teacher)
  createQuestion: (data) => axiosInstance.post('/questions', data),
  
  // Create batch questions (admin/teacher)
  createBatchQuestions: (chapterId, questions) => 
    axiosInstance.post('/questions/batch', { 
      chapter_id: chapterId, 
      questions 
    }),
  
  // Update question (admin/teacher)
  updateQuestion: (id, data) => axiosInstance.put(`/questions/${id}`, data),
  
  // Delete question (admin/teacher)
  deleteQuestion: (id) => axiosInstance.delete(`/questions/${id}`),
  
  // Get questions for exam (admin/teacher)
  getQuestionsForExam: (courseId, filters = {}) =>
    axiosInstance.get('/questions/for-exam', { 
      params: { course_id: courseId, ...filters } 
    }),
};

export default questionsApi;