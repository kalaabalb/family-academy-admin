import axiosInstance from './axiosConfig';

const paymentsApi = {
  submitPayment: (data) => axiosInstance.post('/payments/submit', data),
  
  getMyPayments: () => axiosInstance.get('/payments/my-payments'),
  
  getPendingPayments: () => axiosInstance.get('/payments/pending'),
  
  getAllPayments: () => axiosInstance.get('/payments/all'),
  
  verifyPayment: (id, adminNotes = '') => 
    axiosInstance.post(`/payments/verify/${id}`, { admin_notes: adminNotes }),
  
  rejectPayment: (id, rejectionReason) => 
    axiosInstance.post(`/payments/reject/${id}`, { rejection_reason: rejectionReason }),
};

export default paymentsApi;