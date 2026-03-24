import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorAlert from './ErrorAlert';
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
        <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
          <ErrorAlert
            title="Something went wrong"
            message="An unexpected error occurred. Please refresh the page or contact support if the issue persists."
            details={this.state.errorInfo?.componentStack || this.state.error?.toString()}
            onRetry={this.handleReload}
            actionText="Reload"
          />

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={this.handleReload}>
              Reload
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              If reloading doesn't help, please contact support with the error details shown above.
            </Typography>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
