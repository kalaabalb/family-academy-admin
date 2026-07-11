import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import coursesApi from '../../api/courses';
import categoriesApi from '../../api/categories';
import teachersApi from '../../api/teachers';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import {
  renderCountChip,
  renderPrimaryCell,
  renderTableChip,
  renderTableId,
} from '../common/tableFormatters';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { TrainLoadingBar } from '../common/Loading';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Category as CategoryIcon,
  Person,
  Close,
  Save,
  Lock,
  Assignment,
  Search,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const CourseManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
  });
  
  const [assignFormData, setAssignFormData] = useState({
    course_id: '',
    teacher_ids: [],
  });

  const getFriendlyFormError = (error, fallback, duplicateMessage = null) => {
    const rawMessage = String(error?.response?.data?.message || error?.message || '');
    if (duplicateMessage && /already exists|duplicate entry|unique constraint/i.test(rawMessage)) {
      return duplicateMessage;
    }
    return error?.userMessage || error?.response?.data?.message || fallback;
  };

  // For teacher selection in assign form
  const [assignedTeacherIds, setAssignedTeacherIds] = useState([]);

  // Cache keys
  const coursesCacheKey = 'courses';
  const categoriesCacheKey = 'categories';
  const teachersCacheKey = 'teachers';

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const coursesData = await getCachedData(
        coursesCacheKey,
        () => coursesApi.getAllCourses(),
        { forceRefresh }
      );
      
      const categoriesData = await getCachedData(
        categoriesCacheKey,
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      setCourses(coursesData || []);
      setCategories(categoriesData || []);
      
      if (isAdmin()) {
        const teachersData = await getCachedData(
          teachersCacheKey,
          () => teachersApi.getAllTeachers(),
          { forceRefresh }
        );
        setTeachers(teachersData || []);
      }
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, isAdmin, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Get assigned courses for teacher
  const getAssignedCourseIds = useCallback(() => {
    if (isTeacher() && user?.assigned_courses) {
      return user.assigned_courses;
    }
    return [];
  }, [isTeacher, user]);

  // Check if teacher can edit this course
  const canEditCourse = useCallback((courseId) => {
    if (isAdmin()) return true;
    if (isTeacher()) {
      const assignedIds = getAssignedCourseIds();
      return assignedIds.includes(courseId);
    }
    return false;
  }, [isAdmin, isTeacher, getAssignedCourseIds]);

  // Filter courses for teacher view
  const getFilteredCourses = useCallback(() => {
    let filtered = isAdmin() ? courses : courses.filter(course => getAssignedCourseIds().includes(course.id));
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(query) ||
        (course.description && course.description.toLowerCase().includes(query)) ||
        (course.category_name && course.category_name.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [isAdmin, courses, getAssignedCourseIds, searchQuery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData(prev => ({ ...prev, [name]: value }));
    
    // When course changes, load its assigned teachers
    if (name === 'course_id' && value) {
      const course = courses.find(c => c.id === parseInt(value));
      if (course && course.assigned_teacher_ids) {
        setAssignedTeacherIds(course.assigned_teacher_ids);
        setAssignFormData(prev => ({ ...prev, teacher_ids: course.assigned_teacher_ids }));
      } else {
        setAssignedTeacherIds([]);
        setAssignFormData(prev => ({ ...prev, teacher_ids: [] }));
      }
    }
  };

  const handleTeacherToggle = (teacherId) => {
    setAssignFormData(prev => {
      const currentIds = [...prev.teacher_ids];
      const index = currentIds.indexOf(teacherId);
      
      if (index === -1) {
        currentIds.push(teacherId);
      } else {
        currentIds.splice(index, 1);
      }
      
      return { ...prev, teacher_ids: currentIds };
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      description: '',
    });
    setIsEditing(false);
    setSelectedCourse(null);
  };

  const resetAssignForm = () => {
    setAssignFormData({
      course_id: '',
      teacher_ids: [],
    });
    setAssignedTeacherIds([]);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        showError('Course name is required');
        return;
      }

      if (!formData.category_id) {
        showError('Please select a category');
        return;
      }

      // Check permissions for editing
      if (isEditing && selectedCourse && !canEditCourse(selectedCourse.id)) {
        showError('You do not have permission to edit this course');
        return;
      }

      setActionLoading(true);

      const courseData = {
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id),
        description: formData.description || null,
      };

      if (isEditing && selectedCourse) {
        await coursesApi.updateCourse(selectedCourse.id, courseData);
        showSuccess('Course updated successfully');
        
        // Invalidate caches
        invalidateCache(coursesCacheKey);
        invalidateCache(/^teachers/);
      } else {
        await coursesApi.createCourse(courseData);
        showSuccess('Course created successfully');
        
        // Invalidate caches
        invalidateCache(coursesCacheKey);
      }

      setFormOpen(false);
      resetForm();
      await fetchData(true);
      
    } catch (err) {
      devError('Failed to save course:', err);
      showError(getFriendlyFormError(err, 'Failed to save course', 'A course with that name already exists in this category.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTeachers = async () => {
    try {
      if (!assignFormData.course_id) {
        showError('Please select a course');
        return;
      }

      if (assignFormData.teacher_ids.length === 0) {
        showError('Please select at least one teacher');
        return;
      }

      setActionLoading(true);

      // For each teacher, assign to course
      for (const teacherId of assignFormData.teacher_ids) {
        await coursesApi.assignTeacher(assignFormData.course_id, teacherId);
      }
      
      showSuccess('Teachers assigned successfully');
      
      // Invalidate caches
      invalidateCache(coursesCacheKey);
      invalidateCache(/^teachers/);
      
      setAssignFormOpen(false);
      resetAssignForm();
      await fetchData(true);
      
    } catch (err) {
      devError('Failed to assign teachers:', err);
      showError(getFriendlyFormError(err, 'Failed to assign teachers'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (course) => {
    if (!canEditCourse(course.id)) {
      showError('You do not have permission to edit this course');
      return;
    }

    setSelectedCourse(course);
    setIsEditing(true);
    setFormData({
      name: course.name || '',
      category_id: course.category_id?.toString() || '',
      description: course.description || '',
    });
    setFormOpen(true);
  };

  const handleDelete = (course) => {
    if (!canEditCourse(course.id)) {
      showError('You do not have permission to delete this course');
      return;
    }

    if (course.chapter_count > 0 || course.exam_count > 0) {
      showError('Cannot delete course with existing content. Delete chapters/exams first.');
      return;
    }

    setSelectedCourse(course);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCourse) return;

    try {
      setActionLoading(true);
      await coursesApi.deleteCourse(selectedCourse.id);
      
      // Invalidate caches
      invalidateCache(coursesCacheKey);
      invalidateCache(/^chapters/);
      invalidateCache(/^exams/);
      
      setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
      
      showSuccess(`Course "${selectedCourse.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedCourse(null);
      
    } catch (err) {
      devError('Failed to delete course:', err);
      showError(getFriendlyFormError(err, 'Failed to delete course'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => renderTableId(value),
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      render: (value, row) => renderPrimaryCell({
        primary: value,
        secondary: row.description ? `${row.description.substring(0, 60)}...` : null,
        tertiary: isTeacher() && getAssignedCourseIds().includes(row.id) ? 'Assigned To You' : null,
      }),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 150,
      render: (value) => renderTableChip(value || 'N/A', {
        color: 'primary',
        icon: <CategoryIcon fontSize="small" />,
      }),
    },
    {
      field: 'chapter_count',
      headerName: 'Chapter Count',
      width: 100,
      render: (value) => renderCountChip(value, { color: 'primary' }),
    },
    {
      field: 'exam_count',
      headerName: 'Exam Count',
      width: 100,
      render: (value) => renderCountChip(value, { color: 'secondary' }),
    },
    {
      field: 'teacher_count',
      headerName: 'Teacher Count',
      width: 100,
      render: (value) => renderCountChip(value, { color: 'success' }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      render: (value, row) => {
        const canEdit = canEditCourse(row.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit ? (
              <>
                <Tooltip title="Edit Course">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(row)}
                      color="primary"
                      disabled={actionLoading}
                      sx={{
                        opacity: actionLoading ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete Course">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(row)}
                      color="error"
                      disabled={actionLoading}
                      sx={{
                        opacity: actionLoading ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="Not assigned to you">
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled', p: 1 }}>
                  <Lock fontSize="small" />
                </Box>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  const filteredCourses = getFilteredCourses();

  if (!isAdmin() && !isTeacher()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <ManagementPageHeader
        title="Course Management"
        subtitle={
          isAdmin() 
            ? 'Create and manage courses under categories'
            : 'Manage your assigned courses'
        }
        actions={
          <>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading || actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          {(isAdmin() || isTeacher()) && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              disabled={loading || actionLoading}
              sx={{ borderRadius: 2 }}
            >
              Add Course
            </Button>
          )}
          {isAdmin() && (
            <Button
              variant="outlined"
              startIcon={<Assignment />}
              onClick={() => {
                resetAssignForm();
                setAssignFormOpen(true);
              }}
              disabled={loading || actionLoading}
              sx={{ borderRadius: 2 }}
            >
              Assign Teachers
            </Button>
          )}
          </>
        }
      />

      {/* Loading Indicator */}
      {loading && <TrainLoadingBar sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
          <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      <ManagementSearchToolbar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search courses by name or description..."
      />

      {/* Courses Table */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredCourses}
        loading={loading}
        onRefresh={handleRefresh}
        title={`Courses `}
        rowKey="id"
        searchable={false}
        defaultOrder="desc"
        defaultOrderBy="created_at"
      />

      {/* Add/Edit Course Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !actionLoading && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Course' : 'Add New Course'}
            </Typography>
            <IconButton
              onClick={() => !actionLoading && setFormOpen(false)}
              size="small"
              disabled={actionLoading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Course Name *"
                name="name"
                value={formData.name}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                delay={80}
                required
                placeholder="Enter course name"
                disabled={actionLoading}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  label="Category *"
                  disabled={actionLoading}
                >
                  <MenuItem value="">Select Category</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                delay={80}
                multiline
                rows={3}
                placeholder="Enter course description..."
                disabled={actionLoading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setFormOpen(false);
              resetForm();
            }}
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={actionLoading || !formData.name.trim() || !formData.category_id}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Teachers Dialog (Admin Only) */}
      {isAdmin() && (
        <Dialog
          open={assignFormOpen}
          onClose={() => !actionLoading && setAssignFormOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold">
                Assign Teachers to Course
              </Typography>
              <IconButton
                onClick={() => !actionLoading && setAssignFormOpen(false)}
                size="small"
                disabled={actionLoading}
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Course *</InputLabel>
                  <Select
                    name="course_id"
                    value={assignFormData.course_id}
                    onChange={handleAssignInputChange}
                    label="Course *"
                    disabled={actionLoading}
                  >
                    <MenuItem value="">Select Course</MenuItem>
                    {courses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name} ({course.category_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {assignFormData.course_id && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Select Teachers to Assign
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                    <FormGroup>
                      {teachers.map(teacher => (
                        <FormControlLabel
                          key={teacher.id}
                          control={
                            <Checkbox
                              checked={assignFormData.teacher_ids.includes(teacher.id)}
                              onChange={() => handleTeacherToggle(teacher.id)}
                              disabled={actionLoading}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{teacher.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {teacher.email || teacher.username}
                              </Typography>
                            </Box>
                          }
                          sx={{ mb: 1, display: 'flex', alignItems: 'center' }}
                        />
                      ))}
                    </FormGroup>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setAssignFormOpen(false);
                resetAssignForm();
              }}
              disabled={actionLoading}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAssignTeachers}
              disabled={actionLoading || !assignFormData.course_id || assignFormData.teacher_ids.length === 0}
              startIcon={actionLoading ? <CircularProgress size={20} /> : <Assignment />}
              sx={{ borderRadius: 2 }}
            >
              {actionLoading ? 'Assigning...' : 'Assign Selected Teachers'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Course"
        message={`Are you sure you want to delete course "${selectedCourse?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default CourseManager;
