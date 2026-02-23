import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../../contexts/UserContext';
import usersApi from '../../api/users';
import categoriesApi from '../../api/categories';
import paymentsApi from '../../api/payments';
import teachersApi from '../../api/teachers';
import coursesApi from '../../api/courses';
import examsApi from '../../api/exams';
import subscriptionsApi from '../../api/subscriptions';
import systemLogsApi from '../../api/systemLogs';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  People,
  Category,
  School,
  Payment,
  Book,
  Quiz,
  TrendingUp,
  TrendingDown,
  AccessTime,
  CheckCircle,
  Cancel,
  Refresh,
  ArrowForward,
  Warning,
  Info,
  BarChart,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { getRelativeTime } from '../../api/utils';

const StatCard = ({ title, value, icon, color, change, loading }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        transition: 'all 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" fontWeight="bold" sx={{ color }}>
                {value}
              </Typography>
            )}
          </Box>
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
        </Box>
        
        {change !== undefined && change !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {change > 0 ? (
              <>
                <TrendingUp sx={{ color: 'success.main', mr: 0.5, fontSize: 16 }} />
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  +{change}% from last month
                </Typography>
              </>
            ) : change < 0 ? (
              <>
                <TrendingDown sx={{ color: 'error.main', mr: 0.5, fontSize: 16 }} />
                <Typography variant="caption" color="error.main" fontWeight="medium">
                  {change}% from last month
                </Typography>
              </>
            ) : null}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const QuickActionCard = ({ title, description, icon, color, onClick }) => {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: `1px solid ${color}20`,
        transition: 'all 0.3s',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${color}20`,
          borderColor: color,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mb: 2 }}>
          {description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color={color} fontWeight="medium">
            Go to page
          </Typography>
          <ArrowForward sx={{ fontSize: 16, color: color }} />
        </Box>
      </CardContent>
    </Card>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    expiredUsers: 0,
    unpaidUsers: 0,
    pendingPayments: 0,
    totalTeachers: 0,
    totalCategories: 0,
    totalCourses: 0,
    totalExams: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    revenue: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const { getCachedData, invalidateCache } = useUsers();

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all data in parallel with caching
      const [
        usersRes,
        categoriesRes,
        paymentsRes,
        teachersRes,
        coursesRes,
        examsRes,
        subscriptionsRes,
        logsRes,
      ] = await Promise.allSettled([
        getCachedData('users-stats', () => usersApi.getAllUsers({ limit: 1000 }), { forceRefresh }),
        getCachedData('categories', () => categoriesApi.getAllCategories(), { forceRefresh }),
        getCachedData('payments', () => paymentsApi.getAllPayments(), { forceRefresh }),
        getCachedData('teachers', () => teachersApi.getAllTeachers(), { forceRefresh }),
        getCachedData('courses', () => coursesApi.getAllCourses(), { forceRefresh }),
        getCachedData('exams', () => examsApi.getAllExams(), { forceRefresh }),
        getCachedData('subscriptions', () => subscriptionsApi.getAllSubscriptions(), { forceRefresh }),
        getCachedData('recent-activity', () => systemLogsApi.getSystemLogs({ limit: 5 }), { forceRefresh }),
      ]);
      
      // Process users data
      let totalUsers = 0;
      let activeUsers = 0;
      let expiredUsers = 0;
      let unpaidUsers = 0;
      
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value || [];
        totalUsers = users.length;
        activeUsers = users.filter(u => u.account_status === 'active').length;
        expiredUsers = users.filter(u => u.account_status === 'expired').length;
        unpaidUsers = users.filter(u => u.account_status === 'unpaid').length;
      }
      
      // Process other data
      const pendingPayments = paymentsRes.status === 'fulfilled' 
        ? (paymentsRes.value || []).filter(p => p.status === 'pending').length 
        : 0;
      const totalTeachers = teachersRes.status === 'fulfilled' 
        ? (teachersRes.value || []).length 
        : 0;
      const totalCategories = categoriesRes.status === 'fulfilled' 
        ? (categoriesRes.value || []).length 
        : 0;
      const totalCourses = coursesRes.status === 'fulfilled' 
        ? (coursesRes.value || []).length 
        : 0;
      const totalExams = examsRes.status === 'fulfilled' 
        ? (examsRes.value || []).length 
        : 0;
      
      // Process subscriptions
      let totalSubscriptions = 0;
      let activeSubscriptions = 0;
      let revenue = 0;
      
      if (subscriptionsRes.status === 'fulfilled') {
        const subscriptions = subscriptionsRes.value || [];
        totalSubscriptions = subscriptions.length;
        activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
        revenue = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
      }
      
      setStats({
        totalUsers,
        activeUsers,
        expiredUsers,
        unpaidUsers,
        pendingPayments,
        totalTeachers,
        totalCategories,
        totalCourses,
        totalExams,
        totalSubscriptions,
        activeSubscriptions,
        revenue,
      });
      
      // Process recent activity from system logs
      if (logsRes.status === 'fulfilled') {
        let logs = [];
        const logsData = logsRes.value;
        
        if (logsData?.data?.logs) {
          logs = logsData.data.logs;
        } else if (logsData?.data && Array.isArray(logsData.data)) {
          logs = logsData.data;
        } else if (Array.isArray(logsData)) {
          logs = logsData;
        }
        
        const formatted = logs.slice(0, 5).map(log => ({
          id: log.id,
          action: log.action || 'System Event',
          user: log.user_id ? `User ${log.user_id}` : 'System',
          time: getRelativeTime(log.created_at),
          status: log.level === 'error' ? 'error' : 
                  log.level === 'warn' ? 'warning' : 'info',
        }));
        
        setRecentActivity(formatted);
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const quickActions = [
    {
      title: 'Verify Payments',
      description: 'Review and verify pending payment submissions from users.',
      icon: <Payment />,
      color: theme.palette.success.main,
      onClick: () => navigate('/payments'),
    },
    {
      title: 'Manage Content',
      description: 'Add or update courses, chapters, videos, and study materials.',
      icon: <Book />,
      color: theme.palette.primary.main,
      onClick: () => navigate('/courses'),
    },
    {
      title: 'User Management',
      description: 'View and manage all user accounts, subscriptions, and activity.',
      icon: <People />,
      color: theme.palette.info.main,
      onClick: () => navigate('/users'),
    },
    {
      title: 'System Settings',
      description: 'Configure system settings, notifications, and integrations.',
      icon: <BarChart />,
      color: theme.palette.warning.main,
      onClick: () => navigate('/settings'),
    },
  ];

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: <CheckCircle />,
      color: theme.palette.success.main,
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: <Payment />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: <TrendingUp />,
      color: theme.palette.info.main,
    },
    {
      title: 'Total Courses',
      value: stats.totalCourses,
      icon: <Book />,
      color: theme.palette.secondary.main,
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers,
      icon: <School />,
      color: theme.palette.error.main,
    },
  ];

  const alerts = [
    stats.pendingPayments > 0 && {
      title: 'Pending Payments',
      message: `${stats.pendingPayments} payment(s) require verification.`,
      severity: 'warning',
      icon: <Warning />,
      action: {
        label: 'Verify Now',
        onClick: () => navigate('/payments'),
      },
    },
    {
      title: 'System Health',
      message: 'All systems operational.',
      severity: 'success',
      icon: <CheckCircle />,
    },
    {
      title: 'User Activity',
      message: `${stats.activeUsers} active users currently.`,
      severity: 'info',
      icon: <Info />,
    },
  ].filter(Boolean);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of your learning management system
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

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

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress sx={{ borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            Loading dashboard data...
          </Typography>
        </Box>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <StatCard {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Alerts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              System Alerts
            </Typography>
            {alerts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No active alerts
              </Typography>
            ) : (
              alerts.map((alert, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: `1px solid ${alert.severity === 'error' ? '#d32f2f30' : 
                                     alert.severity === 'warning' ? '#ed6c0230' : 
                                     alert.severity === 'success' ? '#2e7d3230' : '#0288d130'}`,
                    bgcolor: `${alert.severity === 'error' ? '#d32f2f08' : 
                               alert.severity === 'warning' ? '#ed6c0208' : 
                               alert.severity === 'success' ? '#2e7d3208' : '#0288d108'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box sx={{ 
                    color: alert.severity === 'error' ? '#d32f2f' :
                           alert.severity === 'warning' ? '#ed6c02' :
                           alert.severity === 'success' ? '#2e7d32' : '#0288d1',
                    mt: 0.5 
                  }}>
                    {alert.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                      color: alert.severity === 'error' ? '#d32f2f' :
                             alert.severity === 'warning' ? '#ed6c02' :
                             alert.severity === 'success' ? '#2e7d32' : '#0288d1',
                      mb: 0.5 
                    }}>
                      {alert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.message}
                    </Typography>
                    {alert.action && (
                      <Button 
                        size="small" 
                        sx={{ 
                          mt: 1,
                          color: alert.severity === 'error' ? '#d32f2f' :
                                 alert.severity === 'warning' ? '#ed6c02' :
                                 alert.severity === 'success' ? '#2e7d32' : '#0288d1',
                        }} 
                        onClick={alert.action.onClick}
                      >
                        {alert.action.label}
                      </Button>
                    )}
                  </Box>
                </Paper>
              ))
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} key={index}>
                  <QuickActionCard {...action} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Activity
              </Typography>
            </Box>
            
            {recentActivity.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No recent activity
              </Typography>
            ) : (
              <Box>
                {recentActivity.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: 'action.hover',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 
                          activity.status === 'success' ? 'success.light' :
                          activity.status === 'warning' ? 'warning.light' :
                          'info.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        color: 
                          activity.status === 'success' ? 'success.main' :
                          activity.status === 'warning' ? 'warning.main' :
                          'info.main',
                      }}
                    >
                      {activity.status === 'success' ? <CheckCircle /> :
                       activity.status === 'warning' ? <Warning /> : <Info />}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {activity.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        By {activity.user} • {activity.time}
                      </Typography>
                    </Box>
                    
                    <Chip
                      label={activity.status}
                      size="small"
                      color={activity.status === 'success' ? 'success' : 
                             activity.status === 'warning' ? 'warning' : 'info'}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date().toLocaleString()} • 
          Data refreshes automatically every 5 minutes
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminDashboard;