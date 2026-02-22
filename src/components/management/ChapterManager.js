import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import chaptersApi from '../../api/chapters';
import categoriesApi from '../../api/categories';
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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Lock,
  LockOpen,
  Close,
  Save,
} from '@mui/icons-material';

const ChapterManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [chapters, setChapters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    status: 'locked',
    release_date: '',
  });

  // For cascading dropdowns
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch chapters
      const params = {};
      if (isTeacher()) {
        params.created_by = user.id;
      }
      
      const chaptersRes = await chaptersApi.getAllChapters(params);
      setChapters(chaptersRes.data.data || []);
      
      // Fetch categories
      const categoriesRes = await categoriesApi.getAllCategories();
      setCategories(categoriesRes.data.data || []);
      
      // Fetch courses
      const coursesRes = await coursesApi.getAllCourses();
      setCourses(coursesRes.data.data || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load chapters');
      showError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    if (categoryId) {
      const filtered = courses.filter(course => 
        course.category_id === parseInt(categoryId)
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
    setFormData(prev => ({ ...prev, course_id: '' }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      course_id: '',
      status: 'locked',
      release_date: '',
    });
    setSelectedCategoryId('');
    setFilteredCourses([]);
    setIsEditing(false);
    setSelectedChapter(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (!formData.name.trim()) {
        showError('Chapter name is required');
        setLoading(false);
        return;
      }

      if (!formData.course_id) {
        showError('Please select a course');
        setLoading(false);
        return;
      }

      // Teachers can only create locked chapters
      const chapterStatus = isTeacher() ? 'locked' : formData.status;

      const chapterData = {
        name: formData.name.trim(),
        course_id: parseInt(formData.course_id),
        status: chapterStatus,
        release_date: formData.release_date || null,
      };

      if (isEditing && selectedChapter) {
        // Teachers can only update chapters they created
        if (isTeacher() && selectedChapter.created_by !== user.id) {
          showError('You can only edit chapters you created');
          setLoading(false);
          return;
        }
        
        await chaptersApi.updateChapter(selectedChapter.id, chapterData);
        showSuccess('Chapter updated successfully');
      } else {
        await chaptersApi.createChapter(chapterData);
        showSuccess('Chapter created successfully');
      }
      
      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save chapter:', err);
      showError(err.response?.data?.message || 'Failed to save chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (chapter) => {
    // Check if teacher can edit
    if (isTeacher() && chapter.created_by !== user.id) {
      showError('You can only edit chapters you created');
      return;
    }

    setSelectedChapter(chapter);
    setIsEditing(true);
    
    // Find category for this chapter
    const course = courses.find(c => c.id === chapter.course_id);
    if (course) {
      setSelectedCategoryId(course.category_id.toString());
      const filtered = courses.filter(c => c.category_id === course.category_id);
      setFilteredCourses(filtered);
    }
    
    setFormData({
      name: chapter.name || '',
      course_id: chapter.course_id?.toString() || '',
      status: chapter.status || 'locked',
      release_date: chapter.release_date ? chapter.release_date.slice(0, 16) : '',
    });
    
    setFormOpen(true);
  };

  const handleDelete = (chapter) => {
    // Check if teacher can delete
    if (isTeacher() && chapter.created_by !== user.id) {
      showError('You can only delete chapters you created');
      return;
    }
    
    setSelectedChapter(chapter);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedChapter) return;

    try {
      setLoading(true);
      await chaptersApi.deleteChapter(selectedChapter.id);
      
      // Optimistic update
      setChapters(prev => prev.filter(c => c.id !== selectedChapter.id));
      
      showSuccess(`Chapter "${selectedChapter.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedChapter(null);
      
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      showError(err.response?.data?.message || 'Failed to delete chapter');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'name',
      headerName: 'Chapter Name',
      flex: 1,
      render: (value, row) => (
        <Typography variant="body2" fontWeight="500">
          {value}
        </Typography>
      ),
    },
    {
      field: 'course_name',
      headerName: 'Course',
      width: 150,
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => (
        <Chip
          label={value === 'free' ? 'Free' : 'Locked'}
          size="small"
          color={value === 'free' ? 'success' : 'warning'}
          variant="outlined"
          icon={value === 'free' ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
        />
      ),
    },
    {
      field: 'video_count',
      headerName: 'Videos',
      width: 90,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color="info"
          variant="outlined"
        />
      ),
    },
    {
      field: 'note_count',
      headerName: 'Notes',
      width: 90,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color="secondary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'question_count',
      headerName: 'Questions',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color="primary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 120,
      render: (value) => (
        <Typography variant="caption">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.created_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit Chapter">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(row)}
                  color="primary"
                  disabled={!canEdit}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Delete Chapter">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(row)}
                  color="error"
                  disabled={!canEdit}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

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
            Chapters Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isAdmin() ? 'Manage all chapters across all courses' : 'Manage chapters in your courses'}
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
              Add Chapter
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

      {/* Chapters Table */}
      <DataTable
        columns={columns}
        data={chapters}
        loading={loading}
        onRefresh={fetchData}
        title={`Chapters`}
        tableId="chapters-table"
        searchable={true}
        pagination={true}
        rowKey="id"
      />

      {/* Add/Edit Chapter Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !loading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Chapter' : 'Add New Chapter'}
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
                label="Chapter Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter chapter title"
                disabled={loading}
              />
            </Grid>

            {isAdmin() && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    label="Category"
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
            )}

            <Grid item xs={12} md={isAdmin() ? 6 : 12}>
              <FormControl fullWidth>
                <InputLabel>Course *</InputLabel>
                <Select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  label="Course *"
                  disabled={loading || (isAdmin() && !selectedCategoryId)}
                >
                  <MenuItem value="">Select Course</MenuItem>
                  {(isAdmin() ? filteredCourses : courses).map(course => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {isAdmin() && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                    disabled={loading}
                  >
                    <MenuItem value="locked">Locked (Requires subscription)</MenuItem>
                    <MenuItem value="free">Free (Available to all users)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {isAdmin() && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Release Date (Optional)"
                  name="release_date"
                  type="datetime-local"
                  value={formData.release_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                />
              </Grid>
            )}

            {isTeacher() && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography variant="body2">
                    Note: Teachers can only create locked chapters. Admin must set chapters as free.
                  </Typography>
                </Alert>
              </Grid>
            )}
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
            disabled={loading || !formData.name.trim() || !formData.course_id}
            startIcon={<Save />}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Chapter' : 'Create Chapter')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Chapter"
        message={`Are you sure you want to delete chapter "${selectedChapter?.name}"? 
        This will also delete all associated content (videos, notes, questions).`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />
    </Box>
  );
};

export default ChapterManager;