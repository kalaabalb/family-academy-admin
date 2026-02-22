import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
import videosApi from '../../api/videos';
import notesApi from '../../api/notes';
import questionsApi from '../../api/questions';
import examsApi from '../../api/exams';
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
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  MenuBook,
  VideoLibrary,
  Notes,
  Quiz,
  Assessment,
  TrendingUp,
  CheckCircle,
  Warning,
  Info,
  Add,
  ArrowForward,
  School,
  Category,
  AccessTime,
  PlayCircle,
  Edit,
  Visibility,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { formatDate, getRelativeTime } from '../../api/utils';

const StatCard = ({ title, value, icon, color, loading, onClick }) => (
  <Card 
    sx={{ 
      height: '100%',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      transition: 'all 0.3s',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      } : {},
    }}
    onClick={onClick}
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
            <Typography variant="h3" fontWeight="bold" sx={{ color }}>
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
    </CardContent>
  </Card>
);

const CourseCard = ({ course, stats, onView, onManage }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ 
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      transition: 'all 0.3s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      },
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              mr: 2,
            }}
          >
            <MenuBook />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {course.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {course.category_name} • {course.chapter_count || 0} Chapters
            </Typography>
          </Box>
          <Chip
            label={course.status || 'Active'}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {course.description || 'No description available'}
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {stats?.chapters || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chapters
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="secondary">
                {stats?.videos || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Videos
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="info.main">
                {stats?.notes || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Notes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="warning.main">
                {stats?.questions || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Questions
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Last updated: {getRelativeTime(course.updated_at)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Course">
              <IconButton size="small" onClick={() => onView(course.id)}>
                <Visibility />
              </IconButton>
            </Tooltip>
            <Tooltip title="Manage Content">
              <IconButton size="small" color="primary" onClick={() => onManage(course.id)}>
                <Edit />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [stats, setStats] = useState({
    totalChapters: 0,
    totalVideos: 0,
    totalNotes: 0,
    totalQuestions: 0,
    totalExams: 0,
    recentActivity: [],
  });

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all courses
      const coursesRes = await coursesApi.getAllCourses();
      const allCourses = coursesRes.data.data || [];
      
      // Filter courses assigned to this teacher
      const assignedCourseIds = user?.assigned_courses || [];
      const courses = allCourses.filter(course => 
        assignedCourseIds.includes(course.id)
      );
      
      setAssignedCourses(courses);

      // Fetch content counts for each course
      let totalChapters = 0;
      let totalVideos = 0;
      let totalNotes = 0;
      let totalQuestions = 0;
      let totalExams = 0;

      for (const course of courses) {
        try {
          // Get chapters for this course
          const chaptersRes = await chaptersApi.getChaptersForStudent(course.id);
          const chapters = chaptersRes.data.data || [];
          totalChapters += chapters.length;

          // For each chapter, get content
          for (const chapter of chapters) {
            try {
              const videosRes = await videosApi.getVideosForChapter(chapter.id);
              totalVideos += (videosRes.data.data || []).length;

              const notesRes = await notesApi.getNotesForChapter(chapter.id);
              totalNotes += (notesRes.data.data || []).length;

              const questionsRes = await questionsApi.getPracticeQuestions(chapter.id);
              totalQuestions += (questionsRes.data.data || []).length;
            } catch (err) {
              console.error(`Error fetching content for chapter ${chapter.id}:`, err);
            }
          }

          // Get exams for this course
          const examsRes = await examsApi.getAvailableExams(course.id);
          totalExams += (examsRes.data.data || []).length;
        } catch (err) {
          console.error(`Error fetching data for course ${course.id}:`, err);
        }
      }

      setStats({
        totalChapters,
        totalVideos,
        totalNotes,
        totalQuestions,
        totalExams,
        recentActivity: [
          { id: 1, action: 'Chapter 5 updated', course: 'Mathematics', time: '2 hours ago' },
          { id: 2, action: 'New video added', course: 'Physics', time: '5 hours ago' },
          { id: 3, action: 'Exam created', course: 'Chemistry', time: '1 day ago' },
        ],
      });

    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourse = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  const handleManageContent = (courseId) => {
    navigate(`/chapters?course=${courseId}`);
  };

  const statCards = [
    {
      title: 'Total Chapters',
      value: stats.totalChapters,
      icon: <MenuBook />,
      color: theme.palette.primary.main,
      onClick: () => navigate('/chapters'),
    },
    {
      title: 'Videos',
      value: stats.totalVideos,
      icon: <PlayCircle />,
      color: theme.palette.secondary.main,
      onClick: () => navigate('/videos'),
    },
    {
      title: 'Notes',
      value: stats.totalNotes,
      icon: <Notes />,
      color: theme.palette.info.main,
      onClick: () => navigate('/notes'),
    },
    {
      title: 'Questions',
      value: stats.totalQuestions,
      icon: <Quiz />,
      color: theme.palette.warning.main,
      onClick: () => navigate('/questions'),
    },
    {
      title: 'Exams',
      value: stats.totalExams,
      icon: <Assessment />,
      color: theme.palette.success.main,
      onClick: () => navigate('/exams'),
    },
  ];

  if (loading && assignedCourses.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Teacher Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.name || user?.username}! Manage your assigned courses and content.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
          <Button size="small" onClick={fetchTeacherData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <StatCard {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Assigned Courses */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Your Assigned Courses
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTeacherData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {assignedCourses.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <School sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Courses Assigned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You haven't been assigned to any courses yet. Contact an administrator.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {assignedCourses.map((course) => (
              <Grid item xs={12} md={6} key={course.id}>
                <CourseCard
                  course={course}
                  stats={{
                    chapters: stats.totalChapters,
                    videos: stats.totalVideos,
                    notes: stats.totalNotes,
                    questions: stats.totalQuestions,
                  }}
                  onView={handleViewCourse}
                  onManage={handleManageContent}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Recent Activity */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          {stats.recentActivity.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                    <Info />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={activity.action}
                  secondary={`${activity.course} • ${activity.time}`}
                />
                <ListItemSecondaryAction>
                  <Chip label="Updated" size="small" color="info" variant="outlined" />
                </ListItemSecondaryAction>
              </ListItem>
              {index < stats.recentActivity.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default TeacherDashboard;