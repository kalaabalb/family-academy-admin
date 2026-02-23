import React, { createContext, useState, useContext, useCallback } from 'react';
import { cacheManager, generateCacheKey } from '../api/utils';

const UserContext = createContext({});

export const useUsers = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ============== CACHE MANAGEMENT ==============
  
  /**
   * Get data from cache or fetch it
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   */
  const getCachedData = useCallback(async (key, fetchFn, options = {}) => {
    const { forceRefresh = false, ttl } = options;
    
    if (!forceRefresh && cacheManager.has(key)) {
      return cacheManager.get(key);
    }
    
    try {
      const data = await fetchFn();
      cacheManager.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Error fetching data for key ${key}:`, error);
      throw error;
    }
  }, []);

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
    setUsers(newUsers);
    // Invalidate any user list caches
    invalidateCache(/^users\?/);
  }, [invalidateCache]);

  /**
   * Add a user and invalidate cache
   */
  const addUser = useCallback((user) => {
    setUsers(prev => [...prev, user]);
    invalidateCache(/^users\?/);
  }, [invalidateCache]);

  /**
   * Update a user and invalidate cache
   */
  const updateUser = useCallback((userId, updates) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, ...updates } : u
    ));
    // Invalidate specific user cache and lists
    invalidateCache(/^users\?/);
    cacheManager.delete(`user:${userId}`);
  }, [invalidateCache]);

  /**
   * Remove a user and invalidate cache
   */
  const removeUser = useCallback((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
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

  const value = {
    // User state
    users,
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

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;