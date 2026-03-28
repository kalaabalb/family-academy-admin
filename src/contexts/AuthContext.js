import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { devError } from '../utils/devLogger';
import { getNotificationMessage } from '../utils/notificationMessage';
import { cacheManager } from '../api/utils';

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
const STORAGE_KEYS = {
  token: 'fa_admin_token',
  user: 'fa_admin_user',
  refreshToken: 'fa_admin_refresh_token',
};

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
  const sessionTimeoutRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const navigate = useNavigate();

  const logAuthError = useCallback((message, error) => {
    if (process.env.NODE_ENV !== 'production') {
      devError(message, error);
    }
  }, []);

  const readStorage = useCallback((key) => {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      logAuthError(`Error reading storage key ${key}:`, error);
      return null;
    }
  }, [logAuthError]);

  // Load user from cookies
  const loadUserFromCookies = useCallback(() => {
    try {
      const token = Cookies.get('token') || readStorage(STORAGE_KEYS.token);
      const userStr = Cookies.get('user') || readStorage(STORAGE_KEYS.user);
      const refreshToken =
        Cookies.get('refreshToken') || readStorage(STORAGE_KEYS.refreshToken);
      
      if (token && userStr) {
        const parsedUser = JSON.parse(userStr);
        return {
          token,
          user: parsedUser,
          refreshToken,
        };
      }
    } catch (e) {
      logAuthError('Error loading user from cookies:', e);
    }
    return null;
  }, [logAuthError, readStorage]);

  // Save auth data to cookies
  const saveAuthData = useCallback((token, user, rememberMe = true, refreshToken = null) => {
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

    const storageTarget = rememberMe ? localStorage : sessionStorage;
    const storageToClear = rememberMe ? sessionStorage : localStorage;

    storageTarget.setItem(STORAGE_KEYS.token, token);
    storageTarget.setItem(STORAGE_KEYS.user, JSON.stringify(userToSave));
    if (refreshToken) {
      storageTarget.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    } else {
      storageTarget.removeItem(STORAGE_KEYS.refreshToken);
    }

    storageToClear.removeItem(STORAGE_KEYS.token);
    storageToClear.removeItem(STORAGE_KEYS.user);
    storageToClear.removeItem(STORAGE_KEYS.refreshToken);

    if (refreshToken) {
      Cookies.set('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        expires: rememberMe ? 7 : undefined
      });
    } else {
      Cookies.remove('refreshToken', { path: '/' });
    }
    
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
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    sessionStorage.removeItem(STORAGE_KEYS.token);
    sessionStorage.removeItem(STORAGE_KEYS.user);
    sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    cacheManager.clear();
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    
    authApi.logout().catch(() => {});
    navigate('/login');
  }, [navigate, clearAuthData]);

  // Session management
  const resetSessionTimeout = useCallback((rememberMe = true) => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    const timeoutValue = rememberMe ? SESSION_TIMEOUT_LONG : SESSION_TIMEOUT_SHORT;
    sessionTimeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutValue);
  }, [logout]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return undefined;
    }
    hasInitializedRef.current = true;

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
            clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
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
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, [clearAuthData, loadUserFromCookies, logAuthError, resetSessionTimeout]);

  const login = useCallback(async (username, password, rememberMe = true) => {
    try {
      setLoading(true);
      const response = await authApi.adminLogin(username, password);
      
      let token, userData, refreshToken;
      
      if (response.data && response.data.data) {
        token = response.data.data.token;
        userData = response.data.data.user;
        refreshToken = response.data.data.refreshToken || null;
      } else if (response.data && response.data.token) {
        token = response.data.token;
        userData = response.data.user;
        refreshToken = response.data.refreshToken || null;
      } else {
        throw new Error('Invalid response format');
      }

      if (!token || !userData) {
        throw new Error('Login response did not include the required session data');
      }
      
      saveAuthData(token, userData, rememberMe, refreshToken);
      cacheManager.clear();
      
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
