import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
  Pending,
  MonetizationOn,
  AccessTime,
  Book,
  Image,
  Close,
  Warning,
} from '@mui/icons-material';

const CategoryManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    price: '',
    billing_cycle: 'monthly',
    description: '',
    image_url: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await categoriesApi.getAllCategories();
      const categoriesData = response.data?.data || [];
      
      // Get course counts for each category
      const coursesResponse = await coursesApi.getAllCourses();
      const coursesData = coursesResponse.data?.data || [];
      
      const categoryCourseCounts = {};
      coursesData.forEach(course => {
        if (course.category_id) {
          categoryCourseCounts[course.category_id] = (categoryCourseCounts[course.category_id] || 0) + 1;
        }
      });
      
      const enrichedCategories = categoriesData.map(category => ({
        ...category,
        course_count: categoryCourseCounts[category.id] || 0,
      }));
      
      setCategories(enrichedCategories);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errMsg = err.response?.data?.message || 'Failed to load categories';
      setError(errMsg);
      showError('Failed to load categories');
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      // FIXED: Use categoriesApi.uploadCategoryImage directly
      const response = await categoriesApi.uploadCategoryImage(file);
      
      if (response.data && response.data.success) {
        // FIXED: The backend returns the URL directly in data
        const imageUrl = response.data.data || response.data.url;
        setFormData(prev => ({
          ...prev,
          image_url: imageUrl,
        }));
        showSuccess('Image uploaded successfully');
      } else {
        showError(response.data?.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      showError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      status: 'active',
      price: '',
      billing_cycle: 'monthly',
      description: '',
      image_url: '',
    });
    setIsEditing(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (!formData.name.trim()) {
        showError('Category name is required');
        setLoading(false);
        return;
      }

      if (formData.status === 'active' && (!formData.price || parseFloat(formData.price) <= 0)) {
        showError('Price is required for active categories');
        setLoading(false);
        return;
      }

      const submitData = {
        name: formData.name.trim(),
        status: formData.status,
        price: formData.status === 'active' ? parseFloat(formData.price) : null,
        billing_cycle: formData.billing_cycle,
        description: formData.description || null,
        image_url: formData.image_url || null,
      };

      if (isEditing && selectedCategory) {
        const response = await categoriesApi.updateCategory(selectedCategory.id, submitData);
        
        // FIXED: Update the category in state with the response data
        if (response.data && response.data.data) {
          setCategories(prev => prev.map(c => 
            c.id === selectedCategory.id ? { ...c, ...response.data.data } : c
          ));
        }
        showSuccess('Category updated successfully');
      } else {
        await categoriesApi.createCategory(submitData);
        showSuccess('Category created successfully');
      }

      setFormOpen(false);
      resetForm();
      await fetchData();
      
    } catch (err) {
      console.error('Failed to save category:', err);
      showError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setIsEditing(true);
    setFormData({
      name: category.name || '',
      status: category.status || 'active',
      price: category.price || '',
      billing_cycle: category.billing_cycle || 'monthly',
      description: category.description || '',
      image_url: category.image_url || '',
    });
    setFormOpen(true);
  };

  const handleDelete = (category) => {
    setSelectedCategory(category);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;

    try {
      setLoading(true);
      await categoriesApi.deleteCategory(selectedCategory.id);
      
      setCategories(prev => prev.filter(c => c.id !== selectedCategory.id));
      
      showSuccess(`Category "${selectedCategory.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedCategory(null);
      
    } catch (err) {
      console.error('Failed to delete category:', err);
      showError(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    return `${parseFloat(price).toLocaleString()} Birr`;
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
      field: 'image_url',
      headerName: 'Image',
      width: 80,
      render: (value) => (
        <Avatar
          src={value || '/api/placeholder/40/40'}
          variant="rounded"
          sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}
        >
          <Image fontSize="small" />
        </Avatar>
      ),
    },
    {
      field: 'name',
      headerName: 'Category Name',
      flex: 1,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
          {row.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {row.description.substring(0, 50)}...
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      render: (value) => (
        <Chip
          label={value === 'active' ? 'Active' : 'Coming Soon'}
          size="small"
          color={value === 'active' ? 'success' : 'warning'}
          icon={value === 'active' ? <CheckCircle fontSize="small" /> : <Pending fontSize="small" />}
          variant="outlined"
        />
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MonetizationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {row.status === 'active' ? formatPrice(value) : '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'billing_cycle',
      headerName: 'Billing',
      width: 100,
      render: (value) => (
        <Chip
          label={value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Monthly'}
          size="small"
          color="info"
          variant="outlined"
          icon={<AccessTime fontSize="small" />}
        />
      ),
    },
    {
      field: 'course_count',
      headerName: 'Courses',
      width: 100,
      render: (value) => (
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
      width: 120,
      render: (value, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Category">
            <IconButton
              size="small"
              onClick={() => handleEdit(row)}
              color="primary"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={row.course_count > 0 ? "Cannot delete category with courses" : "Delete Category"}>
            <span>
              <IconButton
                size="small"
                onClick={() => row.course_count === 0 && handleDelete(row)}
                color="error"
                disabled={row.course_count > 0}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access category management.
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
            Category Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage course categories (Grade Levels)
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
            Add Category
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

      {/* Categories Table */}
      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        onRefresh={fetchData}
        title={`Categories`}
        tableId="categories-table"
        searchable={true}
        pagination={true}
        rowKey="id"
      />

      {/* Add/Edit Category Dialog */}
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
              {isEditing ? 'Edit Category' : 'Add New Category'}
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
            {/* Image Upload Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Avatar
                  src={formData.image_url || ''}
                  variant="rounded"
                  sx={{ width: 100, height: 100, bgcolor: 'primary.light' }}
                >
                  <Image fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Category Image
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="category-image-upload"
                    type="file"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || loading}
                  />
                  <label htmlFor="category-image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Image />}
                      disabled={uploadingImage || loading}
                      sx={{ borderRadius: 2 }}
                    >
                      {uploadingImage ? <CircularProgress size={24} /> : (formData.image_url ? 'Change Image' : 'Upload Image')}
                    </Button>
                  </label>
                  {formData.image_url && (
                    <Button
                      size="small"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      color="error"
                      sx={{ mt: 1, ml: 2 }}
                    >
                      Remove
                    </Button>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Recommended: 400x400px, JPG or PNG
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Grade 9, Grade 10"
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status *</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status *"
                  disabled={loading}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="coming_soon">Coming Soon</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formData.status === 'active' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price (Birr) *"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Required for active categories"
                    disabled={loading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Billing Cycle *</InputLabel>
                    <Select
                      name="billing_cycle"
                      value={formData.billing_cycle}
                      onChange={handleInputChange}
                      label="Billing Cycle *"
                      disabled={loading}
                    >
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="semester">Semester</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            
            {formData.status === 'coming_soon' && (
              <Grid item xs={12}>
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                  Coming Soon categories will not be available for purchase and cannot have courses added.
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                placeholder="Enter category description..."
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setFormOpen(false)}
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
              (formData.status === 'active' && (!formData.price || parseFloat(formData.price) <= 0))
            }
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Category' : 'Create Category')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={
          selectedCategory ? 
            selectedCategory.course_count > 0 
              ? `Category "${selectedCategory.name}" has ${selectedCategory.course_count} courses and cannot be deleted. Delete the courses first.`
              : `Are you sure you want to delete category "${selectedCategory.name}"? This action cannot be undone.`
            : 'Delete category?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        severity={selectedCategory?.course_count > 0 ? 'warning' : 'error'}
        loading={loading}
        disabled={selectedCategory?.course_count > 0}
      />
    </Box>
  );
};

export default CategoryManager;