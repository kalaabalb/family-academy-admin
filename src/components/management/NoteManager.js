import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import notesApi from '../../api/notes';
import categoriesApi from '../../api/categories';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import TiptapEditor from '../common/TiptapEditor';
import FastTextField from '../common/FastTextField';
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
  Avatar,
  Divider,
  Stack,
  CircularProgress,
  InputAdornment,
  LinearProgress,
  FormHelperText,
} from '@mui/material';
import {
  FilterList,
  Add,
  Edit,
  Delete,
  Refresh,
  Category as CategoryIcon,
  Book,
  Close,
  Save,
  Visibility,
  AccessTime,
  Search,
  MenuBook,
  Notes as NotesIcon,
  Schedule,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SchedulePicker from '../common/SchedulePicker';
import ContentAssignmentFields from '../common/ContentAssignmentFields';
import DetailRow from '../common/DetailRow';
import { devError } from '../../utils/devLogger';

const NoteManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    category_id: '',
    course_id: '',
    chapter_id: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // For cascading dropdowns in form
  const [formFilteredCourses, setFormFilteredCourses] = useState([]);
  const [formFilteredChapters, setFormFilteredChapters] = useState([]);
  
  // For cascading dropdowns in filters
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    course_id: '',
    chapter_id: '',
    release_date: null,
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const getFriendlyFormError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;

  // Cache keys
  const notesCacheKey = 'notes';
  const categoriesCacheKey = 'categories';
  const coursesCacheKey = 'courses';
  const chaptersCacheKey = 'chapters';

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      
      // Fetch notes with role-based filtering
      const params = {};
      if (isTeacher()) {
        params.created_by = user.id;
      }
      
      const notesData = await getCachedData(
        getCacheKey('notes', params),
        () => notesApi.getAllNotes(params),
        { forceRefresh }
      );
      
      const categoriesData = await getCachedData(
        categoriesCacheKey,
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      const coursesData = await getCachedData(
        coursesCacheKey,
        () => coursesApi.getAllCourses(),
        { forceRefresh }
      );
      
      const chaptersData = await getCachedData(
        chaptersCacheKey,
        () => chaptersApi.getAllChapters(),
        { forceRefresh }
      );
      
      // FIX: Filter courses for teachers based on assigned_courses
      let filteredCoursesData = coursesData || [];
      let filteredCategoriesData = categoriesData || [];
      
      if (isTeacher()) {
        const assignedCourseIds = user?.assigned_courses || [];
        
        filteredCoursesData = coursesData.filter(course => 
          assignedCourseIds.includes(course.id)
        );
        
        // Filter categories to only show those with accessible courses
        const accessibleCategoryIds = new Set(
          filteredCoursesData.map(c => c.category_id)
        );
        filteredCategoriesData = categoriesData.filter(cat => 
          accessibleCategoryIds.has(cat.id)
        );
      }
      
      setCategories(filteredCategoriesData || []);
      setCourses(filteredCoursesData || []);
      setChapters(chaptersData || []);
      
      // Enrich notes with course and category names
      const enrichedNotes = (notesData || []).map(note => {
        const chapter = (chaptersData || []).find(ch => ch.id === note.chapter_id);
        const course = chapter ? (coursesData || []).find(c => c.id === chapter.course_id) : null;
        const category = course ? (categoriesData || []).find(c => c.id === course.category_id) : null;
        return {
          ...note,
          chapter_name: chapter?.name || 'Unknown Chapter',
          course_name: course?.name || 'Unknown Course',
          category_name: category?.name || 'Unknown Category',
          release_date: note.release_date || null,
        };
      });
      
      setNotes(enrichedNotes);
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load notes');
      showError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, getCachedData, getCacheKey, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Update filtered courses and chapters when filters change
  useEffect(() => {
    // FIX: Use filtered courses based on teacher's assignments
    let availableCourses = courses;
    
    if (isTeacher()) {
      const assignedCourseIds = user?.assigned_courses || [];
      availableCourses = courses.filter(course => 
        assignedCourseIds.includes(course.id)
      );
    }
    
    if (filters.category_id) {
      const filtered = availableCourses.filter(course => 
        course.category_id === parseInt(filters.category_id)
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
  }, [filters.category_id, courses, isTeacher, user]);

  useEffect(() => {
    if (filters.course_id) {
      const filtered = chapters.filter(chapter => 
        chapter.course_id === parseInt(filters.course_id)
      );
      setFilteredChapters(filtered);
    } else {
      setFilteredChapters([]);
    }
  }, [filters.course_id, chapters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent filters
      if (name === 'category_id') {
        newFilters.course_id = '';
        newFilters.chapter_id = '';
      }
      if (name === 'course_id') {
        newFilters.chapter_id = '';
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      category_id: '',
      course_id: '',
      chapter_id: '',
    });
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, release_date: date }));
  };

  const handleContentChange = (content) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category_id: '',
      course_id: '',
      chapter_id: '',
      release_date: null,
    });
    setScheduleEnabled(false);
    setIsEditing(false);
    setSelectedNote(null);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Note title is required');
      return false;
    }
    
    const cleanContent = formData.content?.replace(/<[^>]*>/g, '').trim();
    if (!cleanContent) {
      showError('Note content is required');
      return false;
    }
    
    if (!formData.chapter_id) {
      showError('Please select a chapter');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setActionLoading(true);
      
      const noteData = {
        title: formData.title.trim(),
        content: formData.content,
        chapter_id: parseInt(formData.chapter_id),
      };
      
      // FIX: Add release_date if provided (for scheduling)
      if (formData.release_date) {
        noteData.release_date = formData.release_date.toISOString();
      }
      
      if (isEditing && selectedNote) {
        if (isTeacher() && selectedNote.created_by !== user.id) {
          showError('You can only edit notes you created');
          setActionLoading(false);
          return;
        }
        
        await notesApi.updateNote(selectedNote.id, noteData);
        showSuccess('Note updated successfully!');
        
        invalidateCache(/^notes/);
        invalidateCache(chaptersCacheKey);
      } else {
        await notesApi.createNote(noteData);
        showSuccess('Note created successfully!');
        
        invalidateCache(/^notes/);
        invalidateCache(chaptersCacheKey);
      }
      
      setFormOpen(false);
      resetForm();
      await fetchData(true);
      
    } catch (err) {
      devError('Failed to save note:', err);
      showError(getFriendlyFormError(err, 'Failed to save note'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (note) => {
    if (isTeacher() && note.created_by !== user.id) {
      showError('You can only edit notes you created');
      return;
    }

    setSelectedNote(note);
    setIsEditing(true);
    
    const chapter = chapters.find(ch => ch.id === note.chapter_id);
    if (chapter) {
      const course = courses.find(c => c.id === chapter.course_id);
      if (course) {
        setFormData(prev => ({ ...prev, category_id: course.category_id?.toString() || '' }));
        const filteredCourses = courses.filter(c => c.category_id === course.category_id);
        setFormFilteredCourses(filteredCourses);
        
        setFormData(prev => ({ ...prev, course_id: course.id?.toString() || '' }));
        const filteredChapters = chapters.filter(ch => ch.course_id === course.id);
        setFormFilteredChapters(filteredChapters);
      }
    }
    
    setFormData({
      title: note.title || '',
      content: note.content || '',
      category_id: note.category_id?.toString() || '',
      course_id: note.course_id?.toString() || '',
      chapter_id: note.chapter_id?.toString() || '',
      release_date: note.release_date ? new Date(note.release_date) : null,
    });
    setScheduleEnabled(!!note.release_date);
    
    setFormOpen(true);
  };

  const handlePreview = (note) => {
    setPreviewNote(note);
    setPreviewOpen(true);
  };

  const handleDelete = (note) => {
    if (isTeacher() && note.created_by !== user.id) {
      showError('You can only delete notes you created');
      return;
    }
    
    setSelectedNote(note);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedNote) return;

    try {
      setActionLoading(true);
      await notesApi.deleteNote(selectedNote.id);
      
      invalidateCache(/^notes/);
      invalidateCache(chaptersCacheKey);
      
      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      
      showSuccess(`Note "${selectedNote.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedNote(null);
      
    } catch (err) {
      devError('Failed to delete note:', err);
      showError(getFriendlyFormError(err, 'Failed to delete note'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Filter notes based on filters and search
  const filteredNotes = useMemo(() => notes.filter(note => {
    if (filters.category_id && note.category_id !== parseInt(filters.category_id)) return false;
    if (filters.course_id && note.course_id !== parseInt(filters.course_id)) return false;
    if (filters.chapter_id && note.chapter_id !== parseInt(filters.chapter_id)) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        (note.content && note.content.toLowerCase().includes(query)) ||
        (note.category_name && note.category_name.toLowerCase().includes(query)) ||
        (note.course_name && note.course_name.toLowerCase().includes(query))
      );
    }
    
    return true;
  }), [notes, filters.category_id, filters.course_id, filters.chapter_id, searchQuery]);

  const columns = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      render: (value) => (
        <Typography variant="body2" fontWeight="medium">
          {value}
        </Typography>
      ),
    },
    {
      field: 'chapter_name',
      headerName: 'Chapter',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Chapter'}
        </Typography>
      ),
    },
    {
      field: 'course_name',
      headerName: 'Course',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Course'}
        </Typography>
      ),
    },
    {
      field: 'created_by_name',
      headerName: 'Created By',
      width: 170,
      render: (value) => (
        <Typography variant="body2" color="text.primary">
          {value || 'Unknown'}
        </Typography>
      ),
    },
    {
      field: 'release_date',
      headerName: 'Release Date',
      width: 130,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value ? new Date(value).toLocaleString() : 'Immediate'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 120,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.created_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Preview Note">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handlePreview(row)}
                  color="info"
                  disabled={actionLoading}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Edit Note">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(row)}
                      color="primary"
                      disabled={actionLoading}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete Note">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(row)}
                      color="error"
                      disabled={actionLoading}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Box>
        );
      },
    },
  ], [actionLoading, handleDelete, handleEdit, handlePreview, isAdmin, isTeacher, user?.id]);

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Notes Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage study notes with scheduling
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading || actionLoading}
              sx={{ borderRadius: 2 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
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
                Create Note
              </Button>
            )}
          </Stack>
        </Box>

        {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
            <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <FastTextField
            fullWidth
            size="small"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onDebouncedChange={(v) => setSearchQuery(v)}
            delay={120}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {showFilters && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Filter Notes
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category_id"
                    value={filters.category_id}
                    onChange={handleFilterChange}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Course</InputLabel>
                  <Select
                    name="course_id"
                    value={filters.course_id}
                    onChange={handleFilterChange}
                    label="Course"
                    disabled={!filters.category_id}
                  >
                    <MenuItem value="">All Courses</MenuItem>
                    {filteredCourses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Chapter</InputLabel>
                  <Select
                    name="chapter_id"
                    value={filters.chapter_id}
                    onChange={handleFilterChange}
                    label="Chapter"
                    disabled={!filters.course_id}
                  >
                    <MenuItem value="">All Chapters</MenuItem>
                    {filteredChapters.map(chapter => (
                      <MenuItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    size="small"
                  >
                    Clear Filters
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        <DataTable
          showToolbar={false}
          columns={columns}
          data={filteredNotes}
          loading={loading}
          onRefresh={handleRefresh}
          title={`Notes `}
          rowKey="id"
        />

        <Dialog
          open={formOpen}
          onClose={() => !actionLoading && setFormOpen(false)}
          keepMounted
          disableRestoreFocus
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5 } }}
        >
          <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography component="div" variant="h6" fontWeight="bold">
                {isEditing ? 'Edit Note' : 'Create New Note'}
              </Typography>
              <IconButton
                onClick={() => {
                  if (!actionLoading) {
                    setFormOpen(false);
                    resetForm();
                  }
                }}
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
                  label="Note Title *"
                  name="title"
                  value={formData.title}
                  onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                  delay={80}
                  required
                  disabled={actionLoading}
                />
              </Grid>

              <ContentAssignmentFields
                categories={categories}
                courses={courses}
                chapters={chapters}
                values={formData}
                onChange={handleAssignmentChange}
                disabled={actionLoading}
                showCategory
                showCourse
                showChapter
              />

              <Grid item xs={12}>
                <SchedulePicker
                  enabled={scheduleEnabled}
                  onEnabledChange={(enabled) => {
                    setScheduleEnabled(enabled);
                    if (!enabled) {
                      handleDateChange(null);
                    }
                  }}
                  value={formData.release_date}
                  onChange={handleDateChange}
                  label="Release Date"
                  helperText="Pick when this note should become visible"
                  disabled={actionLoading}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Content *
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? 3 : 1,
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'divider',
                    p: 1,
                  }}
                >
                  <TiptapEditor
                    value={formData.content}
                    onChange={handleContentChange}
                    placeholder="Start writing your note content here..."
                    height={560}
                    readOnly={actionLoading}
                  />
                </Paper>
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
              disabled={
                actionLoading || 
                !formData.title.trim() || 
                !formData.chapter_id ||
                !formData.content?.replace(/<[^>]*>/g, '').trim()
              }
              startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
              sx={{ borderRadius: 2 }}
            >
              {actionLoading ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          keepMounted
          disableRestoreFocus
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography component="div" variant="h6" fontWeight="bold">
                {previewNote?.title}
              </Typography>
              <IconButton onClick={() => setPreviewOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers sx={{ p: 3 }}>
            {previewNote && (
              <Box>
                <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <DetailRow label="Category" value={previewNote.category_name || 'N/A'} align="flex-start" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DetailRow label="Course" value={previewNote.course_name || 'N/A'} align="flex-start" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DetailRow label="Chapter" value={previewNote.chapter_name || 'N/A'} align="flex-start" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DetailRow
                        label="Created"
                        value={previewNote.created_at ? new Date(previewNote.created_at).toLocaleString() : 'N/A'}
                        align="flex-start"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DetailRow label="Created By" value={previewNote.created_by_name || 'Unknown'} align="flex-start" />
                    </Grid>
                    {previewNote.release_date && (
                      <Grid item xs={12} md={4}>
                        <DetailRow
                          label="Release Date"
                          value={new Date(previewNote.release_date).toLocaleString()}
                          align="flex-start"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
                
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
                    minHeight: 300,
                    maxHeight: 500,
                    overflow: 'auto',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? 3 : 1,
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'divider',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: previewNote.content || '' }} />
                </Paper>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setPreviewOpen(false)}
              sx={{ borderRadius: 2 }}
            >
              Close
            </Button>
            {(isAdmin() || (isTeacher() && previewNote?.created_by === user?.id)) && (
              <Button
                variant="contained"
                onClick={() => {
                  setPreviewOpen(false);
                  handleEdit(previewNote);
                }}
                startIcon={<Edit />}
                sx={{ borderRadius: 2 }}
              >
                Edit Note
              </Button>
            )}
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Note"
          message={`Are you sure you want to delete the note "${selectedNote?.title}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          severity="error"
          loading={actionLoading}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default NoteManager;
