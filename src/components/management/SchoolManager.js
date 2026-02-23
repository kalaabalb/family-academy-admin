import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import schoolsApi from '../../api/schools';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';

const SchoolManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    if (isAdmin()) {
      fetchSchools();
    }
  }, [isAdmin]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await schoolsApi.getAllSchools();
      setSchools(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      showError('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        showError('School name is required');
        return;
      }

      setLoading(true);

      if (editingId) {
        await schoolsApi.updateSchool(editingId, formData.name.trim());
        showSuccess('School updated successfully');
      } else {
        await schoolsApi.createSchool(formData.name.trim());
        showSuccess('School created successfully');
      }

      setFormOpen(false);
      resetForm();
      await fetchSchools();
    } catch (error) {
      console.error('Failed to save school:', error);
      showError(error.response?.data?.message || 'Failed to save school');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (school) => {
    setEditingId(school.id);
    setFormData({ name: school.name });
    setFormOpen(true);
  };

  const handleDelete = (school) => {
    setSelectedSchool(school);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSchool) return;

    try {
      setLoading(true);
      await schoolsApi.deleteSchool(selectedSchool.id);
      
      setSchools(prev => prev.filter(s => s.id !== selectedSchool.id));
      showSuccess(`School "${selectedSchool.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedSchool(null);
    } catch (error) {
      console.error('Failed to delete school:', error);
      showError(error.response?.data?.message || 'Failed to delete school');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'School Name',
      flex: 1,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      type: 'datetime',
      width: 150,
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      type: 'datetime',
      width: 150,
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access school management.
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
            School Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage schools for student registration
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSchools}
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
            Add School
          </Button>
        </Box>
      </Box>

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Schools Table */}
      <DataTable
        columns={columns}
        data={schools}
        loading={loading}
        onRefresh={fetchSchools}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Schools"
        rowKey="id"
      />

      {/* Add/Edit School Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !loading && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {editingId ? 'Edit School' : 'Add New School'}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="School Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            autoFocus
            disabled={loading}
          />
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
            disabled={loading || !formData.name.trim()}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Saving...' : (editingId ? 'Update School' : 'Create School')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete School"
        message={`Are you sure you want to delete school "${selectedSchool?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />
    </Box>
  );
};

export default SchoolManager;