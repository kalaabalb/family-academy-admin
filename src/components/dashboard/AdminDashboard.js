import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward,
  Book,
  Category,
  CheckCircle,
  ErrorOutline,
  NotificationsActive,
  Payment,
  People,
  Quiz,
  Refresh,
  School,
  Tv,
  WarningAmber,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useUsers } from '../../contexts/UserContext';
import usersApi from '../../api/users';
import categoriesApi from '../../api/categories';
import paymentsApi from '../../api/payments';
import teachersApi from '../../api/teachers';
import coursesApi from '../../api/courses';
import examsApi from '../../api/exams';
import subscriptionsApi from '../../api/subscriptions';
import systemLogsApi from '../../api/systemLogs';
import devicesApi from '../../api/devices';
import notificationsApi from '../../api/notifications';
import { getRelativeTime } from '../../api/utils';
import { devError } from '../../utils/devLogger';

const EMPTY_LOG_STATS = {
  counts: { total: 0, info: 0, warn: 0, error: 0, debug: 0 },
  recent_actions: [],
  error_trends: [],
  user_stats: { active_users: 0, active_today: 0 },
  summary: {
    days_with_logs: 0,
    latest_log: null,
    oldest_log: null,
    logs_per_day: 0,
    error_rate: 0,
    warning_rate: 0,
  },
};

const EMPTY_DEVICE_STATS = {
  counts: {
    total: 0,
    primary_count: 0,
    tv_count: 0,
    tv_paired_count: 0,
    tv_blocked_count: 0,
    users_with_devices: 0,
  },
  summary: {
    average_per_user: 0,
    tv_percentage: 0,
    primary_percentage: 0,
  },
};

const EMPTY_NOTIFICATION_STATS = {
  total_templates: 0,
  active_templates: 0,
  total_sent: 0,
  sent_today: 0,
  unread_notifications: 0,
  unique_users_notified: 0,
};

const getResponseData = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.data)) {
    return value.data.data;
  }

  return value?.data?.data ?? value?.data ?? fallback;
};

const getCachedObject = (value, fallback) => {
  const normalized = getResponseData(value, fallback);

  if (Array.isArray(normalized)) {
    return normalized[0] ?? fallback;
  }

  return normalized ?? fallback;
};

const getCachedList = (value, fallback = []) => {
  const normalized = getResponseData(value, fallback);

  if (Array.isArray(normalized)) {
    if (normalized.length === 1 && Array.isArray(normalized[0]?.logs)) {
      return normalized[0].logs;
    }
    return normalized;
  }

  if (Array.isArray(normalized?.logs)) {
    return normalized.logs;
  }

  return fallback;
};

const formatCount = (value) => new Intl.NumberFormat().format(value || 0);

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

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

const isMeaningfulLog = (log) => {
  const action = String(log.action || '').toLowerCase();
  const description = String(log.description || log.message || '').toLowerCase();
  const details = parseLogDetails(log.details);
  const level = String(log.level || '').toLowerCase();

  if (level === 'error' || level === 'warn' || level === 'warning') {
    return true;
  }

  if (Number(details.statusCode || 0) >= 400) {
    return true;
  }

  if (['http_access', 'request', 'response'].includes(action)) {
    return false;
  }

  if (
    description.includes('get /api/') ||
    description.includes('post /api/') ||
    description.includes('put /api/') ||
    description.includes('delete /api/') ||
    description.includes('patch /api/') ||
    description.includes('http/1.1')
  ) {
    return false;
  }

  return true;
};

