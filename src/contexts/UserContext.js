import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { cacheManager, generateCacheKey, resolveCacheTTL, withTimeout } from '../api/utils';
import { devError } from '../utils/devLogger';

// Create context
const UserContext = createContext(null);

// Custom hook to use the context
export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

// Provider component
export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const pendingRequestsRef = useRef(new Map());
  const defaultRequestTimeout = 45000;
  
  // ============== CACHE MANAGEMENT ==============
  
  /**
   * Get data from cache or fetch it
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   */
  const getCachedData = useCallback(async (key, fetchFn, options = {}) => {
    const {
      forceRefresh = false,
      ttl,
      preserveShape = false,
      staleOnError = true,
      requestTimeout = defaultRequestTimeout,
    } = options;
    const effectiveTTL = resolveCacheTTL(key, ttl);
    
    if (!forceRefresh && cacheManager.has(key)) {
      const cached = cacheManager.get(key);
      return cached ?? (preserveShape ? null : []);
    }

    const existingPending = pendingRequestsRef.current.get(key);
    if (existingPending && !forceRefresh) {
      const isStale =
        Number.isFinite(existingPending.startedAt) &&
        Number.isFinite(existingPending.requestTimeout) &&
        Date.now() - existingPending.startedAt > existingPending.requestTimeout;

      if (!isStale) {
        return existingPending.promise;
      }

      pendingRequestsRef.current.delete(key);
    } else if (forceRefresh && existingPending) {
      pendingRequestsRef.current.delete(key);
    }
    
    const requestToken = Symbol(key);
    const requestPromise = (async () => {
      try {
        const response = await withTimeout(fetchFn(), requestTimeout, key);
        let data = response;

        if (response?.data?.data) {
          data = response.data.data;
        } else if (response?.data) {
          data = response.data;
        }
        
        const processedData = preserveShape
          ? (data ?? null)
          : (Array.isArray(data) ? data : (data ? [data] : []));
        cacheManager.set(key, processedData, effectiveTTL);
        return processedData;
      } catch (error) {
        devError(`Error fetching data for key ${key}:`, error);

        if (staleOnError && cacheManager.has(key)) {
          return cacheManager.get(key) ?? (preserveShape ? null : []);
        }

        return preserveShape ? null : [];
      } finally {
        const currentPending = pendingRequestsRef.current.get(key);
        if (currentPending?.token === requestToken) {
          pendingRequestsRef.current.delete(key);
        }
      }
    })();

    pendingRequestsRef.current.set(key, {
      promise: requestPromise,
      startedAt: Date.now(),
      requestTimeout,
      token: requestToken,
    });
    return requestPromise;
  }, [defaultRequestTimeout]);

  /**
   * Invalidate cache for specific keys or patterns
   * @param {string|RegExp} pattern - Key pattern to invalidate
   */
  const invalidateCache = useCallback((pattern) => {
    if (typeof pattern === 'string' || pattern instanceof RegExp) {
      cacheManager.deletePattern(pattern);
    } else {
      cacheManager.clear();
    }
  }, []);

  /**
   * Clear all cache
   */
  const clearAllCache = useCallback(() => {
    cacheManager.clear();
  }, []);

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  // ============== DATA MANAGEMENT ==============

  /**
   * Update users list and invalidate related cache
   */
  const updateUsers = useCallback((newUsers) => {
    setUsers(Array.isArray(newUsers) ? newUsers : []);
    // Invalidate any user list caches
    invalidateCache(/^users\?/);
  }, [invalidateCache]);

  /**
   * Add a user and invalidate cache
   */
  const addUser = useCallback((user) => {
    setUsers(prev => Array.isArray(prev) ? [...prev, user] : [user]);
    invalidateCache(/^users\?/);
  }, [invalidateCache]);

  /**
   * Update a user and invalidate cache
   */
  const updateUser = useCallback((userId, updates) => {
    setUsers(prev => Array.isArray(prev) 
      ? prev.map(u => u.id === userId ? { ...u, ...updates } : u)
      : []);
    // Invalidate specific user cache and lists
    invalidateCache(/^users\?/);
    cacheManager.delete(`user:${userId}`);
  }, [invalidateCache]);

  /**
   * Remove a user and invalidate cache
   */
  const removeUser = useCallback((userId) => {
    setUsers(prev => Array.isArray(prev) 
      ? prev.filter(u => u.id !== userId)
      : []);
    invalidateCache(/^users\?/);
    cacheManager.delete(`user:${userId}`);
  }, [invalidateCache]);

  // ============== HELPER FUNCTIONS ==============

  /**
   * Generate a cache key for a specific data type
   * @param {string} type - Data type (e.g., 'users', 'courses')
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  const getCacheKey = useCallback((type, params = {}) => {
    return generateCacheKey(type, params);
  }, []);

  // Create the value object with all methods
  const value = {
    // User state
    users: Array.isArray(users) ? users : [],
    setUsers: updateUsers,
    selectedUser,
    setSelectedUser,
    loading,
    setLoading,
    
    // Cache management
    getCachedData,
    invalidateCache,
    clearAllCache,
    getCacheStats,
    getCacheKey,
    
    // User operations
    addUser,
    updateUser,
    removeUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
