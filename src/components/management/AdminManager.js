import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  AdminPanelSettings,
  Close,
  Delete,
  Edit,
  LockReset,
  Refresh,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import adminsApi from '../../api/admins';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import FastTextField from '../common/FastTextField';
import {
  renderPrimaryCell,
  renderTableChip,
  renderTableDate,
  renderTableId,
} from '../common/tableFormatters';
import { devError } from '../../utils/devLogger';

const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
];

const AdminManager = () => {
  const { user, isSuperAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'admin',
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminsApi.getAllAdmins();
      const adminsData = response?.data?.data || [];
      setAdmins(Array.isArray(adminsData) ? adminsData : []);
    } catch (error) {
      devError('Failed to fetch admins:', error);
      showError(error?.response?.data?.message || 'Failed to load admin accounts');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchAdmins();
    } else {
      setLoading(false);
    }
  }, [fetchAdmins, isSuperAdmin]);

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'admin',
    });
    setSelectedAdmin(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setSelectedAdmin(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showError('Admin name is required');
      return false;
    }

    if (!formData.username.trim()) {
      showError('Username is required');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      showError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    if (!isEditing && formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading(true);

      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        role: formData.role,
      };

      if (!isEditing) {
        payload.password = formData.password;
        await adminsApi.createAdmin(payload);
        showSuccess('Admin account created successfully');
      } else {
        await adminsApi.updateAdmin(selectedAdmin.id, payload);
        showSuccess('Admin account updated successfully');
      }

      closeForm();
      fetchAdmins();
    } catch (error) {
      devError('Failed to save admin:', error);
      const duplicateMessage = /duplicate entry|already exists|username.*taken/i.test(
        String(error?.response?.data?.message || error?.message || '')
      )
        ? 'An admin with that username already exists.'
        : null;
      showError(
        duplicateMessage ||
        error?.userMessage ||
        error?.response?.data?.message ||
        'Failed to save admin account'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setIsEditing(true);
    setFormData({
      name: admin.name || '',
      username: admin.username || '',
      password: '',
      role: admin.role || 'admin',
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;

    try {
      setActionLoading(true);
      await adminsApi.deleteAdmin(selectedAdmin.id);
      showSuccess('Admin account deactivated successfully');
      closeDeleteConfirm();
      fetchAdmins();
    } catch (error) {
      devError('Failed to delete admin:', error);
      showError(getFriendlyActionError(error, 'Failed to deactivate admin account'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;

    if (!resetPasswordData.new_password || resetPasswordData.new_password.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      showError('Password confirmation does not match');
      return;
    }

    try {
      setActionLoading(true);
      await adminsApi.resetAdminPassword(selectedAdmin.id, {
        new_password: resetPasswordData.new_password,
      });
      setResetPasswordOpen(false);
      setResetPasswordData({ new_password: '', confirm_password: '' });
      setSelectedAdmin(null);
      showSuccess('Admin password reset successfully');
    } catch (error) {
      devError('Failed to reset admin password:', error);
      showError(getFriendlyActionError(error, 'Failed to reset admin password'));
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      sortable: true,
      render: (value) => renderTableId(value),
    },
    {
      field: 'name',
      headerName: 'Name',
      sortable: true,
      render: (value, row) => renderPrimaryCell({
        primary: value,
        secondary: row.username ? `@${row.username}` : null,
      }),
    },
    {
      field: 'username',
      headerName: 'Username',
      sortable: true,
      render: (value) => renderPrimaryCell({ primary: value ? `@${value}` : '-' }),
    },
    {
      field: 'role',
      headerName: 'Role',
      render: (value) => renderTableChip(value === 'superadmin' ? 'Superadmin' : 'Admin', {
        color: value === 'superadmin' ? 'secondary' : 'primary',
      }),
    },
    {
      field: 'last_login',
      headerName: 'Last Login',
      render: (value) => renderTableDate(value, { fallback: 'Never' }),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      render: (value) => renderTableDate(value),
    },
  ], []);

  if (!isSuperAdmin()) {
    return (
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom>
          Admin Accounts
        </Typography>
        <Typography color="text.secondary">
          Only a superadmin can create or manage other admin accounts.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Admin Accounts
          </Typography>
          <Typography color="text.secondary">
            Create and maintain separate admin logins without breaking production auth flow.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAdmins}
            disabled={loading || actionLoading}
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
            disabled={loading || actionLoading}
          >
            Add Admin
          </Button>
        </Stack>
      </Stack>

      {(loading && admins.length === 0) && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable
          showToolbar={false}
          title="Admin Accounts"
          data={admins}
          columns={columns}
          loading={loading}
          rowKey="id"
          onRefresh={fetchAdmins}
          onEdit={handleEdit}
          onDelete={(admin) => {
            setSelectedAdmin(admin);
            setDeleteConfirmOpen(true);
          }}
          onView={(admin) => {
            setSelectedAdmin(admin);
            setResetPasswordOpen(true);
          }}
          searchable
        />
      </Paper>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm" keepMounted disableRestoreFocus>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <AdminPanelSettings color="primary" />
              <Typography variant="h6">
                {isEditing ? 'Edit Admin Account' : 'Create Admin Account'}
              </Typography>
            </Stack>
            <IconButton onClick={closeForm}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={(event) => setFormData((prev) => ({ ...prev, username: event.target.value }))}
              />
            </Grid>
            {!isEditing && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Role"
                value={formData.role}
                onChange={(event) => setFormData((prev) => ({ ...prev, role: event.target.value }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={actionLoading}
            startIcon={<Save />}
          >
            {isEditing ? 'Save Changes' : 'Create Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetPasswordOpen}
        onClose={() => {
          setResetPasswordOpen(false);
          setSelectedAdmin(null);
          setResetPasswordData({ new_password: '', confirm_password: '' });
        }}
        fullWidth
        maxWidth="sm"
        keepMounted
        disableRestoreFocus
      >
        <DialogTitle>Reset Admin Password</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Reset password for <strong>{selectedAdmin?.name || selectedAdmin?.username}</strong>.
          </Typography>
          <Stack spacing={2}>
            <FastTextField
              fullWidth
              label="New Password"
              type={showResetPassword ? 'text' : 'password'}
              value={resetPasswordData.new_password}
              onChange={(event) => setResetPasswordData((prev) => ({ ...prev, new_password: event.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowResetPassword((prev) => !prev)} edge="end">
                      {showResetPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type={showResetPassword ? 'text' : 'password'}
              value={resetPasswordData.confirm_password}
              onChange={(event) => setResetPasswordData((prev) => ({ ...prev, confirm_password: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetPasswordOpen(false);
              setSelectedAdmin(null);
              setResetPasswordData({ new_password: '', confirm_password: '' });
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={actionLoading}
            startIcon={<LockReset />}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Deactivate Admin Account"
        message={`Deactivate ${selectedAdmin?.name || selectedAdmin?.username}? They will no longer be able to sign in.`}
        confirmText="Deactivate"
        severity="error"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </Box>
  );
};

export default AdminManager;
