import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import systemLogsApi from '../../api/systemLogs';
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
  Grid,
  Card,
  CardContent,
  Divider,
  Stack,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  alpha,
} from '@mui/material';
import {
  Refresh,
  Delete,
  Download,
  FilterList,
  Clear,
  Search,
  Info,
  Warning,
  Error as ErrorIcon,
  BugReport,
  CalendarToday,
  Person,
  Code,
  ExpandMore,
  Visibility,
  CloudDownload,
  DateRange,
  AccessTime,
  Storage,
  Close,
} from '@mui/icons-material';

const SystemLogsManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    counts: { total: 0, info: 0, warn: 0, error: 0, debug: 0 },
    summary: {
      days_with_logs: 0,
      logs_per_day: 0,
      error_rate: 0,
      warning_rate: 0
    }
  });
  
  const [filters, setFilters] = useState({
    level: '',
    action: '',
    start_date: '',
    end_date: '',
    user_id: '',
    search: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 0,
    rowsPerPage: 25,
    total: 0
  });
  
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDays, setClearDays] = useState(30);
  const [exportFormat, setExportFormat] = useState('csv');

  // Cache keys
  const logsCacheKey = getCacheKey('system-logs', { ...filters, page: pagination.page, limit: pagination.rowsPerPage });
  const statsCacheKey = 'system-logs-stats';

  const fetchLogs = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.rowsPerPage,
        offset: pagination.page * pagination.rowsPerPage
      };
      
      if (filters.level) params.level = filters.level;
      if (filters.action) params.action = filters.action;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.search) params.search = filters.search;
      
      const response = await systemLogsApi.getSystemLogs(params);
      
      // Handle different response structures
      let logsData = [];
      let total = 0;
      
      if (response?.data) {
        if (Array.isArray(response.data)) {
          logsData = response.data;
          total = logsData.length;
        } else if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            logsData = response.data.data;
            total = logsData.length;
          } else if (response.data.data.logs) {
            logsData = response.data.data.logs || [];
            total = response.data.data.pagination?.total || logsData.length;
          }
        }
      }
      
      setLogs(logsData || []);
      setPagination(prev => ({ ...prev, total: total || logsData.length }));
      setError('');
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
      setError(err.response?.data?.message || 'Failed to load system logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogStats = async (forceRefresh = false) => {
    try {
      const response = await systemLogsApi.getLogStats();
      
      if (response.data?.success && response.data?.data) {
        setStats(response.data.data);
      } else if (response.data?.data) {
        setStats(response.data.data);
      } else {
        // Calculate stats from logs if API fails
        const total = logs.length;
        const info = logs.filter(l => l.level === 'info' || !l.level).length;
        const warn = logs.filter(l => l.level === 'warn' || l.level === 'warning').length;
        const error = logs.filter(l => l.level === 'error').length;
        const debug = logs.filter(l => l.level === 'debug').length;
        
        setStats({
          counts: { total, info, warn, error, debug },
          summary: {
            days_with_logs: 1,
            logs_per_day: total,
            error_rate: total ? (error / total) * 100 : 0,
            warning_rate: total ? (warn / total) * 100 : 0
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch log stats:', err);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchLogs();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin()) {
      fetchLogs();
    }
  }, [pagination.page, pagination.rowsPerPage, filters.level, filters.action, filters.start_date, filters.end_date, filters.user_id]);

  useEffect(() => {
    if (logs.length > 0) {
      fetchLogStats();
    }
  }, [logs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 0 }));
    fetchLogs(true);
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      action: '',
      start_date: '',
      end_date: '',
      user_id: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 0 }));
    fetchLogs(true);
  };

  const handleChangePage = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    setPagination(prev => ({
      ...prev,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleClearLogs = async () => {
    try {
      setActionLoading(true);
      await systemLogsApi.clearOldLogs(clearDays);
      showSuccess(`Successfully cleared logs older than ${clearDays} days`);
      
      // Invalidate caches
      invalidateCache(/^system-logs/);
      invalidateCache(statsCacheKey);
      
      setClearDialogOpen(false);
      fetchLogs(true);
      fetchLogStats(true);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to clear logs');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      setActionLoading(true);
      const params = {};
      if (filters.level) params.level = filters.level;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const response = await systemLogsApi.exportLogs(exportFormat, params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `system-logs-${new Date().toISOString().split('T')[0]}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showSuccess(`Logs exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to export logs');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs(true);
    fetchLogStats(true);
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error': return '#f44336';
      case 'warn': return '#ff9800';
      case 'info': return '#2196f3';
      case 'debug': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getLevelIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'error': return <ErrorIcon fontSize="small" />;
      case 'warn': return <Warning fontSize="small" />;
      case 'info': return <Info fontSize="small" />;
      case 'debug': return <BugReport fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access system logs.
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
            System Logs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor system activities, errors, and performance metrics
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
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
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading || actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Delete />}
            onClick={() => setClearDialogOpen(true)}
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Clear Old Logs
          </Button>
        </Stack>
      </Box>

      {/* Loading Indicator */}
      {(loading || actionLoading) && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError('')}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Statistics Cards - Now show from logs data */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Logs"
            value={logs.length}
            icon={<Storage />}
            color="#1976d2"
            subtitle={`${logs.length} entries`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Errors"
            value={logs.filter(l => l.level === 'error').length}
            icon={<ErrorIcon />}
            color="#f44336"
            subtitle={`${logs.length ? ((logs.filter(l => l.level === 'error').length / logs.length) * 100).toFixed(1) : 0}% of total`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Warnings"
            value={logs.filter(l => l.level === 'warn' || l.level === 'warning').length}
            icon={<Warning />}
            color="#ff9800"
            subtitle={`${logs.length ? ((logs.filter(l => l.level === 'warn' || l.level === 'warning').length / logs.length) * 100).toFixed(1) : 0}% of total`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Info"
            value={logs.filter(l => l.level === 'info' || !l.level).length}
            icon={<Info />}
            color="#2196f3"
            subtitle="Information logs"
          />
        </Grid>
      </Grid>

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Logs
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search in logs..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Level</InputLabel>
                <Select
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                  label="Log Level"
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Action"
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                placeholder="e.g., user_login"
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="User ID"
                name="user_id"
                value={filters.user_id}
                onChange={handleFilterChange}
                placeholder="User ID"
              />
            </Grid>
            
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  size="small"
                >
                  Clear Filters
                </Button>
                <Button
                  variant="contained"
                  onClick={applyFilters}
                  size="small"
                >
                  Apply Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Logs Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold">
            Log Entries ({logs.length})
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                displayEmpty
                disabled={actionLoading}
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Export Logs">
              <span>
                <IconButton 
                  onClick={handleExportLogs} 
                  disabled={logs.length === 0 || actionLoading}
                  color="primary"
                >
                  <Download />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {loading && logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading system logs...
            </Typography>
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Storage sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No system logs found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {filters.level || filters.action || filters.search ? 'Try adjusting your filters' : 'Logs will appear here as system events occur'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Tooltip title={new Date(log.created_at).toLocaleString()}>
                          <Typography variant="body2">
                            {new Date(log.created_at).toLocaleString()}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getLevelIcon(log.level)}
                          label={log.level?.toUpperCase() || 'INFO'}
                          size="small"
                          sx={{
                            bgcolor: alpha(getLevelColor(log.level), 0.1),
                            color: getLevelColor(log.level),
                            border: `1px solid ${alpha(getLevelColor(log.level), 0.3)}`,
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {log.action || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
                          {log.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.user_id ? (
                          <Box>
                            <Typography variant="body2">
                              ID: {log.user_id}
                            </Typography>
                            {log.user_role && (
                              <Typography variant="caption" color="text.secondary">
                                {log.user_role}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            System
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(log)}
                              disabled={actionLoading}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page}
              onPageChange={handleChangePage}
              rowsPerPage={pagination.rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Log Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Code />
              <Typography variant="h6">Log Details</Typography>
            </Box>
            <IconButton onClick={() => setDetailsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedLog && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ID: {selectedLog.id}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {selectedLog.action || 'System Event'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Level
                </Typography>
                <Chip
                  icon={getLevelIcon(selectedLog.level)}
                  label={selectedLog.level?.toUpperCase() || 'INFO'}
                  size="small"
                  sx={{
                    bgcolor: alpha(getLevelColor(selectedLog.level), 0.1),
                    color: getLevelColor(selectedLog.level),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedLog.description || 'No description'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Details
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900' }}>
                  <pre style={{ margin: 0, color: '#fff', overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                  </pre>
                </Paper>
              </Grid>

              {selectedLog.user_id && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User ID
                    </Typography>
                    <Typography variant="body1">
                      {selectedLog.user_id}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User Role
                    </Typography>
                    <Typography variant="body1">
                      {selectedLog.user_role || 'N/A'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Logs Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear Old Logs</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            This will permanently delete system logs older than the specified number of days.
            This action cannot be undone.
          </Typography>
          
          <TextField
            fullWidth
            type="number"
            label="Days to keep"
            value={clearDays}
            onChange={(e) => setClearDays(parseInt(e.target.value) || 30)}
            InputProps={{ inputProps: { min: 1, max: 365 } }}
            sx={{ mt: 2 }}
            disabled={actionLoading}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Logs older than {clearDays} days will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleClearLogs} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Clear Logs'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemLogsManager;