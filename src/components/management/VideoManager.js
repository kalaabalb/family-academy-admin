import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import videosApi from '../../api/videos';
import categoriesApi from '../../api/categories';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
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
  LinearProgress,
  Stack,
  Grid,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SchedulePicker from '../common/SchedulePicker';
import ContentAssignmentFields from '../common/ContentAssignmentFields';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import DetailRow from '../common/DetailRow';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  PlayCircle,
  Visibility,
  CloudUpload,
  CheckCircle,
  AccessTime,
  Storage,
  Category as CategoryIcon,
  Book,
  MenuBook,
  Close,
  Save,
  Search,
  Info,
  Schedule,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const VideoManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();
  const { getCachedData, invalidateCache } = useUsers();
  
  const [videos, setVideos] = useState([]);
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
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [fileValidationError, setFileValidationError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    course_id: '',
    chapter_id: '',
    video_file: null,
    detected_duration: 0,
    release_date: null, // ADDED for scheduling
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category_id: '',
    course_id: '',
    chapter_id: '',
  });
  const videosCacheKey = 'videos-management';
  const categoriesCacheKey = 'videos-management-categories';
  const coursesCacheKey = 'videos-management-courses';
  const chaptersCacheKey = 'videos-management-chapters';

  // Helper functions
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = function() {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      
      video.onerror = function() {
        reject('Could not load video metadata');
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const validateVideoFile = (file) => {
    setFileValidationError('');
    
    if (!file) return false;
    
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mov', 'video/avi'];
    if (!validTypes.includes(file.type)) {
      setFileValidationError('Invalid file type. Please select MP4, MOV, or AVI.');
      return false;
    }
    
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileValidationError(`File too large. Maximum size is 500MB (your file: ${formatFileSize(file.size)})`);
      return false;
    }
    
    return true;
  };

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const [videosData, categoriesData, coursesData, chaptersData] = await Promise.all([
        getCachedData(videosCacheKey, () => videosApi.getAllVideos(), { forceRefresh, ttl: 10 * 60 * 1000 }),
        getCachedData(categoriesCacheKey, () => categoriesApi.getAllCategories(), { forceRefresh, ttl: 15 * 60 * 1000 }),
        getCachedData(coursesCacheKey, () => coursesApi.getAllCourses(), { forceRefresh, ttl: 15 * 60 * 1000 }),
        getCachedData(chaptersCacheKey, () => chaptersApi.getAllChapters(), { forceRefresh, ttl: 10 * 60 * 1000 }),
      ]);
      
      // Filter courses for teachers based on assigned_courses
      let filteredCoursesData = coursesData;
      let filteredCategoriesData = categoriesData;
      
      if (isTeacher()) {
        const assignedCourseIds = user?.assigned_courses || [];
        filteredCoursesData = coursesData.filter(course => 
          assignedCourseIds.includes(course.id)
        );
        
        const accessibleCategoryIds = new Set(
          filteredCoursesData.map(c => c.category_id)
        );
        filteredCategoriesData = categoriesData.filter(cat => 
          accessibleCategoryIds.has(cat.id)
        );
      }
      
      const formattedVideos = videosData.map(video => ({
        ...video,
        duration_formatted: video.duration_formatted || formatDuration(video.duration),
        file_size_formatted: video.file_size_formatted || formatFileSize(video.file_size),
        category_name: filteredCoursesData.find(c => c.id === video.course_id)?.category_name,
        course_name: filteredCoursesData.find(c => c.id === video.course_id)?.name,
        chapter_name: chaptersData.find(ch => ch.id === video.chapter_id)?.name,
        release_date: video.release_date || null,
      }));
      
      setVideos(formattedVideos);
      setCategories(filteredCategoriesData);
      setCourses(filteredCoursesData);
      setChapters(chaptersData);
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load videos');
      showError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [categoriesCacheKey, chaptersCacheKey, coursesCacheKey, getCachedData, isTeacher, showError, user, videosCacheKey]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  useEffect(() => {
    if (filters.category_id) {
      setFilteredCourses(courses.filter((course) => String(course.category_id) === String(filters.category_id)));
    } else {
      setFilteredCourses([]);
    }
  }, [courses, filters.category_id]);

  useEffect(() => {
    if (filters.course_id) {
      setFilteredChapters(chapters.filter((chapter) => String(chapter.course_id) === String(filters.course_id)));
    } else {
      setFilteredChapters([]);
    }
  }, [chapters, filters.course_id]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'category_id') {
        next.course_id = '';
        next.chapter_id = '';
      }
      if (name === 'course_id') {
        next.chapter_id = '';
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({
      category_id: '',
      course_id: '',
      chapter_id: '',
    });
  };

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

  const handleVideoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileValidationError('');
    
    if (validateVideoFile(file)) {
      setFormData(prev => ({ ...prev, video_file: file }));
      
      if (!formData.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: fileName }));
      }
      
      try {
        const duration = await getVideoDuration(file);
        setFormData(prev => ({ ...prev, detected_duration: duration }));
      } catch (err) {
      }
    } else {
      e.target.value = null;
      setFormData(prev => ({ ...prev, video_file: null }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: '',
      course_id: '',
      chapter_id: '',
      video_file: null,
      detected_duration: 0,
      release_date: null,
    });
    setScheduleEnabled(false);
    setIsEditing(false);
    setSelectedVideo(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadError('');
    setFileValidationError('');
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Video title is required');
      return false;
    }

    if (!formData.chapter_id) {
      showError('Please select a chapter');
      return false;
    }

    if (!isEditing && !formData.video_file) {
      showError('Please select a video file');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setUploading(true);
      setUploadProgress(0);
      setUploadError('');

      if (isEditing && selectedVideo) {
        const updateData = {
          title: formData.title.trim(),
        };
        
        // ADDED: Include release_date for scheduling
        if (formData.release_date) {
          updateData.release_date = formData.release_date.toISOString();
        }
        
        await videosApi.updateVideo(selectedVideo.id, updateData);
        invalidateCache(/^videos-management/);
        showSuccess('Video updated successfully!');
        setFormOpen(false);
        resetForm();
        await fetchData(true);
      } else {
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title.trim());
        formDataToSend.append('chapter_id', formData.chapter_id);
        formDataToSend.append('video', formData.video_file);
        
        // ADDED: Include release_date for scheduling
        if (formData.release_date) {
          formDataToSend.append('release_date', formData.release_date.toISOString());
        }
        
        showInfo('Uploading video... This may take a few minutes.', 10000);
        
        const response = await videosApi.createVideo(
          formDataToSend, 
          (progress) => setUploadProgress(progress)
        );
        invalidateCache(/^videos-management/);
        
        // ensure progress reaches 100% in the UI before clearing
        setUploadProgress(100);
        // small pause so users see completion state
        await new Promise((res) => setTimeout(res, 400));

        showSuccess('Video uploaded successfully!');
        setFormOpen(false);
        resetForm();
        await fetchData(true);
      }
      
    } catch (err) {
      devError('Failed to save video:', err);
      
      let errorMessage = 'Failed to save video';
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Bad request. Check your input.';
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication expired. Please login again.';
        } else if (err.response.status === 403) {
          errorMessage = 'You don\'t have permission to upload videos.';
        } else if (err.response.status === 413) {
          errorMessage = 'File too large. Maximum size is 500MB.';
        } else if (err.response.status === 415) {
          errorMessage = 'Unsupported file type. Please use MP4, MOV, or AVI.';
        }
        
        devError('Video error response:', {
          status: err.response.status,
          data: err.response.data,
        });
        
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }
      
      setUploadError(errorMessage);
      showError(errorMessage);
      setUploadProgress(0);
      
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (video) => {
    if (isTeacher() && video.uploaded_by !== user.id) {
      showError('You can only edit videos you uploaded');
      return;
    }

    setSelectedVideo(video);
    setIsEditing(true);
    
    const course = courses.find(c => c.id === video.course_id);
    
    setFormData({
      title: video.title || '',
      category_id: course?.category_id?.toString() || '',
      course_id: video.course_id?.toString() || '',
      chapter_id: video.chapter_id?.toString() || '',
      video_file: null,
      detected_duration: video.duration || 0,
      release_date: video.release_date ? new Date(video.release_date) : null,
    });
    setScheduleEnabled(!!video.release_date);
    
    setFilteredCourses(courses.filter(c => c.category_id === course?.category_id));
    setFilteredChapters(chapters.filter(ch => ch.course_id === video.course_id));
    
    setFormOpen(true);
  };

  const handlePreview = (video) => {
    setPreviewVideo(video);
    setPreviewOpen(true);
  };

  const handleDelete = (video) => {
    if (isTeacher() && video.uploaded_by !== user.id) {
      showError('You can only delete videos you uploaded');
      return;
    }
    
    setSelectedVideo(video);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedVideo) return;

    try {
      setActionLoading(true);
      await videosApi.deleteVideo(selectedVideo.id);
      invalidateCache(/^videos-management/);
      
      setVideos(prev => prev.filter(v => v.id !== selectedVideo.id));
      showSuccess(`Video "${selectedVideo.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedVideo(null);
      
    } catch (err) {
      devError('Failed to delete video:', err);
      showError(err.response?.data?.message || 'Failed to delete video');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const filteredVideos = useMemo(() => videos.filter(video => {
    if (filters.category_id && String(video.category_id) !== String(filters.category_id)) {
      return false;
    }

    if (filters.course_id && String(video.course_id) !== String(filters.course_id)) {
      return false;
    }

    if (filters.chapter_id && String(video.chapter_id) !== String(filters.chapter_id)) {
      return false;
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(query) ||
      (video.chapter_name && video.chapter_name.toLowerCase().includes(query)) ||
      (video.course_name && video.course_name.toLowerCase().includes(query))
    );
  }), [videos, filters.category_id, filters.course_id, filters.chapter_id, searchQuery]);

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
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            variant="rounded"
            src={row.thumbnail_url}
            sx={{ width: 80, height: 45, bgcolor: 'primary.light' }}
          >
            <PlayCircle />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {value}
            </Typography>
          </Box>
        </Box>
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
      field: 'duration_formatted',
      headerName: 'Duration',
      width: 100,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">{value || '00:00'}</Typography>
        </Box>
      ),
    },
    {
      field: 'file_size_formatted',
      headerName: 'File Size',
      width: 100,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Storage sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">{value}</Typography>
        </Box>
      ),
    },
    {
      field: 'view_count',
      headerName: 'View Count',
      width: 90,
      render: (value) => (
        <Chip label={value || 0} size="small" color="info" variant="outlined" />
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
      field: 'uploader_name',
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
      width: 160,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.uploaded_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Preview">
              <IconButton size="small" onClick={() => handlePreview(row)} color="info">
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEdit(row)} color="primary">
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDelete(row)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
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
        <ManagementPageHeader
          title="Video Management"
          subtitle={isAdmin() ? 'Manage all video content' : 'Manage your uploaded videos'}
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
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                Upload Video
              </Button>
            )}
            </>
          }
        />

        {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

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
          placeholder="Search videos by title..."
        />

        {showFilters && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Filter Videos
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
                    {filteredCourses.map((course) => (
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
                    {filteredChapters.map((chapter) => (
                      <MenuItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </MenuItem>
                    ))}
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

        <DataTable
          showToolbar={false}
          columns={columns}
          data={filteredVideos}
          loading={loading}
          onRefresh={handleRefresh}
          title="Videos"
          rowKey="id"
          searchable={false}
        />

        <Dialog
          open={formOpen}
          onClose={() => !uploading && setFormOpen(false)}
          keepMounted
          disableRestoreFocus
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold">
                {isEditing ? 'Edit Video' : 'Upload New Video'}
              </Typography>
              <IconButton
                onClick={() => {
                  if (!uploading) {
                    setFormOpen(false);
                    resetForm();
                  }
                }}
                size="small"
                disabled={uploading}
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
                  label="Video Title *"
                  name="title"
                  value={formData.title}
                  onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                  delay={80}
                  required
                  disabled={uploading}
                  helperText="Give your video a descriptive title"
                />
              </Grid>

              {!isEditing && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Video File * (MP4, MOV, AVI - Max 500MB)
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      borderColor: fileValidationError ? 'error.main' : (formData.video_file ? 'success.main' : 'divider'),
                      bgcolor: fileValidationError ? 'error.lighter' : (formData.video_file ? 'success.light' : 'transparent'),
                      borderRadius: 2,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => !uploading && document.getElementById('video-file')?.click()}
                  >
                    <input
                      id="video-file"
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo"
                      onChange={handleVideoFileChange}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    
                    {uploading ? (
                      <Box>
                        <CircularProgress size={48} sx={{ mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Uploading video... {uploadProgress}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress} 
                          sx={{ height: 8, borderRadius: 4, mb: 2 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formData.video_file?.name} • {formatFileSize(formData.video_file?.size)} • {uploadProgress}% complete
                        </Typography>
                      </Box>
                    ) : formData.video_file ? (
                      <Box>
                        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                        <Typography fontWeight="medium" variant="h6">
                          {formData.video_file.name}
                        </Typography>
                        
                        <Box
                          sx={{
                            mt: 2,
                            mb: 2,
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: 'grey.950',
                            aspectRatio: '16 / 9',
                            minHeight: { xs: 220, sm: 260 },
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <video
                            src={URL.createObjectURL(formData.video_file)}
                            preload="metadata"
                            controls
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'block',
                              objectFit: 'contain',
                              backgroundColor: '#05070b',
                            }}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Size: {formatFileSize(formData.video_file.size)} • 
                          Duration: {formatDuration(formData.detected_duration)}
                        </Typography>
                        <Button
                          variant="text"
                          color="primary"
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, video_file: null }));
                            document.getElementById('video-file').value = '';
                          }}
                        >
                          Choose Different File
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <CloudUpload sx={{ fontSize: 48, color: fileValidationError ? 'error.main' : 'primary.main', mb: 1 }} />
                        <Typography fontWeight="medium" variant="h6">
                          Click to select video file
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          MP4, MOV, AVI • Max 500MB
                        </Typography>
                        {fileValidationError && (
                          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                            {fileValidationError}
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}

              <ContentAssignmentFields
                categories={categories}
                courses={courses}
                chapters={chapters}
                values={formData}
                onChange={handleAssignmentChange}
                disabled={uploading}
                showCategory
                showCourse
                showChapter
              />

              {/* ADDED: Scheduling field for ALL users (teachers can schedule too) */}
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
                  helperText="Pick when this video should become visible"
                  disabled={uploading}
                />
              </Grid>

              {uploadError && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {uploadError}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Info color="info" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Video Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Duration will be automatically extracted from the video
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Thumbnail will be auto-generated from the video
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Cloudinary videos will have multiple quality options (360p-1080p)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Teachers can schedule videos for future release
                      </Typography>
                    </Box>
                  </Box>
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
              disabled={uploading}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={
                uploading || 
                !formData.title.trim() || 
                !formData.chapter_id || 
                (!isEditing && !formData.video_file) ||
                !!fileValidationError
              }
              startIcon={uploading ? <CircularProgress size={20} /> : <Save />}
              sx={{ borderRadius: 2 }}
            >
              {uploading ? `Uploading ${uploadProgress}%` : (isEditing ? 'Update' : 'Upload')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          keepMounted
          disableRestoreFocus
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold">
                {previewVideo?.title}
              </Typography>
              <IconButton onClick={() => setPreviewOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers sx={{ p: 3 }}>
            {previewVideo && (
              <Box>
                <Box
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    mb: 3,
                    bgcolor: 'grey.950',
                    aspectRatio: '16 / 9',
                    minHeight: { xs: 240, sm: 320, md: 360 },
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.18)',
                  }}
                >
                  <video
                    src={previewVideo.file_path}
                    poster={previewVideo.thumbnail_url}
                    preload="metadata"
                    controls
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'contain',
                      backgroundColor: '#05070b',
                    }}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Video Info
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <DetailRow label="Duration" value={previewVideo.duration_formatted} />
                          <DetailRow label="Size" value={previewVideo.file_size_formatted} />
                          <DetailRow label="Views" value={previewVideo.view_count || 0} />
                          {previewVideo.release_date && (
                            <DetailRow
                              label="Release Date"
                              value={new Date(previewVideo.release_date).toLocaleString()}
                            />
                          )}
                          {previewVideo.has_qualities && (
                            <DetailRow label="Quality" value="Multiple Qualities" />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Course Info
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CategoryIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {previewVideo.category_name || 'Not assigned'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Book fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {previewVideo.course_name || 'Not assigned'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MenuBook fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {previewVideo.chapter_name || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button variant="outlined" onClick={() => setPreviewOpen(false)} sx={{ borderRadius: 2 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Video"
          message={`Are you sure you want to delete "${selectedVideo?.title}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          severity="error"
          loading={actionLoading}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default VideoManager;
