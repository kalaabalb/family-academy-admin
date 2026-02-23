import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axiosInstance from './axiosConfig';

const TestApi = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const testEndpoints = [
    { name: 'Auth Validate', endpoint: '/auth/validate', method: 'GET' },
    { name: 'Get Categories', endpoint: '/categories', method: 'GET' },
    { name: 'Get Courses', endpoint: '/courses', method: 'GET' },
    { name: 'Get Users', endpoint: '/users', method: 'GET' },
    { name: 'Get Teachers', endpoint: '/teachers', method: 'GET' },
    { name: 'Get Payments', endpoint: '/payments/all', method: 'GET' },
    { name: 'Get Settings', endpoint: '/settings', method: 'GET' },
  ];

  const testConnection = async (endpoint) => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`Testing ${endpoint.name}...`);
      const startTime = Date.now();
      const response = await axiosInstance.get(endpoint.endpoint);
      const endTime = Date.now();
      
      setResults(prev => [{
        name: endpoint.name,
        endpoint: endpoint.endpoint,
        status: response.status,
        time: endTime - startTime,
        data: response.data,
        success: true,
      }, ...prev]);
      
    } catch (err) {
      console.error(`Test failed for ${endpoint.name}:`, err);
      
      setResults(prev => [{
        name: endpoint.name,
        endpoint: endpoint.endpoint,
        status: err.response?.status || 'Network Error',
        message: err.response?.data?.message || err.message,
        success: false,
      }, ...prev]);
      
      setError(`Failed to connect to ${endpoint.endpoint}`);
    } finally {
      setLoading(false);
    }
  };

  const testAll = async () => {
    setResults([]);
    setError('');
    
    for (const endpoint of testEndpoints) {
      await testConnection(endpoint);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        API Connection Test
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Test connectivity to all backend API endpoints
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={testAll}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Testing...' : 'Test All Endpoints'}
        </Button>
        <Button
          variant="outlined"
          onClick={clearResults}
          disabled={loading}
        >
          Clear Results
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Test Individual Endpoints
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {testEndpoints.map((endpoint) => (
            <Button
              key={endpoint.endpoint}
              variant="outlined"
              size="small"
              onClick={() => testConnection(endpoint)}
              disabled={loading}
            >
              {endpoint.name}
            </Button>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Test Results
        </Typography>

        {results.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No tests run yet. Click a button to test an endpoint.
          </Typography>
        ) : (
          <List>
            {results.map((result, index) => (
              <ListItem
                key={index}
                sx={{
                  bgcolor: result.success ? 'success.light' : 'error.light',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {result.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {result.endpoint}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    result.success ? (
                      <>
                        Status: {result.status} • Response Time: {result.time}ms
                        <br />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {JSON.stringify(result.data).substring(0, 100)}...
                        </Typography>
                      </>
                    ) : (
                      <>
                        Status: {result.status} • Error: {result.message}
                      </>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default TestApi;