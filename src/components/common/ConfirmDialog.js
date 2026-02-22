import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close,
  Warning,
  Error,
  Info,
  CheckCircle,
  Help,
  Delete,
  Edit,
  WarningAmber,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  severity = "warning",
  loading = false,
  showIcon = true,
  additionalInfo,
  confirmButtonProps = {},
  cancelButtonProps = {},
}) => {
  const theme = useTheme();

  const getSeverityConfig = () => {
    switch (severity) {
      case 'error':
        return {
          icon: <Error />,
          color: theme.palette.error.main,
          light: theme.palette.error.light,
          bg: alpha(theme.palette.error.main, 0.1),
        };
      case 'warning':
        return {
          icon: <WarningAmber />,
          color: theme.palette.warning.main,
          light: theme.palette.warning.light,
          bg: alpha(theme.palette.warning.main, 0.1),
        };
      case 'info':
        return {
          icon: <Info />,
          color: theme.palette.info.main,
          light: theme.palette.info.light,
          bg: alpha(theme.palette.info.main, 0.1),
        };
      case 'success':
        return {
          icon: <CheckCircle />,
          color: theme.palette.success.main,
          light: theme.palette.success.light,
          bg: alpha(theme.palette.success.main, 0.1),
        };
      case 'delete':
        return {
          icon: <Delete />,
          color: theme.palette.error.main,
          light: theme.palette.error.light,
          bg: alpha(theme.palette.error.main, 0.1),
        };
      case 'edit':
        return {
          icon: <Edit />,
          color: theme.palette.info.main,
          light: theme.palette.info.light,
          bg: alpha(theme.palette.info.main, 0.1),
        };
      default:
        return {
          icon: <Help />,
          color: theme.palette.primary.main,
          light: theme.palette.primary.light,
          bg: alpha(theme.palette.primary.main, 0.1),
        };
    }
  };

  const config = getSeverityConfig();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        },
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 3, 
        pb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showIcon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: config.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.color,
              }}
            >
              {config.icon}
            </Box>
          )}
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        {!loading && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Close />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ px: 3, py: 2 }}>
        <DialogContentText 
          sx={{ 
            color: 'text.primary', 
            fontSize: '1rem',
            lineHeight: 1.6,
            mb: additionalInfo ? 2 : 0,
          }}
        >
          {message}
        </DialogContentText>
        
        {additionalInfo && (
          <Alert 
            severity={severity === 'delete' ? 'error' : severity} 
            sx={{ 
              mt: 2, 
              borderRadius: 2,
              '& .MuiAlert-icon': { color: config.color },
            }}
          >
            <Typography variant="body2">{additionalInfo}</Typography>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ 
            borderRadius: 2,
            minWidth: 100,
            ...cancelButtonProps?.sx,
          }}
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 2,
            minWidth: 100,
            bgcolor: config.color,
            '&:hover': {
              bgcolor: config.light,
            },
            ...confirmButtonProps?.sx,
          }}
          {...confirmButtonProps}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;