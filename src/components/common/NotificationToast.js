import React from 'react';
import { Alert, AlertTitle, Snackbar } from '@mui/material';
import { getNotificationTitle } from '../../utils/notificationMessage';

const NotificationToast = ({
  open,
  message,
  severity = 'info',
  duration = 3200,
  onClose,
}) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      sx={{ mt: 7, px: { xs: 1, sm: 0 } }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={onClose}
        sx={{
          width: '100%',
          minWidth: { xs: 0, sm: 320 },
          maxWidth: { xs: 'calc(100vw - 24px)', sm: 460 },
          borderRadius: 2,
          alignItems: 'flex-start',
          boxShadow: 4,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <AlertTitle sx={{ mb: 0.5, fontWeight: 700 }}>
          {getNotificationTitle(severity)}
        </AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;
