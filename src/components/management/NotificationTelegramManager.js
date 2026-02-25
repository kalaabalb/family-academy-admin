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
  InputAdornment,
  CircularProgress,
  Tab,
  Tabs,
  LinearProgress,
  Avatar,
  Badge,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  CheckCircle,
  Error,
  Warning,
  Info,
  Person,
  People,
  Group,
  School,
  Bolt,
  Timer,
  Search,
  Close,
  Save,
  Download,
  TrendingUp,
  Assessment,
  LocalFireDepartment,
  EmojiEvents,
  AutoAwesome,
  FormatQuote,
} from '@mui/icons-material';

// ==================== CONSTANTS ====================

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Information', icon: <Info />, color: '#2196F3' },
  { value: 'success', label: 'Success', icon: <CheckCircle />, color: '#4CAF50' },
  { value: 'warning', label: 'Warning', icon: <Warning />, color: '#FF9800' },
  { value: 'error', label: 'Error', icon: <Error />, color: '#F44336' },
  { value: 'academic', label: 'Academic', icon: <School />, color: '#3F51B5' },
  { value: 'payment', label: 'Payment', icon: <Bolt />, color: '#FF5722' },
];

const TARGET_TYPES = [
  { value: 'all', label: 'All Users', icon: <People /> },
  { value: 'paid_users', label: 'Paid Users', icon: <CheckCircle /> },
  { value: 'unpaid_users', label: 'Unpaid Users', icon: <Timer /> },
  { value: 'specific_user', label: 'Specific User', icon: <Person /> },
  { value: 'teachers', label: 'Teachers Only', icon: <Group /> },
  { value: 'parents', label: 'Parents Only', icon: <People /> },
];

const TRIGGER_EVENTS = [
  { value: 'payment_verified', label: 'Payment Verified', category: 'payment' },
  { value: 'payment_rejected', label: 'Payment Rejected', category: 'payment' },
  { value: 'payment_pending', label: 'Payment Pending', category: 'payment' },
  { value: 'subscription_expiring', label: 'Subscription Expiring', category: 'payment' },
  { value: 'subscription_expired', label: 'Subscription Expired', category: 'payment' },
  { value: 'chapter_released', label: 'Chapter Released', category: 'academic' },
  { value: 'video_released', label: 'Video Released', category: 'academic' },
  { value: 'note_released', label: 'Note Released', category: 'academic' },
  { value: 'exam_scheduled', label: 'Exam Scheduled', category: 'academic' },
  { value: 'exam_available', label: 'Exam Available', category: 'academic' },
  { value: 'exam_result', label: 'Exam Result', category: 'academic' },
  { value: 'exam_reminder', label: 'Exam Reminder', category: 'academic' },
  { value: 'streak_milestone', label: 'Streak Milestone', category: 'academic' },
  { value: 'achievement_unlocked', label: 'Achievement Unlocked', category: 'academic' },
  { value: 'parent_weekly_report', label: 'Parent Weekly Report', category: 'parent' },
  { value: 'parent_streak', label: 'Parent Streak', category: 'parent' },
  { value: 'parent_chapter_completed', label: 'Parent Chapter Completed', category: 'parent' },
];

const VARIABLE_TYPES = {
  'payment_verified': ['amount', 'category_name', 'expiry_date'],
  'payment_rejected': ['amount', 'category_name', 'rejection_reason'],
  'payment_pending': ['amount', 'category_name', 'submitted_date'],
  'subscription_expiring': ['category_name', 'days_remaining'],
  'chapter_released': ['chapter_name', 'course_name', 'category_name'],
  'video_released': ['video_title', 'chapter_name', 'course_name'],
  'exam_result': ['exam_title', 'course_name', 'score', 'passed'],
  'streak_milestone': ['streak_count'],
  'achievement_unlocked': ['achievement_title'],
  'parent_weekly_report': ['student_name', 'study_days', 'chapters_completed'],
};

// ==================== MAIN COMPONENT ====================

const NotificationTelegramManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  // ==================== STATES ====================
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Data states
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    scheduled: 0,
    failed: 0
  });
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteType, setDeleteType] = useState('notification');
  
  // Form states
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target_type: 'all',
    target_id: '',
    scheduled_time: '',
    send_now: true,
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    title_template: '',
    message_template: '',
    telegram_template: '',
    type: 'info',
    trigger_event: '',
    category: 'general',
    variables: [],
    is_active: true,
  });

  // ==================== API CALLS ====================
  
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, schedulesRes, notificationsRes, usersRes, telegramRes, statsRes] = await Promise.all([
        notificationsApi.getTemplates().catch(() => ({ data: { data: [] } })),
        notificationsApi.getSchedules().catch(() => ({ data: { data: [] } })),
        notificationsApi.getNotificationHistory().catch(() => ({ data: { data: [] } })),
        usersApi.getAllUsers({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        telegramApi.getBotStatus().catch(() => ({ data: { data: null } })),
        notificationsApi.getStats().catch(() => ({ data: { data: { summary: {} } } })),
      ]);

      setTemplates(templatesRes.data?.data || []);
      setSchedules(schedulesRes.data?.data || []);
      setNotifications(notificationsRes.data?.data || []);
      setUsers(usersRes.data?.data || []);
      setTelegramStatus(telegramRes.data?.data || null);
      setStats(statsRes.data?.data?.summary || { total: 0, sent: 0, scheduled: 0, failed: 0 });
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isAdmin()) fetchAllData();
  }, [isAdmin, fetchAllData]);

  // ==================== TEMPLATE HANDLERS ====================
  
  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.title_template || !templateForm.message_template) {
      showError('Name and templates are required');
      return;
    }

    setActionLoading(true);
    try {
      await notificationsApi.createTemplate(templateForm);
      showSuccess('Template created');
      setTemplateFormOpen(false);
      resetTemplateForm();
      fetchAllData();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to create template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await notificationsApi.updateTemplate(selectedItem.id, templateForm);
      showSuccess('Template updated');
      setTemplateFormOpen(false);
      resetTemplateForm();
      fetchAllData();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await notificationsApi.deleteTemplate(selectedItem.id);
      showSuccess('Template deleted');
      fetchAllData();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete template');
    } finally {
      setActionLoading(false);
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
    }
  };

  // ==================== SCHEDULE HANDLERS ====================
  
  const handleToggleSchedule = async (id, isActive) => {
    try {
      await notificationsApi.toggleSchedule(id, isActive);
      showSuccess(`Schedule ${isActive ? 'enabled' : 'disabled'}`);
      fetchAllData();
    } catch (error) {
      showError('Failed to toggle schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await notificationsApi.deleteSchedule(selectedItem.id);
      showSuccess('Schedule deleted');
      fetchAllData();
    } catch (error) {
      showError('Failed to delete schedule');
    } finally {
      setActionLoading(false);
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
    }
  };

  // ==================== NOTIFICATION HANDLERS ====================
  
  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      showError('Title and message are required');
      return;
    }

    setActionLoading(true);
    try {
      await notificationsApi.sendNotification({
        title: notificationForm.title,
        message: notificationForm.message,
        notification_type: notificationForm.type,
        target_type: notificationForm.target_type,
        target_id: notificationForm.target_id || null,
        scheduled_time: notificationForm.send_now ? null : notificationForm.scheduled_time,
      });
      showSuccess('Notification sent');
      resetNotificationForm();
      fetchAllData();
      setActiveTab(3); // Switch to history tab
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await notificationsApi.deleteNotification(selectedItem.id);
      showSuccess('Notification deleted');
      fetchAllData();
    } catch (error) {
      showError('Failed to delete');
    } finally {
      setActionLoading(false);
      setDeleteConfirmOpen(false);
      setSelectedItem(null);
    }
  };

  const handleResendNotification = async (notification) => {
    setActionLoading(true);
    try {
      await notificationsApi.sendNotification({
        title: notification.title,
        message: notification.message,
        notification_type: notification.notification_type,
        target_type: notification.target_type,
      });
      showSuccess('Notification resent');
    } catch (error) {
      showError('Failed to resend');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== TELEGRAM HANDLERS ====================
  
  const handleTestTelegram = async () => {
    setActionLoading(true);
    try {
      const res = await telegramApi.testBotConnection();
      showSuccess(res.data.message || 'Telegram connection OK');
    } catch (error) {
      showError('Telegram test failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== FORM RESETS ====================
  
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      title_template: '',
      message_template: '',
      telegram_template: '',
      type: 'info',
      trigger_event: '',
      category: 'general',
      variables: [],
      is_active: true,
    });
    setSelectedItem(null);
  };

  const resetNotificationForm = () => {
    setNotificationForm({
      title: '',
      message: '',
      type: 'info',
      target_type: 'all',
      target_id: '',
      scheduled_time: '',
      send_now: true,
    });
  };

  // ==================== UTILITIES ====================
  
  const handleEditTemplate = (template) => {
    setSelectedItem(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      title_template: template.title_template,
      message_template: template.message_template,
      telegram_template: template.telegram_template || '',
      type: template.notification_type || 'info',
      trigger_event: template.trigger_event,
      category: template.category || 'general',
      variables: template.variables || [],
      is_active: template.is_active,
    });
    setTemplateFormOpen(true);
  };

  const handleUseTemplate = (template) => {
    setNotificationForm({
      ...notificationForm,
      title: template.name,
      message: template.message_template.replace(/{{(.*?)}}/g, '[var]'),
      type: template.notification_type || 'info',
    });
    setActiveTab(0);
  };

  const handleTriggerEventChange = (event) => {
    const variables = VARIABLE_TYPES[event.target.value] || [];
    setTemplateForm({
      ...templateForm,
      trigger_event: event.target.value,
      variables,
    });
  };

  const handleRefresh = () => fetchAllData();

  const handleDeleteClick = (item, type) => {
    setSelectedItem(item);
    setDeleteType(type);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'template') handleDeleteTemplate();
    else if (deleteType === 'schedule') handleDeleteSchedule();
    else handleDeleteNotification();
  };

  // ==================== FILTERS ====================
  
  const filteredNotifications = notifications.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q);
    }
    return true;
  });

  // ==================== COLUMNS ====================
  
  const notificationColumns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="500">{value}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.message?.substring(0, 50)}...
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
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
              color: type?.color,
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
      render: (value) => {
        const colors = { sent: 'success', scheduled: 'warning', failed: 'error' };
        return <Chip label={value} size="small" color={colors[value] || 'default'} />;
      },
    },
    {
      field: 'created_at',
      headerName: 'Sent',
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
      width: 100,
      render: (value, row) => (
        <Box>
          <IconButton size="small" onClick={() => handleResendNotification(row)}>
            <Send fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteClick(row, 'notification')}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const templateColumns = [
    { field: 'name', headerName: 'Name', width: 200 },
    {
      field: 'trigger_event',
      headerName: 'Trigger',
      width: 150,
      render: (value) => <Chip label={value?.replace(/_/g, ' ')} size="small" />,
    },
    {
      field: 'notification_type',
      headerName: 'Type',
      width: 100,
      render: (value) => {
        const colors = { info: 'info', success: 'success', warning: 'warning', error: 'error' };
        return <Chip label={value} size="small" color={colors[value] || 'default'} />;
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      render: (value) => (
        <Chip label={value ? 'Active' : 'Inactive'} size="small" color={value ? 'success' : 'default'} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      render: (value, row) => (
        <Box>
          <IconButton size="small" onClick={() => handleEditTemplate(row)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDeleteClick(row, 'template')}>
            <Delete fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleUseTemplate(row)}>
            <Send fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const scheduleColumns = [
    { field: 'name', headerName: 'Name', width: 200 },
    {
      field: 'schedule_type',
      headerName: 'Type',
      width: 100,
      render: (value) => <Chip label={value} size="small" />,
    },
    {
      field: 'next_run',
      headerName: 'Next Run',
      width: 150,
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      render: (value, row) => (
        <Switch
          checked={value}
          onChange={(e) => handleToggleSchedule(row.id, e.target.checked)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      render: (value, row) => (
        <IconButton size="small" color="error" onClick={() => handleDeleteClick(row, 'schedule')}>
          <Delete fontSize="small" />
        </IconButton>
      ),
    },
  ];

  // ==================== RENDER ====================
  
  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access Denied - Admin only</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Communications Manager</Typography>
          <Typography variant="body1" color="text.secondary">
            Manage notifications, templates, and Telegram bot
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {/* Loading */}
      {(loading || actionLoading) && <LinearProgress sx={{ mb: 3 }} />}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{notifications.length}</Typography>
              <Typography variant="caption">Total Notifications</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{templates.length}</Typography>
              <Typography variant="caption">Templates</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{schedules.length}</Typography>
              <Typography variant="caption">Schedules</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge color={telegramStatus?.initialized ? 'success' : 'error'} variant="dot">
                  <Telegram />
                </Badge>
                <Typography variant="body2">
                  {telegramStatus?.initialized ? 'Bot Active' : 'Bot Offline'}
                </Typography>
              </Box>
              <Button size="small" onClick={handleTestTelegram} sx={{ mt: 1 }}>
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Send" icon={<Send />} iconPosition="start" />
          <Tab label="Templates" icon={<AutoAwesome />} iconPosition="start" />
          <Tab label="Schedules" icon={<Schedule />} iconPosition="start" />
          <Tab label="History" icon={<History />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Send Notification */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Send Notification</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" name="title" value={notificationForm.title}
                onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Message" name="message" value={notificationForm.message}
                onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                multiline rows={4} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={notificationForm.type} onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}>
                  {NOTIFICATION_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Target</InputLabel>
                <Select value={notificationForm.target_type} onChange={(e) => setNotificationForm({...notificationForm, target_type: e.target.value})}>
                  {TARGET_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {notificationForm.target_type === 'specific_user' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select User</InputLabel>
                  <Select value={notificationForm.target_id} onChange={(e) => setNotificationForm({...notificationForm, target_id: e.target.value})}>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={notificationForm.send_now} onChange={(e) => setNotificationForm({...notificationForm, send_now: e.target.checked})} />}
                label="Send now"
              />
              {!notificationForm.send_now && (
                <TextField fullWidth type="datetime-local" label="Schedule"
                  value={notificationForm.scheduled_time}
                  onChange={(e) => setNotificationForm({...notificationForm, scheduled_time: e.target.value})}
                  sx={{ mt: 2 }} />
              )}
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSendNotification}
                disabled={actionLoading || !notificationForm.title || !notificationForm.message}
                startIcon={actionLoading ? <CircularProgress size={20} /> : <Send />}>
                {actionLoading ? 'Sending...' : (notificationForm.send_now ? 'Send Now' : 'Schedule')}
              </Button>
            </Grid>
          </Grid>

          {/* Templates quick pick */}
          {templates.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Use Template</Typography>
              <Grid container spacing={2}>
                {templates.slice(0, 3).map(t => (
                  <Grid item xs={12} sm={4} key={t.id}>
                    <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleUseTemplate(t)}>
                      <CardContent>
                        <Typography variant="subtitle2">{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* Tab 1: Templates */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Templates</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setTemplateFormOpen(true)}>
              New Template
            </Button>
          </Box>
          <DataTable columns={templateColumns} data={templates} loading={loading} />
        </Box>
      )}

      {/* Tab 2: Schedules */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>Schedules</Typography>
          <DataTable columns={scheduleColumns} data={schedules} loading={loading} />
        </Box>
      )}

      {/* Tab 3: History */}
      {activeTab === 3 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" placeholder="Search..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5} sx={{ textAlign: 'right' }}>
                <Button startIcon={<Download />} size="small">Export</Button>
              </Grid>
            </Grid>
          </Paper>
          <DataTable columns={notificationColumns} data={filteredNotifications} loading={loading} />
        </Box>
      )}

      {/* Template Form Dialog */}
      <Dialog open={templateFormOpen} onClose={() => setTemplateFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">{selectedItem ? 'Edit' : 'New'} Template</Typography>
            <IconButton onClick={() => setTemplateFormOpen(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Name" value={templateForm.name}
                onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Trigger Event</InputLabel>
                <Select value={templateForm.trigger_event} onChange={handleTriggerEventChange}>
                  {TRIGGER_EVENTS.map(e => (
                    <MenuItem key={e.value} value={e.value}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={e.category} size="small" /> {e.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={2} value={templateForm.description}
                onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={templateForm.type} onChange={(e) => setTemplateForm({...templateForm, type: e.target.value})}>
                  {NOTIFICATION_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Category" value={templateForm.category}
                onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Variables</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                {templateForm.variables.map(v => (
                  <Chip key={v} label={`{{${v}}}`} size="small" sx={{ m: 0.5 }} />
                ))}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Title Template" value={templateForm.title_template}
                onChange={(e) => setTemplateForm({...templateForm, title_template: e.target.value})}
                required multiline InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Message Template" value={templateForm.message_template}
                onChange={(e) => setTemplateForm({...templateForm, message_template: e.target.value})}
                required multiline rows={3} InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Telegram Template" value={templateForm.telegram_template}
                onChange={(e) => setTemplateForm({...templateForm, telegram_template: e.target.value})}
                multiline rows={3} InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={templateForm.is_active} onChange={(e) => setTemplateForm({...templateForm, is_active: e.target.checked})} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={selectedItem ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!templateForm.name || !templateForm.title_template || !templateForm.message_template}>
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteType}`}
        message={`Are you sure you want to delete this ${deleteType}?`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default NotificationTelegramManager;