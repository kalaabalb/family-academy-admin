import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  Fade,
  Container,
  useTheme,
  alpha,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  AdminPanelSettings,
  School,
  CheckCircle,
  Security,
} from '@mui/icons-material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);
    
    const message = location.state?.message;
    if (message) {
      setError(message);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, rememberMe);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    if (role === 'admin') {
      setUsername('superadmin');
      setPassword('Admin@123!');
    } else if (role === 'teacher') {
      setUsername('teacher1');
      setPassword('Teacher@123');
    }
    setRememberMe(true);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: { xs: 2, sm: 3 },
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
      }}
    >
      <Fade in={fadeIn} timeout={800}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            {/* Left Side - Branding */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: { xs: 4, md: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: 'white',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    }}
                  >
                    <School sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                  </Box>
                  <Box>
                    <Typography variant="h3" fontWeight="bold" sx={{ color: 'white' }}>
                      Family Academy
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Learning Management System
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h2" fontWeight="bold" sx={{ color: 'white', mb: 2 }}>
                  Welcome Back
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 4 }}>
                  Sign in to access your dashboard and manage your educational platform.
                </Typography>

                {/* Features Grid */}
                <Grid container spacing={2}>
                  {[
                    { icon: <CheckCircle />, text: 'Course Management', color: '#4caf50' },
                    { icon: <CheckCircle />, text: 'Student Analytics', color: '#2196f3' },
                    { icon: <CheckCircle />, text: 'Content Creation', color: '#ff9800' },
                    { icon: <CheckCircle />, text: 'Exam Management', color: '#9c27b0' },
                  ].map((feature, index) => (
                    <Grid item xs={6} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                        <Box sx={{ mr: 1, color: feature.color }}>{feature.icon}</Box>
                        <Typography variant="body2">{feature.text}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* System Status */}
                <Paper
                  sx={{
                    mt: 4,
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#4caf50',
                        mr: 1.5,
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 0.5 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.5 },
                        },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      System Status: <strong>Operational</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                      v2.0.0
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Grid>

            {/* Right Side - Login Form */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={6}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Admin & Teacher Portal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter your credentials to access your dashboard
                  </Typography>
                </Box>

                {error && (
                  <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2 }}
                    onClose={() => setError('')}
                  >
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                  />
                  
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleClickShowPassword}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Remember me"
                    />
                    
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      mb: 3,
                      borderRadius: 2,
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(102,126,234,0.6)',
                      },
                      '&:disabled': {
                        background: '#ccc',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                  </Button>
                </Box>


              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Fade>
    </Box>
  );
};

export default Login;