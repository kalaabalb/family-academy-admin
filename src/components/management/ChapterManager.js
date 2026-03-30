import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import chaptersApi from '../../api/chapters';
import categoriesApi from '../../api/categories';
import coursesApi from '../../api/courses';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  Box,
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
  LinearProgress,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Lock,
  LockOpen,
  Close,
  Save,
  Search,
  PlayCircle,
  Notes,
  Quiz,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SchedulePicker from '../common/SchedulePicker';
import ContentAssignmentFields from '../common/ContentAssignmentFields';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import DetailRow from '../common/DetailRow';
import { renderCountChip, renderTableChip } from '../common/tableFormatters';
import { devError } from '../../utils/devLogger';

const ChapterManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [chapters, setChapters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category_id: '',
    course_id: '',
    status: '',
  });
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    course_id: '',
    status: 'locked',
    release_date: null,
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;

  // Cache keys
  const chaptersCacheKey = 'chapters';
  const categoriesCacheKey = 'categories';
  const coursesCacheKey = 'courses';

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch chapters with role-based filtering
      const params = {};
      if (isTeacher()) {
        params.created_by = user.id;
      }
      
      const chaptersData = await getCachedData(
        getCacheKey('chapters', params),
        () => chaptersApi.getAllChapters(params),
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
      
      let filteredCoursesList = coursesData || [];
      if (isTeacher()) {
        const assignedCourseIds = user?.assigned_courses || [];
        filteredCoursesList = filteredCoursesList.filter(course => 
          assignedCourseIds.includes(course.id)
        );
      }
      
      const availableCategoryIds = new Set(
        filteredCoursesList.map((course) => course.category_id)
      );
      setCategories((categoriesData || []).filter((category) => availableCategoryIds.has(category.id)));
      setCourses(filteredCoursesList);
      
      // Enrich chapters with course and category names
      const enrichedChapters = (chaptersData || []).map(chapter => {
        const course = filteredCoursesList.find(c => c.id === chapter.course_id);
        const category = course ? categoriesData?.find(c => c.id === course.category_id) : null;
        return {
          ...chapter,
          course_name: course?.name || 'Unknown Course',
          category_name: category?.name || 'Unknown Category',
        };
      });
      
      setChapters(enrichedChapters);
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load chapters');
      showError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, getCachedData, getCacheKey, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      course_id: '',
      status: 'locked',
      release_date: null,
    });
    setScheduleEnabled(false);
    setIsEditing(false);
    setSelectedChapter(null);
  };

  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      
      // Validation
      if (!formData.name.trim()) {
        showError('Chapter name is required');
        setActionLoading(false);
        return;
      }

      if (!formData.course_id) {
        showError('Please select a course');
        setActionLoading(false);
        return;
      }

      // Teachers can only create locked chapters
      const chapterStatus = isTeacher() ? 'locked' : formData.status;

      // CRITICAL: Convert course_id to integer
      const courseIdInt = parseInt(formData.course_id, 10);
      
      if (isNaN(courseIdInt) || courseIdInt <= 0) {
        showError('Invalid course selection');
        setActionLoading(false);
        return;
      }

      const chapterData = {
        name: formData.name.trim(),
        course_id: courseIdInt,  // Always send as integer
        status: chapterStatus,
        // only include release_date if user set a value
        ...(scheduleEnabled && formData.release_date
          ? { release_date: formData.release_date.toISOString() }
          : {}),
      };

      if (isEditing && selectedChapter) {
        // Teachers can only update chapters they created
        if (isTeacher() && selectedChapter.created_by !== user.id) {
          showError('You can only edit chapters you created');
          setActionLoading(false);
          return;
        }
        
        await chaptersApi.updateChapter(selectedChapter.id, chapterData);
        showSuccess('Chapter updated successfully');
        
        // Invalidate caches
        invalidateCache(/^chapters/);
        invalidateCache(coursesCacheKey);
      } else {
        await chaptersApi.createChapter(chapterData);
        showSuccess('Chapter created successfully');
        
        // Invalidate caches
        invalidateCache(/^chapters/);
        invalidateCache(coursesCacheKey);
      }
      
      setFormOpen(false);
      resetForm();
      await fetchData(true);
      
    } catch (err) {
      devError('Failed to save chapter:', err);
      devError('Chapter error response:', err.response?.data);
      
      // Improved error display
      let errorMessage = 'Failed to save chapter';
      
      if (err.validationErrors) {
        // Handle validation errors from our enhanced API
        errorMessage = err.validationErrors.map(e => e.message).join(', ');
      } else if (err.response?.data?.errors) {
        // Handle validation errors array from backend
        errorMessage = err.response.data.errors.map(e => e.msg || e.message).join(', ');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showError(errorMessage);
    } finally {
      setActionLoading(false);
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
    setFormData({
      name: chapter.name || '',
      category_id: course?.category_id?.toString() || '',
      course_id: chapter.course_id?.toString() || '',
      status: chapter.status || 'locked',
      release_date: chapter.release_date ? new Date(chapter.release_date) : null,
    });
    setScheduleEnabled(Boolean(chapter.release_date));
    
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

  const handlePreview = (chapter) => {
    setSelectedChapter(chapter);
    setPreviewOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedChapter) return;

    try {
      setActionLoading(true);
      await chaptersApi.deleteChapter(selectedChapter.id);
      
      // Invalidate caches
      invalidateCache(/^chapters/);
      invalidateCache(coursesCacheKey);
      
      setChapters(prev => prev.filter(c => c.id !== selectedChapter.id));
      
      showSuccess(`Chapter "${selectedChapter.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedChapter(null);
      
    } catch (err) {
      devError('Failed to delete chapter:', err);
      showError(getFriendlyActionError(err, 'Failed to delete chapter'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'category_id' ? { course_id: '' } : {}),
    }));
  };

  const clearFilters = () => {
    setFilters({
      category_id: '',
      course_id: '',
      status: '',
    });
  };

  // Filter chapters based on search
  const filteredChapters = useMemo(() => chapters.filter(chapter => {
    if (filters.category_id && String(chapter.category_id) !== String(filters.category_id)) {
      return false;
    }

    if (filters.course_id && String(chapter.course_id) !== String(filters.course_id)) {
      return false;
    }

    if (filters.status && chapter.status !== filters.status) {
      return false;
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      chapter.name.toLowerCase().includes(query) ||
      (chapter.course_name && chapter.course_name.toLowerCase().includes(query)) ||
      (chapter.category_name && chapter.category_name.toLowerCase().includes(query))
    );
  }), [chapters, filters.category_id, filters.course_id, filters.status, searchQuery]);

  const filterCourses = useMemo(() => {
    if (!filters.category_id) {
      return [];
    }

    return courses.filter((course) => String(course.category_id) === String(filters.category_id));
  }, [courses, filters.category_id]);

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
      field: 'name',
      headerName: 'name',
      flex: 1,
      render: (value) => (
        <Typography variant="body2" fontWeight="medium">
          {value}
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
      field: 'category_name',
      headerName: 'Category',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Category'}
        </Typography>
      ),
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
          icon={<PlayCircle fontSize="small" />}
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
          icon={<Notes fontSize="small" />}
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
          icon={<Quiz fontSize="small" />}
        />
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
      width: 120,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.created_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Chapter">
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
            <Tooltip title="Edit Chapter">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(row)}
                  color="primary"
                  disabled={!canEdit || actionLoading}
                  sx={{
                    opacity: actionLoading || !canEdit ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
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
                  disabled={!canEdit || actionLoading}
                  sx={{
                    opacity: actionLoading || !canEdit ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
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
      <ManagementPageHeader
        title="Chapters Management"
        subtitle={isAdmin() ? 'Manage all chapters across all courses' : 'Manage chapters in your courses'}
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
            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={() => setShowFilters((prev) => !prev)}
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
                Add Chapter
              </Button>
            )}
          </>
        }
      />

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

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
        placeholder="Search chapters by name, course, or category..."
      />

      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Chapters
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
                  {categories.map((cat) => (
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
                  {filterCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="locked">Locked</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={clearFilters} size="small">
                  Clear Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Chapters Table */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredChapters}
        loading={loading}
        onRefresh={handleRefresh}
        title={`Chapters`}
        rowKey="id"
      />

      {/* Add/Edit Chapter Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !actionLoading && setFormOpen(false)}
        keepMounted
        disableRestoreFocus
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
                label="Chapter Name *"
                name="name"
                value={formData.name}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                delay={80}
                required
                placeholder="Enter chapter title"
                disabled={actionLoading}
              />
            </Grid>

            <ContentAssignmentFields
              categories={categories}
              courses={courses}
              chapters={[]}
              values={formData}
              onChange={handleAssignmentChange}
              disabled={actionLoading}
              showCategory
              showCourse
              showChapter={false}
              categoryLabel="Category *"
              courseLabel="Course *"
            />

            {isAdmin() && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      label="Status"
                      disabled={actionLoading}
                    >
                      <MenuItem value="locked">Locked (Requires subscription)</MenuItem>
                      <MenuItem value="free">Free (Available to all users)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <SchedulePicker
                    enabled={scheduleEnabled}
                    onEnabledChange={(enabled) => {
                      setScheduleEnabled(enabled);
                      if (!enabled) {
                        setFormData(prev => ({ ...prev, release_date: null }));
                      }
                    }}
                    value={formData.release_date}
                    onChange={(value) => setFormData(prev => ({ ...prev, release_date: value }))}
                    label="Release Date"
                    helperText="Pick when this chapter should become visible"
                    disabled={actionLoading}
                  />
                </Grid>
              </>
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
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={actionLoading || !formData.name.trim() || !formData.course_id}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Saving...' : (isEditing ? 'Update Chapter' : 'Create Chapter')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              View Chapter
            </Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedChapter?.name || '-'}
              </Typography>
              <Stack spacing={1.25}>
                <DetailRow label="Course" value={selectedChapter?.course_name || 'Unknown Course'} />
                <DetailRow label="Category" value={selectedChapter?.category_name || 'Unknown Category'} />
                <DetailRow
                  label="Status"
                  value={selectedChapter?.status ? renderTableChip(selectedChapter.status, {
                    color: selectedChapter.status === 'open' ? 'success' : 'warning',
                  }) : '-'}
                />
                <DetailRow label="Created By" value={selectedChapter?.created_by_name || 'Unknown'} />
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Content Coverage
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {renderCountChip(selectedChapter?.video_count || 0, { color: 'info' })}
                {renderCountChip(selectedChapter?.note_count || 0, { color: 'secondary' })}
                {renderCountChip(selectedChapter?.question_count || 0, { color: 'warning' })}
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">Videos</Typography>
                <Typography variant="body2" color="text.secondary">Notes</Typography>
                <Typography variant="body2" color="text.secondary">Questions</Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setPreviewOpen(false);
              handleEdit(selectedChapter);
            }}
            disabled={!selectedChapter}
            sx={{ borderRadius: 2 }}
          >
            Edit Chapter
          </Button>
          <Button variant="outlined" onClick={() => setPreviewOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Chapter"
        message={`Are you sure you want to delete chapter "${selectedChapter?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
    </LocalizationProvider>
  );
};

export default ChapterManager;
