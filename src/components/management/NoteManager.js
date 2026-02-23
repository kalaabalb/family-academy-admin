import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import notesApi from '../../api/notes';
import categoriesApi from '../../api/categories';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import RichTextEditor from '../common/RichTextEditor';
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
} from '@mui/material';
import {
  FilterList,
  Add,
  Edit,
  Delete,
  Refresh,
  Person,
  Category as CategoryIcon,
  Book,
  Close,
  Save,
  Visibility,
  AccessTime,
  Search,
  MenuBook,
  Notes as NotesIcon,
} from '@mui/icons-material';

const NoteManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
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
    release_date: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch notes with role-based filtering
      const params = {};
      if (isTeacher()) {
        params.created_by = user.id;
      }
      
      const notesRes = await notesApi.getAllNotes(params);
      const notesData = notesRes.data.data || [];
      
      // Fetch categories
      const categoriesRes = await categoriesApi.getAllCategories();
      setCategories(categoriesRes.data.data || []);
      
      // Fetch courses
      const coursesRes = await coursesApi.getAllCourses();
      setCourses(coursesRes.data.data || []);
      
      // Fetch chapters
      const chaptersRes = await chaptersApi.getAllChapters();
      const chaptersData = chaptersRes.data.data || [];
      setChapters(chaptersData);
      
      // Enrich notes with course and category names
      const enrichedNotes = notesData.map(note => {
        const chapter = chaptersData.find(ch => ch.id === note.chapter_id);
        const course = chapter ? coursesRes.data.data?.find(c => c.id === chapter.course_id) : null;
        const category = course ? categoriesRes.data.data?.find(c => c.id === course.category_id) : null;
        return {
          ...note,
          chapter_name: chapter?.name || 'Unknown Chapter',
          course_name: course?.name || 'Unknown Course',
          category_name: category?.name || 'Unknown Category',
        };
      });
      
      setNotes(enrichedNotes);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load notes');
      showError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Update filtered courses and chapters when filters change
  useEffect(() => {
    if (filters.category_id) {
      const filtered = courses.filter(course => 
        course.category_id === parseInt(filters.category_id)
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
  }, [filters.category_id, courses]);

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
    setFormData(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Update cascading dropdowns
      if (name === 'category_id') {
        const filtered = courses.filter(course => 
          course.category_id === parseInt(value)
        );
        setFormFilteredCourses(filtered);
        newForm.course_id = '';
        newForm.chapter_id = '';
        setFormFilteredChapters([]);
      }
      
      if (name === 'course_id') {
        const filtered = chapters.filter(chapter => 
          chapter.course_id === parseInt(value)
        );
        setFormFilteredChapters(filtered);
        newForm.chapter_id = '';
      }
      
      return newForm;
    });
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
      release_date: '',
    });
    setFormFilteredCourses([]);
    setFormFilteredChapters([]);
    setIsEditing(false);
    setSelectedNote(null);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Note title is required');
      return false;
    }
    
    // Check if content is not empty (remove HTML tags)
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
        ...(formData.release_date && { release_date: formData.release_date })
      };
      
      if (isEditing && selectedNote) {
        // Check if teacher can edit
        if (isTeacher() && selectedNote.created_by !== user.id) {
          showError('You can only edit notes you created');
          setActionLoading(false);
          return;
        }
        
        await notesApi.updateNote(selectedNote.id, noteData);
        showSuccess('Note updated successfully!');
      } else {
        await notesApi.createNote(noteData);
        showSuccess('Note created successfully!');
      }
      
      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save note:', err);
      showError(err.response?.data?.message || 'Failed to save note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (note) => {
    // Check if teacher can edit
    if (isTeacher() && note.created_by !== user.id) {
      showError('You can only edit notes you created');
      return;
    }

    setSelectedNote(note);
    setIsEditing(true);
    
    // Find category and course for this note
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
      release_date: note.release_date ? note.release_date.slice(0, 16) : '',
    });
    
    setFormOpen(true);
  };

  const handlePreview = (note) => {
    setPreviewNote(note);
    setPreviewOpen(true);
  };

  const handleDelete = (note) => {
    // Check if teacher can delete
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
      
      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      
      showSuccess(`Note "${selectedNote.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedNote(null);
      
    } catch (err) {
      console.error('Failed to delete note:', err);
      showError(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter notes based on filters and search
  const filteredNotes = notes.filter(note => {
    // Apply filters
    if (filters.category_id && note.category_id !== parseInt(filters.category_id)) return false;
    if (filters.course_id && note.course_id !== parseInt(filters.course_id)) return false;
    if (filters.chapter_id && note.chapter_id !== parseInt(filters.chapter_id)) return false;
    
    // Apply search
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
  });

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          #{value}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.chapter_name} • {row.course_name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 120,
      render: (value) => (
        <Chip
          label={value || 'N/A'}
          size="small"
          variant="outlined"
          icon={<CategoryIcon fontSize="small" />}
        />
      ),
    },
    {
      field: 'creator_role',
      headerName: 'Created By',
      width: 120,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person fontSize="small" color="action" />
          <Typography variant="body2">
            {value === 'admin' ? 'Admin' : 'Teacher'}
            {row.created_by === user?.id && ' (You)'}
          </Typography>
        </Box>
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
                  sx={{
                    opacity: actionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
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
                      sx={{
                        opacity: actionLoading ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
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
            )}
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
            Notes Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage study notes with rich text formatting
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
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

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
          <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search notes by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Filters Section */}
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

      {/* Notes Table */}
      <DataTable
        columns={columns}
        data={filteredNotes}
        loading={loading}
        onRefresh={fetchData}
        title={`Notes (${filteredNotes.length})`}
        rowKey="id"
      />

      {/* Create/Edit Note Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !actionLoading && setFormOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
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
              <TextField
                fullWidth
                label="Note Title *"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                disabled={actionLoading}
              />
            </Grid>

            {isAdmin() && (
              <>
                <Grid item xs={12} md={4}>
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

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Course *</InputLabel>
                    <Select
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleInputChange}
                      label="Course *"
                      disabled={actionLoading || !formData.category_id}
                    >
                      <MenuItem value="">Select Course</MenuItem>
                      {formFilteredCourses.map(course => (
                        <MenuItem key={course.id} value={course.id}>
                          {course.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12} md={isAdmin() ? 4 : 12}>
              <FormControl fullWidth>
                <InputLabel>Chapter *</InputLabel>
                <Select
                  name="chapter_id"
                  value={formData.chapter_id}
                  onChange={handleInputChange}
                  label="Chapter *"
                  disabled={actionLoading || (isAdmin() && !formData.course_id)}
                >
                  <MenuItem value="">Select Chapter</MenuItem>
                  {(isAdmin() ? formFilteredChapters : chapters).map(chapter => (
                    <MenuItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {isAdmin() && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Release Date (Optional)"
                  name="release_date"
                  value={formData.release_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={actionLoading}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                Content *
              </Typography>
              <RichTextEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Start writing your note content here..."
                height={400}
                readOnly={actionLoading}
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

      {/* Preview Note Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
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
              {/* Metadata */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Category:</strong> {previewNote.category_name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Course:</strong> {previewNote.course_name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Chapter:</strong> {previewNote.chapter_name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Created:</strong> {previewNote.created_at ? new Date(previewNote.created_at).toLocaleString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Created By:</strong> {previewNote.creator_role === 'admin' ? 'Admin' : 'Teacher'}
                    </Typography>
                  </Grid>
                  {previewNote.release_date && (
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Release Date:</strong> {new Date(previewNote.release_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
              
              {/* Content */}
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  minHeight: 300,
                  maxHeight: 500,
                  overflow: 'auto',
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

      {/* Delete Confirmation Dialog */}
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
  );
};

export default NoteManager;