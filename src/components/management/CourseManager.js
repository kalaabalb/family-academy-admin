import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import coursesApi from '../../api/courses';
import categoriesApi from '../../api/categories';
import teachersApi from '../../api/teachers';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Category as CategoryIcon,
  Person,
  CheckCircle,
  Close,
  Save,
  Lock,
  Assignment,
} from '@mui/icons-material';

const CourseManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

  // For teacher selection in assign form
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const promises = [
        coursesApi.getAllCourses(),
        categoriesApi.getAllCategories(),
      ];

      if (isAdmin()) {
        promises.push(teachersApi.getAllTeachers());
      }

      const [coursesRes, categoriesRes, teachersRes] = await Promise.all(promises);
      
      setCourses(coursesRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
      
      if (teachersRes) {
        setTeachers(teachersRes.data.data || []);
      }
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [showError, isAdmin]);

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
    if (isAdmin()) return courses;
    if (isTeacher()) {
      const assignedIds = getAssignedCourseIds();
      return courses.filter(course => assignedIds.includes(course.id));
    }
    return [];
  }, [isAdmin, isTeacher, courses, getAssignedCourseIds]);

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
      } else {
        setAssignedTeacherIds([]);
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

      setLoading(true);

      const courseData = {
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id),
        description: formData.description || null,
      };

      if (isEditing && selectedCourse) {
        await coursesApi.updateCourse(selectedCourse.id, courseData);
        showSuccess('Course updated successfully');
      } else {
        await coursesApi.createCourse(courseData);
        showSuccess('Course created successfully');
      }

      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save course:', err);
      showError(err.response?.data?.message || 'Failed to save course');
    } finally {
      setLoading(false);
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

      setLoading(true);

      // For each teacher, assign to course
      for (const teacherId of assignFormData.teacher_ids) {
        await coursesApi.assignTeacher(assignFormData.course_id, teacherId);
      }
      
      showSuccess('Teachers assigned successfully');
      setAssignFormOpen(false);
      resetAssignForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to assign teachers:', err);
      showError(err.response?.data?.message || 'Failed to assign teachers');
    } finally {
      setLoading(false);
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
      setLoading(true);
      await coursesApi.deleteCourse(selectedCourse.id);
      
      setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
      
      showSuccess(`Course "${selectedCourse.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedCourse(null);
      
    } catch (err) {
      console.error('Failed to delete course:', err);
      showError(err.response?.data?.message || 'Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Course Name',
      flex: 1.5,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
          {row.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {row.description.substring(0, 60)}...
            </Typography>
          )}
          {isTeacher() && (
            <Chip
              label="Assigned to you"
              size="small"
              color="success"
              variant="outlined"
              sx={{ mt: 0.5, height: 20 }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 150,
    },
    {
      field: 'chapter_count',
      headerName: 'Chapters',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color={value > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'exam_count',
      headerName: 'Exams',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color={value > 0 ? 'secondary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'teacher_count',
      headerName: 'Teachers',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color={value > 0 ? 'success' : 'default'}
          variant="outlined"
          icon={<Person fontSize="small" />}
        />
      ),
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
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(row)}
                    color="primary"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Course">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(row)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
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
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Course Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isAdmin() 
              ? 'Create and manage courses under categories'
              : 'Manage your assigned courses'}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Assign Teachers
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
          <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Courses Table */}
      <DataTable
        columns={columns}
        data={filteredCourses}
        loading={loading}
        onRefresh={fetchData}
        title={`Courses`}
        tableId="courses-table"
        searchable={true}
        pagination={true}
        rowKey="id"
      />

      {/* Add/Edit Course Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !loading && setFormOpen(false)}
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
              onClick={() => !loading && setFormOpen(false)}
              size="small"
              disabled={loading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Course Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter course name"
                disabled={loading}
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
                  disabled={loading}
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
              <TextField
                fullWidth
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                placeholder="Enter course description..."
                disabled={loading}
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
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim() || !formData.category_id}
            startIcon={<Save />}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Teachers Dialog (Admin Only) */}
      {isAdmin() && (
        <Dialog
          open={assignFormOpen}
          onClose={() => !loading && setAssignFormOpen(false)}
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
                onClick={() => !loading && setAssignFormOpen(false)}
                size="small"
                disabled={loading}
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
                    disabled={loading}
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
                  <Typography variant="subtitle2" gutterBottom>
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
                              disabled={loading}
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
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAssignTeachers}
              disabled={loading || !assignFormData.course_id || assignFormData.teacher_ids.length === 0}
              startIcon={<Assignment />}
              sx={{ borderRadius: 2 }}
            >
              {loading ? 'Assigning...' : 'Assign Selected Teachers'}
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
        loading={loading}
      />
    </Box>
  );
};

export default CourseManager;