const getReadableActivityTitle = (log) => {
  const action = String(log.action || '').toLowerCase();
  const entity = humanizeLogText(log.entity_type || log.resource || '');
  const details = parseLogDetails(log.details);
  const actor = details.adminUsername || details.teacherUsername || log.user_name || log.username;

  if (action.includes('login')) return actor ? `${actor} signed in` : 'A user signed in';
  if (action.includes('logout')) return actor ? `${actor} signed out` : 'A user signed out';
  if (action.includes('created') || action.includes('create')) return actor ? `${actor} created ${entity || 'a record'}` : `${entity || 'A record'} was created`;
  if (action.includes('updated') || action.includes('update') || action.includes('edit')) return actor ? `${actor} updated ${entity || 'a record'}` : `${entity || 'A record'} was updated`;
  if (action.includes('deleted') || action.includes('delete') || action.includes('remove')) return actor ? `${actor} removed ${entity || 'a record'}` : `${entity || 'A record'} was removed`;
  if (action.includes('verified')) return actor ? `${actor} verified a record` : 'A record was verified';
  if (action.includes('scheduled')) return actor ? `${actor} scheduled an item` : 'An item was scheduled';
  if (action.includes('deactivated')) return actor ? `${actor} deactivated an account` : 'An account was deactivated';
  if (action.includes('payment')) return actor ? `${actor} handled payment activity` : 'Payment activity was recorded';
  if (action.includes('exam')) return actor ? `${actor} worked on exam content` : 'Exam activity was recorded';
  if (action.includes('question')) return actor ? `${actor} worked on question content` : 'Question activity was recorded';
  if (action.includes('video')) return actor ? `${actor} worked on video content` : 'Video activity was recorded';
  if (action.includes('note')) return actor ? `${actor} worked on note content` : 'Note activity was recorded';
  if (action.includes('chapter')) return actor ? `${actor} worked on chapter content` : 'Chapter activity was recorded';
  if (action.includes('error')) return entity ? `${entity} hit an error` : 'The system recorded an error';

  return humanizeLogText(log.action) || 'System activity recorded';
};

const getReadableActivityDescription = (log) => {
  const details = parseLogDetails(log.details);
  const action = String(log.action || '').toLowerCase();
  const endpoint = details.endpoint || details.url;
  const method = details.method;
  const statusCode = details.statusCode;
  const message = log.description || log.message;

  if (statusCode >= 500) {
    return `The request failed with a server error${endpoint ? ` while opening ${endpoint}` : ''}.`;
  }

  if (statusCode >= 400) {
    return `The request was blocked or failed${endpoint ? ` on ${endpoint}` : ''}.`;
  }

  if (action.includes('admin') || action.includes('teacher')) {
    if (endpoint && method) {
      return `${humanizeLogText(method)} ${endpoint} completed${statusCode ? ` with status ${statusCode}` : ''}.`;
    }
    if (message && !/http\/1\.1|\/api\//i.test(String(message))) {
      return String(message);
    }
  }

  if (log.description && !/http\/1\.1|\/api\//i.test(String(log.description))) {
    return log.description;
  }

  if (typeof message === 'string' && !/http\/1\.1|\/api\//i.test(message)) {
    return message;
  }

  const entity = humanizeLogText(log.entity_type || log.resource || 'record');
  const level = String(log.level || 'info').toLowerCase();

  if (level === 'error') {
    return `The system recorded an issue related to ${entity.toLowerCase()}.`;
  }

  if (level === 'warn') {
    return `The system flagged ${entity.toLowerCase()} for attention.`;
  }

  return `An update was recorded for ${entity.toLowerCase()}.`;
};

const getReadableUserLabel = (log) => {
  if (log.user_name) return log.user_name;
  if (log.username) return log.username;
  if (log.user_role) return humanizeLogText(log.user_role);
  if (log.user_id) return `User ${log.user_id}`;
  return 'System';
};

const DashboardHero = ({ title, subtitle, actions, children }) => (
  <Paper
    sx={{
      p: { xs: 2.5, md: 3.5 },
      mb: 3,
      borderRadius: 4,
      background: (theme) =>
        theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.24)}, ${alpha(theme.palette.background.paper, 0.96)})`
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.background.paper, 0.96)})`,
      border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 760, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {subtitle}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ width: { xs: '100%', md: 'auto' } }}>
        {actions}
      </Stack>
    </Stack>
    {children}
  </Paper>
);

