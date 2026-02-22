import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const TeacherRoute = ({ children }) => {
  const { isAuthenticated, loading, isTeacher, isAdmin } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Verifying permissions...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Teachers and admins can access teacher routes
  if (!isTeacher() && !isAdmin()) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <Alert 
          severity="error" 
          sx={{ 
            maxWidth: 500, 
            borderRadius: 2,
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2">
            This area is restricted to teachers and administrators.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return children;
};

export default TeacherRoute;