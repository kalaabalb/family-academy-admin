import React, { createContext, useState, useContext, useCallback } from 'react';
import { Alert, Snackbar } from '@mui/material';

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

  const showNotification = useCallback((message, severity = 'info', duration = 6000) => {
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, message, severity, open: true, duration },
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

  const handleClose = (id) => {
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
        <Snackbar
          key={notification.id}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={notification.open}
          autoHideDuration={notification.duration}
          onClose={() => handleClose(notification.id)}
          sx={{ mt: 6 }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%', borderRadius: 1 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};