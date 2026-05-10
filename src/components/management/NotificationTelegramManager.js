import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import notificationsApi from '../../api/notifications';
import telegramApi from '../../api/telegram';
import usersApi from '../../api/users';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import {
  formatLabel,
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SchedulePicker from '../common/SchedulePicker';
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
import { devError } from '../../utils/devLogger';
import dateUtils from '../../utils/dateUtils';

const getNotificationTypeColor = (value) => {
  switch (value) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'academic':
      return 'secondary';
    case 'payment':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

const getPushReadiness = (user) => {
  const hasToken = Boolean(user?.fcm_token && String(user.fcm_token).trim().length > 10);
  return {
    hasToken,
    label: hasToken ? 'Push ready' : 'No token',
    color: hasToken ? 'success' : 'default',
  };
};

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

const MANUAL_TARGET_TYPES = ['all', 'paid_users', 'unpaid_users', 'specific_user'];
const SCHEDULE_TARGET_TYPES = ['all', 'paid_users', 'specific_user'];

const toSafeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toSafeIsoString = (value) => {
  const date = toSafeDate(value);
  return date ? date.toISOString() : '';
};

const formatScheduleClock = (value) => {
  if (!value) return 'Time not set';
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return normalized;

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatScheduleSummary = (schedule) => {
  switch (schedule?.schedule_type) {
    case 'one_time':
      return schedule?.schedule_value
        ? `Runs once on ${dateUtils.formatDateTime(schedule.schedule_value)}`
        : 'Runs once';
    case 'weekly':
      return `Every ${formatLabel(schedule?.scheduled_day)} at ${formatScheduleClock(schedule?.scheduled_time)}`;
    case 'monthly':
      return `Every month on day ${schedule?.schedule_value || '-'} at ${formatScheduleClock(schedule?.scheduled_time)}`;
    case 'daily':
      return `Every day at ${formatScheduleClock(schedule?.scheduled_time)}`;
    default:
      return schedule?.scheduled_time
        ? `At ${formatScheduleClock(schedule.scheduled_time)}`
        : '-';
  }
};

const SCHEDULE_TYPES = [
  { value: 'one_time', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TRIGGER_EVENTS = [
  { value: 'payment_verified', label: 'Payment Verified', category: 'payment' },
  { value: 'payment_rejected', label: 'Payment Rejected', category: 'payment' },
  { value: 'payment_pending', label: 'Payment Pending', category: 'payment' },
  { value: 'subscription_expiring', label: 'Subscription Expiring', category: 'payment' },
  { value: 'subscription_expired', label: 'Subscription Expired', category: 'payment' },
  { value: 'chapter_scheduled', label: 'Chapter Scheduled', category: 'academic' },
  { value: 'chapter_released', label: 'Chapter Released', category: 'academic' },
  { value: 'video_scheduled', label: 'Video Scheduled', category: 'academic' },
  { value: 'video_released', label: 'Video Released', category: 'academic' },
  { value: 'note_scheduled', label: 'Note Scheduled', category: 'academic' },
  { value: 'note_released', label: 'Note Released', category: 'academic' },
  { value: 'exam_scheduled', label: 'Exam Scheduled', category: 'academic' },
  { value: 'exam_available', label: 'Exam Available', category: 'academic' },
  { value: 'exam_result', label: 'Exam Result', category: 'academic' },
  { value: 'exam_reminder', label: 'Exam Reminder', category: 'academic' },
  { value: 'daily_motivation', label: 'Daily Motivation', category: 'academic' },
  { value: 'study_reminder', label: 'Study Reminder', category: 'academic' },
  { value: 'weekly_progress_nudge', label: 'Weekly Progress Nudge', category: 'academic' },
  { value: 'streak_milestone', label: 'Streak Milestone', category: 'academic' },
  { value: 'achievement_unlocked', label: 'Achievement Unlocked', category: 'academic' },
  { value: 'parent_weekly_report', label: 'Parent Weekly Report', category: 'parent' },
  { value: 'parent_streak', label: 'Parent Streak', category: 'parent' },
  { value: 'parent_chapter_completed', label: 'Parent Chapter Completed', category: 'parent' },
  { value: 'parent_linked', label: 'Parent Linked', category: 'parent' },
];

const VARIABLE_TYPES = {
  'payment_verified': ['amount', 'category_name', 'expiry_date'],
  'payment_rejected': ['amount', 'category_name', 'rejection_reason'],
  'payment_pending': ['amount', 'category_name', 'submitted_date'],
  'subscription_expiring': ['category_name', 'days_remaining'],
  'chapter_scheduled': ['chapter_name', 'course_name', 'category_name', 'release_date', 'release_time', 'chapter_id'],
  'chapter_released': ['chapter_name', 'course_name', 'category_name'],
  'video_scheduled': ['video_title', 'chapter_name', 'course_name', 'category_name', 'release_date', 'release_time', 'video_id'],
  'video_released': ['video_title', 'chapter_name', 'course_name'],
  'note_scheduled': ['note_title', 'chapter_name', 'course_name', 'category_name', 'release_date', 'release_time', 'note_id'],
  'note_released': ['note_title', 'chapter_name', 'course_name', 'category_name'],
  'exam_scheduled': ['exam_title', 'course_name', 'category_name', 'start_date', 'end_date', 'exam_id'],
  'exam_available': ['exam_title', 'course_name', 'end_date', 'exam_id'],
  'exam_reminder': ['exam_title', 'course_name', 'hours_remaining', 'start_date', 'exam_id'],
  'daily_motivation': [],
  'study_reminder': [],
  'weekly_progress_nudge': [],
  'exam_result': ['exam_title', 'course_name', 'score', 'passed'],
  'streak_milestone': ['streak_count'],
  'achievement_unlocked': ['achievement_title'],
  'parent_weekly_report': ['student_name', 'study_days', 'chapters_completed'],
  'parent_linked': ['parent_name', 'linked_at'],
};

// ==================== MAIN COMPONENT ====================

const NotificationTelegramManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, invalidateCache } = useUsers();
  
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
  const [repairingDelivery, setRepairingDelivery] = useState(false);

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;
  const [testPushOpen, setTestPushOpen] = useState(false);
  
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
  const [notificationScheduleEnabled, setNotificationScheduleEnabled] = useState(false);
  
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    template_id: '',
    schedule_type: 'daily',
    schedule_value: '',
    scheduled_time: '09:00',
    scheduled_day: 'monday',
    target_type: 'all',
    target_ids: [],
    is_active: true,
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    title_template: '',
    message_template: '',
    telegram_template: '',
    notification_type: 'info',
    trigger_event: '',
    category: 'general',
    variables: [],
    is_active: true,
  });
  const [testPushForm, setTestPushForm] = useState({
    user_id: '',
    title: 'Family Academy test push',
    message: 'This is a test notification to confirm cloud push is working on this device.',
  });

  const closeTemplateForm = () => {
    setTemplateFormOpen(false);
    resetTemplateForm();
  };

  const closeScheduleForm = () => {
    setScheduleFormOpen(false);
    resetScheduleForm();
  };

  const closeTestPushDialog = () => {
    setTestPushOpen(false);
    setTestPushForm({
      user_id: '',
      title: 'Family Academy test push',
      message: 'This is a test notification to confirm cloud push is working on this device.',
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setSelectedItem(null);
    setDeleteType('notification');
  };

  // ==================== API CALLS ====================
  
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const [templatesRes, schedulesRes, notificationsRes, usersRes, telegramRes, statsRes] = await Promise.all([
        getCachedData(
          'notifications-templates-management',
          () => notificationsApi.getTemplates().catch(() => ({ data: { data: [] } })),
          { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
        ),
        getCachedData(
          'notifications-schedules-management',
          () => notificationsApi.getSchedules().catch(() => ({ data: { data: [] } })),
          { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
        ),
        getCachedData(
          'notifications-history-management',
          () => notificationsApi.getNotificationHistory().catch(() => ({ data: { data: [] } })),
          { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
        ),
        getCachedData(
          'notifications-users-management',
          () => usersApi.getAllUsers({ limit: 100 }).catch(() => ({ data: { data: [] } })),
          { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
        ),
        getCachedData(
          'notifications-telegram-status',
          () => telegramApi.getBotStatus().catch(() => ({ data: { data: null } })),
          { forceRefresh, ttl: 60 * 1000, preserveShape: true }
        ),
        getCachedData(
          'notifications-stats-management',
          () => notificationsApi.getStats().catch(() => ({ data: { data: { summary: {} } } })),
          { forceRefresh, ttl: 2 * 60 * 1000, preserveShape: true }
        ),
      ]);

      setTemplates(Array.isArray(templatesRes) ? templatesRes : []);
      setSchedules(Array.isArray(schedulesRes) ? schedulesRes : []);
      setNotifications(Array.isArray(notificationsRes) ? notificationsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setTelegramStatus(
        telegramRes && !Array.isArray(telegramRes) ? telegramRes : null
      );
      setStats(
        statsRes?.summary ||
          statsRes?.data?.summary ||
          { total: 0, sent: 0, scheduled: 0, failed: 0 }
      );
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, showError]);

  useEffect(() => {
    if (isAdmin()) fetchAllData();
  }, [isAdmin, fetchAllData]);

  useEffect(() => {
    if (!isAdmin()) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllData(true);
      }
    }, 90 * 1000);

    return () => window.clearInterval(interval);
  }, [isAdmin, fetchAllData]);

  const invalidateNotificationCaches = useCallback(() => {
    invalidateCache('notifications-templates-management');
    invalidateCache('notifications-schedules-management');
    invalidateCache('notifications-history-management');
    invalidateCache('notifications-users-management');
    invalidateCache('notifications-telegram-status');
    invalidateCache('notifications-stats-management');
  }, [invalidateCache]);

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
      closeTemplateForm();
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to create template'));
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
      closeTemplateForm();
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to update template'));
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
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to delete template'));
    } finally {
      setActionLoading(false);
      closeDeleteConfirm();
    }
  };

  // ==================== SCHEDULE HANDLERS ====================
  
  const handleCreateSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.template_id) {
      showError('Name and template are required');
      return;
    }

    if (scheduleForm.schedule_type === 'one_time' && !toSafeDate(scheduleForm.schedule_value)) {
      showError('Choose a valid date and time for the one-time schedule');
      return;
    }

    if (scheduleForm.schedule_type === 'monthly') {
      const dayOfMonth = Number(scheduleForm.schedule_value);
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        showError('Choose a valid day of the month between 1 and 31');
        return;
      }
    }

    if (scheduleForm.target_type === 'specific_user' && (!scheduleForm.target_ids || scheduleForm.target_ids.length === 0)) {
      showError('Choose at least one user for this schedule');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...scheduleForm,
        template_id: Number(scheduleForm.template_id),
        schedule_value: scheduleForm.schedule_type === 'one_time'
          ? toSafeIsoString(scheduleForm.schedule_value)
          : scheduleForm.schedule_type === 'monthly'
            ? String(scheduleForm.schedule_value || '')
            : null,
        scheduled_time: scheduleForm.schedule_type === 'one_time'
          ? null
          : (scheduleForm.scheduled_time || null),
        scheduled_day: scheduleForm.schedule_type === 'weekly'
          ? scheduleForm.scheduled_day
          : null,
        target_ids: scheduleForm.target_type === 'specific_user'
          ? (scheduleForm.target_ids || []).map((id) => Number(id)).filter(Boolean)
          : [],
      };

      await notificationsApi.createSchedule(payload);
      showSuccess('Schedule created');
      closeScheduleForm();
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to create schedule'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSchedule = async (id, isActive) => {
    try {
      await notificationsApi.toggleSchedule(id, isActive);
      showSuccess(`Schedule ${isActive ? 'enabled' : 'disabled'}`);
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to toggle schedule'));
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await notificationsApi.deleteSchedule(selectedItem.id);
      showSuccess('Schedule deleted');
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to delete schedule'));
    } finally {
      setActionLoading(false);
      closeDeleteConfirm();
    }
  };

  // ==================== NOTIFICATION HANDLERS ====================
  
  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      showError('Title and message are required');
      return;
    }

    // Validate template selection - REQUIRED for production
    if (!selectedItem || !selectedItem.id) {
      showError('Please select a template first');
      setActiveTab(1); // Switch to templates tab
      return;
    }

    if (notificationForm.target_type === 'specific_user' && !notificationForm.target_id) {
      showError('Choose a user to receive this notification');
      return;
    }

    if (!notificationForm.send_now && !toSafeDate(notificationForm.scheduled_time)) {
      showError('Choose a valid date and time for the scheduled notification');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        template_id: selectedItem.id, // Always required
        title: notificationForm.title,
        message: notificationForm.message,
        notification_type: notificationForm.type,
        target_type: notificationForm.target_type,
        target_id: notificationForm.target_type === 'specific_user'
          ? Number(notificationForm.target_id)
          : null,
        scheduled_time: notificationForm.send_now
          ? null
          : toSafeIsoString(notificationForm.scheduled_time),
        variables: {}, // Add empty variables object as required by backend
        force_push: true,
      };

      const response = await notificationsApi.sendNotification(payload);
      showSuccess(response.data?.message || 'Notification sent successfully');
      resetNotificationForm();
      setSelectedItem(null); // Clear selected template
      invalidateNotificationCaches();
      await fetchAllData(true);
      setActiveTab(3); // Switch to history tab
    } catch (error) {
      devError('Send notification error:', error.response?.data || error);
      showError(getFriendlyActionError(error, 'Failed to send notification'));
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
      invalidateNotificationCaches();
      fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to delete notification'));
    } finally {
      setActionLoading(false);
      closeDeleteConfirm();
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
      showError(getFriendlyActionError(error, 'Failed to resend notification'));
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== TELEGRAM HANDLERS ====================
  
  const handleTestTelegram = async () => {
    if (actionLoading) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await telegramApi.testBotConnection();
      const message =
        res?.data?.message ||
        res?.data?.data?.message ||
        'Telegram connection OK';
      invalidateCache('notifications-telegram-status');
      await fetchAllData(true);
      showSuccess(message);
    } catch (error) {
      showError(
        getFriendlyActionError(error, 'Unable to test Telegram connection right now.')
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepairDelivery = async () => {
    setRepairingDelivery(true);
    try {
      const response = await notificationsApi.repairDelivery({ dry_run: false });
      const result = response?.data?.data || {};
      showSuccess(
        `Repair completed: ${result.repaired_log_rows || 0} logs fixed, ${result.created_payment_notifications || 0} payment notifications created.`
      );
      invalidateNotificationCaches();
      await fetchAllData(true);
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to repair notification delivery'));
    } finally {
      setRepairingDelivery(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!testPushForm.user_id || !testPushForm.title || !testPushForm.message) {
      showError('User, title, and message are required');
      return;
    }

    setActionLoading(true);
    try {
      const response = await notificationsApi.sendTestPush(testPushForm);
      const userLabel = users.find((user) => String(user.id) === String(testPushForm.user_id));
      showSuccess(
        response.data?.message ||
          `Test push sent to ${userLabel?.full_name || userLabel?.username || `User #${testPushForm.user_id}`}`
      );
      closeTestPushDialog();
    } catch (error) {
      showError(getFriendlyActionError(error, 'Failed to send test push'));
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
      notification_type: 'info',
      trigger_event: '',
      category: 'general',
      variables: [],
      is_active: true,
    });
    setSelectedItem(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: '',
      template_id: '',
      schedule_type: 'daily',
      schedule_value: '',
      scheduled_time: '09:00',
      scheduled_day: 'monday',
      target_type: 'all',
      target_ids: [],
      is_active: true,
    });
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
    setNotificationScheduleEnabled(false);
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
      notification_type: template.notification_type || 'info',
      trigger_event: template.trigger_event,
      category: template.category || 'general',
      variables: template.variables || [],
      is_active: template.is_active,
    });
    setTemplateFormOpen(true);
  };

  const handleUseTemplate = (template) => {
    // Replace variables with placeholders
    let message = template.message_template;
    if (template.variables) {
      template.variables.forEach(varName => {
        message = message.replace(new RegExp(`{{${varName}}}`, 'g'), `[${varName}]`);
      });
    }
    
    setNotificationForm({
      ...notificationForm,
      title: template.name,
      message: message,
      type: template.notification_type || 'info',
    });
    setSelectedItem(template); // CRITICAL: Store the selected template
    setActiveTab(0); // Switch to send tab
    showSuccess(`Template "${template.name}" selected. You can now send.`);
  };

  const handleTriggerEventChange = (event) => {
    const variables = VARIABLE_TYPES[event.target.value] || [];
    setTemplateForm({
      ...templateForm,
      trigger_event: event.target.value,
      variables,
    });
  };

  const handleRefresh = () => {
    invalidateNotificationCaches();
    return fetchAllData(true);
  };

  const handleExportHistory = () => {
    const rows = filteredNotifications.map((row) => ({
      id: row.id ?? '',
      title: row.title ?? '',
      message: row.message ?? '',
      status: row.status ?? '',
      trigger_event: row.trigger_event ?? '',
      template_name: row.template_name ?? '',
      target_type: row.target_type ?? '',
      target_id: row.target_id ?? '',
      total_recipients: row.total_recipients ?? '',
      app_delivered_count: row.app_delivered_count ?? '',
      app_failed_count: row.app_failed_count ?? '',
      sent_by: row.sent_by_username ?? '',
      created_at: row.created_at ?? '',
      sent_at: row.sent_at ?? '',
    }));

    if (rows.length === 0) {
      showError('There is no notification history to export yet.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(`Exported ${rows.length} notification records.`);
  };

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

  const selectedNotificationUser = users.find(
    (user) => String(user.id) === String(notificationForm.target_id)
  );
  const selectedTestPushUser = users.find(
    (user) => String(user.id) === String(testPushForm.user_id)
  );

  // ==================== FILTERS ====================
  
  const filteredNotifications = notifications.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.trigger_event?.toLowerCase().includes(q) ||
        n.template_name?.toLowerCase().includes(q) ||
        n.target_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ==================== COLUMNS ====================

  const renderContentIdSummary = (row) => {
    const ids = [];
    if (row.id != null) ids.push(`Notification #${row.id}`);
    if (row.template_id != null) ids.push(`Template #${row.template_id}`);
    if (row.target_id != null) ids.push(`Target #${row.target_id}`);

    const templateData = row.template_data && typeof row.template_data === 'object'
      ? row.template_data
      : {};

    ['video_id', 'note_id', 'exam_id', 'chapter_id', 'course_id', 'category_id'].forEach((key) => {
      if (templateData[key] != null && templateData[key] !== '') {
        ids.push(`${formatLabel(key)}: ${templateData[key]}`);
      }
    });

    return ids.length > 0 ? ids.join(' • ') : '-';
  };
  
  const notificationColumns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 96,
      minWidth: 96,
      render: (value) => renderTableChip(`#${value}`, { color: 'default' }),
    },
    {
      field: 'title',
      headerName: 'Notification',
      minWidth: 320,
      render: (value, row) => renderPrimaryCell({
        primary: value,
        secondary: [
          row.template_name ? `Template: ${row.template_name}` : null,
          row.message ? `${row.message.substring(0, 70)}...` : null,
          row.app_failure_detail ? `App push: ${row.app_failure_detail}` : null,
        ].filter(Boolean).join(' • '),
      }),
    },
    {
      field: 'trigger_event',
      headerName: 'Trigger',
      width: 170,
      minWidth: 170,
      render: (value) => renderTableChip(formatLabel(value), { color: 'secondary' }),
    },
    {
      field: 'notification_type',
      headerName: 'Type',
      width: 100,
      minWidth: 100,
      render: (value) => {
        const type = NOTIFICATION_TYPES.find(t => t.value === value);
        return renderTableChip(type?.label || formatLabel(value), {
          color: getNotificationTypeColor(value),
        });
      },
    },
    {
      field: 'target_type',
      headerName: 'Target',
      minWidth: 170,
      render: (value, row) => {
        const target = TARGET_TYPES.find(t => t.value === value);
        const label = row.target_id ? `${target?.label || formatLabel(value)} #${row.target_id}` : (target?.label || formatLabel(value));
        return renderTableChip(label, { color: 'primary' });
      },
    },
    {
      field: 'content_ids',
      headerName: 'Content / IDs',
      minWidth: 320,
      sortable: false,
      searchable: false,
      render: (value, row) => renderPrimaryCell({
        primary: renderContentIdSummary(row),
      }),
    },
    {
      field: 'total_recipients',
      headerName: 'Recipients',
      width: 160,
      minWidth: 180,
      render: (value, row) => renderPrimaryCell({
        primary: `${value || 0} total`,
        secondary: [
          row.app_delivered_count ? `${row.app_delivered_count} app delivered` : null,
          row.app_failed_count ? `${row.app_failed_count} app failed` : null,
        ].filter(Boolean).join(' • ') || null,
      }),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      minWidth: 100,
      render: (value) => {
        const colors = { sent: 'success', scheduled: 'warning', failed: 'error' };
        return renderTableChip(formatLabel(value), { color: colors[value] || 'default' });
      },
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 170,
      minWidth: 170,
      render: (value) => renderTableDate(value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      minWidth: 100,
      sortable: false,
      searchable: false,
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
    {
      field: 'id',
      headerName: 'ID',
      width: 88,
      minWidth: 88,
      render: (value) => renderTableChip(`#${value}`, { color: 'default' }),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      minWidth: 220,
      render: (value) => renderPrimaryCell({ primary: value }),
    },
    {
      field: 'trigger_event',
      headerName: 'Trigger',
      width: 150,
      minWidth: 170,
      render: (value) => renderTableChip(formatLabel(value)),
    },
    {
      field: 'notification_type',
      headerName: 'Type',
      width: 100,
      minWidth: 100,
      render: (value) => renderTableChip(formatLabel(value), {
        color: getNotificationTypeColor(value),
      }),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      minWidth: 100,
      render: (value) => renderTableChip(value ? 'Active' : 'Inactive', {
        color: value ? 'success' : 'default',
      }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      minWidth: 150,
      sortable: false,
      searchable: false,
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
    {
      field: 'id',
      headerName: 'ID',
      width: 88,
      minWidth: 88,
      render: (value) => renderTableChip(`#${value}`, { color: 'default' }),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      minWidth: 220,
      render: (value) => renderPrimaryCell({ primary: value }),
    },
    {
      field: 'template_name',
      headerName: 'Template',
      width: 150,
      minWidth: 180,
      render: (value, row) => {
        const template = templates.find(t => t.id === row.template_id);
        return renderPrimaryCell({ primary: template?.name || '-' });
      },
    },
    {
      field: 'target_ids',
      headerName: 'Target / IDs',
      minWidth: 180,
      sortable: false,
      searchable: false,
      render: (value, row) => renderPrimaryCell({
        primary: row.target_type === 'specific_user'
          ? `User #${row.target_ids?.[0] || row.target_id || '-'}`
          : formatLabel(row.target_type),
        secondary: row.template_id ? `Template #${row.template_id}` : null,
      }),
    },
    {
      field: 'schedule_type',
      headerName: 'Type',
      width: 100,
      minWidth: 100,
      render: (value) => renderTableChip(formatLabel(value)),
    },
    {
      field: 'next_run',
      headerName: 'Next Run',
      width: 220,
      minWidth: 260,
      render: (value, row) => renderPrimaryCell({
        primary: dateUtils.formatDateTime(value) || '-',
        secondary: formatScheduleSummary(row),
      }),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      minWidth: 100,
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
      minWidth: 80,
      sortable: false,
      searchable: false,
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ p: 3 }}>
      <ManagementPageHeader
        title="Communications Manager"
        subtitle="Manage notifications, templates, schedules, delivery history, and Telegram connectivity."
        actions={
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* Loading */}
      {(loading || actionLoading) && <LinearProgress sx={{ mb: 3 }} />}

      <SummaryStrip
        items={[
          { label: 'Notifications', value: stats.total || notifications.length, color: 'primary' },
          { label: 'Templates', value: templates.length, color: 'secondary' },
          { label: 'Schedules', value: schedules.length, color: 'info' },
          { label: 'Telegram Bot', value: telegramStatus?.initialized ? 'Active' : 'Offline', color: telegramStatus?.initialized ? 'success' : 'error' },
        ]}
        sx={{
          '& .MuiStack-root': {
            alignItems: { xs: 'stretch', md: 'center' },
          },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<NotificationsIcon />} onClick={() => setTestPushOpen(true)}>
            Test Push
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleTestTelegram}
            disabled={loading || actionLoading}
          >
            {actionLoading ? 'Checking...' : 'Test Connection'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Bolt />}
            onClick={handleRepairDelivery}
            disabled={repairingDelivery}
          >
            {repairingDelivery ? 'Repairing...' : 'Repair Delivery'}
          </Button>
        </Stack>
      </Box>

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
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Send Notification {selectedItem && `- Using Template: ${selectedItem.name}`}
          </Typography>
          
          {!selectedItem && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please select a template from the Templates tab first
            </Alert>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Title" name="title" value={notificationForm.title}
                onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})} 
                disabled={!selectedItem} />
            </Grid>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Message" name="message" value={notificationForm.message}
                onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                multiline rows={4} disabled={!selectedItem} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth disabled={!selectedItem}>
                <InputLabel>Type</InputLabel>
                <Select value={notificationForm.type} onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}>
                  {NOTIFICATION_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth disabled={!selectedItem}>
                <InputLabel>Target</InputLabel>
                <Select value={notificationForm.target_type} onChange={(e) => setNotificationForm({...notificationForm, target_type: e.target.value})}>
                  {TARGET_TYPES.filter((t) => MANUAL_TARGET_TYPES.includes(t.value)).map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {notificationForm.target_type === 'specific_user' && (
              <Grid item xs={12}>
                <FormControl fullWidth disabled={!selectedItem}>
                  <InputLabel>Select User</InputLabel>
                  <Select value={notificationForm.target_id} onChange={(e) => setNotificationForm({...notificationForm, target_id: e.target.value})}>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                              {u.full_name || u.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              @{u.username} • #{u.id}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={getPushReadiness(u).label}
                            color={getPushReadiness(u).color}
                            variant={getPushReadiness(u).hasToken ? 'filled' : 'outlined'}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedNotificationUser && (
                  <Alert severity={getPushReadiness(selectedNotificationUser).hasToken ? 'success' : 'warning'} sx={{ mt: 1.5 }}>
                    {getPushReadiness(selectedNotificationUser).hasToken
                      ? 'This user has a saved device push token, so app delivery should be possible.'
                      : 'This user does not have a valid device push token yet, so app push may not arrive until they open the app online and sign in again.'}
                  </Alert>
                )}
              </Grid>
            )}
            <Grid item xs={12}>
              <SchedulePicker
                enabled={notificationScheduleEnabled}
                onEnabledChange={(enabled) => {
                  setNotificationScheduleEnabled(enabled);
                  setNotificationForm({
                    ...notificationForm,
                    send_now: !enabled,
                    scheduled_time: enabled ? notificationForm.scheduled_time : '',
                  });
                }}
                value={toSafeDate(notificationForm.scheduled_time)}
                onChange={(date) =>
                  setNotificationForm({
                    ...notificationForm,
                    scheduled_time: toSafeIsoString(date),
                    send_now: !date,
                  })
                }
                label="Notification Schedule"
                helperText="Use the same datetime picker style used for content scheduling"
                disabled={!selectedItem}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSendNotification}
                disabled={actionLoading || !notificationForm.title || !notificationForm.message || !selectedItem}
                startIcon={actionLoading ? <CircularProgress size={20} /> : <Send />}>
                {actionLoading ? 'Sending...' : (notificationForm.send_now ? 'Send Now' : 'Schedule')}
              </Button>
              {selectedItem && (
                <Button variant="outlined" sx={{ ml: 2 }} onClick={() => setSelectedItem(null)}>
                  Clear Template
                </Button>
              )}
            </Grid>
          </Grid>

          {/* Templates quick pick */}
          {templates.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Use a Template</Typography>
              <Grid container spacing={2}>
                {templates.slice(0, 3).map(t => (
                  <Grid item xs={12} sm={4} key={t.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedItem?.id === t.id ? '2px solid #1976d2' : undefined
                      }} 
                      onClick={() => handleUseTemplate(t)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2">{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {templates.length > 3 && (
                <Button size="small" sx={{ mt: 1 }} onClick={() => setActiveTab(1)}>
                  View all templates
                </Button>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Tab 1: Templates */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Templates</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => {
              resetTemplateForm();
              setTemplateFormOpen(true);
            }}>
              New Template
            </Button>
          </Box>
          <DataTable showToolbar={false} columns={templateColumns} data={templates} loading={loading} onRefresh={handleRefresh} />
        </Box>
      )}

      {/* Tab 2: Schedules */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Schedules</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => {
              resetScheduleForm();
              setScheduleFormOpen(true);
            }}>
              New Schedule
            </Button>
          </Box>
          <DataTable showToolbar={false} columns={scheduleColumns} data={schedules} loading={loading} onRefresh={handleRefresh} />
        </Box>
      )}

      {/* Tab 3: History */}
      {activeTab === 3 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            History now shows trigger events, target audience, and recipient counts so you can audit delivery more easily.
          </Alert>
          <ManagementSearchToolbar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search communication history..."
            actions={
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
                <Button startIcon={<Download />} size="small" onClick={handleExportHistory}>Export</Button>
              </>
            }
          />
          <DataTable showToolbar={false} columns={notificationColumns} data={filteredNotifications} loading={loading} onRefresh={handleRefresh} />
        </Box>
      )}

      {/* Template Form Dialog */}
      <Dialog open={templateFormOpen} onClose={closeTemplateForm} maxWidth="md" fullWidth>
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">{selectedItem ? 'Edit' : 'New'} Template</Typography>
            <IconButton onClick={closeTemplateForm} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FastTextField fullWidth label="Name" value={templateForm.name}
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
              <FastTextField fullWidth label="Description" multiline rows={2} value={templateForm.description}
                onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={templateForm.notification_type} onChange={(e) => setTemplateForm({...templateForm, notification_type: e.target.value})}>
                  {NOTIFICATION_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FastTextField fullWidth label="Category" value={templateForm.category}
                onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Variables</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                {templateForm.variables.length > 0 ? templateForm.variables.map(v => (
                  <Chip key={v} label={`{{${v}}}`} size="small" sx={{ m: 0.5 }} />
                )) : (
                  <Typography variant="body2" color="text.secondary">
                    This template does not require dynamic variables.
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Title Template" value={templateForm.title_template}
                onChange={(e) => setTemplateForm({...templateForm, title_template: e.target.value})}
                required multiline InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Message Template" value={templateForm.message_template}
                onChange={(e) => setTemplateForm({...templateForm, message_template: e.target.value})}
                required multiline rows={3} InputProps={{ sx: { fontFamily: 'monospace' } }} />
            </Grid>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Telegram Template (Optional)" value={templateForm.telegram_template}
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
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button variant="outlined" onClick={closeTemplateForm} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={selectedItem ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!templateForm.name || !templateForm.title_template || !templateForm.message_template}
            sx={{ borderRadius: 2 }}>
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Form Dialog */}
      <Dialog open={scheduleFormOpen} onClose={closeScheduleForm} maxWidth="md" fullWidth>
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">New Schedule</Typography>
            <IconButton onClick={closeScheduleForm} size="small"><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FastTextField fullWidth label="Schedule Name" value={scheduleForm.name}
                onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select value={scheduleForm.template_id} onChange={(e) => setScheduleForm({...scheduleForm, template_id: e.target.value})}>
                  {templates.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} {t.trigger_event ? `(${formatLabel(t.trigger_event)})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Schedule Type</InputLabel>
                <Select
                  value={scheduleForm.schedule_type}
                  onChange={(e) => setScheduleForm({
                    ...scheduleForm,
                    schedule_type: e.target.value,
                    schedule_value: e.target.value === 'monthly' ? scheduleForm.schedule_value : '',
                    scheduled_time: e.target.value === 'one_time' ? '' : (scheduleForm.scheduled_time || '09:00'),
                    scheduled_day: e.target.value === 'weekly' ? scheduleForm.scheduled_day : 'monday',
                  })}
                >
                  {SCHEDULE_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {scheduleForm.schedule_type === 'one_time' && (
              <Grid item xs={12}>
                <SchedulePicker
                  enabled
                  onEnabledChange={() => {}}
                  value={toSafeDate(scheduleForm.schedule_value)}
                  onChange={(value) => setScheduleForm({
                    ...scheduleForm,
                    schedule_value: toSafeIsoString(value),
                  })}
                  label="Send At"
                  helperText="Choose the exact date and time for this one-time schedule."
                  disabled={actionLoading}
                />
              </Grid>
            )}
            {scheduleForm.schedule_type === 'weekly' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select value={scheduleForm.scheduled_day} onChange={(e) => setScheduleForm({...scheduleForm, scheduled_day: e.target.value})}>
                    <MenuItem value="monday">Monday</MenuItem>
                    <MenuItem value="tuesday">Tuesday</MenuItem>
                    <MenuItem value="wednesday">Wednesday</MenuItem>
                    <MenuItem value="thursday">Thursday</MenuItem>
                    <MenuItem value="friday">Friday</MenuItem>
                    <MenuItem value="saturday">Saturday</MenuItem>
                    <MenuItem value="sunday">Sunday</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            {scheduleForm.schedule_type === 'monthly' && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="number" label="Day of Month (1-31)" 
                  value={scheduleForm.schedule_value} 
                  onChange={(e) => setScheduleForm({...scheduleForm, schedule_value: e.target.value})}
                  inputProps={{ min: 1, max: 31 }} />
              </Grid>
            )}
            {scheduleForm.schedule_type !== 'one_time' && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="time" label="Time" 
                  value={scheduleForm.scheduled_time}
                  onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select value={scheduleForm.target_type} onChange={(e) => setScheduleForm({...scheduleForm, target_type: e.target.value})}>
                  {TARGET_TYPES.filter(t => SCHEDULE_TARGET_TYPES.includes(t.value)).map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {scheduleForm.target_type === 'specific_user' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value={scheduleForm.target_ids?.[0] || ''}
                    onChange={(e) => setScheduleForm({
                      ...scheduleForm,
                      target_ids: e.target.value ? [e.target.value] : [],
                    })}
                  >
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <Alert severity="info">
                Recurring schedules currently support all users, paid users, or one specific user.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={scheduleForm.is_active} onChange={(e) => setScheduleForm({...scheduleForm, is_active: e.target.checked})} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button variant="outlined" onClick={closeScheduleForm} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSchedule}
            disabled={!scheduleForm.name || !scheduleForm.template_id}
            sx={{ borderRadius: 2 }}>
            Create Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteType}`}
        message={`Are you sure you want to delete this ${deleteType}?`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
      />

      <Dialog open={testPushOpen} onClose={() => !actionLoading && closeTestPushDialog()} fullWidth maxWidth="sm">
        <DialogTitle>Send Test Push</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              This sends a real app push to one user, so it is the fastest way to verify Firebase delivery.
            </Alert>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                value={testPushForm.user_id}
                label="User"
                onChange={(e) => setTestPushForm({ ...testPushForm, user_id: e.target.value })}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {user.full_name || user.username || `User #${user.id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          @{user.username || `user_${user.id}`} • #{user.id}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={getPushReadiness(user).label}
                        color={getPushReadiness(user).color}
                        variant={getPushReadiness(user).hasToken ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTestPushUser && (
              <Alert severity={getPushReadiness(selectedTestPushUser).hasToken ? 'success' : 'warning'}>
                {getPushReadiness(selectedTestPushUser).hasToken
                  ? 'This user looks ready for cloud push delivery.'
                  : 'This user does not currently have a valid push token saved, so the test push will likely fail until they open the app online and sign in again.'}
              </Alert>
            )}
            <FastTextField
              fullWidth
              label="Title"
              name="testPushTitle"
              value={testPushForm.title}
              onChange={(e) => setTestPushForm({ ...testPushForm, title: e.target.value })}
            />
            <FastTextField
              fullWidth
              label="Message"
              name="testPushMessage"
              multiline
              rows={3}
              value={testPushForm.message}
              onChange={(e) => setTestPushForm({ ...testPushForm, message: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTestPushDialog} disabled={actionLoading}>Cancel</Button>
          <Button onClick={handleSendTestPush} variant="contained" disabled={actionLoading}>
            Send Test Push
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </LocalizationProvider>
  );
};

export default NotificationTelegramManager;
