import React from 'react';
import NotificationToast from './NotificationToast';
import { getNotificationMessage } from '../../utils/notificationMessage';

const SuccessAlert = ({ message, onClose, duration = 3200 }) => {
  if (!message) return null;
  
  return (
    <NotificationToast
      open
      severity="success"
      message={getNotificationMessage(message, 'success')}
      duration={duration}
      onClose={onClose}
    />
  );
};

export default SuccessAlert;
