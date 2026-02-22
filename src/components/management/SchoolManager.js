import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
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
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
  });

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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        showError('School name is required');
        return;
      }

      if (editingId) {
        await schoolsApi.updateSchool(editingId, formData.name.trim());
        showSuccess('School updated successfully');
      } else {
        await schoolsApi.createSchool(formData.name.trim());
        showSuccess('School created successfully');
      }

      setFormOpen(false);
      resetForm();
      fetchSchools();
    } catch (error) {
      console.error('Failed to save school:', error);
      showError(error.response?.data?.message || 'Failed to save school');
    }
  };

  const handleEdit = (school) => {
    setEditingId(school.id);
    setFormData({
      name: school.name,
    });
    setFormOpen(true);
  };

  const handleDelete = (school) => {
    setSelectedSchool(school);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSchool) return;

    try {
      await schoolsApi.deleteSchool(selectedSchool.id);
      
      // Optimistic update
      setSchools(prev => prev.filter(s => s.id !== selectedSchool.id));
      
      showSuccess(`School "${selectedSchool.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedSchool(null);
    } catch (error) {
      console.error('Failed to delete school:', error);
      showError(error.response?.data?.message || 'Failed to delete school');
    }
  };

  const columns = [
    {
      field: 'name',
      headerName: 'School Name',
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
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      type: 'datetime',
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
        >
          Add School
        </Button>
      </Box>

      {/* Schools Table */}
      <DataTable
        columns={columns}
        data={schools}
        loading={loading}
        onRefresh={fetchSchools}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title={`Schools `}
      />

      {/* Add/Edit Form Dialog */}
      {formOpen && (
        <Paper
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 500,
            p: 3,
            zIndex: 1300,
          }}
          elevation={24}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {editingId ? 'Edit School' : 'Add New School'}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="School Name *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              autoFocus
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.name.trim()}
              >
                {editingId ? 'Update School' : 'Create School'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Overlay for form */}
      {formOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1299,
          }}
          onClick={() => {
            setFormOpen(false);
            resetForm();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete School"
        message={`Are you sure you want to delete school "${selectedSchool?.name}"? 
        ${selectedSchool?.userCount > 0 ? 'This school has assigned users and cannot be deleted.' : ''}`}
        confirmText="Delete"
        cancelText="Cancel"
        severity={selectedSchool?.userCount > 0 ? "warning" : "error"}
        loading={loading}
      />
    </Box>
  );
};

export default SchoolManager;