import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie'; // We'll install this

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cookie options
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const navigate = useNavigate();

  // Load user from multiple sources (cookies, localStorage, sessionStorage)
  const loadUserFromStorage = useCallback(() => {
    // Try cookies first (most persistent)
    const cookieToken = Cookies.get('token');
    const cookieUser = Cookies.get('user');
    const cookieRefreshToken = Cookies.get('refreshToken');
    
    if (cookieToken && cookieUser && cookieRefreshToken) {
      try {
        const parsedUser = JSON.parse(cookieUser);
        return {
          token: cookieToken,
          user: parsedUser,
          refreshToken: cookieRefreshToken,
          source: 'cookie'
        };
      } catch (e) {
        console.error('Error parsing cookie user:', e);
      }
    }
    
    // Try localStorage next
    const localToken = localStorage.getItem('token');
    const localUser = localStorage.getItem('user');
    const localRefreshToken = localStorage.getItem('refreshToken');
    
    if (localToken && localUser && localRefreshToken) {
      try {
        const parsedUser = JSON.parse(localUser);
        return {
          token: localToken,
          user: parsedUser,
          refreshToken: localRefreshToken,
          source: 'localStorage'
        };
      } catch (e) {
        console.error('Error parsing localStorage user:', e);
      }
    }
    
    // Try sessionStorage last
    const sessionToken = sessionStorage.getItem('token');
    const sessionUser = sessionStorage.getItem('user');
    const sessionRefreshToken = sessionStorage.getItem('refreshToken');
    
    if (sessionToken && sessionUser && sessionRefreshToken) {
      try {
        const parsedUser = JSON.parse(sessionUser);
        return {
          token: sessionToken,
          user: parsedUser,
          refreshToken: sessionRefreshToken,
          source: 'sessionStorage'
        };
      } catch (e) {
        console.error('Error parsing sessionStorage user:', e);
      }
    }
    
    return null;
  }, []);

  // Save auth data to all storage types
  const saveAuthData = useCallback((token, user, refreshToken, rememberMe = true) => {
    // Always save to sessionStorage (temporary)
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    
    // Save to localStorage if remember me is true
    if (rememberMe) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    } else {
      // Clear localStorage if not remembering
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    }
    
    // Always save to cookies (most persistent)
    Cookies.set('token', token, COOKIE_OPTIONS);
    Cookies.set('user', JSON.stringify(user), COOKIE_OPTIONS);
    if (refreshToken) {
      Cookies.set('refreshToken', refreshToken, COOKIE_OPTIONS);
    }
  }, []);

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    // Clear all storage types
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('refreshToken');
    
    // Clear cookies
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
  }, []);

  // Session management
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    const timeout = setTimeout(() => {
      console.log('Session expired due to inactivity');
      logout();
    }, SESSION_TIMEOUT);
    setSessionTimeout(timeout);
  }, []);

  // Load user from storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = loadUserFromStorage();
        
        if (stored) {
          setUser(stored.user);
          setIsAuthenticated(true);
          resetSessionTimeout();
          
          // Validate token silently
          try {
            await authApi.validateToken();
          } catch (error) {
            // Token might be expired, try to refresh
            try {
              const response = await authApi.refreshToken(stored.refreshToken);
              const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
              
              // Update all storage with new tokens
              saveAuthData(newToken, stored.user, newRefreshToken, true);
            } catch (refreshError) {
              console.error('Auto-refresh failed:', refreshError);
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up activity listeners for session reset
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetActivity = () => resetSessionTimeout();
    events.forEach(event => document.addEventListener(event, resetActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetActivity));
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, []);

  // Auto-refresh token periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        if (!refreshToken) return;

        const response = await authApi.refreshToken(refreshToken);
        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        // Update tokens in all storage
        const currentUser = user;
        saveAuthData(token, currentUser, newRefreshToken, true);
        
        console.log('Token auto-refreshed successfully');
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // Don't logout immediately, token might still be valid
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, user]);

  const login = useCallback(async (username, password, rememberMe = true) => {
    try {
      setLoading(true);
      const response = await authApi.adminLogin(username, password);
      const { data } = response.data;
      
      // Save auth data to all storage types
      saveAuthData(data.token, data.user, data.refreshToken, rememberMe);
      
      // Update state
      setUser(data.user);
      setIsAuthenticated(true);
      resetSessionTimeout();
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    } finally {
      setLoading(false);
    }
  }, [resetSessionTimeout, saveAuthData]);

  const logout = useCallback(() => {
    // Clear all storage
    clearAuthData();
    
    // Clear state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear session timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    // Call logout API silently
    authApi.logout().catch(() => {});
    
    // Navigate to login
    navigate('/login');
  }, [navigate, sessionTimeout, clearAuthData]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await authApi.validateToken();
      const updatedUser = response.data.data?.user || user;
      
      // Update stored user in all storage
      const currentToken = Cookies.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const currentRefreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      saveAuthData(currentToken, updatedUser, currentRefreshToken, true);
      setUser(updatedUser);
      resetSessionTimeout();
    } catch (error) {
      console.error('Failed to refresh user:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  }, [isAuthenticated, user, logout, resetSessionTimeout, saveAuthData]);

  const updateUser = useCallback((updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Update user in all storage
    const currentToken = Cookies.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');
    const currentRefreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    
    saveAuthData(currentToken, updatedUser, currentRefreshToken, true);
  }, [user, saveAuthData]);

  // Permission checks
  const isAdmin = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'superadmin';
  }, [user]);

  const isTeacher = useCallback(() => {
    return user?.role === 'teacher';
  }, [user]);

  const isSuperAdmin = useCallback(() => {
    return user?.role === 'superadmin';
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (isSuperAdmin()) return true;
    return user.permissions?.includes(permission) || false;
  }, [user, isSuperAdmin]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    updateUser,
    isAdmin,
    isTeacher,
    isSuperAdmin,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};