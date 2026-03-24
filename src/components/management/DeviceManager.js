import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import devicesApi from '../../api/devices';
import usersApi from '../../api/users';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import {
  renderPrimaryCell,
  renderTableChip,
  renderTableDate,
  renderTableId,
} from '../common/tableFormatters';
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
  Card,
  CardContent,
  Stack,
  LinearProgress,
  alpha,
  InputAdornment
} from '@mui/material';
import {
  Refresh,
  Delete,
  Devices,
  Tv,
  Smartphone,
  Link,
  LinkOff,
  Search,
  FilterList,
  Download,
  Visibility,
  Person,
  AccessTime,
  Info,
  CheckCircle,
  Cancel,
  Block,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const DeviceManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    primary: 0,      
    tv: 0,            
    paired: 0,
    active: 0,
  });
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unpairConfirmOpen, setUnpairConfirmOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    device_type: '',
    status: '',
    search: '',
    user_id: '',
  });

  // Cache keys
  const devicesCacheKey = getCacheKey('devices', filters);
  const usersCacheKey = 'users';
  const statsCacheKey = 'device-stats';

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch devices
      const devicesData = await getCachedData(
        getCacheKey('devices', filters),
        () => devicesApi.getAllDevices(filters),
        { forceRefresh }
      );
      
      // Fetch users
      const usersData = await getCachedData(
        usersCacheKey,
        () => usersApi.getAllUsers(),
        { forceRefresh }
      );
      
      setDevices(devicesData || []);
      setUsers(usersData || []);
      
      // Calculate stats from devices data (don't rely on stats API)
      const total = (devicesData || []).length;
      const primary = (devicesData || []).filter(d => d.device_category === 'primary' || d.device_type !== 'tv').length;
      const tv = (devicesData || []).filter(d => d.device_category === 'secondary' || d.device_type === 'tv').length;
      const paired = (devicesData || []).filter(d => d.is_paired === true).length;
      
      // Get unique users with devices
      const uniqueUserIds = new Set((devicesData || []).map(d => d.user_id).filter(id => id));
      const active = uniqueUserIds.size;
      
      setStats({
        total,
        primary,
        tv,
        paired,
        active,
      });
      
    } catch (err) {
      devError('Failed to fetch devices:', err);
      setError(err.response?.data?.message || 'Failed to load devices');
      showError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [filters, getCachedData, getCacheKey, showError]);

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchData(true);
  };

  const clearFilters = () => {
    setFilters({
      device_type: '',
      status: '',
      search: '',
      user_id: '',
    });
  };

  const handleRemoveDevice = (device) => {
    setSelectedDevice(device);
    setDeleteConfirmOpen(true);
  };

  const handleUnpairDevice = (device) => {
    setSelectedDevice(device);
    setUnpairConfirmOpen(true);
  };

  const confirmRemoveDevice = async () => {
    if (!selectedDevice) return;

    try {
      setLoading(true);
      
      await devicesApi.forceRemoveDevice(selectedDevice.source_id || selectedDevice.id, {
        reason: 'Removed by admin',
        source_table: selectedDevice.source_table || 'devices',
        user_id: selectedDevice.user_id
      });
      
      // Invalidate caches
      invalidateCache(/^devices/);
      invalidateCache(statsCacheKey);
      
      showSuccess('Device removed successfully');
      setDeleteConfirmOpen(false);
      setSelectedDevice(null);
      fetchData(true);
      
    } catch (err) {
      devError('Failed to remove device:', err);
      showError(err.response?.data?.message || 'Failed to remove device');
    } finally {
      setLoading(false);
    }
  };

  const confirmUnpairDevice = async () => {
    if (!selectedDevice) return;

    try {
      setLoading(true);
      
      if (selectedDevice.device_type === 'tv') {
        await devicesApi.updateDevice(selectedDevice.id, { is_paired: false });
        
        // Invalidate caches
        invalidateCache(/^devices/);
        invalidateCache(statsCacheKey);
        
        showSuccess('TV device unpaired successfully');
      } else {
        showSuccess('Primary devices cannot be unpaired - they are always paired');
      }
      
      setUnpairConfirmOpen(false);
      setSelectedDevice(null);
      fetchData(true);
      
    } catch (err) {
      devError('Failed to unpair device:', err);
      showError(err.response?.data?.message || 'Failed to unpair device');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const getDeviceIcon = (device) => {
    if (device.device_category === 'secondary' || device.device_type === 'tv') {
      return <Tv />;
    }
    return <Smartphone />;
  };

  const getDeviceColor = (device) => {
    if (device.device_category === 'secondary' || device.device_type === 'tv') {
      return 'info';
    }
    return 'success';
  };

  const getDeviceLabel = (device) => {
    if (device.device_category === 'secondary' || device.device_type === 'tv') {
      return 'TV (Secondary)';
    }
    return 'Primary Device';
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => renderTableId(value),
    },
    {
      field: 'device_id',
      headerName: 'Device ID',
      width: 200,
      render: (value) => renderPrimaryCell({
        primary: value ? `${value.substring(0, 20)}...` : 'N/A',
        primaryWeight: 500,
      }),
    },
    {
      field: 'username',
      headerName: 'User',
      width: 150,
      render: (value, row) => renderPrimaryCell({
        primary: value || 'Unknown',
        secondary: row.user_id ? `User ID: ${row.user_id}` : null,
      }),
    },
    {
      field: 'device_type',
      headerName: 'Type',
      width: 180,
      render: (value, row) => {
        const color = getDeviceColor(row);
        return renderTableChip(getDeviceLabel(row), {
          icon: getDeviceIcon(row),
          color,
        });
      },
    },
    {
      field: 'is_paired',
      headerName: 'Status',
      width: 120,
      render: (value, row) => {
        if (row.device_category === 'primary') {
          return renderTableChip('Active', {
            color: 'success',
            icon: <CheckCircle />,
          });
        }
        
        if (row.removed_by_admin) {
          return renderTableChip('Blocked', {
            color: 'error',
            icon: <Block />,
          });
        }
        
        return renderTableChip(value ? 'Paired' : 'Unpaired', {
          color: value ? 'success' : 'default',
          icon: value ? <Link /> : <LinkOff />,
        });
      },
    },
    {
      field: 'paired_at',
      headerName: 'Last Paired',
      width: 120,
      render: (value) => renderTableDate(value, { dateOnly: true, fallback: 'N/A' }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      render: (value, row) => (
        <Stack direction="row" spacing={1}>
          {row.device_category === 'secondary' && (
            <Tooltip title={row.is_paired ? "Unpair TV" : "Already Unpaired"}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => row.is_paired && handleUnpairDevice(row)}
                  disabled={!row.is_paired || row.removed_by_admin || loading}
                  color="warning"
                  sx={{
                    opacity: loading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <LinkOff fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Remove Device">
            <span>
              <IconButton
                size="small"
                onClick={() => handleRemoveDevice(row)}
                color="error"
                disabled={loading}
                sx={{
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access device management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <ManagementPageHeader
        title="Device Management"
        subtitle="Monitor primary devices, TV pairings, and device access across user accounts."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ borderRadius: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={async () => {
                try {
                  const response = await devicesApi.exportDevices('csv');
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'devices-export.csv');
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  showError('Failed to export devices');
                }
              }}
              disabled={loading || devices.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Refresh
            </Button>
          </>
        }
      />

      <ManagementSearchToolbar
        value={filters.search}
        onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        placeholder="Search devices by device ID or username..."
      />

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError('')}
        >
          {error}
          <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      <SummaryStrip
        items={[
          { label: 'Total Devices', value: stats.total, color: 'primary' },
          { label: 'Primary Devices', value: stats.primary, color: 'success' },
          { label: 'TV Devices', value: stats.tv, color: 'info' },
          { label: 'Users With Devices', value: stats.active, color: 'secondary' },
          { label: 'Paired TVs', value: stats.paired, color: 'warning' },
        ]}
      />

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Devices
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Device Type</InputLabel>
                <Select
                  name="device_type"
                  value={filters.device_type}
                  onChange={handleFilterChange}
                  label="Device Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="primary">Primary (Mobile/Tablet/Desktop)</MenuItem>
                  <MenuItem value="tv">Secondary (TV)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="paired">Paired</MenuItem>
                  <MenuItem value="unpaired">Unpaired</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select
                  name="user_id"
                  value={filters.user_id}
                  onChange={handleFilterChange}
                  label="User"
                >
                  <MenuItem value="">All Users</MenuItem>
                  {users.slice(0, 50).map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  sx={{ borderRadius: 2 }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="contained"
                  onClick={applyFilters}
                  sx={{ borderRadius: 2 }}
                >
                  Apply Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Devices Table */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={devices}
        loading={loading}
        onRefresh={handleRefresh}
        title="Devices"
        rowKey={(row) => `${row.source_table || 'devices'}_${row.source_id || row.id || row.user_id}`}
      />

      {/* Information Box */}
      <Alert 
        severity="info" 
        variant="outlined" 
        sx={{ mt: 3, borderRadius: 2 }}
        icon={<Info />}
      >
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Device Management Guide
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>Primary Devices:</strong> Mobile phones, tablets, and desktops - stored in user accounts
          <br />
          • <strong>Secondary Devices:</strong> TVs only - can be paired/unpaired
          <br />
          • <strong>Remove Device:</strong> Blocks the device, requires new setup
        </Typography>
      </Alert>

      {/* Remove Device Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmRemoveDevice}
        title="Remove Device"
        message={
          selectedDevice?.device_category === 'primary'
            ? `Are you sure you want to remove the primary device? The user will need to set up a new device.`
            : `Are you sure you want to remove this TV device?`
        }
        confirmText="Remove Device"
        cancelText="Cancel"
        severity="error"
        loading={loading}
      />

      {/* Unpair TV Device Confirmation Dialog */}
      <ConfirmDialog
        open={unpairConfirmOpen}
        onClose={() => setUnpairConfirmOpen(false)}
        onConfirm={confirmUnpairDevice}
        title="Unpair TV Device"
        message="Are you sure you want to unpair this TV device?"
        confirmText="Unpair TV"
        cancelText="Cancel"
        severity="warning"
        loading={loading}
      />
    </Box>
  );
};

export default DeviceManager;