const MetricCard = ({ title, value, subtitle, icon, tone = 'primary' }) => (
  <Card
    sx={{
      height: '100%',
      borderRadius: 3,
      border: (theme) => `1px solid ${alpha(theme.palette[tone].main, 0.14)}`,
      background: (theme) =>
        `linear-gradient(180deg, ${alpha(theme.palette[tone].main, 0.08)}, ${alpha(theme.palette.background.paper, 0.94)})`,
      boxShadow: 'none',
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
        sx={{ minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (theme) => alpha(theme.palette[tone].main, 0.14),
            color: `${tone}.main`,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const CompactOverviewCard = ({ title, value, subtitle, icon, tone = 'primary' }) => (
  <Paper
    sx={{
      p: 2.25,
      height: '100%',
      minHeight: 176,
      borderRadius: 3,
      overflow: 'hidden',
      border: (theme) => `1px solid ${alpha(theme.palette[tone].main, 0.12)}`,
      background: (theme) =>
        `linear-gradient(180deg, ${alpha(theme.palette[tone].main, 0.07)}, ${alpha(theme.palette.background.paper, 0.98)})`,
    }}
  >
    <Stack spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, height: '100%' }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (theme) => alpha(theme.palette[tone].main, 0.12),
          color: `${tone}.main`,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, width: '100%' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0.75, lineHeight: 1.4, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {title}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ mb: 0.75, lineHeight: 1.1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.55, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  </Paper>
);

const SectionCard = ({ title, subtitle, action, children }) => (
  <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, height: '100%', minWidth: 0 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" fontWeight={700} sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
    {children}
  </Paper>
);

const SignalRow = ({ label, value, hint, tone = 'primary' }) => (
  <Box sx={{ py: 1.25 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.25}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      <Chip
        label={value}
        size="small"
        sx={{
          bgcolor: (theme) => alpha(theme.palette[tone].main, 0.12),
          color: `${tone}.main`,
          fontWeight: 700,
        }}
      />
    </Stack>
  </Box>
);

const RecentActivityList = ({ activities }) => (
  <List disablePadding>
    {activities.map((activity, index) => (
      <React.Fragment key={activity.id}>
        <ListItem disableGutters sx={{ py: 1.4, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              mt: 0.8,
              mr: 1.5,
              flexShrink: 0,
              bgcolor:
                activity.status === 'error'
                  ? 'error.main'
                  : activity.status === 'warning'
                    ? 'warning.main'
                    : 'info.main',
            }}
          />
          <ListItemText
            sx={{ minWidth: 0 }}
            primary={
              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {activity.action}
                </Typography>
                <Chip
                  label={activity.user}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22 }}
                />
              </Stack>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {activity.description}
              </Typography>
            }
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 0.5, sm: 0 }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}
          >
            {activity.time}
          </Typography>
        </ListItem>
        {index < activities.length - 1 ? <Divider /> : null}
      </React.Fragment>
    ))}
  </List>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { getCachedData } = useUsers();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({
    stats: null,
    logStats: EMPTY_LOG_STATS,
    deviceStats: EMPTY_DEVICE_STATS,
    notificationStats: EMPTY_NOTIFICATION_STATS,
    recentActivity: [],
  });

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');

      const [
        usersRes,
        categoriesRes,
        paymentsRes,
        teachersRes,
        coursesRes,
        examsRes,
        subscriptionsRes,
        logsRes,
        logStatsRes,
        deviceStatsRes,
        notificationStatsRes,
      ] = await Promise.allSettled([
        getCachedData('dashboard-users', () => usersApi.getAllUsers({ limit: 1000 }), { forceRefresh }),
        getCachedData('dashboard-categories', () => categoriesApi.getAllCategories(), { forceRefresh }),
        getCachedData('dashboard-payments', () => paymentsApi.getAllPayments(), { forceRefresh }),
        getCachedData('dashboard-teachers', () => teachersApi.getAllTeachers(), { forceRefresh }),
        getCachedData('dashboard-courses', () => coursesApi.getAllCourses(), { forceRefresh }),
        getCachedData('dashboard-exams', () => examsApi.getAllExams(), { forceRefresh }),
        getCachedData('dashboard-subscriptions', () => subscriptionsApi.getAllSubscriptions(), { forceRefresh }),
        getCachedData('dashboard-logs', () => systemLogsApi.getSystemLogs({ limit: 8 }), { forceRefresh }),
        getCachedData('dashboard-log-stats', () => systemLogsApi.getLogStats(), { forceRefresh }),
        getCachedData('dashboard-device-stats', () => devicesApi.getDeviceStats(), { forceRefresh }),
        getCachedData('dashboard-notification-stats', () => notificationsApi.getStats(), { forceRefresh }),
      ]);

      const users = usersRes.status === 'fulfilled' ? getCachedList(usersRes.value) : [];
      const categories = categoriesRes.status === 'fulfilled' ? getCachedList(categoriesRes.value) : [];
      const payments = paymentsRes.status === 'fulfilled' ? getCachedList(paymentsRes.value) : [];
      const teachers = teachersRes.status === 'fulfilled' ? getCachedList(teachersRes.value) : [];
      const courses = coursesRes.status === 'fulfilled' ? getCachedList(coursesRes.value) : [];
      const exams = examsRes.status === 'fulfilled' ? getCachedList(examsRes.value) : [];
      const subscriptions =
        subscriptionsRes.status === 'fulfilled' ? getCachedList(subscriptionsRes.value) : [];

      const rawLogs = logsRes.status === 'fulfilled' ? getCachedList(logsRes.value) : [];
      const logStats =
        logStatsRes.status === 'fulfilled'
          ? getCachedObject(logStatsRes.value, EMPTY_LOG_STATS) || EMPTY_LOG_STATS
          : EMPTY_LOG_STATS;
      const deviceStats =
        deviceStatsRes.status === 'fulfilled'
          ? getCachedObject(deviceStatsRes.value, EMPTY_DEVICE_STATS) || EMPTY_DEVICE_STATS
          : EMPTY_DEVICE_STATS;
      const notificationStats =
        notificationStatsRes.status === 'fulfilled'
          ? getCachedObject(notificationStatsRes.value, EMPTY_NOTIFICATION_STATS) || EMPTY_NOTIFICATION_STATS
          : EMPTY_NOTIFICATION_STATS;

      const activeUsers = users.filter((item) => item.account_status === 'active').length;
      const expiredUsers = users.filter((item) => item.account_status === 'expired').length;
      const unpaidUsers = users.filter((item) => item.account_status === 'unpaid').length;
      const pendingPayments = payments.filter((item) => item.status === 'pending').length;
      const approvedPayments = payments.filter((item) => item.status === 'verified').length;
      const rejectedPayments = payments.filter((item) => item.status === 'rejected').length;
      const activeSubscriptions = subscriptions.filter((item) => item.status === 'active').length;
      const revenue = subscriptions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const activeUserRate = users.length ? Math.round((activeUsers / users.length) * 100) : 0;
      const subscriptionCoverage = users.length
        ? Math.round((activeSubscriptions / users.length) * 100)
        : 0;

      const recentActivity = rawLogs
        .filter(isMeaningfulLog)
        .slice(0, 8)
        .map((log, index) => ({
        id: log.id ?? `${log.created_at || 'log'}-${log.action || 'event'}-${index}`,
        action: getReadableActivityTitle(log),
        user: getReadableUserLabel(log),
        description: getReadableActivityDescription(log),
        time: getRelativeTime(log.created_at),
        status:
          log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info',
      }));

      setDashboard({
        stats: {
          totalUsers: users.length,
          activeUsers,
          expiredUsers,
          unpaidUsers,
          pendingPayments,
          approvedPayments,
          rejectedPayments,
          totalTeachers: teachers.length,
          totalCategories: categories.length,
          totalCourses: courses.length,
          totalExams: exams.length,
          totalSubscriptions: subscriptions.length,
          activeSubscriptions,
          revenue,
          activeUserRate,
          subscriptionCoverage,
        },
        logStats,
        deviceStats,
        notificationStats,
        recentActivity,
      });
    } catch (fetchError) {
      devError('Failed to load admin dashboard:', fetchError);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const { stats, logStats, deviceStats, notificationStats, recentActivity } = dashboard;

  const summaryCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      {
        title: 'Learners',
        value: formatCount(stats.totalUsers),
        subtitle: `${stats.activeUserRate}% active account health`,
        icon: <People />,
        tone: 'primary',
      },
      {
        title: 'Revenue',
        value: formatCurrency(stats.revenue),
        subtitle: `${formatCount(stats.activeSubscriptions)} active subscriptions`,
        icon: <Payment />,
        tone: 'success',
      },
      {
        title: 'Pending Payments',
        value: formatCount(stats.pendingPayments),
        subtitle: `${formatCount(stats.approvedPayments)} already verified`,
        icon: <WarningAmber />,
        tone: stats.pendingPayments > 0 ? 'warning' : 'success',
      },
      {
        title: 'Course Library',
        value: formatCount(stats.totalCourses),
        subtitle: `${formatCount(stats.totalCategories)} categories and ${formatCount(stats.totalExams)} exams`,
        icon: <Book />,
        tone: 'secondary',
      },
    ];
  }, [stats]);

  const quickActions = [
    { label: 'Review Payments', onClick: () => navigate('/payments') },
    { label: 'Manage Users', onClick: () => navigate('/users') },
    { label: 'Open Courses', onClick: () => navigate('/courses') },
    { label: 'System Logs', onClick: () => navigate('/system-logs') },
  ];

  if (loading && !stats) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Building the admin overview...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHero
        title="Admin Dashboard"
        subtitle="A live operating view of users, payments, content health, notifications, and system activity."
        actions={[
          <Button key="payments" variant="contained" onClick={() => navigate('/payments')}>
            Review Payments
          </Button>,
          <Button
            key="refresh"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
          >
            Refresh
          </Button>,
        ]}
      >
        <Grid container spacing={2.25}>
          {summaryCards.map((card) => (
            <Grid item xs={12} sm={6} lg={3} key={card.title}>
              <MetricCard {...card} />
            </Grid>
          ))}
        </Grid>
      </DashboardHero>

      {error ? (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? <LinearProgress sx={{ mb: 3, borderRadius: 3 }} /> : null}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="Operational Attention"
            subtitle="The items that need review before they turn into support or revenue problems."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: (currentTheme) => alpha(currentTheme.palette.warning.main, 0.08),
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <WarningAmber color="warning" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Payment Queue
                    </Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
                    {formatCount(stats.pendingPayments)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending submissions still waiting for verification.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: (currentTheme) => alpha(currentTheme.palette.error.main, 0.08),
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <ErrorOutline color="error" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Error Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
                    {Math.round(logStats.summary?.error_rate || 0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Share of system logs currently landing as errors.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: (currentTheme) => alpha(currentTheme.palette.info.main, 0.08),
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <Tv color="info" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Blocked TVs
                    </Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
                    {formatCount(deviceStats.counts?.tv_blocked_count)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Television devices blocked or unable to pair cleanly.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: (currentTheme) => alpha(currentTheme.palette.secondary.main, 0.08),
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <NotificationsActive color="secondary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Notifications Today
                    </Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
                    {formatCount(notificationStats.sent_today)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Notification deliveries sent across the platform today.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <SectionCard
            title="Platform Health"
            subtitle="Signals that summarize platform readiness at a glance."
          >
            <SignalRow
              label="Accounts in good standing"
              value={`${stats.activeUserRate}%`}
              hint={`${formatCount(stats.activeUsers)} active of ${formatCount(stats.totalUsers)} learners`}
              tone="success"
            />
            <Divider />
            <SignalRow
              label="Subscription coverage"
              value={`${stats.subscriptionCoverage}%`}
              hint={`${formatCount(stats.activeSubscriptions)} active subscriptions`}
              tone="primary"
            />
            <Divider />
            <SignalRow
              label="Teachers on platform"
              value={formatCount(stats.totalTeachers)}
              hint="Accounts currently able to manage assigned content"
              tone="secondary"
            />
            <Divider />
            <SignalRow
              label="Users with registered devices"
              value={formatCount(deviceStats.counts?.users_with_devices)}
              hint={`${formatCount(deviceStats.counts?.total)} devices across phones and TVs`}
              tone="info"
            />
            <Divider />
            <SignalRow
              label="Warnings in logs"
              value={`${Math.round(logStats.summary?.warning_rate || 0)}%`}
              hint={`${formatCount(logStats.counts?.warn)} warning entries`}
              tone="warning"
            />
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={6}>
          <SectionCard
            title="Operations Snapshot"
            subtitle="Payment, device, and notification activity in one place."
          >
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <MetricCard
                  title="Verified Payments"
                  value={formatCount(stats.approvedPayments)}
                  subtitle={`${formatCount(stats.rejectedPayments)} rejected`}
                  icon={<CheckCircle />}
                  tone="success"
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="TV Devices"
                  value={formatCount(deviceStats.counts?.tv_count)}
                  subtitle={`${formatCount(deviceStats.counts?.tv_paired_count)} paired`}
                  icon={<Tv />}
                  tone="info"
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="Templates"
                  value={formatCount(notificationStats.total_templates)}
                  subtitle={`${formatCount(notificationStats.active_templates)} active`}
                  icon={<NotificationsActive />}
                  tone="secondary"
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="Unread Notices"
                  value={formatCount(notificationStats.unread_notifications)}
                  subtitle={`${formatCount(notificationStats.unique_users_notified)} unique users reached`}
                  icon={<People />}
                  tone="warning"
                />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard
            title="Content Library Overview"
            subtitle="The core learning catalog managed across the organization."
            action={
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/courses')}>
                Open library
              </Button>
            }
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <CompactOverviewCard
                  title="Categories"
                  value={formatCount(stats.totalCategories)}
                  subtitle="Top-level structure"
                  icon={<Category />}
                  tone="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CompactOverviewCard
                  title="Courses"
                  value={formatCount(stats.totalCourses)}
                  subtitle="Published learning paths"
                  icon={<Book />}
                  tone="secondary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CompactOverviewCard
                  title="Exams"
                  value={formatCount(stats.totalExams)}
                  subtitle="Assessments available"
                  icon={<Quiz />}
                  tone="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CompactOverviewCard
                  title="Subscriptions"
                  value={formatCount(stats.totalSubscriptions)}
                  subtitle="Active and historical records"
                  icon={<School />}
                  tone="success"
                />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Recent System Activity"
            subtitle="The latest events happening across the platform."
            action={
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/system-logs')}>
                Open activity log
              </Button>
            }
          >
            {recentActivity.length ? (
              <RecentActivityList activities={recentActivity} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No recent system activity is available yet.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SectionCard
            title="Quick Actions"
            subtitle="Jump into the places admins use most often."
          >
            <Stack spacing={1.5}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outlined"
                  fullWidth
                  endIcon={<ArrowForward />}
                  onClick={action.onClick}
                  sx={{ justifyContent: 'space-between' }}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" color="text.secondary">
              Last refreshed {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              Theme tuned for {theme.palette.mode} mode.
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
