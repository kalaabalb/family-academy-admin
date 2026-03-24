import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
  Alert,
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
  AssignmentTurnedIn,
  AutoStories,
  MenuBook,
  Notes,
  PendingActions,
  PlayCircle,
  Quiz,
  Refresh,
  School,
  WarningAmber,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../contexts/UserContext';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
import videosApi from '../../api/videos';
import notesApi from '../../api/notes';
import questionsApi from '../../api/questions';
import examsApi from '../../api/exams';
import { getRelativeTime } from '../../api/utils';
import { devError } from '../../utils/devLogger';

const getDateValue = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const collectTeacherActivity = ({
  items,
  type,
  titleKey,
  createdKey,
  timeKey,
  tone,
  course,
  userId,
  activityPool,
  counters,
  now,
}) => {
  items.forEach((item) => {
    if (item?.[createdKey] === userId) {
      counters.createdItems += 1;
      activityPool.push({
        id: `${type}-${item.id}`,
        type,
        title: item?.[titleKey] || item?.name || `${type} item`,
        courseLabel: `${course.name}${item.chapter_title ? ` • ${item.chapter_title}` : ''}`,
        timestamp: getDateValue(item?.[timeKey] || item?.updated_at),
        time: getRelativeTime(item?.[timeKey] || item?.updated_at),
        tone,
      });
    }

    const releaseDate = getDateValue(item?.release_date || item?.scheduled_at);
    if (releaseDate > now) {
      counters.scheduledItems += 1;
    }
  });
};

const DashboardHero = ({ title, subtitle, actions, children }) => (
  <Paper
    sx={{
      p: { xs: 2.5, md: 3.5 },
      mb: 3,
      borderRadius: 4,
      background: (theme) =>
        theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.22)}, ${alpha(theme.palette.background.paper, 0.96)})`
          : `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.12)}, ${alpha(theme.palette.background.paper, 0.96)})`,
      border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.14)}`,
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

const ActivityList = ({ items }) => (
  <List disablePadding>
    {items.map((item, index) => (
      <React.Fragment key={item.id}>
        <ListItem disableGutters sx={{ py: 1.35, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              mt: 0.8,
              mr: 1.5,
              flexShrink: 0,
              bgcolor: item.tone || 'primary.main',
            }}
          />
          <ListItemText
            sx={{ minWidth: 0 }}
            primary={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {item.title}
                </Typography>
                <Chip label={item.type} size="small" variant="outlined" sx={{ height: 22 }} />
              </Stack>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {item.courseLabel}
              </Typography>
            }
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 0.5, sm: 0 }, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}
          >
            {item.time}
          </Typography>
        </ListItem>
        {index < items.length - 1 ? <Divider /> : null}
      </React.Fragment>
    ))}
  </List>
);

