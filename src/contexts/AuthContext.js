import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
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


const SESSION_TIMEOUT = 30 * 60 * 1000;


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
  
  
  const logoutRef = useRef();

  
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

  
  const saveAuthData = useCallback((token, user, rememberMe = true) => {
    
    Cookies.set('token', token, { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined 
    });
    Cookies.set('user', JSON.stringify(user), { 
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 7 : undefined
    });
    
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }, []);

  
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
  
  
  logoutRef.current = logout;

  
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    const timeout = setTimeout(() => {
      console.log('Session expired due to inactivity');
      if (logoutRef.current) {
        logoutRef.current();
      }
    }, SESSION_TIMEOUT);
    setSessionTimeout(timeout);
  }, [sessionTimeout]);

  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const cookieData = loadUserFromCookies();
        
        if (cookieData) {
          setUser(cookieData.user);
          setIsAuthenticated(true);
          resetSessionTimeout();
          
          
          try {
            await authApi.validateToken();
          } catch (error) {
            
            if (logoutRef.current) {
              logoutRef.current();
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

    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetActivity = () => resetSessionTimeout();
    events.forEach(event => document.addEventListener(event, resetActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetActivity));
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [loadUserFromCookies, resetSessionTimeout, clearAuthData]);

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
    logout: logoutRef.current || logout, 
    isAdmin,
    isTeacher,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};