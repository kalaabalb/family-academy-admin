import axiosInstance from './axiosConfig';

const subscriptionsApi = {
  
  getAllSubscriptions: (params = {}) => 
    axiosInstance.get('/subscriptions', { params }),
  
  
  getSubscription: (id) => 
    axiosInstance.get(`/subscriptions/${id}`),
  
  
  extendSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}/extend`, data),
  
  
  cancelSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/cancel`),
  
  
  reactivateSubscription: (id) => 
    axiosInstance.put(`/subscriptions/${id}/reactivate`),
  
  
  createSubscription: (data) => 
    axiosInstance.post('/subscriptions', data),
  
  
  getUserSubscriptions: (userId) => 
    axiosInstance.get(`/users/${userId}/subscriptions`),
  
  
  updateSubscription: (id, data) => 
    axiosInstance.put(`/subscriptions/${id}`, data),
  
  
  deleteSubscription: (id) => 
    axiosInstance.delete(`/subscriptions/${id}`),
  
  
  getSubscriptionStats: () => 
    axiosInstance.get('/subscriptions/stats'),
  
  
  bulkUpdateSubscriptions: (subscriptionIds, data) => 
    axiosInstance.put('/subscriptions/bulk-update', {
      subscription_ids: subscriptionIds,
      data
    }),
  
  
  checkSubscriptionStatus: (userId, categoryId) => 
    axiosInstance.get('/subscriptions/check-status', {
      params: { user_id: userId, category_id: categoryId }
    }),
  
  
  getUpcomingExpirations: (days = 7) => 
    axiosInstance.get('/subscriptions/upcoming-expirations', {
      params: { days }
    }),
  
  
  exportSubscriptions: (format = 'csv') => 
    axiosInstance.get('/subscriptions/export', {
      params: { format },
      responseType: 'blob'
    }),
};

export default subscriptionsApi;