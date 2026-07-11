import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import systemLogsApi from '../../api/systemLogs';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import {
  renderPrimaryCell,
  renderTableChip,
  renderTableDate,
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
  
  alpha,
} from '@mui/material';
import { TrainLoadingBar } from '../common/Loading';
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
import { devError } from '../../utils/devLogger';

const humanizeLogText = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseLogDetails = (details) => {
  if (!details) return {};

  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }

  if (typeof details === 'object') {
    return details;
  }

  return {};
};

const isTechnicalNoiseLog = (log) => {
  const action = String(log.action || '').toLowerCase();
  const description = String(log.description || '').toLowerCase();
  const details = parseLogDetails(log.details);

  if (action === 'request' || action === 'response' || action === 'http_access') {
    return true;
  }

  if (
    /^\d+([ _]\d+){4,}/.test(action) ||
    description.includes('http/1.1') ||
    description.includes('get /api/') ||
    description.includes('post /api/') ||
    description.includes('put /api/') ||
    description.includes('delete /api/') ||
    description.includes('patch /api/')
  ) {
    return true;
  }

  if (
    (details.endpoint || details.url || details.method) &&
    !String(log.level || '').match(/error|warn/i)
  ) {
    return true;
  }

  return false;
};

const getReadableLogAction = (log) => {
  const action = String(log.action || '').toLowerCase();
  const entity = humanizeLogText(log.entity_type || log.resource || '');
  const details = parseLogDetails(log.details);
  const actor = details.adminUsername || details.teacherUsername || log.user_name || log.username;

  if (action === 'no_schedules_due_for_processing') return 'No Notifications Due';
  if (action === 'starting_notification_scheduler_job') return 'Notification Scheduler Started';
  if (action === 'scheduled_content_check_completed') return 'Scheduled Content Check Completed';
  if (action === 'starting_scheduled_content_release_job') return 'Scheduled Content Release Started';
  if (action === 'no_notes_scheduled_for_release') return 'No Notes Due';
  if (action === 'no_videos_scheduled_for_release') return 'No Videos Due';
  if (action === 'no_chapters_scheduled_for_release') return 'No Chapters Due';
  if (isTechnicalNoiseLog(log)) return 'Background Request';
  if (action.includes('login')) return actor ? `${actor} Signed In` : 'User Sign In';
  if (action.includes('logout')) return actor ? `${actor} Signed Out` : 'User Sign Out';
  if (action.includes('created') || action.includes('create')) return actor ? `${actor} Created ${entity || 'Record'}` : `${entity || 'Record'} Created`;
  if (action.includes('updated') || action.includes('update') || action.includes('edit')) return actor ? `${actor} Updated ${entity || 'Record'}` : `${entity || 'Record'} Updated`;
  if (action.includes('deleted') || action.includes('delete') || action.includes('remove')) return actor ? `${actor} Removed ${entity || 'Record'}` : `${entity || 'Record'} Removed`;
  if (action.includes('verified')) return actor ? `${actor} Verified a Record` : 'Record Verified';
  if (action.includes('scheduled')) return actor ? `${actor} Scheduled an Item` : 'Item Scheduled';
  if (action.includes('payment')) return actor ? `${actor} Payment Activity` : 'Payment Activity';
  if (action.includes('subscription')) return actor ? `${actor} Subscription Activity` : 'Subscription Activity';
  if (action.includes('question')) return actor ? `${actor} Question Activity` : 'Question Activity';
  if (action.includes('exam')) return actor ? `${actor} Exam Activity` : 'Exam Activity';
  if (action.includes('video')) return actor ? `${actor} Video Activity` : 'Video Activity';
  if (action.includes('note')) return actor ? `${actor} Note Activity` : 'Note Activity';
  if (action.includes('chapter')) return actor ? `${actor} Chapter Activity` : 'Chapter Activity';
  if (action.includes('error')) return entity ? `${entity} Error` : 'System Error';

  return humanizeLogText(log.action) || 'System Activity';
};

