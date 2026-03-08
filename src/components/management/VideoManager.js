import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
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
  AddPhotoAlternate,
} from '@mui/icons-material';

const VideoManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();
  
  // State
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
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
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    course_id: '',
    chapter_id: '',
    release_date: '',
    video_file: null,
    thumbnail_file: null,
  });

  // Cascading dropdowns
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);

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

  // Get video duration from file
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

  // Validate video file
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

  // Validate thumbnail image
  const validateThumbnailFile = (file) => {
    if (!file) return true; // Optional field
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Please select a valid image file (JPG, PNG, WEBP)');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      showError('Thumbnail image must be less than 5MB');
      return false;
    }
    
    return true;
  };

  // Fetch data
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const videosResponse = await videosApi.getAllVideos();
      const videosData = videosResponse.data?.data || [];
      
      const [categoriesRes, coursesRes, chaptersRes] = await Promise.all([
        categoriesApi.getAllCategories(),
        coursesApi.getAllCourses(),
        chaptersApi.getAllChapters(),
      ]);
      
      const categoriesData = categoriesRes.data?.data || [];
      const coursesData = coursesRes.data?.data || [];
      const chaptersData = chaptersRes.data?.data || [];
      
      const formattedVideos = videosData.map(video => ({
        ...video,
        duration_formatted: video.duration_formatted || formatDuration(video.duration),
        file_size_formatted: video.file_size_formatted || formatFileSize(video.file_size),
        category_name: coursesData.find(c => c.id === video.course_id)?.category_name,
        course_name: coursesData.find(c => c.id === video.course_id)?.name,
        chapter_name: chaptersData.find(ch => ch.id === video.chapter_id)?.name,
      }));
      
      setVideos(formattedVideos);
      setCategories(categoriesData.filter(c => c.status === 'active'));
      setCourses(coursesData);
      setChapters(chaptersData);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load videos');
      showError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'category_id') {
      const filtered = courses.filter(course => 
        course.category_id === parseInt(value)
      );
      setFilteredCourses(filtered);
      setFilteredChapters([]);
      setFormData(prev => ({ 
        ...prev, 
        course_id: '',
        chapter_id: '' 
      }));
    }
    
    if (name === 'course_id') {
      const filtered = chapters.filter(chapter => 
        chapter.course_id === parseInt(value)
      );
      setFilteredChapters(filtered);
      setFormData(prev => ({ ...prev, chapter_id: '' }));
    }
  };

  const handleVideoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileValidationError('');
    
    if (validateVideoFile(file)) {
      setFormData(prev => ({ ...prev, video_file: file }));
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: fileName }));
      }
      
      // Get duration for display
      try {
        const duration = await getVideoDuration(file);
        console.log(`📹 Video duration: ${formatDuration(duration)} (${duration}s)`);
        // Store duration temporarily for display
        setFormData(prev => ({ ...prev, detected_duration: duration }));
      } catch (err) {
        console.warn('Could not get video duration:', err);
      }
    } else {
      e.target.value = null;
      setFormData(prev => ({ ...prev, video_file: null }));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (validateThumbnailFile(file)) {
      setFormData(prev => ({ ...prev, thumbnail_file: file }));
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    } else {
      e.target.value = null;
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: '',
      course_id: '',
      chapter_id: '',
      release_date: '',
      video_file: null,
      thumbnail_file: null,
    });
    setFilteredCourses([]);
    setFilteredChapters([]);
    setIsEditing(false);
    setSelectedVideo(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadError('');
    setFileValidationError('');
    setThumbnailPreview(null);
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
        // Update video (title and release date only)
        await videosApi.updateVideo(selectedVideo.id, {
          title: formData.title.trim(),
          release_date: formData.release_date || null,
        });
        showSuccess('Video updated successfully!');
        setFormOpen(false);
        resetForm();
        await fetchData(true);
      } else {
        // Create new video with upload
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title.trim());
        formDataToSend.append('chapter_id', formData.chapter_id);
        
        if (formData.release_date) {
          formDataToSend.append('release_date', formData.release_date);
        }
        
        formDataToSend.append('video', formData.video_file);
        
        if (formData.thumbnail_file) {
          formDataToSend.append('thumbnail', formData.thumbnail_file);
        }
        
        showInfo('Uploading video... This may take a few minutes.', 10000);
        
        const response = await videosApi.createVideo(
          formDataToSend, 
          (progress) => setUploadProgress(progress)
        );
        
        console.log('Upload response:', response.data);
        
        showSuccess('Video uploaded successfully!');
        setFormOpen(false);
        resetForm();
        await fetchData(true);
      }
      
    } catch (err) {
      console.error('Failed to save video:', err);
      
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
        
        console.error('Error response:', {
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
      release_date: video.release_date ? video.release_date.slice(0, 16) : '',
      video_file: null,
      thumbnail_file: null,
    });
    
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
      
      setVideos(prev => prev.filter(v => v.id !== selectedVideo.id));
      showSuccess(`Video "${selectedVideo.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedVideo(null);
      
    } catch (err) {
      console.error('Failed to delete video:', err);
      showError(err.response?.data?.message || 'Failed to delete video');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  // Filter videos
  const filteredVideos = videos.filter(video => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(query) ||
      (video.chapter_name && video.chapter_name.toLowerCase().includes(query)) ||
      (video.course_name && video.course_name.toLowerCase().includes(query))
    );
  });

  // Table columns
  const columns = [
    {
      field: 'title',
      headerName: 'Video Title',
      flex: 2,
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
            <Typography variant="caption" color="text.secondary">
              {row.chapter_name} • {row.course_name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {row.has_qualities && (
                <Chip
                  label="HD"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
              {row.processing_status === 'completed' && (
                <Chip
                  label="Ready"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Box>
          </Box>
        </Box>
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
      headerName: 'Size',
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
      headerName: 'Views',
      width: 90,
      render: (value) => (
        <Chip label={value || 0} size="small" color="info" variant="outlined" />
      ),
    },
    {
      field: 'uploader_role',
      headerName: 'Uploader',
      width: 100,
      render: (value) => (
        <Chip
          label={value === 'admin' ? 'Admin' : 'Teacher'}
          size="small"
          color={value === 'admin' ? 'secondary' : 'warning'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Uploaded',
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
            Video Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isAdmin() ? 'Manage all video content' : 'Manage your uploaded videos'}
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

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search videos by title..."
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredVideos}
        loading={loading}
        onRefresh={handleRefresh}
        title="Videos"
        rowKey="id"
      />

      {/* Upload/Edit Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !uploading && setFormOpen(false)}
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
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Video Title *"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                disabled={uploading}
                helperText="Give your video a descriptive title"
              />
            </Grid>

            {/* Release Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Release Date (Optional)"
                type="datetime-local"
                name="release_date"
                value={formData.release_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={uploading}
                helperText="Leave empty for immediate release"
              />
            </Grid>

            {/* Video File Upload */}
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
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ) : formData.video_file ? (
                    <Box>
                      <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                      <Typography fontWeight="medium" variant="h6">
                        {formData.video_file.name}
                      </Typography>
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

            {/* Thumbnail Upload */}
            {!isEditing && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Thumbnail Image (Optional)
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    borderColor: formData.thumbnail_file ? 'success.main' : 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  onClick={() => !uploading && document.getElementById('thumbnail-file')?.click()}
                >
                  <input
                    id="thumbnail-file"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleThumbnailChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  
                  {formData.thumbnail_file ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={thumbnailPreview} 
                        variant="rounded"
                        sx={{ width: 80, height: 45 }}
                      />
                      <Box sx={{ flex: 1, textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {formData.thumbnail_file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(formData.thumbnail_file.size)}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, thumbnail_file: null }));
                          setThumbnailPreview(null);
                          document.getElementById('thumbnail-file').value = '';
                        }}
                      >
                        <Close />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <AddPhotoAlternate sx={{ color: 'primary.main' }} />
                      <Typography variant="body2">Click to upload thumbnail image</Typography>
                      <Typography variant="caption" color="text.secondary">
                        (JPG, PNG, WEBP • Max 5MB)
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Category (Admin only) */}
            {isAdmin() && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category *</InputLabel>
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    label="Category *"
                    disabled={uploading}
                  >
                    <MenuItem value="">Select Category</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Course */}
            <Grid item xs={12} md={isAdmin() ? 6 : 12}>
              <FormControl fullWidth>
                <InputLabel>Course *</InputLabel>
                <Select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  label="Course *"
                  disabled={uploading || (isAdmin() && !formData.category_id)}
                >
                  <MenuItem value="">Select Course</MenuItem>
                  {(isAdmin() ? filteredCourses : courses).map(course => (
                    <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                  ))}
                </Select>
                {isAdmin() && !formData.category_id && (
                  <FormHelperText>Select a category first</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Chapter */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Chapter *</InputLabel>
                <Select
                  name="chapter_id"
                  value={formData.chapter_id}
                  onChange={handleInputChange}
                  label="Chapter *"
                  disabled={uploading || !formData.course_id}
                >
                  <MenuItem value="">Select Chapter</MenuItem>
                  {(isAdmin() ? filteredChapters : chapters.filter(ch => ch.course_id === parseInt(formData.course_id))).map(chapter => (
                    <MenuItem key={chapter.id} value={chapter.id}>{chapter.name}</MenuItem>
                  ))}
                </Select>
                {!formData.course_id && (
                  <FormHelperText>Select a course first</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Upload Error */}
            {uploadError && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {uploadError}
                </Alert>
              </Grid>
            )}

            {/* Info Box */}
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
                      • Thumbnail will be auto-generated if not provided
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Cloudinary videos will have multiple quality options (360p-1080p)
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

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
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
              <Box sx={{ bgcolor: 'black', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                <video
                  src={previewVideo.file_path}
                  poster={previewVideo.thumbnail_url}
                  controls
                  style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Video Info
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">Duration:</Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {previewVideo.duration_formatted}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">Size:</Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {previewVideo.file_size_formatted}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">Views:</Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {previewVideo.view_count || 0}
                          </Typography>
                        </Box>
                        {previewVideo.has_qualities && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Quality:</Typography>
                            <Chip 
                              label="Multiple Qualities" 
                              size="small" 
                              color="info" 
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Course Info
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CategoryIcon fontSize="small" color="primary" />
                          <Typography variant="caption">
                            {previewVideo.category_name || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Book fontSize="small" color="primary" />
                          <Typography variant="caption">
                            {previewVideo.course_name || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MenuBook fontSize="small" color="primary" />
                          <Typography variant="caption">
                            {previewVideo.chapter_name || 'N/A'}
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

      {/* Delete Confirmation */}
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
  );
};

export default VideoManager;