import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

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

// Cookie options - FIXED for production
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
  path: '/'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const navigate = useNavigate();

  // Load user from cookies ONLY (simplified)
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
      console.error('Error loading user from cookies:', e);
    }
    return null;
  }, []);

  // Save auth data to cookies only
  const saveAuthData = useCallback((token, user, rememberMe = true) => {
    // Always set cookies
    Cookies.set('token', token, { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined // Session cookie if not remember me
    });
    Cookies.set('user', JSON.stringify(user), { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined
    });
    
    // Don't use localStorage/sessionStorage to avoid conflicts
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
  }, [logout, sessionTimeout]);

  // Load user from cookies on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const cookieData = loadUserFromCookies();
        
        if (cookieData) {
          setUser(cookieData.user);
          setIsAuthenticated(true);
          resetSessionTimeout();
          
          // Validate token silently
          try {
            await authApi.validateToken();
          } catch (error) {
            // Token expired
            logout();
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

  const login = useCallback(async (username, password, rememberMe = true) => {
    try {
      setLoading(true);
      const response = await authApi.adminLogin(username, password);
      
      // Check response structure
      let token, userData;
      
      if (response.data && response.data.data) {
        // Standard API response
        token = response.data.data.token;
        userData = response.data.data.user;
      } else if (response.data && response.data.token) {
        // Direct response
        token = response.data.token;
        userData = response.data.user;
      } else {
        throw new Error('Invalid response format');
      }
      
      // Save auth data
      saveAuthData(token, userData, rememberMe);
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      resetSessionTimeout();
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed. Please check your credentials.',
      };
    } finally {
      setLoading(false);
    }
  }, [resetSessionTimeout, saveAuthData]);

  const logout = useCallback(() => {
    // Clear cookies
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