const getReadableLogDescription = (log) => {
  const details = parseLogDetails(log.details);
  const action = String(log.action || '').toLowerCase();
  const endpoint = details.endpoint || details.url;
  const method = details.method;
  const statusCode = details.statusCode;

  if (action === 'no_schedules_due_for_processing') {
    return 'There were no scheduled notifications waiting to be sent at this check.';
  }

  if (action === 'starting_notification_scheduler_job') {
    return 'The notification scheduler started its regular background check.';
  }

  if (action === 'scheduled_content_check_completed') {
    return 'The platform finished checking scheduled content releases.';
  }

  if (action === 'starting_scheduled_content_release_job') {
    return 'The platform started a scheduled content release cycle.';
  }

  if (action === 'no_notes_scheduled_for_release') {
    return 'No notes were due for release at this time.';
  }

  if (action === 'no_videos_scheduled_for_release') {
    return 'No videos were due for release at this time.';
  }

  if (action === 'no_chapters_scheduled_for_release') {
    return 'No chapters were due for release at this time.';
  }

  if (isTechnicalNoiseLog(log)) {
    return 'A background API request was recorded.';
  }

  if (statusCode >= 500) {
    return `The system failed${endpoint ? ` on ${endpoint}` : ''} with a server error.`;
  }

  if (statusCode >= 400) {
    return `The action failed${endpoint ? ` on ${endpoint}` : ''}.`;
  }

  if ((action.includes('admin') || action.includes('teacher')) && endpoint) {
    return `${humanizeLogText(method || 'request')} ${endpoint}${statusCode ? ` finished with status ${statusCode}` : ''}.`;
  }

  if (log.description && typeof log.description === 'string' && !/http\/1\.1|\/api\//i.test(log.description)) {
    return log.description;
  }

  if (log.message && typeof log.message === 'string' && !/http\/1\.1|\/api\//i.test(log.message)) {
    return log.message;
  }

  const entity = humanizeLogText(log.entity_type || log.resource || 'record').toLowerCase();
  const level = String(log.level || 'info').toLowerCase();

  if (level === 'error') {
    return `The system recorded an error related to ${entity}.`;
  }

  if (level === 'warn' || level === 'warning') {
    return `The system flagged ${entity} for review.`;
  }

  return `An update was recorded for ${entity}.`;
};

const getReadableUser = (log) => {
  const details = parseLogDetails(log.details);
  if (details.adminUsername) return details.adminUsername;
  if (details.teacherUsername) return details.teacherUsername;
  if (log.user_name) return log.user_name;
  if (log.username) return log.username;
  if (log.user_id) return `User ${log.user_id}`;
  return 'System';
};

