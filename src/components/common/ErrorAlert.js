import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Collapse,
  Button,
  Typography,
} from '@mui/material';
import {
  Close,
  Refresh,
  BugReport,
  Warning,
  Error,
  Info,
  CheckCircle,
} from '@mui/icons-material';

const ErrorAlert = ({ 
  message, 
  onClose, 
  title = 'Error',
  severity = 'error',
  details,
  onRetry,
  action,
  actionText = 'Retry',
}) => {
  const [open, setOpen] = React.useState(true);
  const [showDetails, setShowDetails] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      case 'info':
        return <Info />;
      case 'success':
        return <CheckCircle />;
      default:
        return <Error />;
    }
  };

  if (!message) return null;

  return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        icon={getIcon()}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onRetry && (
              <Button
                color="inherit"
                size="small"
                startIcon={<Refresh />}
                onClick={onRetry}
                sx={{ mr: 1 }}
              >
                {actionText}
              </Button>
            )}
            {action}
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          mb: 2,
          borderRadius: 2,
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        <Typography variant="body2">{message}</Typography>
        
        {details && (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              startIcon={<BugReport />}
              onClick={() => setShowDetails(!showDetails)}
              sx={{ textTransform: 'none' }}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Collapse in={showDetails}>
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                <pre style={{ margin: 0 }}>
                  {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                </pre>
              </Box>
            </Collapse>
          </Box>
        )}
      </Alert>
    </Collapse>
  );
};

export default ErrorAlert;