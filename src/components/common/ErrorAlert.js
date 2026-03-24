import React from 'react';
import NotificationToast from './NotificationToast';
import { getNotificationMessage } from '../../utils/notificationMessage';

const ErrorAlert = ({ 
  message, 
  onClose, 
  severity = 'error',
  duration = 3200,
}) => {
  if (!message) return null;

  return (
    <NotificationToast
      open
      severity={severity}
      message={getNotificationMessage(message, severity)}
      duration={duration}
      onClose={onClose}
    />
  );
};

export default ErrorAlert;