const getLevelChipColor = (level) => {
  switch (String(level || '').toLowerCase()) {
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
};

const formatLogDetails = (details) => {
  if (!details) {
    return 'No extra details were recorded for this activity.';
  }

  if (typeof details === 'string') {
    return details;
  }

  return JSON.stringify(details, null, 2);
};

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

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;
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
      
      const response = await getCachedData(
        logsCacheKey,
        () => systemLogsApi.getSystemLogs(params),
        { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
      );
      
      // Handle different response structures
      let logsData = [];
      let total = 0;
      
      const responseData = response?.data ? response.data : response;

      if (responseData) {
        if (Array.isArray(responseData)) {
          logsData = responseData;
          total = logsData.length;
        } else if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            logsData = responseData.data;
            total = logsData.length;
          } else if (responseData.data.logs) {
            logsData = responseData.data.logs || [];
            total = responseData.data.pagination?.total || logsData.length;
          }
        } else if (Array.isArray(responseData.logs)) {
          logsData = responseData.logs;
          total = responseData.pagination?.total || logsData.length;
        }
      }
      
      const rawLogs = Array.isArray(logsData) ? logsData : [];
      const visibleLogs = rawLogs.filter((log) => !isTechnicalNoiseLog(log));
      const effectiveLogs = visibleLogs.length > 0 ? visibleLogs : rawLogs;
      setLogs(effectiveLogs);
      setPagination(prev => ({
        ...prev,
        total: visibleLogs.length > 0 ? visibleLogs.length : (total || rawLogs.length),
      }));
      setError('');
    } catch (err) {
      devError('Failed to fetch system logs:', err);
      setError(err.response?.data?.message || 'Failed to load system logs');
      setLogs([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const fetchLogStats = async (forceRefresh = false) => {
    try {
      const response = await getCachedData(
        statsCacheKey,
        () => systemLogsApi.getLogStats(),
        { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
      );
      const responseData = response?.data ? response.data : response;
      
      if (responseData?.success && responseData?.data) {
        setStats(responseData.data);
      } else if (responseData?.data) {
        setStats(responseData.data);
      } else if (responseData?.counts || responseData?.summary) {
        setStats(responseData);
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
      devError('Failed to fetch log stats:', err);
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
  }, [pagination.page, pagination.rowsPerPage, filters.level, filters.action, filters.start_date, filters.end_date, filters.user_id, filters.search]);

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
      showError(getFriendlyActionError(err, 'Failed to clear logs'));
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
      showError(getFriendlyActionError(err, 'Failed to export logs'));
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
      <ManagementPageHeader
        title="System Logs"
        subtitle="Review meaningful admin activity, system failures, warnings, and important operational events."
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
              Clear Old Activity
            </Button>
          </>
        }
      />

      <ManagementSearchToolbar
        value={filters.search}
        onChange={(value) => {
          setFilters((prev) => ({ ...prev, search: value }));
          setPagination((prev) => ({ ...prev, page: 0 }));
        }}
        placeholder="Search activity by action, user, or summary..."
        actions={
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
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportLogs}
              disabled={logs.length === 0 || actionLoading}
            >
              Export
            </Button>
          </Stack>
        }
      />

      {/* Loading Indicator */}
      {(loading || actionLoading) && <TrainLoadingBar sx={{ mb: 3, borderRadius: 2 }} />}

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

      <SummaryStrip
        items={[
          { label: 'Visible Activity', value: logs.length, color: 'primary' },
          { label: 'Issues', value: logs.filter(l => l.level === 'error').length, color: 'error' },
          { label: 'Needs Review', value: logs.filter(l => l.level === 'warn' || l.level === 'warning').length, color: 'warning' },
          { label: 'Normal', value: logs.filter(l => l.level === 'info' || !l.level).length, color: 'info' },
        ]}
      />

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Activity
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Log Level</InputLabel>
                <Select
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                  label="Log Level"
                >
                  <MenuItem value="">All Statuses</MenuItem>
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
                placeholder="e.g., Sign In"
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
            Activity Entries ({logs.length})
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {logs.length} visible entries
          </Typography>
        </Box>

        {loading && logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading activity...
            </Typography>
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Storage sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No activity found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {filters.level || filters.action || filters.search ? 'Try adjusting your filters' : 'Activity will appear here as the platform is used'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1, px: 1.5, verticalAlign: 'top' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{renderTableDate(log.created_at)}</TableCell>
                      <TableCell>
                        {renderTableChip(humanizeLogText(log.level) || 'Info', {
                          icon: getLevelIcon(log.level),
                          color: getLevelChipColor(log.level),
                        })}
                      </TableCell>
                      <TableCell>
                        {renderPrimaryCell({ primary: getReadableLogAction(log) })}
                      </TableCell>
                      <TableCell>
                        {renderPrimaryCell({
                          primary: getReadableLogDescription(log),
                          primaryWeight: 400,
                        })}
                      </TableCell>
                      <TableCell>
                        {log.user_id ? (
                          renderPrimaryCell({
                            primary: getReadableUser(log),
                            secondary: log.user_role ? humanizeLogText(log.user_role) : null,
                          })
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
              <Typography variant="h6">Activity Details</Typography>
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
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ID: {selectedLog.id}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {getReadableLogAction(selectedLog)}
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
                  color={getLevelChipColor(selectedLog.level)}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Summary
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2.5 }}>
                  <Typography variant="body1">
                    {getReadableLogDescription(selectedLog)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Technical Details
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                  }}
                >
                  <pre style={{ margin: 0, color: 'inherit', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {formatLogDetails(selectedLog.details)}
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
                      {humanizeLogText(selectedLog.user_role) || 'Not available'}
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
        <DialogTitle>Clear Old Activity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            This will permanently delete activity records older than the specified number of days.
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
            Activity older than {clearDays} days will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleClearLogs} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Clear Activity'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemLogsManager;
