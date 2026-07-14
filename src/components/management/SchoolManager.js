import React, { useState, useEffect, useMemo } from 'react';
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
  
} from '@mui/material';
import { TrainLoadingBar } from '../common/Loading';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import usersApi from '../../api/users';
import schoolsApi from '../../api/schools';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import {
  renderCountChip,
  renderPrimaryCell,
  renderTableDate,
  renderTableId,
} from '../common/tableFormatters';
import { devError } from '../../utils/devLogger';

const SchoolManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const getFriendlyFormError = (error, fallback, duplicateMessage = null) => {
    const rawMessage = String(error?.response?.data?.message || error?.message || '');
    if (duplicateMessage && /already exists|duplicate entry|unique constraint/i.test(rawMessage)) {
      return duplicateMessage;
    }
    return error?.userMessage || error?.response?.data?.message || fallback;
  };

  // Cache key
  const schoolsCacheKey = 'schools';

  const fetchSchools = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      const [schoolsData, usersData] = await Promise.all([
        getCachedData(
          schoolsCacheKey,
          () => schoolsApi.getAllSchools(),
          { forceRefresh }
        ),
        getCachedData(
          'users-school-counts',
          () => usersApi.getAllUsers({ limit: 1000 }),
          { forceRefresh }
        ),
      ]);
      
      setSchools(schoolsData || []);
      setUsers(usersData || []);
    } catch (error) {
      devError('Failed to fetch schools:', error);
      showError('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchSchools();
    }
  }, [isAdmin]);

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

      // Invalidate cache after modification
      invalidateCache(schoolsCacheKey);
      
      setFormOpen(false);
      resetForm();
      await fetchSchools(true); // Force refresh
    } catch (error) {
      devError('Failed to save school:', error);
      showError(getFriendlyFormError(error, 'Failed to save school', 'A school with that name already exists.'));
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
      
      // Invalidate cache after deletion
      invalidateCache(schoolsCacheKey);
      
      setSchools(prev => prev.filter(s => s.id !== selectedSchool.id));
      showSuccess(`School "${selectedSchool.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedSchool(null);
    } catch (error) {
      devError('Failed to delete school:', error);
      showError(getFriendlyFormError(error, 'Failed to delete school'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSchools(true);
  };

  const getSchoolMatchKeys = (item) => {
    const keys = new Set();
    const addId = (value) => {
      if (value !== undefined && value !== null && value !== '') {
        const normalized = Number(value);
        if (Number.isFinite(normalized)) {
          keys.add(`id:${normalized}`);
        }
      }
    };
    const addName = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized) {
        keys.add(`name:${normalized}`);
      }
    };

    addId(item?.school_id);
    addId(item?.schoolId);
    addId(item?.selected_school_id);
    addId(item?.selectedSchoolId);
    addId(item?.school?.id);
    addId(item?.school?.school_id);

    addName(item?.school_name);
    addName(item?.schoolName);
    addName(item?.selected_school_name);
    addName(item?.school?.name);
    addName(item?.school?.school_name);

    return Array.from(keys);
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => renderTableId(value),
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      render: (value) => renderPrimaryCell({ primary: value }),
    },
    {
      field: 'student_count',
      headerName: 'Students',
      width: 110,
      render: (value) => renderCountChip(value, { color: 'success' }),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      render: (value) => renderTableDate(value),
    },
    {
      field: 'updated_at',
      headerName: 'Updated At',
      width: 150,
      render: (value) => renderTableDate(value),
    },
  ];

  const enrichedSchools = useMemo(() => {
    const studentCounts = new Map();

    users.forEach((user) => {
      const keys = getSchoolMatchKeys(user);
      if (keys.length === 0) return;
      keys.forEach((key) => {
        studentCounts.set(key, (studentCounts.get(key) || 0) + 1);
      });
    });

    return schools
      .map((school) => ({
        ...school,
        student_count:
          studentCounts.get(`id:${Number(school.id)}`) ||
          studentCounts.get(`name:${String(school.name || '').trim().toLowerCase()}`) ||
          0,
      }))
      .sort((a, b) => {
        if ((b.student_count || 0) !== (a.student_count || 0)) {
          return (b.student_count || 0) - (a.student_count || 0);
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [schools, users]);

  const filteredSchools = useMemo(() => {
    if (!searchQuery) return enrichedSchools;
    const query = searchQuery.toLowerCase();
    return enrichedSchools.filter((school) =>
      school.name?.toLowerCase().includes(query)
    );
  }, [enrichedSchools, searchQuery]);

  const topSchool = enrichedSchools[0];
  const totalStudents = enrichedSchools.reduce((sum, school) => sum + (Number(school.student_count) || 0), 0);

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
      <ManagementPageHeader
        title="School Management"
        subtitle="Manage schools for student registration"
        actions={
          <>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
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
          </>
        }
      />

      {/* Loading Indicator */}
      {loading && <TrainLoadingBar sx={{ mb: 3, borderRadius: 2 }} />}

      <ManagementSearchToolbar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search schools by name..."
      />

      <SummaryStrip
        items={[
          { label: 'Total Schools', value: schools.length, color: 'primary' },
          { label: 'Total Students', value: totalStudents, color: 'success' },
          { label: 'Top School', value: topSchool ? `${topSchool.name} (${topSchool.student_count || 0})` : '-', color: 'secondary' },
        ]}
      />

      {/* Schools Table */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredSchools}
        loading={loading}
        onRefresh={handleRefresh}
        onEdit={handleEdit}
        onDelete={handleDelete}
        title="Schools"
        rowKey="id"
        searchable={false}
        defaultOrder="desc"
        defaultOrderBy="student_count"
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
          <Typography component="div" variant="h6" fontWeight="bold">
            {editingId ? 'Edit School' : 'Add New School'}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <FastTextField
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
