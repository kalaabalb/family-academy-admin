import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  CircularProgress,
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
} from '@mui/icons-material';
import { formatDate, getRelativeTime } from '../../utils/validation';

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
  { value: 'school', label: 'By School', icon: <School />, description: 'Send to users from specific school' },
  { value: 'category', label: 'By Category', icon: <CategoryIcon />, description: 'Send to users subscribed to specific category' },
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
    id: 'study_reminder',
    name: 'Daily Study Reminder',
    description: 'Daily motivation for active users',
    trigger: 'daily_reminder',
    defaultMessage: '📚 Time to study! Continue your learning streak today.',
    targets: ['paid_users'],
    enabled: true,
    schedule: 'daily',
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
  
  // Main States
  const [loading, setLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  
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
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState('send');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch notifications history
      const notificationsRes = await notificationsApi.getNotificationHistory();
      setNotifications(notificationsRes.data.data || []);
      
      // Fetch telegram status
      try {
        const telegramRes = await telegramApi.getBotStatus();
        setTelegramStatus(telegramRes.data.data || {});
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
      const usersRes = await usersApi.getAllUsers({ limit: 100 });
      setUsers(usersRes.data.data || []);
      
      // Fetch scheduled notifications
      setScheduledNotifications(SCHEDULED_TEMPLATES);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showError('Failed to load notification data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Fetch parent stats
  const fetchParentStats = async () => {
    try {
      const response = await telegramApi.getParentStats();
      setParentStats(response.data.data || {
        total: 0,
        active: 0,
        notificationsSent: 0,
        openRate: 0,
      });
    } catch (err) {
      console.error('Failed to fetch parent stats:', err);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchAllData();
      fetchParentStats();
    }
  }, [isAdmin, fetchAllData]);

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
      setLoading(true);
      
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

      const response = await notificationsApi.sendNotification(payload);
      showSuccess('Notification sent successfully!');
      
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
      fetchAllData();
      
    } catch (error) {
      console.error('Send notification error:', error);
      showError(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
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
    setSelectedTemplate(template);
    setExpandedAccordion('send');
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
    setSelectedTemplate(template);
    setExpandedAccordion('send');
  };

  // Test Telegram Connection
  const handleTestTelegram = async () => {
    try {
      setLoading(true);
      const response = await telegramApi.testBotConnection();
      showSuccess(response.data.message || 'Telegram bot connection successful!');
    } catch (error) {
      showError('Telegram test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Update Telegram Settings
  const handleUpdateTelegramSettings = async () => {
    try {
      setLoading(true);
      await telegramApi.updateBotSettings(telegramSettings);
      showSuccess('Telegram settings updated successfully');
      fetchAllData();
    } catch (error) {
      showError('Failed to update settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (notification) => {
    try {
      await notificationsApi.deleteNotification(notification.id);
      showSuccess('Notification deleted successfully');
      fetchAllData();
    } catch (error) {
      showError('Failed to delete notification');
    }
  };

  // Resend Notification
  const handleResendNotification = async (notification) => {
    try {
      const payload = {
        title: notification.title,
        message: notification.message,
        target_type: notification.target_type,
        target_id: notification.target_id,
        notification_type: notification.notification_type || 'info',
      };
      
      await notificationsApi.sendNotification(payload);
      showSuccess('Notification resent successfully');
      fetchAllData();
    } catch (error) {
      showError('Failed to resend notification');
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

  // Accordion handlers
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
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
        return <Chip label="Sent" size="small" color="success" icon={<CheckCircle fontSize="small" />} />;
      case 'scheduled':
        return <Chip label="Scheduled" size="small" color="warning" icon={<Timer fontSize="small" />} />;
      case 'failed':
        return <Chip label="Failed" size="small" color="error" icon={<Error fontSize="small" />} />;
      default:
        return <Chip label={status} size="small" color="default" />;
    }
  };

  // Statistics
  const stats = {
    totalSent: notifications.length,
    successful: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    scheduled: notifications.filter(n => n.status === 'scheduled').length,
    today: notifications.filter(n => {
      const today = new Date().toDateString();
      const notifDate = new Date(n.created_at).toDateString();
      return today === notifDate;
    }).length,
  };

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
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
            onClick={() => {
              fetchAllData();
              fetchParentStats();
            }}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: 'primary.light', p: 1.5, borderRadius: 2 }}>
                    <NotificationsIcon sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.totalSent}</Typography>
                    <Typography variant="caption" color="text.secondary">Total Sent</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: 'success.light', p: 1.5, borderRadius: 2 }}>
                    <CheckCircle sx={{ color: 'success.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.successful}</Typography>
                    <Typography variant="caption" color="text.secondary">Successful</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: 'warning.light', p: 1.5, borderRadius: 2 }}>
                    <Timer sx={{ color: 'warning.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.scheduled}</Typography>
                    <Typography variant="caption" color="text.secondary">Scheduled</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: telegramStatus?.initialized ? 'success.light' : 'error.light', p: 1.5, borderRadius: 2 }}>
                    <Telegram sx={{ color: telegramStatus?.initialized ? 'success.main' : 'error.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {telegramStatus?.initialized ? 'Bot Active' : 'Bot Offline'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {telegramStatus?.connectedUsers || 0} connected
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Send Notification & Templates */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
            <Accordion
              expanded={expandedAccordion === 'send'}
              onChange={handleAccordionChange('send')}
              sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Send color="primary" />
                  <Typography variant="h6" fontWeight="bold">Send New Notification</Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom color="text.secondary">
                      Notification Details
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Title *"
                      name="title"
                      value={notificationForm.title}
                      onChange={handleNotificationFormChange}
                      variant="outlined"
                      size="medium"
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
                      variant="outlined"
                      size="medium"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Notification Type</InputLabel>
                      <Select
                        name="notification_type"
                        value={notificationForm.notification_type}
                        onChange={handleNotificationFormChange}
                        label="Notification Type"
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
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        name="priority"
                        value={notificationForm.priority}
                        onChange={handleNotificationFormChange}
                        label="Priority"
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
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom color="text.secondary">
                      Target Audience
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Send To *</InputLabel>
                      <Select
                        name="target_type"
                        value={notificationForm.target_type}
                        onChange={handleNotificationFormChange}
                        label="Send To *"
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
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Select User *</InputLabel>
                        <Select
                          name="target_id"
                          value={notificationForm.target_id}
                          onChange={handleNotificationFormChange}
                          label="Select User *"
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
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom color="text.secondary">
                      Delivery Options
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationForm.send_immediately}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, send_immediately: e.target.checked }))}
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
                      />
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationForm.include_telegram}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, include_telegram: e.target.checked }))}
                        />
                      }
                      label="Send via Telegram"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationForm.include_app}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, include_app: e.target.checked }))}
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
                      >
                        Clear
                      </Button>
                      
                      <Button
                        variant="contained"
                        onClick={handleSendNotification}
                        disabled={loading || !notificationForm.title.trim() || !notificationForm.message.trim()}
                        startIcon={<Send />}
                      >
                        {notificationForm.send_immediately ? 'Send Now' : 'Schedule'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            {/* Scheduled Templates Section */}
            <Accordion
              expanded={expandedAccordion === 'templates'}
              onChange={handleAccordionChange('templates')}
              sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AutoAwesome color="secondary" />
                  <Typography variant="h6" fontWeight="bold">Scheduled Templates</Typography>
                  <Chip label={scheduledNotifications.filter(t => t.enabled).length} size="small" color="primary" />
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Pre-configured notifications that trigger automatically based on system events
                </Typography>
                
                <Grid container spacing={2}>
                  {scheduledNotifications.map(template => (
                    <Grid item xs={12} key={template.id}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {template.name}
                                </Typography>
                                <Chip
                                  label={template.enabled ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={template.enabled ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {template.description}
                              </Typography>
                              
                              <Typography variant="caption" color="text.secondary" display="block">
                                Trigger: {template.trigger.replace(/_/g, ' ')} • 
                                Targets: {template.targets.map(t => TARGET_TYPES.find(tt => tt.value === t)?.label || t).join(', ')}
                              </Typography>
                              
                              <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                                "{template.defaultMessage}"
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                              <Switch
                                checked={template.enabled}
                                onChange={(e) => handleToggleTemplate(template.id, e.target.checked)}
                                color="primary"
                                size="small"
                              />
                              
                              <Tooltip title="Use this template">
                                <IconButton size="small" onClick={() => handleUseTemplate(template)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Schedule this template">
                                <IconButton size="small" onClick={() => handleScheduleTemplate(template)}>
                                  <Timer fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
          
          {/* Notification History */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <History color="action" />
                <Typography variant="h6" fontWeight="bold">Notification History</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <Select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </Box>
            </Box>
            
            {loading && notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading notifications...
                </Typography>
              </Box>
            ) : filteredNotifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No notifications found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchQuery ? 'Try adjusting your search criteria' : 'Start by sending your first notification'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredNotifications.map(notification => (
                  <Card key={notification.id} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: getNotificationTypeColor(notification.notification_type || 'info'),
                              }}
                            />
                            <Typography variant="subtitle1" fontWeight="medium">
                              {notification.title}
                            </Typography>
                            {getStatusChip(notification.status)}
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 1 }}>
                            {notification.message}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                              To: {TARGET_TYPES.find(t => t.value === notification.target_type)?.label || notification.target_type}
                              {notification.target_id && ` (ID: ${notification.target_id})`}
                            </Typography>
                            
                            <Typography variant="caption" color="text.secondary">
                              Sent: {formatDate(notification.created_at, true)}
                            </Typography>
                            
                            {notification.sent_count !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                Delivered: {notification.sent_count || 0} • Failed: {notification.failed_count || 0}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Resend">
                            <IconButton
                              size="small"
                              onClick={() => handleResendNotification(notification)}
                              disabled={loading}
                            >
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedNotification(notification);
                                setDeleteConfirmOpen(true);
                              }}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Telegram Settings & Bot Status */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Telegram color="primary" />
              <Typography variant="h6" fontWeight="bold">Telegram Bot Configuration</Typography>
            </Box>
            
            {/* Bot Status */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Bot Status
                </Typography>
                
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: telegramStatus?.initialized ? 'success.main' : 'error.main',
                        }}
                      />
                      <Typography variant="body2">
                        {telegramStatus?.initialized ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      @{telegramStatus?.botUsername || 'FamilyAcademy_notify_Bot'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Polling: {telegramStatus?.pollingEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Messages: {telegramStatus?.totalMessages || 0}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Last active: {telegramStatus?.lastActive ? getRelativeTime(telegramStatus.lastActive) : 'Never'}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Wifi />}
                  onClick={handleTestTelegram}
                  disabled={loading}
                  sx={{ borderRadius: 2 }}
                >
                  Test Connection
                </Button>
              </CardContent>
            </Card>
            
            {/* Bot Settings */}
            <Typography variant="subtitle2" fontWeight="medium" gutterBottom sx={{ mb: 2 }}>
              Bot Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bot Token"
                  name="bot_token"
                  type="password"
                  value={telegramSettings.bot_token}
                  onChange={handleTelegramSettingsChange}
                  variant="outlined"
                  size="small"
                  helperText="Get from @BotFather on Telegram"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bot Username"
                  name="bot_username"
                  value={telegramSettings.bot_username}
                  onChange={handleTelegramSettingsChange}
                  variant="outlined"
                  size="small"
                  placeholder="@FamilyAcademy_notify_Bot"
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
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Max Parents per User"
                  name="max_parents_per_user"
                  type="number"
                  value={telegramSettings.max_parents_per_user}
                  onChange={handleTelegramSettingsChange}
                  variant="outlined"
                  size="small"
                  InputProps={{ inputProps: { min: 1, max: 5 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={telegramSettings.auto_approve}
                      onChange={handleTelegramSettingsChange}
                      name="auto_approve"
                    />
                  }
                  label="Auto-approve parent linking"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={telegramSettings.notification_enabled}
                      onChange={handleTelegramSettingsChange}
                      name="notification_enabled"
                    />
                  }
                  label="Enable notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={telegramSettings.daily_stats_enabled}
                      onChange={handleTelegramSettingsChange}
                      name="daily_stats_enabled"
                    />
                  }
                  label="Send daily stats"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleUpdateTelegramSettings}
                  disabled={loading}
                  sx={{ borderRadius: 2, mt: 1 }}
                >
                  Update Bot Settings
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Quick Stats & Actions */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Quick Actions
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Campaign />}
                  onClick={() => {
                    setNotificationForm({
                      ...notificationForm,
                      title: 'System Announcement',
                      message: 'Important system update announcement...',
                      notification_type: 'info',
                      target_type: 'all',
                    });
                    setExpandedAccordion('send');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Send Announcement
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Assessment />}
                  onClick={() => {
                    // Send test notification to yourself
                    setNotificationForm({
                      ...notificationForm,
                      title: 'Test Notification',
                      message: 'This is a test notification sent from the admin panel.',
                      notification_type: 'info',
                      target_type: 'specific_user',
                      target_id: user?.id,
                    });
                    setExpandedAccordion('send');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Test Notification
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => {
                    // Export notification history
                    showSuccess('Export feature coming soon');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Export History
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Insights />}
                  onClick={() => {
                    // View analytics
                    showSuccess('Analytics dashboard coming soon');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  View Analytics
                </Button>
              </Grid>
            </Grid>

            {/* Parent Communication Section */}
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Parent Communication
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<Assessment />}
                  onClick={() => {
                    setNotificationForm({
                      ...notificationForm,
                      title: 'Weekly Progress Report',
                      message: 'Your child\'s weekly progress report is now available. Open the app to see detailed progress!',
                      notification_type: 'info',
                      target_type: 'parents',
                    });
                    setExpandedAccordion('send');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start', mb: 1 }}
                >
                  Send Progress Report to All Parents
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  startIcon={<LocalFireDepartment />}
                  onClick={() => {
                    setNotificationForm({
                      ...notificationForm,
                      title: 'Streak Update',
                      message: 'Your child has maintained a learning streak! Encourage them to keep going! 🔥',
                      notification_type: 'success',
                      target_type: 'parents',
                    });
                    setExpandedAccordion('send');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start', mb: 1 }}
                >
                  Send Streak Reminder to Parents
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<EmojiEvents />}
                  onClick={() => {
                    setNotificationForm({
                      ...notificationForm,
                      title: 'Achievement Unlocked!',
                      message: 'Your child has unlocked a new achievement! Check the app to celebrate! 🏆',
                      notification_type: 'success',
                      target_type: 'parents',
                    });
                    setExpandedAccordion('send');
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start', mb: 1 }}
                >
                  Send Achievement Alert to Parents
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="info"
                  startIcon={<Telegram />}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await telegramApi.sendProgressToAllParents();
                      showSuccess('Weekly progress reports sent to all parents!');
                    } catch (err) {
                      showError('Failed to send reports: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Send Weekly Reports to All Parents
                </Button>
              </Grid>
            </Grid>

            {/* Parent Statistics */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Parent Statistics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <People sx={{ color: 'primary.main', fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {parentStats.total || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Parents Linked
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {parentStats.active || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active This Week
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ color: 'warning.main', fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {parentStats.notificationsSent || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Notifications Sent
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Schedule sx={{ color: 'info.main', fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold">
                      {parentStats.openRate || 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Open Rate
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
              Tips & Best Practices
            </Typography>
            
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Info fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Keep messages concise"
                  secondary="Aim for 1-2 sentences maximum"
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Warning fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Test before sending"
                  secondary="Always test with yourself first"
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Timer fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Schedule wisely"
                  secondary="Avoid sending during late hours"
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircle fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Use templates"
                  secondary="Save time with pre-configured templates"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          handleDeleteNotification(selectedNotification);
          setDeleteConfirmOpen(false);
        }}
        title="Delete Notification"
        message={`Are you sure you want to delete notification "${selectedNotification?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
      />
    </Box>
  );
};

export default NotificationTelegramManager;