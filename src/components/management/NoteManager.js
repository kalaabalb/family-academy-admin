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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Description,
  Person,
  Category as CategoryIcon,
  Book,
  MenuBook,
  Close,
  Save,
  Visibility,
  AccessTime,
  Search,
  FilterList,
  Clear,
} from '@mui/icons-material';

const NoteManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
    search: '',
  });
  
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
      setNotes(notesRes.data.data || []);
      
      // Fetch categories
      const categoriesRes = await categoriesApi.getAllCategories();
      setCategories(categoriesRes.data.data || []);
      
      // Fetch courses
      const coursesRes = await coursesApi.getAllCourses();
      setCourses(coursesRes.data.data || []);
      
      // Fetch chapters
      const chaptersRes = await chaptersApi.getAllChapters();
      setChapters(chaptersRes.data.data || []);
      
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
      search: '',
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
      setLoading(true);
      
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
          setLoading(false);
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
      setLoading(false);
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
      setLoading(true);
      await notesApi.deleteNote(selectedNote.id);
      
      setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
      
      showSuccess(`Note "${selectedNote.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedNote(null);
      
    } catch (err) {
      console.error('Failed to delete note:', err);
      showError(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on filters
  const filteredNotes = notes.filter(note => {
    if (filters.category_id && note.category_id !== parseInt(filters.category_id)) return false;
    if (filters.course_id && note.course_id !== parseInt(filters.course_id)) return false;
    if (filters.chapter_id && note.chapter_id !== parseInt(filters.chapter_id)) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        note.title.toLowerCase().includes(searchLower) ||
        (note.content && note.content.toLowerCase().includes(searchLower)) ||
        (note.category_name && note.category_name.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const columns = [
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
              <IconButton
                size="small"
                onClick={() => handlePreview(row)}
                color="info"
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Edit Note">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(row)}
                    color="primary"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Note">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(row)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
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
              Create Note
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

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search notes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
        </Grid>
        {(filters.category_id || filters.course_id || filters.chapter_id || filters.search) && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={clearFilters} startIcon={<Clear />}>
              Clear Filters
            </Button>
          </Box>
        )}
      </Paper>

      {/* Notes Table */}
      <DataTable
        columns={columns}
        data={filteredNotes}
        loading={loading}
        onRefresh={fetchData}
        title={`Notes`}
        tableId="notes-table"
        searchable={false}
        pagination={true}
        rowKey="id"
      />

      {/* Create/Edit Note Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !loading && setFormOpen(false)}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Note Title *"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                disabled={loading}
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

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Course *</InputLabel>
                    <Select
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleInputChange}
                      label="Course *"
                      disabled={loading || !formData.category_id}
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
                  disabled={loading || (isAdmin() && !formData.course_id)}
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
                  disabled={loading}
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
                readOnly={loading}
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
            disabled={
              loading || 
              !formData.title.trim() || 
              !formData.chapter_id ||
              !formData.content?.replace(/<[^>]*>/g, '').trim()
            }
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note')}
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
        message={`Are you sure you want to delete the note "${selectedNote?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />
    </Box>
  );
};

export default NoteManager;