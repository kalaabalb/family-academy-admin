import axiosInstance from './axiosConfig';

const adminsApi = {
  getAllAdmins: () => axiosInstance.get('/admins'),
  createAdmin: (data) => axiosInstance.post('/admins', data),
  updateAdmin: (id, data) => axiosInstance.put(`/admins/${id}`, data),
  resetAdminPassword: (id, data) => axiosInstance.post(`/admins/${id}/reset-password`, data),
  deleteAdmin: (id) => axiosInstance.delete(`/admins/${id}`),
};

export default adminsApi;
