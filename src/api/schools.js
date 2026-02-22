import axiosInstance from './axiosConfig';

const schoolsApi = {
  
  getAllSchools: () => axiosInstance.get('/schools'),
  
  
  createSchool: (name) => axiosInstance.post('/schools', { name }),
  
  
  updateSchool: (id, name) => axiosInstance.put(`/schools/${id}`, { name }),
  
  
  deleteSchool: (id) => axiosInstance.delete(`/schools/${id}`),
};

export default schoolsApi;