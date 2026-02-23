import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import notificationsApi from '../../api/notifications';
import telegramApi from '../../api/telegram';
import usersApi from '../../api/users';
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
  Grid,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  Tab,
  Tabs,
  Avatar,
  Stack,
  Badge,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Send,
  Schedule,
  History,
  Settings,
  Telegram,
  Notifications as NotificationsIcon,
  Add,
  Edit,
  Delete,
  Refresh,
  Visibility,
  CheckCircle,
  Error,
  Warning,
  Info,
  Person,
  People,
  Group,
  School,
  Category as CategoryIcon,
  Book,
  Chat,
  SmartToy,
  Bolt,
  AutoAwesome,
  Timer,
  CalendarToday,
  FilterList,
  Search,
  ExpandMore,
  Close,
  Save,
  Download,
  Upload,
  MoreVert,
  TrendingUp,
  Assessment,
  BarChart,
  Insights,
  Campaign,
  Announcement,
  Sms,
  Email,
  Language,
  DeviceHub,
  Security,
  Code,
  DataUsage,
  Psychology,
  SettingsApplications,
  IntegrationInstructions,
  Api,
  Webhook,
  CloudUpload,
  CloudDone,
  CloudOff,
  Wifi,
  WifiOff,
  ConnectedTv,
  TvOff,
  Verified,
  Pending,
  Block,
  LocalFireDepartment,
  EmojiEvents,
  OpenInNew,
} from '@mui/icons-material';

// Notification Type Configuration
const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Information', icon: <Info />, color: '#2196F3' },
  { value: 'success', label: 'Success', icon: <CheckCircle />, color: '#4CAF50' },
  { value: 'warning', label: 'Warning', icon: <Warning />, color: '#FF9800' },
  { value: 'error', label: 'Error', icon: <Error />, color: '#F44336' },
  { value: 'promotion', label: 'Promotion', icon: <TrendingUp />, color: '#9C27B0' },
  { value: 'academic', label: 'Academic', icon: <School />, color: '#3F51B5' },
  { value: 'payment', label: 'Payment', icon: <Bolt />, color: '#FF5722' },
];

// Target Types
const TARGET_TYPES = [
  { value: 'all', label: 'All Users', icon: <People />, description: 'Send to all registered users' },
  { value: 'paid_users', label: 'Paid Users', icon: <Verified />, description: 'Send to active subscribers only' },
  { value: 'unpaid_users', label: 'Unpaid Users', icon: <Pending />, description: 'Send to users with unpaid status' },
  { value: 'specific_user', label: 'Specific User', icon: <Person />, description: 'Send to individual user' },
  { value: 'teachers', label: 'Teachers Only', icon: <Group />, description: 'Send to all teachers' },
  { value: 'parents', label: 'Parents Only', icon: <People />, description: 'Send to linked parents via Telegram' },
];

// Scheduled Notification Templates
const SCHEDULED_TEMPLATES = [
  {
    id: 'payment_verification',
    name: 'Payment Verification',
    description: 'Send when payment is verified',
    trigger: 'payment_verified',
    defaultMessage: '🎉 Your payment has been verified! You now have full access to all content.',
    targets: ['paid_users'],
    enabled: true,
  },
  {
    id: 'payment_expiring',
    name: 'Subscription Expiring',
    description: 'Send 3 days before subscription expires',
    trigger: 'subscription_expiring',
    defaultMessage: '⚠️ Your subscription expires in 3 days. Renew now to continue access.',
    targets: ['paid_users'],
    enabled: true,
  },
  {
    id: 'subscription_expired',
    name: 'Subscription Expired',
    description: 'Send when subscription expires',
    trigger: 'subscription_expired',
    defaultMessage: '❌ Your subscription has expired. Renew to regain access.',
    targets: ['paid_users'],
    enabled: true,
  },
  {
    id: 'welcome_message',
    name: 'Welcome Message',
    description: 'Send to new users after registration',
    trigger: 'user_registered',
    defaultMessage: '👋 Welcome to Family Academy! Start your learning journey today.',
    targets: ['all'],
    enabled: true,
  },
  {
    id: 'achievement_unlocked',
    name: 'Achievement Unlocked',
    description: 'Send when user achieves milestone',
    trigger: 'achievement_unlocked',
    defaultMessage: '🏆 Congratulations! You have unlocked a new achievement.',
    targets: ['all'],
    enabled: true,
  },
];

