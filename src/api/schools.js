import axiosInstance from './axiosConfig';

const schoolsApi = {
  // Get all schools
  getAllSchools: () => axiosInstance.get('/schools'),
  
  // Create school
  createSchool: (name) => axiosInstance.post('/schools', { name }),
  
  // Update school
  updateSchool: (id, name) => axiosInstance.put(`/schools/${id}`, { name }),
  
  // Delete school
  deleteSchool: (id) => axiosInstance.delete(`/schools/${id}`),
};

export default schoolsApi;