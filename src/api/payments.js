import axiosInstance from './axiosConfig';

const paymentsApi = {
  // Submit payment (user)
  submitPayment: (data) => axiosInstance.post('/payments/submit', data),
  
  // Get my payments (user)
  getMyPayments: () => axiosInstance.get('/payments/my-payments'),
  
  // Get pending payments (admin)
  getPendingPayments: () => axiosInstance.get('/payments/pending'),
  
  // Get all payments (admin)
  getAllPayments: () => axiosInstance.get('/payments/all'),
  
  // Verify payment (admin)
  verifyPayment: (id, adminNotes = '') => 
    axiosInstance.post(`/payments/verify/${id}`, { admin_notes: adminNotes }),
  
  // Reject payment (admin)
  rejectPayment: (id, rejectionReason) => 
    axiosInstance.post(`/payments/reject/${id}`, { rejection_reason: rejectionReason }),
};

export default paymentsApi;