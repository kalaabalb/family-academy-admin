import React, { createContext, useState, useContext, useCallback } from 'react';
import NotificationToast from '../components/common/NotificationToast';
import { getNotificationMessage } from '../utils/notificationMessage';

const NotificationContext = createContext({});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, severity = 'info', duration = 3200) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [
      ...prev,
      {
        id,
        message: getNotificationMessage(message, severity),
        severity,
        open: true,
        duration: typeof duration === 'number' ? duration : 3200,
      },
    ]);
    return id;
  }, []);

  const hideNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, open: false } : notification
      )
    );
    
    // Remove from state after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  }, []);

  const success = useCallback((message, duration) => {
    return showNotification(message, 'success', duration);
  }, [showNotification]);

  const error = useCallback((message, duration) => {
    return showNotification(message, 'error', duration);
  }, [showNotification]);

  const warning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration);
  }, [showNotification]);

  const info = useCallback((message, duration) => {
    return showNotification(message, 'info', duration);
  }, [showNotification]);

  const handleClose = (id, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideNotification(id);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        hideNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      
      {/* Render all notifications */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          duration={notification.duration}
          onClose={(_, reason) => handleClose(notification.id, reason)}
        />
      ))}
    </NotificationContext.Provider>
  );
};