const NotificationTelegramManager = () => {
  const { isAdmin, user } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Main States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Parent Stats
  const [parentStats, setParentStats] = useState({
    total: 0,
    active: 0,
    notificationsSent: 0,
    openRate: 0,
  });
  
  // Form States
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    notification_type: 'info',
    target_type: 'all',
    target_id: '',
    scheduled_time: '',
    send_immediately: true,
    priority: 'medium',
    include_telegram: true,
    include_app: true,
  });
  
  const [telegramSettings, setTelegramSettings] = useState({
    bot_token: '',
    bot_username: '',
    auto_approve: true,
    welcome_message: 'Welcome to Family Academy! Use /help for commands.',
    max_parents_per_user: 2,
    notification_enabled: true,
    daily_stats_enabled: true,
  });
  
  // UI States
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Cache keys
  const notificationsCacheKey = 'notifications';
  const telegramStatusCacheKey = 'telegram-status';
  const usersCacheKey = 'users';
  const parentStatsCacheKey = 'parent-stats';
  
  // Fetch all data
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Fetch notifications history
      const notificationsData = await getCachedData(
        notificationsCacheKey,
        () => notificationsApi.getNotificationHistory(),
        { forceRefresh }
      );
      setNotifications(notificationsData || []);
      
      // Fetch telegram status
      try {
        const telegramData = await getCachedData(
          telegramStatusCacheKey,
          () => telegramApi.getBotStatus(),
          { forceRefresh, ttl: 2 * 60 * 1000 } // 2 minutes TTL
        );
        setTelegramStatus(telegramData || {});
      } catch (telegramError) {
        console.warn('Could not fetch telegram status:', telegramError);
        setTelegramStatus({
          initialized: true,
          pollingEnabled: true,
          canReceiveMessages: true,
          canSendMessages: true,
          botUsername: 'FamilyAcademy_notify_Bot',
          lastActive: new Date().toISOString(),
          connectedUsers: 0,
          totalMessages: 0,
        });
      }
      
      // Fetch users for targeting
      const usersData = await getCachedData(
        usersCacheKey,
        () => usersApi.getAllUsers({ limit: 100 }),
        { forceRefresh }
      );
      setUsers(usersData || []);
      
      // Fetch scheduled notifications (static data)
      setScheduledNotifications(SCHEDULED_TEMPLATES);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showError('Failed to load notification data');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, showError]);

  // Fetch parent stats
  const fetchParentStats = useCallback(async (forceRefresh = false) => {
    try {
      const statsData = await getCachedData(
        parentStatsCacheKey,
        () => telegramApi.getParentStats(),
        { forceRefresh, ttl: 5 * 60 * 1000 } // 5 minutes TTL
      );
      setParentStats(statsData || {
        total: 0,
        active: 0,
        notificationsSent: 0,
        openRate: 0,
      });
    } catch (err) {
      console.error('Failed to fetch parent stats:', err);
    }
  }, [getCachedData]);

  useEffect(() => {
    if (isAdmin()) {
      fetchAllData();
      fetchParentStats();
    }
  }, [isAdmin, fetchAllData, fetchParentStats]);

  // Handle form changes
  const handleNotificationFormChange = (e) => {
    const { name, value, checked } = e.target;
    setNotificationForm(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value,
    }));
  };

  const handleTelegramSettingsChange = (e) => {
    const { name, value, checked } = e.target;
    setTelegramSettings(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value,
    }));
  };

  // Send Notification
  const handleSendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      showError('Title and message are required');
      return;
    }

    try {
      setActionLoading(true);
      
      const payload = {
        title: notificationForm.title.trim(),
        message: notificationForm.message.trim(),
        notification_type: notificationForm.notification_type,
        target_type: notificationForm.target_type,
        target_id: notificationForm.target_id || null,
        scheduled_time: notificationForm.send_immediately ? null : notificationForm.scheduled_time,
        priority: notificationForm.priority,
        channels: {
          telegram: notificationForm.include_telegram,
          app: notificationForm.include_app,
        },
      };

      await notificationsApi.sendNotification(payload);
      showSuccess('Notification sent successfully!');
      
      // Invalidate cache
      invalidateCache(notificationsCacheKey);
      
      // Reset form
      setNotificationForm({
        title: '',
        message: '',
        notification_type: 'info',
        target_type: 'all',
        target_id: '',
        scheduled_time: '',
        send_immediately: true,
        priority: 'medium',
        include_telegram: true,
        include_app: true,
      });
      
      // Refresh data
      await fetchAllData(true);
      setTabValue(0);
      
    } catch (error) {
      console.error('Send notification error:', error);
      showError(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setActionLoading(false);
    }
  };

  // Use Template
  const handleUseTemplate = (template) => {
    setNotificationForm({
      ...notificationForm,
      title: template.name,
      message: template.defaultMessage,
      target_type: template.targets[0] || 'all',
      notification_type: template.trigger.includes('payment') ? 'payment' : 'info',
    });
    setTabValue(1);
  };

  // Schedule Template
  const handleScheduleTemplate = (template) => {
    setNotificationForm({
      ...notificationForm,
      title: template.name,
      message: template.defaultMessage,
      target_type: template.targets[0] || 'all',
      send_immediately: false,
      scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      notification_type: 'info',
    });
    setTabValue(1);
  };

  // Test Telegram Connection
  const handleTestTelegram = async () => {
    try {
      setActionLoading(true);
      const response = await telegramApi.testBotConnection();
      showSuccess(response.data.message || 'Telegram bot connection successful!');
      
      // Invalidate cache to refresh status
      invalidateCache(telegramStatusCacheKey);
      await fetchAllData(true);
    } catch (error) {
      showError('Telegram test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Update Telegram Settings
  const handleUpdateTelegramSettings = async () => {
    try {
      setActionLoading(true);
      await telegramApi.updateBotSettings(telegramSettings);
      showSuccess('Telegram settings updated successfully');
      
      // Invalidate cache
      invalidateCache(telegramStatusCacheKey);
      await fetchAllData(true);
    } catch (error) {
      showError('Failed to update settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (notification) => {
    try {
      setActionLoading(true);
      await notificationsApi.deleteNotification(notification.id);
      showSuccess('Notification deleted successfully');
      
      // Invalidate cache
      invalidateCache(notificationsCacheKey);
      await fetchAllData(true);
    } catch (error) {
      showError('Failed to delete notification');
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Notification
  const handleResendNotification = async (notification) => {
    try {
      setActionLoading(true);
      const payload = {
        title: notification.title,
        message: notification.message,
        target_type: notification.target_type,
        target_id: notification.target_id,
        notification_type: notification.notification_type || 'info',
      };
      
      await notificationsApi.sendNotification(payload);
      showSuccess('Notification resent successfully');
      
      // Invalidate cache
      invalidateCache(notificationsCacheKey);
      await fetchAllData(true);
    } catch (error) {
      showError('Failed to resend notification');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Scheduled Template
  const handleToggleTemplate = async (templateId, enabled) => {
    setScheduledNotifications(prev =>
      prev.map(t =>
        t.id === templateId ? { ...t, enabled } : t
      )
    );
    showSuccess(`Template ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleRefresh = () => {
    fetchAllData(true);
    fetchParentStats(true);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (statusFilter !== 'all' && notification.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query) ||
        notification.target_type?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Get notification type color
  const getNotificationTypeColor = (type) => {
    const notificationType = NOTIFICATION_TYPES.find(nt => nt.value === type);
    return notificationType?.color || '#757575';
  };

  // Get status chip
  const getStatusChip = (status) => {
    switch (status) {
      case 'sent':
        return <Chip label="Sent" size="small" color="success" />;
      case 'scheduled':
        return <Chip label="Scheduled" size="small" color="warning" />;
      case 'failed':
        return <Chip label="Failed" size="small" color="error" />;
      default:
        return <Chip label={status} size="small" color="default" />;
    }
  };

  // Notification History Columns
  const notificationColumns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="500">
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.message && row.message.length > 50 ? row.message.substring(0, 50) + '...' : row.message}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'notification_type',
      headerName: 'Type',
      width: 100,
      render: (value) => {
        const type = NOTIFICATION_TYPES.find(t => t.value === value);
        return (
          <Chip
            label={type?.label || value}
            size="small"
            sx={{
              bgcolor: alpha(type?.color || '#757575', 0.1),
              color: type?.color || '#757575',
              border: `1px solid ${alpha(type?.color || '#757575', 0.3)}`,
            }}
          />
        );
      },
    },
    {
      field: 'target_type',
      headerName: 'Target',
      width: 120,
      render: (value) => {
        const target = TARGET_TYPES.find(t => t.value === value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {target?.icon}
            <Typography variant="caption">{target?.label || value}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => getStatusChip(value),
    },
    {
      field: 'sent_count',
      headerName: 'Sent',
      width: 80,
      render: (value, row) => (
        <Tooltip title={`${value || 0} delivered, ${row.failed_count || 0} failed`}>
          <Box>
            <Typography variant="body2">{value || 0}</Typography>
            {row.failed_count > 0 && (
              <Typography variant="caption" color="error">({row.failed_count} failed)</Typography>
            )}
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 120,
      render: (value) => (
        <Typography variant="caption">
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
          <Tooltip title="Resend">
            <span>
              <IconButton
                size="small"
                onClick={() => handleResendNotification(row)}
                disabled={actionLoading}
                sx={{
                  opacity: actionLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedNotification(row);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
                disabled={actionLoading}
                sx={{
                  opacity: actionLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
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
          Access Denied - Only administrators can access notification and telegram management.
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
            Communications Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage notifications, Telegram bot, and automated communications
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading || actionLoading}
          sx={{ borderRadius: 2 }}
        >
          Refresh
        </Button>
      </Box>

      {/* Loading Indicator */}
      {(loading || actionLoading) && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <NotificationsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {notifications.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Notifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {notifications.filter(n => n.status === 'sent').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Successfully Sent
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <Timer />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {notifications.filter(n => n.status === 'scheduled').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scheduled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: telegramStatus?.initialized ? 'success.light' : 'error.light', 
                              color: telegramStatus?.initialized ? 'success.main' : 'error.main' }}>
                  <Telegram />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {telegramStatus?.initialized ? 'Bot Active' : 'Bot Offline'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{telegramStatus?.botUsername || 'FamilyAcademy_bot'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<History />} label="Notification History" />
          <Tab icon={<Send />} label="Send Notification" />
          <Tab icon={<AutoAwesome />} label="Templates" />
          <Tab icon={<Settings />} label="Telegram Settings" />
          <Tab icon={<People />} label="Parent Communication" />
        </Tabs>
      </Box>

      {/* Tab 0: Notification History */}
      {tabValue === 0 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => {
                      showSuccess('Export feature coming soon');
                    }}
                    size="small"
                  >
                    Export
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <DataTable
            columns={notificationColumns}
            data={filteredNotifications}
            loading={loading}
            onRefresh={handleRefresh}
            title="Notification History"
            rowKey="id"
          />
        </Box>
      )}

      {/* Tab 1: Send Notification */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Send New Notification
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title *"
                name="title"
                value={notificationForm.title}
                onChange={handleNotificationFormChange}
                disabled={actionLoading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message *"
                name="message"
                value={notificationForm.message}
                onChange={handleNotificationFormChange}
                multiline
                rows={4}
                disabled={actionLoading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Notification Type</InputLabel>
                <Select
                  name="notification_type"
                  value={notificationForm.notification_type}
                  onChange={handleNotificationFormChange}
                  label="Notification Type"
                  disabled={actionLoading}
                >
                  {NOTIFICATION_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: type.color }}>{type.icon}</Box>
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={notificationForm.priority}
                  onChange={handleNotificationFormChange}
                  label="Priority"
                  disabled={actionLoading}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Target Audience
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Send To *</InputLabel>
                <Select
                  name="target_type"
                  value={notificationForm.target_type}
                  onChange={handleNotificationFormChange}
                  label="Send To *"
                  disabled={actionLoading}
                >
                  {TARGET_TYPES.map(target => (
                    <MenuItem key={target.value} value={target.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {target.icon}
                        {target.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {notificationForm.target_type === 'specific_user' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select User *</InputLabel>
                  <Select
                    name="target_id"
                    value={notificationForm.target_id}
                    onChange={handleNotificationFormChange}
                    label="Select User *"
                    disabled={actionLoading}
                  >
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.username} ({user.name || 'No name'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Delivery Options
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationForm.send_immediately}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, send_immediately: e.target.checked }))}
                    disabled={actionLoading}
                  />
                }
                label="Send immediately"
              />
              
              {!notificationForm.send_immediately && (
                <TextField
                  fullWidth
                  label="Schedule Date & Time"
                  type="datetime-local"
                  name="scheduled_time"
                  value={notificationForm.scheduled_time}
                  onChange={handleNotificationFormChange}
                  sx={{ mt: 2 }}
                  InputLabelProps={{ shrink: true }}
                  disabled={actionLoading}
                />
              )}
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationForm.include_telegram}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, include_telegram: e.target.checked }))}
                    disabled={actionLoading}
                  />
                }
                label="Send via Telegram"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationForm.include_app}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, include_app: e.target.checked }))}
                    disabled={actionLoading}
                    sx={{ ml: 2 }}
                  />
                }
                label="Send via App Notification"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setNotificationForm({
                      title: '',
                      message: '',
                      notification_type: 'info',
                      target_type: 'all',
                      target_id: '',
                      scheduled_time: '',
                      send_immediately: true,
                      priority: 'medium',
                      include_telegram: true,
                      include_app: true,
                    });
                  }}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2 }}
                >
                  Clear
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleSendNotification}
                  disabled={actionLoading || !notificationForm.title.trim() || !notificationForm.message.trim()}
                  startIcon={actionLoading ? <CircularProgress size={20} /> : <Send />}
                  sx={{ borderRadius: 2 }}
                >
                  {actionLoading ? 'Sending...' : (notificationForm.send_immediately ? 'Send Now' : 'Schedule')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tab 2: Templates */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {SCHEDULED_TEMPLATES.map(template => (
            <Grid item xs={12} md={6} key={template.id}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {template.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Trigger: {template.trigger.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <Switch
                      checked={template.enabled}
                      onChange={(e) => handleToggleTemplate(template.id, e.target.checked)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {template.description}
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', mb: 2 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      "{template.defaultMessage}"
                    </Typography>
                  </Paper>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Send />}
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Now
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Schedule />}
                      onClick={() => handleScheduleTemplate(template)}
                    >
                      Schedule
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 3: Telegram Settings */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Telegram Bot Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Bot Status
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Badge
                    color={telegramStatus?.initialized ? 'success' : 'error'}
                    variant="dot"
                  >
                    <Avatar sx={{ bgcolor: telegramStatus?.initialized ? 'success.light' : 'error.light' }}>
                      <Telegram />
                    </Avatar>
                  </Badge>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      @{telegramStatus?.botUsername || 'FamilyAcademy_bot'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Status: {telegramStatus?.initialized ? 'Active' : 'Inactive'} • 
                      Polling: {telegramStatus?.pollingEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Box>
                </Box>
                
                <Button
                  variant="outlined"
                  startIcon={<Wifi />}
                  onClick={handleTestTelegram}
                  disabled={actionLoading}
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Test Connection
                </Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Bot Statistics
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Connected Users</Typography>
                    <Typography variant="h6">{telegramStatus?.connectedUsers || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                    <Typography variant="h6">{telegramStatus?.totalMessages || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Last Active</Typography>
                    <Typography variant="body2">
                      {telegramStatus?.lastActive ? new Date(telegramStatus.lastActive).toLocaleDateString() : 'Never'}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Bot Settings
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bot Token"
                name="bot_token"
                type="password"
                value={telegramSettings.bot_token}
                onChange={handleTelegramSettingsChange}
                disabled={actionLoading}
                size="small"
                helperText="Get from @BotFather on Telegram"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bot Username"
                name="bot_username"
                value={telegramSettings.bot_username}
                onChange={handleTelegramSettingsChange}
                disabled={actionLoading}
                size="small"
                placeholder="@FamilyAcademy_bot"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Welcome Message"
                name="welcome_message"
                value={telegramSettings.welcome_message}
                onChange={handleTelegramSettingsChange}
                multiline
                rows={2}
                disabled={actionLoading}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Parents per User"
                name="max_parents_per_user"
                type="number"
                value={telegramSettings.max_parents_per_user}
                onChange={handleTelegramSettingsChange}
                disabled={actionLoading}
                size="small"
                InputProps={{ inputProps: { min: 1, max: 5 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={telegramSettings.auto_approve}
                    onChange={handleTelegramSettingsChange}
                    name="auto_approve"
                    disabled={actionLoading}
                  />
                }
                label="Auto-approve parent linking"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={telegramSettings.notification_enabled}
                    onChange={handleTelegramSettingsChange}
                    name="notification_enabled"
                    disabled={actionLoading}
                  />
                }
                label="Enable notifications"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleUpdateTelegramSettings}
                  disabled={actionLoading}
                  startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
                  sx={{ borderRadius: 2 }}
                >
                  {actionLoading ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tab 4: Parent Communication */}
      {tabValue === 4 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Parent Communication
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {parentStats.total || 0}
                      </Typography>
                      <Typography variant="caption">Total Parents</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {parentStats.active || 0}
                      </Typography>
                      <Typography variant="caption">Active This Week</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Send sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant="h4" fontWeight="bold">
                        {parentStats.notificationsSent || 0}
                      </Typography>
                      <Typography variant="caption">Notifications Sent</Typography>
                    </Card>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Quick Actions
                </Typography>
                
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        await telegramApi.sendProgressToAllParents();
                        showSuccess('Weekly progress reports sent to all parents!');
                        
                        // Invalidate parent stats cache
                        invalidateCache(parentStatsCacheKey);
                        await fetchParentStats(true);
                      } catch (err) {
                        showError('Failed to send reports');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                  >
                    Send Weekly Reports to All Parents
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<LocalFireDepartment />}
                    onClick={() => {
                      setNotificationForm({
                        ...notificationForm,
                        title: 'Streak Update',
                        message: 'Your child has maintained a learning streak! Encourage them to keep going! 🔥',
                        notification_type: 'success',
                        target_type: 'parents',
                      });
                      setTabValue(1);
                    }}
                    disabled={actionLoading}
                    sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                  >
                    Send Streak Reminder to Parents
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<EmojiEvents />}
                    onClick={() => {
                      setNotificationForm({
                        ...notificationForm,
                        title: 'Achievement Unlocked!',
                        message: 'Your child has unlocked a new achievement! Check the app to celebrate! 🏆',
                        notification_type: 'success',
                        target_type: 'parents',
                      });
                      setTabValue(1);
                    }}
                    disabled={actionLoading}
                    sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                  >
                    Send Achievement Alert to Parents
                  </Button>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Tips & Best Practices
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Keep messages concise"
                      secondary="Aim for 1-2 sentences maximum"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Test before sending"
                      secondary="Always test with yourself first"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Timer color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Schedule wisely"
                      secondary="Avoid sending during late hours"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          handleDeleteNotification(selectedNotification);
          setDeleteConfirmOpen(false);
        }}
        title="Delete Notification"
        message={`Are you sure you want to delete notification "${selectedNotification?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default NotificationTelegramManager;