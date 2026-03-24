import axiosInstance from './axiosConfig';
import { devError } from '../utils/devLogger';

const systemLogsApi = {
  // Get system logs with filters
  getSystemLogs: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/system-logs', { params });
      return response;
    } catch (error) {
      devError('Error fetching system logs:', error);
      throw error;
    }
  },
  
  // Get log statistics
  getLogStats: async () => {
    try {
      const response = await axiosInstance.get('/system-logs/stats');
      return response;
    } catch (error) {
      devError('Error fetching log stats:', error);
      // Return default stats object instead of throwing
      return {
        data: {
          success: true,
          data: {
            counts: { total: 0, info: 0, warn: 0, error: 0, debug: 0 },
            recent_actions: [],
            error_trends: [],
            summary: {
              days_with_logs: 0,
              latest_log: null,
              oldest_log: null,
              logs_per_day: 0,
              error_rate: 0,
              warning_rate: 0
            }
          }
        }
      };
    }
  },
  
  // Clear old logs (admin)
  clearOldLogs: async (days = 30) => {
    try {
      const response = await axiosInstance.delete('/system-logs/clear', { 
        params: { days } 
      });
      return response;
    } catch (error) {
      devError('Error clearing old logs:', error);
      throw error;
    }
  },
  
  // Export logs (admin)
  exportLogs: async (format = 'csv', params = {}) => {
    try {
      const response = await axiosInstance.get('/system-logs/export', {
        params: { format, ...params },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      devError('Error exporting logs:', error);
      throw error;
    }
  },
  
  // Get single log details
  getLogDetails: async (id) => {
    try {
      const response = await axiosInstance.get(`/system-logs/${id}`);
      return response;
    } catch (error) {
      devError('Error fetching log details:', error);
      throw error;
    }
  }
};

export default systemLogsApi;
