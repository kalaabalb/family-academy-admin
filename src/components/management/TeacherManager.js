import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import teachersApi from '../../api/teachers';
import coursesApi from '../../api/courses';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  CircularProgress,
  InputAdornment,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Card,
  CardContent,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Person,
  LockReset,
  School,
  Book,
  Visibility,
  VisibilityOff,
  Close,
  Save,
  CheckCircle,
  Cancel,
  Email,
  Phone,
  CalendarToday,
  VpnKey,
  Assignment,
  Group,
} from '@mui/icons-material';

const TeacherManager = () => {
  const { isAdmin, user } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    status: 'active',
    course_ids: [],
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [teachersRes, coursesRes] = await Promise.all([
        teachersApi.getAllTeachers(),
        coursesApi.getAllCourses(),
      ]);
      
      setTeachers(teachersRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCourseToggle = (courseId) => {
    setFormData(prev => {
      const currentIds = [...prev.course_ids];
      const index = currentIds.indexOf(courseId);
      
      if (index === -1) {
        currentIds.push(courseId);
      } else {
        currentIds.splice(index, 1);
      }
      
      return { ...prev, course_ids: currentIds };
    });
  };

  const handleSelectAllCourses = () => {
    if (formData.course_ids.length === courses.length) {
      setFormData(prev => ({ ...prev, course_ids: [] }));
    } else {
      setFormData(prev => ({ ...prev, course_ids: courses.map(c => c.id) }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      status: 'active',
      course_ids: [],
    });
    setIsEditing(false);
    setSelectedTeacher(null);
    setShowPassword(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showError('Teacher name is required');
      return false;
    }

    if (!formData.username.trim()) {
      showError('Username is required');
      return false;
    }

    // Check username format (alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      showError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    if (!isEditing && !formData.password) {
      showError('Password is required for new teachers');
      return false;
    }

    if (formData.password && formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      return false;
    }

    // Check if username already exists
    const usernameExists = teachers.some(
      teacher => teacher.username === formData.username.trim() && 
      (!selectedTeacher || teacher.id !== selectedTeacher.id)
    );
    
    if (usernameExists) {
      showError('Username already exists. Please choose a different username.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const teacherData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        status: formData.status,
        course_ids: formData.course_ids,
      };

      if (!isEditing && formData.password) {
        teacherData.password = formData.password;
      }

      if (isEditing && selectedTeacher) {
        await teachersApi.updateTeacher(selectedTeacher.id, teacherData);
        showSuccess('Teacher updated successfully');
      } else {
        await teachersApi.createTeacher(teacherData);
        showSuccess('Teacher created successfully');
      }

      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save teacher:', err);
      showError(err.response?.data?.message || 'Failed to save teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsEditing(true);
    
    // Parse assigned course IDs
    let assignedCourses = [];
    if (teacher.assigned_course_ids && Array.isArray(teacher.assigned_course_ids)) {
      assignedCourses = teacher.assigned_course_ids;
    } else if (teacher.assigned_courses) {
      assignedCourses = teacher.assigned_courses.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }
    
    setFormData({
      name: teacher.name || '',
      username: teacher.username || '',
      password: '', // Leave empty for edit
      status: teacher.status || 'active',
      course_ids: assignedCourses,
    });
    
    setFormOpen(true);
  };

  const handleResetPassword = (teacher) => {
    setSelectedTeacher(teacher);
    setResetPasswordData({
      new_password: '',
      confirm_password: '',
    });
    setResetPasswordOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedTeacher || !resetPasswordData.new_password) return;

    if (resetPasswordData.new_password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      showError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await teachersApi.resetTeacherPassword(selectedTeacher.id, {
        new_password: resetPasswordData.new_password,
      });
      
      showSuccess('Password reset successfully');
      setResetPasswordOpen(false);
      setSelectedTeacher(null);
      
    } catch (err) {
      console.error('Failed to reset password:', err);
      showError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (teacher) => {
    setSelectedTeacher(teacher);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTeacher) return;

    try {
      setLoading(true);
      await teachersApi.deleteTeacher(selectedTeacher.id);
      
      setTeachers(prev => prev.filter(t => t.id !== selectedTeacher.id));
      
      showSuccess(`Teacher "${selectedTeacher.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedTeacher(null);
      
    } catch (err) {
      console.error('Failed to delete teacher:', err);
      showError(err.response?.data?.message || 'Failed to delete teacher');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          #{value}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Teacher Name',
      flex: 1,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
            {value?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{row.username}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => (
        <Chip
          label={value === 'active' ? 'Active' : 'Inactive'}
          size="small"
          color={value === 'active' ? 'success' : 'default'}
          variant="outlined"
          icon={value === 'active' ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
        />
      ),
    },
    {
      field: 'course_count',
      headerName: 'Courses',
      width: 100,
      render: (value, row) => (
        <Chip
          label={value || 0}
          size="small"
          color={value > 0 ? 'primary' : 'default'}
          variant="outlined"
          icon={<Book fontSize="small" />}
        />
      ),
    },
    {
      field: 'assigned_course_names',
      headerName: 'Assigned Courses',
      flex: 1,
      render: (value) => (
        <Typography variant="caption" color="text.secondary">
          {value || 'No courses assigned'}
        </Typography>
      ),
    },
    {
      field: 'last_active',
      headerName: 'Last Active',
      width: 130,
      render: (value) => (
        <Typography variant="caption" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 120,
      render: (value) => (
        <Typography variant="caption" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      render: (value, row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Teacher">
            <IconButton
              size="small"
              onClick={() => handleEdit(row)}
              color="primary"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Password">
            <IconButton
              size="small"
              onClick={() => handleResetPassword(row)}
              color="warning"
            >
              <LockReset fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Teacher">
            <IconButton
              size="small"
              onClick={() => handleDelete(row)}
              color="error"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access teacher management.
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
            Teacher Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, edit, and manage teacher accounts and course assignments
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
            Add Teacher
          </Button>
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

      {/* Teachers Table */}
      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        onRefresh={fetchData}
        title={`Teachers`}
        tableId="teachers-table"
        searchable={true}
        pagination={true}
        rowKey="id"
      />

      {/* Add/Edit Teacher Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !loading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Teacher' : 'Add New Teacher'}
            </Typography>
            <IconButton
              onClick={() => {
                if (!loading) {
                  setFormOpen(false);
                  resetForm();
                }
              }}
              size="small"
              disabled={loading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username *"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={loading || isEditing}
                helperText={isEditing ? "Username cannot be changed" : "Letters, numbers, underscores"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKey />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {!isEditing && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password *"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  helperText="Minimum 6 characters"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockReset />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            {isEditing && (
              <Grid item xs={12}>
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                  Leave password field blank to keep current password. 
                  Use "Reset Password" action to change password.
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                  disabled={loading}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Course Assignments
                </Typography>
                <Button
                  size="small"
                  onClick={handleSelectAllCourses}
                  disabled={loading || courses.length === 0}
                >
                  {formData.course_ids.length === courses.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                {courses.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" py={2}>
                    No courses available. Create courses first.
                  </Typography>
                ) : (
                  <FormGroup>
                    {courses.map(course => (
                      <FormControlLabel
                        key={course.id}
                        control={
                          <Checkbox
                            checked={formData.course_ids.includes(course.id)}
                            onChange={() => handleCourseToggle(course.id)}
                            disabled={loading}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">
                              {course.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {course.category_name}
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 1, display: 'flex', alignItems: 'center' }}
                      />
                    ))}
                  </FormGroup>
                )}
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Selected: {formData.course_ids.length} course(s)
              </Typography>
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
            disabled={
              loading || 
              !formData.name.trim() || 
              !formData.username.trim() ||
              (!isEditing && !formData.password)
            }
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Create Teacher')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordOpen}
        onClose={() => !loading && setResetPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Reset Password for {selectedTeacher?.name}
            </Typography>
            <IconButton
              onClick={() => {
                if (!loading) {
                  setResetPasswordOpen(false);
                  setResetPasswordData({ new_password: '', confirm_password: '' });
                }
              }}
              size="small"
              disabled={loading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password *"
                type="password"
                value={resetPasswordData.new_password}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                required
                helperText="Minimum 6 characters"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm Password *"
                type="password"
                value={resetPasswordData.confirm_password}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                required
                error={resetPasswordData.new_password !== resetPasswordData.confirm_password}
                helperText={
                  resetPasswordData.new_password !== resetPasswordData.confirm_password
                    ? "Passwords do not match"
                    : "Re-enter the new password"
                }
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setResetPasswordOpen(false);
              setResetPasswordData({ new_password: '', confirm_password: '' });
            }}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmResetPassword}
            disabled={
              loading ||
              !resetPasswordData.new_password ||
              !resetPasswordData.confirm_password ||
              resetPasswordData.new_password.length < 6 ||
              resetPasswordData.new_password !== resetPasswordData.confirm_password
            }
            startIcon={loading ? <CircularProgress size={20} /> : <LockReset />}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete teacher "${selectedTeacher?.name}"? All their content will be reassigned to admin.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />
    </Box>
  );
};

export default TeacherManager;