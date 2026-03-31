import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  Fade,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArrowForward,
  LockOutlined,
  PersonOutline,
  SchoolOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const fieldSx = {
  '& .MuiInputLabel-root': {
    fontWeight: 600,
    color: 'text.secondary',
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 56,
    borderRadius: 3,
    backgroundColor: (theme) =>
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.03)
        : alpha('#ffffff', 0.82),
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    '& fieldset': {
      borderColor: (theme) =>
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.12)
          : alpha(theme.palette.text.primary, 0.12),
    },
    '&:hover': {
      backgroundColor: (theme) =>
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.05)
          : alpha('#ffffff', 0.94),
      '& fieldset': {
        borderColor: 'primary.main',
      },
    },
    '&.Mui-focused': {
      backgroundColor: (theme) =>
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.06)
          : '#ffffff',
      '& fieldset': {
        borderColor: 'primary.main',
        borderWidth: '1px',
      },
    },
    '& input': {
      fontSize: '0.98rem',
      fontWeight: 500,
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: (theme) =>
        `0 0 0 100px ${
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.03)
            : '#ffffff'
        } inset`,
      WebkitTextFillColor: 'currentColor',
      caretColor: 'currentColor',
      borderRadius: 'inherit',
      transition: 'background-color 9999s ease-out 0s',
    },
    '& input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
      WebkitBoxShadow: (theme) =>
        `0 0 0 100px ${
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.05)
            : '#ffffff'
        } inset`,
      WebkitTextFillColor: 'currentColor',
    },
  },
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 60);
    if (location.state?.message) {
      setError(location.state.message);
    }
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(username.trim(), password, rememberMe);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Unable to sign in. Please check your credentials.');
      }
    } catch (submitError) {
      devError('Login error:', submitError);
      setError('Unable to connect right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2.5, md: 4 },
        px: 1.5,
        background: (currentTheme) =>
          currentTheme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #11161d 0%, #171d25 42%, #1c2430 100%)'
            : 'linear-gradient(135deg, #ece6dc 0%, #f4f0e8 42%, #e7edf2 100%)',
      }}
    >
      <Container maxWidth="xl">
        <Fade in={ready} timeout={450}>
          <Paper
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: { xs: 4, md: 6 },
              border: (currentTheme) =>
                `1px solid ${
                  currentTheme.palette.mode === 'dark'
                    ? alpha(currentTheme.palette.common.white, 0.08)
                    : alpha('#1f2933', 0.08)
                }`,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 28px 80px rgba(0, 0, 0, 0.42)'
                  : '0 28px 72px rgba(27, 35, 43, 0.14)',
              backgroundColor: 'transparent',
            }}
          >
            <Grid container>
              <Grid item xs={12} lg={6}>
                <Box
                  sx={{
                    height: '100%',
                    minHeight: { xs: 260, lg: 720 },
                    position: 'relative',
                    px: { xs: 3, sm: 4.5, lg: 6 },
                    py: { xs: 4, sm: 5, lg: 6 },
                    color: '#f6f8fb',
                    background:
                      'linear-gradient(165deg, #18212c 0%, #202b38 48%, #243444 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      background:
                        'radial-gradient(circle at 16% 18%, rgba(142, 168, 199, 0.24), transparent 26%), radial-gradient(circle at 78% 22%, rgba(212, 187, 160, 0.16), transparent 22%), radial-gradient(circle at 62% 82%, rgba(142, 168, 199, 0.12), transparent 24%)',
                    }}
                  />

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ position: 'relative', zIndex: 1 }}
                  >
                    <Box
                      sx={{
                        width: 58,
                        height: 58,
                        borderRadius: 3,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <SchoolOutlined sx={{ fontSize: 30, color: '#f3f6fb' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '1.45rem',
                          fontWeight: 800,
                          letterSpacing: '-0.03em',
                          color: '#f7f9fc',
                        }}
                      >
                        Family Academy
                      </Typography>
                      <Typography sx={{ color: 'rgba(235, 240, 246, 0.72)', fontSize: '0.95rem' }}>
                        Administration portal
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ position: 'relative', zIndex: 1, my: { xs: 4, lg: 6 } }}>
                    <Typography
                      sx={{
                        maxWidth: 520,
                        fontSize: { xs: '2rem', sm: '2.5rem', lg: '3.2rem' },
                        fontWeight: 800,
                        lineHeight: 1.02,
                        letterSpacing: '-0.05em',
                        mb: 2.25,
                        textWrap: 'balance',
                      }}
                    >
                      Professional access for school operations.
                    </Typography>
                    <Typography
                      sx={{
                        maxWidth: 500,
                        fontSize: { xs: '1rem', lg: '1.05rem' },
                        lineHeight: 1.75,
                        color: 'rgba(234, 239, 245, 0.74)',
                      }}
                    >
                      Manage courses, content, teachers, students, exams, payments, and platform workflows from one secure workspace.
                    </Typography>
                  </Box>

                  <Stack
                    spacing={2}
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3.5,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(14px)',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#f7f9fb',
                          fontWeight: 700,
                          fontSize: '1rem',
                          mb: 0.75,
                        }}
                      >
                        Authorized roles
                      </Typography>
                      <Typography
                        sx={{
                          color: 'rgba(232, 238, 245, 0.72)',
                          lineHeight: 1.7,
                          fontSize: '0.95rem',
                        }}
                      >
                        Sign in with your assigned administrator or teacher account credentials.
                      </Typography>
                    </Paper>
                  </Stack>
                </Box>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Box
                  sx={{
                    minHeight: { xs: 'auto', lg: 720 },
                    px: { xs: 3, sm: 4.5, lg: 6 },
                    py: { xs: 4, sm: 5, lg: 6 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: (currentTheme) =>
                      currentTheme.palette.mode === 'dark'
                        ? alpha('#10151b', 0.86)
                        : alpha('#fbf8f3', 0.96),
                  }}
                >
                  <Box sx={{ width: '100%', maxWidth: 470 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.9rem', sm: '2.2rem' },
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        color: 'text.primary',
                        mb: 1,
                      }}
                    >
                      Sign in
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 4, lineHeight: 1.7 }}
                    >
                      Enter your credentials to continue to the management workspace.
                    </Typography>

                    <Paper
                      component="form"
                      onSubmit={handleSubmit}
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, sm: 3.5 },
                        borderRadius: 4,
                        bgcolor: (currentTheme) =>
                          currentTheme.palette.mode === 'dark'
                            ? alpha(currentTheme.palette.background.paper, 0.92)
                            : alpha('#ffffff', 0.72),
                        border: (currentTheme) =>
                          `1px solid ${
                            currentTheme.palette.mode === 'dark'
                              ? alpha(currentTheme.palette.common.white, 0.08)
                              : alpha('#1f2933', 0.08)
                          }`,
                        boxShadow:
                          theme.palette.mode === 'dark'
                            ? '0 18px 36px rgba(0, 0, 0, 0.24)'
                            : '0 18px 34px rgba(27, 35, 43, 0.08)',
                      }}
                    >
                      <Stack spacing={2.25}>
                        {error ? (
                          <Alert
                            severity="error"
                            sx={{ borderRadius: 2.5 }}
                            onClose={() => setError('')}
                          >
                            {error}
                          </Alert>
                        ) : null}

                        <TextField
                          fullWidth
                          label="Username"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          required
                          autoFocus
                          autoComplete="username"
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonOutline sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          autoComplete="current-password"
                          sx={fieldSx}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlined sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword((current) => !current)}
                                  edge="end"
                                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                                  sx={{
                                    color: 'text.secondary',
                                  }}
                                >
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={rememberMe}
                                onChange={(event) => setRememberMe(event.target.checked)}
                              />
                            }
                            label="Keep me signed in"
                            sx={{
                              m: 0,
                              '& .MuiFormControlLabel-label': {
                                color: 'text.secondary',
                                fontSize: '0.95rem',
                              },
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Secure internal access
                          </Typography>
                        </Stack>

                        <Button
                          type="submit"
                          fullWidth
                          size="large"
                          variant="contained"
                          disabled={submitting}
                          endIcon={
                            submitting ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />
                          }
                          sx={{
                            mt: 0.5,
                            minHeight: 54,
                            borderRadius: 3,
                            fontSize: '0.98rem',
                            fontWeight: 700,
                          }}
                        >
                          {submitting ? 'Signing in' : 'Sign in'}
                        </Button>
                      </Stack>
                    </Paper>

                    <Divider sx={{ my: 3.5 }} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.7, maxWidth: 430 }}
                    >
                      Use the credentials assigned by your organization. If access is not working, contact the system administrator.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
