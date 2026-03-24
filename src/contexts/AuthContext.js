import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { devError } from '../utils/devLogger';
import { getNotificationMessage } from '../utils/notificationMessage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Session timeout values
const SESSION_TIMEOUT_SHORT = 30 * 60 * 1000; // 30 minutes
const SESSION_TIMEOUT_LONG = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cookie options
const COOKIE_OPTIONS = {
  expires: 7,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const navigate = useNavigate();

  const logAuthError = useCallback((message, error) => {
    if (process.env.NODE_ENV !== 'production') {
      devError(message, error);
    }
  }, []);

  // Load user from cookies
  const loadUserFromCookies = useCallback(() => {
    try {
      const token = Cookies.get('token');
      const userStr = Cookies.get('user');
      
      if (token && userStr) {
        const parsedUser = JSON.parse(userStr);
        return {
          token,
          user: parsedUser
        };
      }
    } catch (e) {
      logAuthError('Error loading user from cookies:', e);
    }
    return null;
  }, [logAuthError]);

  // Save auth data to cookies
  const saveAuthData = useCallback((token, user, rememberMe = true) => {
    const userToSave = {
      ...user,
      assigned_courses: user.assigned_courses || []
    };

    Cookies.set('token', token, { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined
    });
    Cookies.set('user', JSON.stringify(userToSave), { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined
    });
    
    // Clear any old storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }, []);

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    authApi.logout().catch(() => {});
    navigate('/login');
  }, [navigate, sessionTimeout, clearAuthData]);

  // Session management
  const resetSessionTimeout = useCallback((rememberMe = true) => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    const timeoutValue = rememberMe ? SESSION_TIMEOUT_LONG : SESSION_TIMEOUT_SHORT;
    const timeout = setTimeout(() => {
      logout();
    }, timeoutValue);
    setSessionTimeout(timeout);
  }, [sessionTimeout, logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const cookieData = loadUserFromCookies();
        
        if (cookieData) {
          setUser(cookieData.user);
          setIsAuthenticated(true);
          const rememberMe = true;
          resetSessionTimeout(rememberMe);
          
          try {
            await authApi.validateToken();
          } catch (error) {
            logout();
          }
        }
      } catch (error) {
        logAuthError('Error loading user:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetActivity = () => {
      const rememberMe = true;
      resetSessionTimeout(rememberMe);
    };
    events.forEach(event => document.addEventListener(event, resetActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetActivity));
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, []);

  const login = useCallback(async (username, password, rememberMe = true) => {
    try {
      setLoading(true);
      const response = await authApi.adminLogin(username, password);
      
      let token, userData;
      
      if (response.data && response.data.data) {
        token = response.data.data.token;
        userData = response.data.data.user;
      } else if (response.data && response.data.token) {
        token = response.data.token;
        userData = response.data.user;
      } else {
        throw new Error('Invalid response format');
      }
      
      saveAuthData(token, userData, rememberMe);
      
      setUser(userData);
      setIsAuthenticated(true);
      resetSessionTimeout(rememberMe);
      
      return { success: true, user: userData };
    } catch (error) {
      logAuthError('Login error:', error);
      return {
        success: false,
        message: getNotificationMessage(error, 'error'),
      };
    } finally {
      setLoading(false);
    }
  }, [logAuthError, resetSessionTimeout, saveAuthData]);

  const isAdmin = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'superadmin';
  }, [user]);

  const isTeacher = useCallback(() => {
    return user?.role === 'teacher';
  }, [user]);

  const isSuperAdmin = useCallback(() => {
    return user?.role === 'superadmin';
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    isAdmin,
    isTeacher,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
