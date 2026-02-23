import axiosInstance from './axiosConfig';

const subscriptionsApi = {
  // Get all subscriptions (admin)
  getAllSubscriptions: (params = {}) => 
    axiosInstance.get('/subscriptions', { params }),
  
  // Get subscription by ID
  getSubscription: (id) => 
    axiosInstance.get(`/subscriptions/${id}`),
  
  // Extend subscription (admin)
  extendSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}/extend`, data),
  
  // Cancel subscription (admin/user)
  cancelSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/cancel`),
  
  // Reactivate subscription (admin)
  reactivateSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/reactivate`),
  
  // Create subscription (admin)
  createSubscription: (data) => 
    axiosInstance.post('/subscriptions', data),
  
  // Get user subscriptions (admin)
  getUserSubscriptions: (userId) => 
    axiosInstance.get(`/users/${userId}/subscriptions`),
  
  // Update subscription (admin)
  updateSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}`, data),
  
  // Delete subscription (admin)
  deleteSubscription: (id) => 
    axiosInstance.delete(`/subscriptions/${id}`),
  
  // Get subscription statistics (admin)
  getSubscriptionStats: () => 
    axiosInstance.get('/subscriptions/stats'),
  
  // Bulk update subscriptions (admin)
  bulkUpdateSubscriptions: (subscriptionIds, data) => 
    axiosInstance.put('/subscriptions/bulk-update', {
      subscription_ids: subscriptionIds,
      data
    }),
  
  // Check subscription status
  checkSubscriptionStatus: (userId, categoryId) => 
    axiosInstance.get('/subscriptions/check-status', {
      params: { user_id: userId, category_id: categoryId }
    }),
  
  // Get upcoming expirations (admin)
  getUpcomingExpirations: (days = 7) => 
    axiosInstance.get('/subscriptions/upcoming-expirations', {
      params: { days }
    }),
  
  // Export subscriptions (admin)
  exportSubscriptions: (format = 'csv') => 
    axiosInstance.get('/subscriptions/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default subscriptionsApi;