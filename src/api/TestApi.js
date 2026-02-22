import React, { useEffect } from 'react';
import axiosInstance from '../api/axiosConfig';

const TestApi = () => {
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing API connection...');
        const response = await axiosInstance.get('/auth/validate');
        console.log('API Test Response:', response.data);
        
        
        const categoriesRes = await axiosInstance.get('/categories');
        console.log('Categories Response:', categoriesRes.data);
      } catch (error) {
        console.error('API Test Error:', error);
        console.error('Error details:', error.response?.data || error.message);
      }
    };
    
    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Testing API Connection</h2>
      <p>Check browser console for results</p>
    </div>
  );
};

export default TestApi;