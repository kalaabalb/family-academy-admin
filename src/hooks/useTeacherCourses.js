import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import teacherCoursesApi from '../api/teacherCourses';
import coursesApi from '../api/courses';
import { cacheManager } from '../api/utils';
import { devError, devLog } from '../utils/devLogger';

export const useTeacherCourses = () => {
  const { user } = useAuth();
  const { error: showError } = useNotification();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  
  const assignedCourseIds = user?.assigned_courses || [];
  
  const fetchCourses = useCallback(async (force = false) => {
    if (assignedCourseIds.length === 0) {
      devLog('No courses assigned to teacher');
      setCourses([]);
      return [];
    }
    
    const cacheKey = `teacher:${user?.id}:courses`;
    if (!force) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        devLog('Using cached teacher courses:', cached.length);
        setCourses(cached);
        return cached;
      }
    }
    
    setLoading(true);
    
    try {
      devLog('Fetching teacher courses, assigned IDs:', assignedCourseIds);
      
      const response = await coursesApi.getAllCourses();
      const allCourses = response.data?.data || [];
      
      const filteredCourses = allCourses.filter(course => 
        assignedCourseIds.includes(course.id)
      );
      
      devLog('Filtered courses:', filteredCourses.map(c => ({ id: c.id, name: c.name })));
      
      cacheManager.set(cacheKey, filteredCourses, 5 * 60 * 1000);
      
      setCourses(filteredCourses);
      setLastFetched(Date.now());
      return filteredCourses;
      
    } catch (err) {
      devError('Failed to fetch teacher courses:', err);
      showError('Failed to load your assigned courses');
      return [];
    } finally {
      setLoading(false);
    }
  }, [assignedCourseIds, user?.id, showError]);
  
  const getCourseById = useCallback((courseId) => {
    return courses.find(c => c.id === parseInt(courseId)) || null;
  }, [courses]);
  
  const getCourseOptions = useCallback(() => {
    return courses.map(course => ({
      value: course.id,
      label: course.name,
      category: course.category_name,
    }));
  }, [courses]);
  
  const hasCourseAccess = useCallback((courseId) => {
    return assignedCourseIds.includes(parseInt(courseId));
  }, [assignedCourseIds]);
  
  const refreshCourses = useCallback(() => {
    return fetchCourses(true);
  }, [fetchCourses]);
  
  useEffect(() => {
    if (assignedCourseIds.length > 0) {
      fetchCourses();
    }
  }, [assignedCourseIds.join(',')]);
  
  return {
    courses,
    loading,
    assignedCourseIds,
    fetchCourses,
    refreshCourses,
    getCourseById,
    getCourseOptions,
    hasCourseAccess,
    isEmpty: courses.length === 0,
  };
};
