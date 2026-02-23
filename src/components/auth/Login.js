import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
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
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  School,
  CheckCircle,
  Security,
  ArrowForward,
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
      setError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%)',
          animation: 'pulse 15s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%': { transform: 'translate(-10%, -10%) rotate(0deg)' },
          '50%': { transform: 'translate(0%, 0%) rotate(5deg)' },
          '100%': { transform: 'translate(-10%, -10%) rotate(0deg)' },
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in={fadeIn} timeout={1000}>
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            {/* Left Side - Branding */}
            <Grid item xs={12} md={6}>
              <Box sx={{ color: 'white', mb: { xs: 4, md: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      bgcolor: 'white',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 3,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    }}
                  >
                    <School sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                  </Box>
                  <Box>
                    <Typography variant="h3" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>
                      Family Academy
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                      Learning Management System
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h2" fontWeight="800" sx={{ mb: 2, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                  Welcome Back
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: 500 }}>
                  Sign in to access your dashboard and manage your educational platform.
                </Typography>

                {/* Feature List */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {[
                    { icon: <CheckCircle />, text: 'Course Management', color: '#4caf50' },
                    { icon: <CheckCircle />, text: 'Student Analytics', color: '#2196f3' },
                    { icon: <CheckCircle />, text: 'Content Creation', color: '#ff9800' },
                    { icon: <CheckCircle />, text: 'Exam Management', color: '#9c27b0' },
                  ].map((feature, index) => (
                    <Grid item xs={6} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1, color: feature.color }}>{feature.icon}</Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {feature.text}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* System Status */}
                <Card
                  sx={{
                    mt: 4,
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: '#4caf50',
                          mr: 2,
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '0%': { opacity: 0.5, transform: 'scale(1)' },
                            '50%': { opacity: 1, transform: 'scale(1.2)' },
                            '100%': { opacity: 0.5, transform: 'scale(1)' },
                          },
                        }}
                      />
                      <Typography variant="body1" sx={{ color: 'white' }}>
                        System Status: <strong>Operational</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                        v2.0.0
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Grid>

            {/* Right Side - Login Form */}
            <Grid item xs={12} md={5}>
              <Card
                elevation={24}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255,255,255,0.95)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ color: theme.palette.primary.main }}>
                      Admin & Teacher Portal
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
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

                  <Box component="form" onSubmit={handleSubmit} noValidate>
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
                      autoComplete="off"
                      inputProps={{
                        autoComplete: 'new-username',
                      }}
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
                      autoComplete="off"
                      inputProps={{
                        autoComplete: 'new-password',
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
                        label={
                          <Typography variant="body2">Remember me</Typography>
                        }
                      />
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      endIcon={!loading && <ArrowForward />}
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
                          background: theme.palette.grey[400],
                        },
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>

                    <Divider sx={{ my: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        Secure Login
                      </Typography>
                    </Divider>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Security sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        SSL Encrypted Connection
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;