const CourseCoverageCard = ({ course, stats, onOpen }) => {
  const completionSignals = [
    { label: 'Chapters', value: stats.chapters },
    { label: 'Videos', value: stats.videos },
    { label: 'Notes', value: stats.notes },
    { label: 'Questions', value: stats.questions },
    { label: 'Exams', value: stats.exams },
  ];

  return (
    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {course.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {course.category_name || 'Uncategorized course'}
            </Typography>
          </Box>
          <Chip
            label={stats.missingBuckets === 0 ? 'Healthy' : `${stats.missingBuckets} gaps`}
            size="small"
            color={stats.missingBuckets === 0 ? 'success' : 'warning'}
            variant="outlined"
          />
        </Stack>

        <Grid container spacing={1.25} sx={{ mb: 2 }}>
          {completionSignals.map((item) => (
            <Grid item xs={6} sm={4} md={2.4} key={item.label}>
              <Paper
                sx={{
                  py: 1,
                  px: 1,
                  textAlign: 'center',
                  borderRadius: 2,
                  minHeight: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {item.value}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.35,
                    maxWidth: '100%',
                    lineHeight: 1.2,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Updated {getRelativeTime(course.updated_at || course.created_at)}
        </Typography>

        <Button
          variant="outlined"
          endIcon={<ArrowForward />}
          onClick={() => onOpen(course.id)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Open Course Content
        </Button>
      </CardContent>
    </Card>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const { getCachedData, getCacheKey } = useUsers();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({
    assignedCourses: [],
    stats: {
      assignedCourses: 0,
      totalChapters: 0,
      totalVideos: 0,
      totalNotes: 0,
      totalQuestions: 0,
      totalExams: 0,
      createdItems: 0,
      scheduledItems: 0,
    },
    courseCoverage: [],
    recentActivity: [],
    attentionItems: [],
  });

  const fetchTeacherData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');

      const assignedCourseIds = Array.isArray(user?.assigned_courses) ? user.assigned_courses : [];
      const coursesData = await getCachedData('teacher-dashboard-courses', () => coursesApi.getAllCourses(), {
        forceRefresh,
      });
      const allCourses = Array.isArray(coursesData) ? coursesData : [];
      const assignedCourses = allCourses.filter((course) => assignedCourseIds.includes(course.id));

      const activityPool = [];
      const coverage = [];
      const now = Date.now();
      const counters = {
        totalChapters: 0,
        totalVideos: 0,
        totalNotes: 0,
        totalQuestions: 0,
        totalExams: 0,
        createdItems: 0,
        scheduledItems: 0,
      };

      for (const course of assignedCourses) {
        try {
          const chapters =
            (await getCachedData(
              getCacheKey('chapters', { course_id: course.id }),
              () => chaptersApi.getAllChapters({ course_id: course.id }),
              { forceRefresh }
            )) || [];

          counters.totalChapters += chapters.length;

          let courseVideos = [];
          let courseNotes = [];
          let courseQuestions = [];

          for (const chapter of chapters) {
            const [videos, notes, questions] = await Promise.all([
              getCachedData(
                getCacheKey('videos', { chapter_id: chapter.id }),
                () => videosApi.getAllVideos({ chapter_id: chapter.id }),
                { forceRefresh }
              ),
              getCachedData(
                getCacheKey('notes', { chapter_id: chapter.id }),
                () => notesApi.getAllNotes({ chapter_id: chapter.id }),
                { forceRefresh }
              ),
              getCachedData(
                getCacheKey('questions', { chapter_id: chapter.id }),
                () => questionsApi.getAllQuestions({ chapter_id: chapter.id }),
                { forceRefresh }
              ),
            ]);

            courseVideos = courseVideos.concat(videos || []);
            courseNotes = courseNotes.concat(notes || []);
            courseQuestions = courseQuestions.concat(questions || []);
          }

          const exams =
            (await getCachedData(
              getCacheKey('exams', { course_id: course.id }),
              () => examsApi.getAllExams({ course_id: course.id }),
              { forceRefresh }
            )) || [];

          counters.totalVideos += courseVideos.length;
          counters.totalNotes += courseNotes.length;
          counters.totalQuestions += courseQuestions.length;
          counters.totalExams += exams.length;

          chapters.forEach((chapter) => {
            if (chapter?.created_by === user?.id) {
              counters.createdItems += 1;
              activityPool.push({
                id: `chapter-${chapter.id}`,
                type: 'Chapter',
                title: chapter.title || chapter.name || 'Untitled chapter',
                courseLabel: course.name,
                timestamp: getDateValue(chapter.created_at || chapter.updated_at),
                time: getRelativeTime(chapter.created_at || chapter.updated_at),
                tone: theme.palette.primary.main,
              });
            }

            const releaseDate = getDateValue(chapter.release_date || chapter.scheduled_at);
            if (releaseDate > now) {
              counters.scheduledItems += 1;
            }
          });

          collectTeacherActivity({
            items: courseVideos,
            type: 'Video',
            titleKey: 'title',
            createdKey: 'uploaded_by',
            timeKey: 'created_at',
            tone: theme.palette.secondary.main,
            course,
            userId: user?.id,
            activityPool,
            counters,
            now,
          });
          collectTeacherActivity({
            items: courseNotes,
            type: 'Note',
            titleKey: 'title',
            createdKey: 'created_by',
            timeKey: 'created_at',
            tone: theme.palette.info.main,
            course,
            userId: user?.id,
            activityPool,
            counters,
            now,
          });
          collectTeacherActivity({
            items: courseQuestions,
            type: 'Question',
            titleKey: 'question_text',
            createdKey: 'created_by',
            timeKey: 'created_at',
            tone: theme.palette.warning.main,
            course,
            userId: user?.id,
            activityPool,
            counters,
            now,
          });
          collectTeacherActivity({
            items: exams,
            type: 'Exam',
            titleKey: 'title',
            createdKey: 'created_by',
            timeKey: 'created_at',
            tone: theme.palette.success.main,
            course,
            userId: user?.id,
            activityPool,
            counters,
            now,
          });

          const contentGaps = [
            chapters.length === 0,
            courseVideos.length === 0,
            courseNotes.length === 0,
            courseQuestions.length === 0,
            exams.length === 0,
          ].filter(Boolean).length;

          coverage.push({
            course,
            stats: {
              chapters: chapters.length,
              videos: courseVideos.length,
              notes: courseNotes.length,
              questions: courseQuestions.length,
              exams: exams.length,
              missingBuckets: contentGaps,
            },
          });
        } catch (courseError) {
          devError(`Failed loading dashboard data for course ${course.id}`, courseError);
          coverage.push({
            course,
            stats: { chapters: 0, videos: 0, notes: 0, questions: 0, exams: 0, missingBuckets: 5 },
          });
        }
      }

      const recentActivity = activityPool
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 8);

      const attentionItems = coverage
        .filter((item) => item.stats.missingBuckets > 0)
        .sort((left, right) => right.stats.missingBuckets - left.stats.missingBuckets)
        .slice(0, 4)
        .map((item) => ({
          title: item.course.name,
          subtitle:
            item.stats.missingBuckets === 1
              ? 'One content area still missing'
              : `${item.stats.missingBuckets} content areas still missing`,
          courseId: item.course.id,
        }));

      setDashboard({
        assignedCourses,
        stats: {
          assignedCourses: assignedCourses.length,
          totalChapters: counters.totalChapters,
          totalVideos: counters.totalVideos,
          totalNotes: counters.totalNotes,
          totalQuestions: counters.totalQuestions,
          totalExams: counters.totalExams,
          createdItems: counters.createdItems,
          scheduledItems: counters.scheduledItems,
        },
        courseCoverage: coverage,
        recentActivity,
        attentionItems,
      });
    } catch (fetchError) {
      devError('Failed to load teacher dashboard:', fetchError);
      setError('Failed to load your dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const summaryCards = useMemo(() => {
    const { stats } = dashboard;

    return [
      {
        title: 'Assigned Courses',
        value: stats.assignedCourses,
        subtitle: 'Courses you are actively responsible for',
        icon: <School />,
        tone: 'primary',
      },
      {
        title: 'Teaching Content',
        value: stats.totalChapters + stats.totalVideos + stats.totalNotes + stats.totalQuestions + stats.totalExams,
        subtitle: 'Total assigned-course items across all content types',
        icon: <AutoStories />,
        tone: 'secondary',
      },
      {
        title: 'Your Recent Output',
        value: stats.createdItems,
        subtitle: 'Items personally created or uploaded by you',
        icon: <AssignmentTurnedIn />,
        tone: 'success',
      },
      {
        title: 'Scheduled Releases',
        value: stats.scheduledItems,
        subtitle: 'Future dated content waiting to go live',
        icon: <PendingActions />,
        tone: 'warning',
      },
    ];
  }, [dashboard]);

  if (loading && dashboard.assignedCourses.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Building your teacher workspace...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHero
        title="Teacher Dashboard"
        subtitle={`Welcome back, ${user?.name || user?.username}. This dashboard focuses on your assigned courses, your content activity, and what needs attention next.`}
        actions={[
          <Button
            key="content"
            variant="contained"
            onClick={() => navigate('/chapters')}
          >
            Open Content
          </Button>,
          <Button
            key="refresh"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchTeacherData(true)}
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
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Assigned Course Coverage"
            subtitle="A quick view of how complete each assigned course looks right now."
          >
            {dashboard.courseCoverage.length ? (
              <Grid container spacing={2}>
                {dashboard.courseCoverage.map((entry) => (
                  <Grid item xs={12} md={6} key={entry.course.id}>
                    <CourseCoverageCard
                      course={entry.course}
                      stats={entry.stats}
                      onOpen={(courseId) => navigate(`/chapters?course_id=${courseId}`)}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  No courses assigned yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ask an administrator to assign a course so your dashboard can show course coverage and activity.
                </Typography>
              </Paper>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SectionCard
            title="Your Content Totals"
            subtitle="Everything inside your assigned course scope."
          >
            <Stack spacing={1.5}>
              <MetricCard
                title="Chapters"
                value={dashboard.stats.totalChapters}
                subtitle="Visible in your assigned courses"
                icon={<MenuBook />}
                tone="primary"
              />
              <MetricCard
                title="Videos"
                value={dashboard.stats.totalVideos}
                subtitle="Course video library"
                icon={<PlayCircle />}
                tone="secondary"
              />
              <MetricCard
                title="Notes / Questions / Exams"
                value={dashboard.stats.totalNotes + dashboard.stats.totalQuestions + dashboard.stats.totalExams}
                subtitle={`${dashboard.stats.totalNotes} notes, ${dashboard.stats.totalQuestions} questions, ${dashboard.stats.totalExams} exams`}
                icon={<Quiz />}
                tone="info"
              />
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="Recent Activity"
            subtitle="Only your own recent content work, not everyone else's."
            action={
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/notes')}>
                Open content tools
              </Button>
            }
          >
            {dashboard.recentActivity.length ? (
              <ActivityList items={dashboard.recentActivity} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No recent personal activity yet. As you create chapters, upload videos, write notes, and build exams,
                your own activity timeline will appear here.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <SectionCard
            title="What Needs Attention"
            subtitle="Assigned courses that still need more content coverage."
          >
            {dashboard.attentionItems.length ? (
              <Stack spacing={1.5}>
                {dashboard.attentionItems.map((item) => (
                  <Paper
                    key={item.courseId}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: (currentTheme) => alpha(currentTheme.palette.warning.main, 0.08),
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                      <WarningAmber color="warning" sx={{ mt: 0.25 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.subtitle}
                        </Typography>
                      </Box>
                      <Button size="small" onClick={() => navigate(`/chapters?course_id=${item.courseId}`)}>
                        Open
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: (currentTheme) => alpha(currentTheme.palette.success.main, 0.08),
                }}
              >
                <Typography variant="body2" fontWeight={700} color="success.main" sx={{ mb: 0.5 }}>
                  Strong coverage
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your assigned courses currently have at least one item in each main content area.
                </Typography>
              </Paper>
            )}
            <Divider sx={{ my: 2.5 }} />
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
              <Button variant="outlined" onClick={() => navigate('/chapters')}>
                Chapters
              </Button>
              <Button variant="outlined" onClick={() => navigate('/videos')}>
                Videos
              </Button>
              <Button variant="outlined" onClick={() => navigate('/notes')}>
                Notes
              </Button>
              <Button variant="outlined" onClick={() => navigate('/questions')}>
                Questions
              </Button>
              <Button variant="outlined" onClick={() => navigate('/exams')}>
                Exams
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherDashboard;
