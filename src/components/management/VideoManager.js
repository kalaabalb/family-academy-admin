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
  CardMedia,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  PlayCircle,
  Visibility,
  CloudUpload,
  Cancel,
  CheckCircle,
  AccessTime,
  Storage,
  VideoLibrary,
  Category as CategoryIcon,
  Book,
  MenuBook,
  Close,
  Save,
} from '@mui/icons-material';

const VideoManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    course_id: '',
    chapter_id: '',
    description: '',
    video_file: null,
    video_url: '',
  });

  // For cascading dropdowns
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch videos with role-based filtering
      const params = {};
      if (isTeacher()) {
        params.uploaded_by = user.id;
      }
      
      const videosRes = await videosApi.getAllVideos(params);
      const videosData = videosRes.data.data || [];
      
      // Format video data
      const formattedVideos = videosData.map(video => ({
        ...video,
        duration_formatted: formatDuration(video.duration),
        file_size_formatted: formatFileSize(video.file_size),
      }));
      
      setVideos(formattedVideos);
      
      // Fetch categories (only active ones)
      const categoriesRes = await categoriesApi.getAllCategories();
      const activeCategories = categoriesRes.data.data?.filter(c => c.status === 'active') || [];
      setCategories(activeCategories);
      
      // Fetch courses
      const coursesRes = await coursesApi.getAllCourses();
      setCourses(coursesRes.data.data || []);
      
      // Fetch chapters
      const chaptersRes = await chaptersApi.getAllChapters();
      setChapters(chaptersRes.data.data || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load videos');
      showError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Helper functions
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Handle cascading dropdowns
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      showError('Please select a valid video file (MP4, MOV, AVI, or WEBM)');
      return;
    }
    
    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      showError('File size must be less than 500MB');
      return;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      video_file: file,
      // Create preview URL
      video_url: URL.createObjectURL(file)
    }));
  };

  const resetForm = () => {
    // Clean up preview URL if it exists
    if (formData.video_url && formData.video_url.startsWith('blob:')) {
      URL.revokeObjectURL(formData.video_url);
    }
    
    setFormData({
      title: '',
      category_id: '',
      course_id: '',
      chapter_id: '',
      description: '',
      video_file: null,
      video_url: '',
    });
    setFilteredCourses([]);
    setFilteredChapters([]);
    setIsEditing(false);
    setSelectedVideo(null);
    setUploading(false);
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.title.trim()) {
        showError('Video title is required');
        return;
      }

      if (!formData.chapter_id) {
        showError('Please select a chapter');
        return;
      }

      if (!isEditing && !formData.video_file) {
        showError('Please select a video file');
        return;
      }

      setUploading(true);

      if (isEditing && selectedVideo) {
        // Update existing video
        const updateData = {
          title: formData.title.trim(),
          description: formData.description || null,
        };
        
        await videosApi.updateVideo(selectedVideo.id, updateData);
        showSuccess('Video updated successfully!');
      } else {
        // Create new video with file upload
        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title.trim());
        formDataToSend.append('chapter_id', formData.chapter_id);
        if (formData.description) {
          formDataToSend.append('description', formData.description);
        }
        formDataToSend.append('file', formData.video_file);
        
        await videosApi.createVideo(formDataToSend);
        showSuccess('Video uploaded successfully!');
      }

      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save video:', err);
      showError(err.response?.data?.message || 'Failed to save video');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (video) => {
    // Check if teacher can edit
    if (isTeacher() && video.uploaded_by !== user.id) {
      showError('You can only edit videos you uploaded');
      return;
    }

    setSelectedVideo(video);
    setIsEditing(true);
    
    // Find category for this video
    const course = courses.find(c => c.id === video.course_id);
    if (course) {
      setFormData(prev => ({ ...prev, category_id: course.category_id?.toString() || '' }));
      const filtered = courses.filter(c => c.category_id === course.category_id);
      setFilteredCourses(filtered);
    }
    
    if (video.course_id) {
      const filtered = chapters.filter(ch => ch.course_id === video.course_id);
      setFilteredChapters(filtered);
    }
    
    setFormData({
      title: video.title || '',
      category_id: course?.category_id?.toString() || '',
      course_id: video.course_id?.toString() || '',
      chapter_id: video.chapter_id?.toString() || '',
      description: video.description || '',
      video_file: null,
      video_url: video.file_path || '',
    });
    
    setFormOpen(true);
  };

  const handlePreview = (video) => {
    setPreviewVideo(video);
    setPreviewOpen(true);
  };

  const handleDelete = (video) => {
    // Check if teacher can delete
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
      setLoading(true);
      await videosApi.deleteVideo(selectedVideo.id);
      
      setVideos(prev => prev.filter(v => v.id !== selectedVideo.id));
      
      showSuccess(`Video "${selectedVideo.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedVideo(null);
      
    } catch (err) {
      console.error('Failed to delete video:', err);
      showError(err.response?.data?.message || 'Failed to delete video');
    } finally {
      setLoading(false);
    }
  };

  // Table columns
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
      field: 'title',
      headerName: 'Video Title',
      flex: 1,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 60,
              height: 40,
              bgcolor: 'primary.light',
              color: 'primary.main',
            }}
          >
            <PlayCircle />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {row.chapter_name} • {row.course_name}
            </Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary">
                {row.description.substring(0, 60)}...
              </Typography>
            )}
          </Box>
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
          color="primary"
          variant="outlined"
          icon={<CategoryIcon fontSize="small" />}
        />
      ),
    },
    {
      field: 'duration_formatted',
      headerName: 'Duration',
      width: 100,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">{value}</Typography>
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
        <Chip
          label={value || 0}
          size="small"
          color="info"
          variant="outlined"
        />
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
      width: 180,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.uploaded_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Preview Video">
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
                <Tooltip title="Edit Video">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(row)}
                    color="primary"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Video">
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
              Upload Video
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

      {/* Videos Table */}
      <DataTable
        columns={columns}
        data={videos}
        loading={loading}
        onRefresh={fetchData}
        title={`Videos`}
        tableId="videos-table"
        searchable={true}
        pagination={true}
        rowKey="id"
      />

      {/* Upload/Edit Video Dialog */}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Video Title *"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                disabled={uploading}
              />
            </Grid>

            {/* File Upload Section */}
            {!isEditing && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    borderColor: formData.video_file ? 'success.main' : 'divider',
                    bgcolor: formData.video_file ? 'success.light' : 'transparent',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onClick={() => !uploading && document.getElementById('video-file-input')?.click()}
                >
                  <input
                    id="video-file-input"
                    type="file"
                    accept="video/*,.mp4,.mov,.avi,.webm"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  
                  {uploading ? (
                    <Box>
                      <CircularProgress size={48} sx={{ mb: 2 }} />
                      <Typography variant="body1" gutterBottom>
                        Uploading video...
                      </Typography>
                    </Box>
                  ) : formData.video_file ? (
                    <Box>
                      <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                      <Typography variant="body1" fontWeight="medium" gutterBottom>
                        File Selected: {formData.video_file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Size: {formatFileSize(formData.video_file.size)} • 
                        Type: {formData.video_file.type}
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                      <Typography variant="body1" fontWeight="medium" gutterBottom>
                        Click to select video file
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supported formats: MP4, MOV, AVI, WEBM • Max size: 500MB
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Video Preview */}
            {(formData.video_url || (isEditing && selectedVideo?.file_path)) && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Video Preview
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 200,
                      bgcolor: 'black',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <video
                      src={formData.video_url || selectedVideo?.file_path}
                      controls
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Category Select (Admin only) */}
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
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Course Select */}
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
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Chapter Select */}
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
                    <MenuItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                disabled={uploading}
                placeholder="Enter video description..."
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
              (!isEditing && !formData.video_file)
            }
            startIcon={uploading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {uploading ? 'Uploading...' : (isEditing ? 'Update Video' : 'Upload Video')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Preview Dialog */}
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
              Video Preview: {previewVideo?.title}
            </Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {previewVideo && (
            <Box>
              {/* Video Player */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  bgcolor: 'black',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 3,
                }}
              >
                <video
                  src={previewVideo.file_path}
                  controls
                  style={{
                    width: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              
              {/* Video Info */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Video Information
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">Duration:</Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {previewVideo.duration_formatted}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">File Size:</Typography>
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption">Uploaded:</Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {previewVideo.created_at ? new Date(previewVideo.created_at).toLocaleDateString() : '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Course Information
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CategoryIcon fontSize="small" color="primary" />
                          <Typography variant="caption">
                            Category: {previewVideo.category_name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Book fontSize="small" color="primary" />
                          <Typography variant="caption">
                            Course: {previewVideo.course_name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MenuBook fontSize="small" color="primary" />
                          <Typography variant="caption">
                            Chapter: {previewVideo.chapter_name}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {previewVideo.description && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Description
                        </Typography>
                        <Typography variant="body2">
                          {previewVideo.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
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
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Video"
        message={`Are you sure you want to delete video "${selectedVideo?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />
    </Box>
  );
};

export default VideoManager;