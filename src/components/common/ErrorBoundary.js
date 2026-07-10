import React from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { devError } from '../../utils/devLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    devError('Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 720,
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.5 }}>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
              An unexpected error interrupted the page. Reloading usually restores it.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
              <Button variant="contained" onClick={this.handleReload} sx={{ minWidth: 150 }}>
                Reload
              </Button>
              <Button variant="outlined" onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} sx={{ minWidth: 150 }}>
                Try Again
              </Button>
            </Box>

            <Alert severity="info" variant="outlined" sx={{ textAlign: 'left', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                If the issue keeps happening, send the error details from the browser console to support.
              </Typography>
            </Alert>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
