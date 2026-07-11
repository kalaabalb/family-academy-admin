import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import usersApi from '../../api/users';
import schoolsApi from '../../api/schools';
import categoriesApi from '../../api/categories';
import paymentsApi from '../../api/payments';
import subscriptionsApi from '../../api/subscriptions';
import examResultsApi from '../../api/examResults';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import DetailRow from '../common/DetailRow';
import {
  renderCountChip,
  renderPrimaryCell,
  renderTableChip,
  renderTableDate,
  renderTableId,
} from '../common/tableFormatters';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  
  Tooltip,
  Divider,
  InputAdornment,
  FormControlLabel,
  Switch,
  Badge,
  Grow,
  useTheme,
  TablePagination,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Stack,
} from '@mui/material';
import { TrainLoadingBar } from '../common/Loading';
import {
  Refresh,
  FilterList,
  Clear,
  Person,
  School,
  Payment,
  TrendingUp,
  Email,
  Phone,
  CalendarToday,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  Visibility,
  Close,
  Save,
  Assessment,
  History,
  LocalAtm,
  AccessTime,
  Book,
  Quiz,
  EmojiEvents,
  LocalFireDepartment,
  Timer,
  Warning,
  Info,
  HourglassEmpty,
  PlayCircle,
  MenuBook,
  ExpandMore,
  ExpandLess,
  CheckCircleOutline,
  RadioButtonUnchecked,
  CloudUpload,
  OpenInNew,
} from '@mui/icons-material';
import { getRelativeTime } from '../../api/utils';
import { devError } from '../../utils/devLogger';

const formatStatusLabel = (value) =>
  value
    ? String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '-';

const DETAIL_CACHE_TTL = 5 * 60 * 1000;

const getRowTimestamp = (row) => {
  const raw =
    row?.last_accessed ||
    row?.updated_at ||
    row?.completed_at ||
    row?.earned_at ||
    row?.created_at ||
    row?.date ||
    null;
  const value = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

const formatAchievementType = (achievementType) =>
  String(achievementType || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || 'Achievement';

const buildProgressFallback = (rows, user = {}) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const sortedRows = [...normalizedRows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
  const totalQuestionsAttempted = sortedRows.reduce((sum, row) => sum + (Number(row.questions_attempted) || 0), 0);
  const totalQuestionsCorrect = sortedRows.reduce((sum, row) => sum + (Number(row.questions_correct) || 0), 0);
  const completedChapters = sortedRows.filter((row) => row.completed).length;
  const averageVideoProgress = sortedRows.length
    ? sortedRows.reduce((sum, row) => sum + (Number(row.video_progress) || 0), 0) / sortedRows.length
    : 0;
  const videoMilestones = sortedRows.filter((row) => (Number(row.video_progress) || 0) >= 90).length;
  const notesViewed = sortedRows.filter((row) => row.notes_viewed).length;
  const categoryCount = new Set(sortedRows.map((row) => row.course_id || row.chapter_id).filter(Boolean)).size;

  return {
    chapters: sortedRows,
    recent_activity: sortedRows.slice(0, 10),
    stats: {
      total_chapters_started: sortedRows.length,
      chapters_completed: completedChapters,
      total_questions_attempted: totalQuestionsAttempted,
      total_questions_correct: totalQuestionsCorrect,
      study_time_hours: Math.round(((Number(user.total_study_time) || 0) / 60) * 10) / 10,
      average_video_progress: Math.round(averageVideoProgress * 100) / 100,
      videos_completed: videoMilestones,
      notes_viewed: notesViewed,
      categories_started: categoryCount,
    },
  };
};

const buildSyntheticAchievements = ({ user = {}, progress = {}, streaks = {}, exams = [], payments = [], subscriptions = [] }) => {
  const achievements = [];
  const seen = new Set();
  const addAchievement = (achievement_type, title, message, earned_at = new Date().toISOString()) => {
    const key = `${achievement_type}:${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    achievements.push({
      id: `synthetic-${achievement_type}-${title}`,
      achievement_type,
      title,
      message,
      earned_at,
      synthetic: true,
    });
  };

  const streakCount = Number(user.streak_count) || 0;
  const studyTimeHours = Math.round(((Number(user.total_study_time) || 0) / 60) * 10) / 10;
  const totalStarted = Number(progress?.stats?.total_chapters_started) || 0;
  const completedChapters = Number(progress?.stats?.chapters_completed) || 0;
  const questionsAttempted = Number(progress?.stats?.total_questions_attempted) || 0;
  const questionsCorrect = Number(progress?.stats?.total_questions_correct) || 0;
  const examCount = Array.isArray(exams) ? exams.length : 0;
  const passedExams = Array.isArray(exams)
    ? exams.filter((exam) => {
        const score = Number(exam.score) || 0;
        const passMark = Number(exam.passing_score) || 50;
        return score >= passMark;
      }).length
    : 0;
  const paymentCount = Array.isArray(payments) ? payments.length : 0;
  const activeSubscriptions = Array.isArray(subscriptions)
    ? subscriptions.filter((subscription) => subscription.status === 'active').length
    : 0;
  const streakHistoryCount = Array.isArray(streaks?.history) ? streaks.history.length : 0;
  const bestScore = Array.isArray(exams)
    ? exams.reduce((max, exam) => Math.max(max, Number(exam.score) || 0), 0)
    : 0;

  if (paymentCount > 0) {
    addAchievement(
      'first_payment',
      'First Payment',
      'The learner has completed at least one payment.'
    );
  }
  if (paymentCount >= 3) {
    addAchievement(
      'payment_milestone',
      'Committed Learner',
      'Three or more payments show continued commitment.'
    );
  }
  if (activeSubscriptions > 0) {
    addAchievement(
      'active_subscription',
      'Active Access',
      'The learner currently has an active subscription.'
    );
  }
  if (streakCount >= 3) {
    addAchievement('streak_3', '3-Day Streak', 'Three consecutive learning days achieved.');
  }
  if (streakCount >= 7) {
    addAchievement('streak_7', '7-Day Streak', 'A full week of consistent learning.');
  }
  if (streakCount >= 14) {
    addAchievement('streak_14', '14-Day Streak', 'Two weeks of steady learning.');
  }
  if (streakCount >= 30) {
    addAchievement('streak_30', '30-Day Streak', 'A month of uninterrupted learning.');
  }
  if (studyTimeHours >= 5) {
    addAchievement('study_hours_5', 'Five Study Hours', 'The learner has invested at least five hours.');
  }
  if (studyTimeHours >= 20) {
    addAchievement('study_hours_20', 'Twenty Study Hours', 'The learner has invested at least twenty hours.');
  }
  if (totalStarted > 0) {
    addAchievement('chapter_started', 'First Chapter Started', 'Learning activity has started.');
  }
  if (completedChapters > 0) {
    addAchievement('chapter_completed', 'Chapter Finisher', 'At least one chapter has been completed.');
  }
  if (questionsAttempted > 0) {
    addAchievement('practice_started', 'Practice Solver', 'Practice questions have been attempted.');
  }
  if (questionsAttempted >= 25) {
    addAchievement('practice_milestone', 'Question Explorer', 'A strong amount of practice has been completed.');
  }
  if (questionsAttempted > 0 && questionsCorrect >= Math.max(10, Math.floor(questionsAttempted * 0.7))) {
    addAchievement('accuracy', 'Sharp Accuracy', 'The learner is answering practice questions well.');
  }
  if (Array.isArray(progress?.recent_activity) && progress.recent_activity.some((row) => (Number(row.video_progress) || 0) >= 90)) {
    addAchievement('video_completion', 'Video Finisher', 'At least one video is nearly or fully completed.');
  }
  if (Array.isArray(progress?.recent_activity) && progress.recent_activity.some((row) => row.notes_viewed)) {
    addAchievement('note_reader', 'Note Reader', 'Notes have been opened and read.');
  }
  if (examCount > 0) {
    addAchievement('exam_taker', 'Exam Taker', 'The learner has taken at least one exam.');
  }
  if (passedExams > 0) {
    addAchievement('exam_pass', 'Exam Passer', 'At least one exam has been passed.');
  }
  if (bestScore >= 80) {
    addAchievement('high_score', 'High Scorer', 'An exam score of 80 or above was reached.');
  }
  if (streakHistoryCount > 0) {
    addAchievement('streak_history', 'Streak Tracker', 'The streak history is being recorded.');
  }
  if (user.parent_linked) {
    addAchievement('parent_linked', 'Parent Connected', 'This learner is linked to a parent account.');
  }

  return achievements
    .sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a))
    .map((achievement, index) => ({
      ...achievement,
      id: achievement.id || `synthetic-${index}`,
      title: achievement.title || formatAchievementType(achievement.achievement_type),
      message: achievement.message || 'Achievement earned.',
    }));
};

const UserManager = () => {
  const { isAdmin, user } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, invalidateCache } = useUsers();
  const theme = useTheme();
  
  // States
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsRefreshing, setDetailsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [parentReportLoading, setParentReportLoading] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Track which user is being viewed (for button fading)
  const [viewingUserId, setViewingUserId] = useState(null);
  const userDetailsCacheRef = useRef(new Map());
  const detailRequestIdRef = useRef(0);
  
  // Expanded sections for progress
  const [expandedChapters, setExpandedChapters] = useState({});

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;
  
  // Pagination
  const [subscriptionsPage, setSubscriptionsPage] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [examsPage, setExamsPage] = useState(0);
  const [progressPage, setProgressPage] = useState(0);
  const [rowsPerPage] = useState(5);
  
  // Filters
  const [filters, setFilters] = useState({
    school_id: '',
    category_id: '',
    status: '',
    parent_linked: '',
    search: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Edit form
  const [editForm, setEditForm] = useState({
    account_status: '',
    school_id: '',
    admin_notes: '',
    email: '',
    phone: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unpaid: 0,
    expired: 0,
    withParents: 0,
    newToday: 0,
    avgStreak: 0,
    parentLinkedPercent: 0,
    totalStudyHours: 0,
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      if (forceRefresh) {
        invalidateCache('users-admin');
        invalidateCache('schools');
        invalidateCache('categories');
      }
      
      const [usersData, schoolsData, categoriesData] = await Promise.all([
        getCachedData('users-admin', () => usersApi.getAllUsers({ limit: 1000 }), { ttl: 15 * 60 * 1000 }),
        getCachedData('schools', () => schoolsApi.getAllSchools(), { ttl: 15 * 60 * 1000 }),
        getCachedData('categories', () => categoriesApi.getAllCategories(), { ttl: 15 * 60 * 1000 }),
      ]);
      
      setUsers(usersData);
      setSchools(schoolsData || []);
      setCategories(categoriesData || []);
      
      // Calculate stats
      const today = new Date().toDateString();
      const newToday = usersData.filter(u => 
        new Date(u.created_at).toDateString() === today
      ).length;

      const activeUsers = usersData.filter(u => u.account_status === 'active');
      const avgStreak = activeUsers.length 
        ? activeUsers.reduce((sum, u) => sum + (u.streak_count || 0), 0) / activeUsers.length
        : 0;

      const parentLinkedPercent = usersData.length
        ? Math.round((usersData.filter(u => u.parent_linked).length / usersData.length) * 100)
        : 0;

      const totalStudyHours = usersData.reduce((sum, u) => sum + (u.total_study_time || 0), 0) / 60;

      setStats({
        total: usersData.length,
        active: activeUsers.length,
        unpaid: usersData.filter(u => u.account_status === 'unpaid').length,
        expired: usersData.filter(u => u.account_status === 'expired').length,
        withParents: usersData.filter(u => u.parent_linked).length,
        newToday,
        avgStreak: Math.round(avgStreak * 10) / 10,
        parentLinkedPercent,
        totalStudyHours: Math.round(totalStudyHours),
      });
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      showError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, invalidateCache, showError]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const loadUserDetails = useCallback(async (userId, options = {}) => {
    const { forceRefresh = false } = options;
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    const cachedEntry = userDetailsCacheRef.current.get(userId);
    const cachedDetails = cachedEntry?.details || null;
    const shouldUseCache = Boolean(cachedDetails) && !forceRefresh;

    if (shouldUseCache) {
      setUserDetails(cachedDetails);
      setSelectedUser(userId);
      setViewModalOpen(true);
      setTabValue(0);
      setSubscriptionsPage(0);
      setPaymentsPage(0);
      setExamsPage(0);
      setProgressPage(0);
      setDetailsRefreshing(true);
    } else {
      setLoadingDetails(true);
      setViewingUserId(userId);
      setViewModalOpen(true);
    }

    try {
      const [
        userRes,
        userProgressRes,
        userStreakRes,
        userAchievementsRes,
      ] = await Promise.allSettled([
        usersApi.getUserDetails(userId),
        usersApi.getUserProgress(userId).catch(() => ({ data: { data: {} } })),
        usersApi.getUserStreak(userId).catch(() => ({ data: { data: { history: [] } } })),
        usersApi.getUserAchievements(userId).catch(() => ({ data: { data: [] } })),
      ]);

      let userData = {};
      let subscriptionsData = [];
      let paymentsData = [];
      let examsData = [];
      let detailProgressRows = [];

      if (userRes.status === 'fulfilled') {
        const responseData = userRes.value.data.data || {};

        userData = responseData.user || responseData || {};
        subscriptionsData = Array.isArray(responseData.subscriptions) ? responseData.subscriptions : [];
        paymentsData = Array.isArray(responseData.payments) ? responseData.payments : [];
        examsData = Array.isArray(responseData.exams) ? responseData.exams : [];
        detailProgressRows = Array.isArray(responseData.progress) ? responseData.progress : [];
      }

      let progressData = {
        chapters: [],
        recent_activity: [],
        stats: {
          total_chapters_started: 0,
          chapters_completed: 0,
          total_questions_attempted: 0,
          total_questions_correct: 0,
          study_time_hours: Math.round((Number(userData.total_study_time) || 0) / 60),
        },
      };

      if (userProgressRes.status === 'fulfilled') {
        const progressResponse = userProgressRes.value.data.data || {};

        if (progressResponse.chapters && Array.isArray(progressResponse.chapters)) {
          progressData = progressResponse;
        } else if (progressResponse.data && progressResponse.data.chapters) {
          progressData = progressResponse.data;
        } else if (Array.isArray(progressResponse)) {
          progressData = buildProgressFallback(progressResponse, userData);
        } else if (progressResponse.overall || progressResponse.recent_activity) {
          progressData = {
            chapters: Array.isArray(progressResponse.recent_activity) ? progressResponse.recent_activity : [],
            recent_activity: Array.isArray(progressResponse.recent_activity) ? progressResponse.recent_activity : [],
            stats: {
              total_chapters_started: progressResponse.overall?.total_chapters_attempted || 0,
              chapters_completed: progressResponse.overall?.chapters_completed || 0,
              total_questions_attempted: progressResponse.overall?.total_questions_attempted || 0,
              total_questions_correct: progressResponse.overall?.total_questions_correct || 0,
              study_time_hours: progressResponse.overall?.study_time_hours || 0,
            },
          };
        }
      }

      if (
        (!progressData.chapters || progressData.chapters.length === 0) &&
        detailProgressRows.length > 0
      ) {
        progressData = buildProgressFallback(detailProgressRows, userData);
      }

      let streakData = { history: [] };
      if (userStreakRes.status === 'fulfilled') {
        streakData = userStreakRes.value.data.data || streakData;
      }

      let achievementsData = [];
      if (userAchievementsRes.status === 'fulfilled') {
        const rawAchievements = userAchievementsRes.value.data.data || [];
        achievementsData = Array.isArray(rawAchievements) ? rawAchievements : [];
      }

      if (paymentsData.length === 0) {
        try {
          const paymentsRes = await paymentsApi.getAllPayments({ user_id: userId });
          if (paymentsRes.data && paymentsRes.data.data) {
            paymentsData = paymentsRes.data.data.filter(p => p.user_id === parseInt(userId));
          }
        } catch (err) {
          void err;
        }
      }

      if (examsData.length === 0) {
        try {
          const examsRes = await examResultsApi.getExamResultsByUser(userId);
          if (examsRes.data && examsRes.data.data) {
            examsData = examsRes.data.data;
          }
        } catch (err) {
          if (userData.exam_results) {
            examsData = userData.exam_results;
          }
        }
      }

      const syntheticAchievements = buildSyntheticAchievements({
        user: userData,
        progress: progressData,
        streaks: streakData,
        exams: examsData,
        payments: paymentsData,
        subscriptions: subscriptionsData,
      });

      const mergedAchievements = [
        ...achievementsData,
        ...syntheticAchievements,
      ].reduce((acc, achievement) => {
        const key = `${achievement.achievement_type || 'achievement'}:${achievement.title || ''}`;
        if (!acc.some((item) => `${item.achievement_type || 'achievement'}:${item.title || ''}` === key)) {
          acc.push(achievement);
        }
        return acc;
      }, []).sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));

      const details = {
        user: userData,
        subscriptions: subscriptionsData,
        payments: paymentsData,
        exams: examsData,
        progress: progressData,
        streaks: streakData,
        achievements: mergedAchievements,
      };

      if (detailRequestIdRef.current !== requestId) {
        return;
      }

      userDetailsCacheRef.current.set(userId, {
        details,
        loadedAt: Date.now(),
      });

      setUserDetails(details);
      setSelectedUser(userId);
      setTabValue(0);
      setSubscriptionsPage(0);
      setPaymentsPage(0);
      setExamsPage(0);
      setProgressPage(0);

      if (details.user?.parent_linked && (details.progress?.stats?.total_chapters_started > 0 || details.achievements.length > 0)) {
        const reportKey = `fa_admin_last_parent_progress_sent_${userId}`;
        const lastSentAt = Number(localStorage.getItem(reportKey) || 0);
        const reportIsFresh = lastSentAt && (Date.now() - lastSentAt) < (12 * 60 * 60 * 1000);

        if (!reportIsFresh) {
          usersApi.sendProgressToParent(userId)
            .then(() => {
              localStorage.setItem(reportKey, String(Date.now()));
            })
            .catch((err) => {
              devError('Failed to send parent progress report:', err);
            });
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        devError('Failed to load user details:', err);
      }

      if (!cachedDetails && detailRequestIdRef.current === requestId) {
        showError('Failed to load user details');
        setViewModalOpen(false);
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setLoadingDetails(false);
        setDetailsRefreshing(false);
        setViewingUserId(null);
      }
    }
  }, [showError]);

  const handleSendProgressToParent = useCallback(async () => {
    const targetUserId = userDetails?.user?.id;
    if (!targetUserId || !userDetails?.user?.parent_linked) return;

    try {
      setParentReportLoading(true);
      await usersApi.sendProgressToParent(targetUserId);
      showSuccess('Progress report sent to parent');
    } catch (err) {
      devError('Failed to send progress to parent:', err);
      showError(getFriendlyActionError(err, 'Failed to send progress to parent'));
    } finally {
      setParentReportLoading(false);
    }
  }, [showError, showSuccess, userDetails]);

  const toggleChapterExpand = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const openEditModal = (user) => {
    setSelectedUser(user.id);
    setEditForm({
      account_status: user.account_status || '',
      school_id: user.school_id || '',
      admin_notes: user.admin_notes || '',
      email: user.email || '',
      phone: user.phone || '',
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    
    try {
      await usersApi.updateUser(selectedUser, editForm);
      
      setUsers(prev => prev.map(u => 
        u.id === selectedUser 
          ? { 
              ...u, 
              ...editForm,
              school_name: schools.find(s => s.id === parseInt(editForm.school_id))?.name || u.school_name 
            }
          : u
      ));
      
      if (userDetails?.user?.id === selectedUser) {
        setUserDetails(prev => ({
          ...prev,
          user: { ...prev.user, ...editForm },
        }));
      }
      
      setEditModalOpen(false);
      setSelectedUser(null);
      showSuccess('User updated successfully');
      
    } catch (err) {
      devError('Failed to update user:', err);
      showError(getFriendlyActionError(err, 'Failed to update user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setSelectedUser(null);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    
    try {
      await usersApi.deleteUser(selectedUser.id);
      
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      closeDeleteConfirm();
      setViewModalOpen(false);
      
      showSuccess(`User "${selectedUser.username}" deleted successfully`);
    } catch (err) {
      devError('Failed to delete user:', err);
      showError(getFriendlyActionError(err, 'Failed to delete user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      school_id: '',
      category_id: '',
      status: '',
      parent_linked: '',
      search: '',
    });
  };

  const filteredUsers = useMemo(() => {
    const rankedUsers = [...users]
      .map((entry) => ({
        ...entry,
        progress_score: (Number(entry.streak_count) || 0) * 1000 + Math.round(Number(entry.total_study_time) || 0),
      }))
      .sort((a, b) => {
        if (b.progress_score !== a.progress_score) return b.progress_score - a.progress_score;
        if ((Number(b.streak_count) || 0) !== (Number(a.streak_count) || 0)) {
          return (Number(b.streak_count) || 0) - (Number(a.streak_count) || 0);
        }
        return (Number(b.total_study_time) || 0) - (Number(a.total_study_time) || 0);
      });

    return rankedUsers.filter(user => {
      if (filters.school_id && user.school_id !== parseInt(filters.school_id)) return false;
      if (filters.status && user.account_status !== filters.status) return false;
      if (filters.parent_linked === 'yes' && !user.parent_linked) return false;
      if (filters.parent_linked === 'no' && user.parent_linked) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.username.toLowerCase().includes(searchLower) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.phone && user.phone.includes(searchLower)) ||
          (user.school_name && user.school_name.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [users, filters]);

  const getStreakDays = (user, streakHistory) => {
    const streakDays = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0];
      const hasStreak = streakHistory?.some(
        (s) => s.streak_date?.split('T')[0] === dateStr
      ) || i < (user?.streak_count || 0);
      
      streakDays.push({
        date,
        hasStreak
      });
    }
    
    return streakDays;
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => renderTableId(value),
    },
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      render: (value, row) => renderPrimaryCell({
        primary: value,
        secondary: row.email || row.phone || 'No contact details',
        tertiary: `Streak: ${row.streak_count || 0}`,
      }),
    },
    {
      field: 'email',
      headerName: 'Contact',
      width: 200,
      render: (value, row) => renderPrimaryCell({
        primary: value || '-',
        secondary: row.phone || 'No phone',
        primaryWeight: 400,
      }),
    },
    {
      field: 'school_name',
      headerName: 'School',
      width: 150,
      render: (value) => renderTableChip(value || 'No School', { color: 'primary' }),
    },
    {
      field: 'account_status',
      headerName: 'Status',
      width: 100,
      render: (value) => renderTableChip(formatStatusLabel(value), {
        color: value === 'active' ? 'success' : value === 'expired' ? 'warning' : 'default',
      }),
    },
    {
      field: 'streak_count',
      headerName: 'Streak',
      width: 80,
      render: (value) => renderCountChip(value, { color: 'warning' }),
    },
    {
      field: 'progress_score',
      headerName: 'Progress',
      width: 150,
      render: (value, row) => renderPrimaryCell({
        primary: `Score ${Number(value) || 0}`,
        secondary: `Streak ${row.streak_count || 0} • ${Math.round((row.total_study_time || 0) / 60)}h`,
        primaryWeight: 700,
      }),
    },
    {
      field: 'total_study_time',
      headerName: 'Study Hours',
      width: 100,
      render: (value) => (
        <Tooltip title={`${Math.round(value / 60)} hours studied`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{Math.round(value / 60)}h</Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: 'parent_linked',
      headerName: 'Parent Link',
      width: 100,
      render: (value) => renderTableChip(value ? 'Linked' : 'Not Linked', {
        color: value ? 'info' : 'default',
      }),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 120,
      render: (value) => renderTableDate(value, { dateOnly: true }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      render: (value, row) => {
        // Determine if this row's view button is loading
        const isViewingThisUser = viewingUserId === row.id && loadingDetails;
        const isAnyActionLoading = loadingDetails || actionLoading;
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Details">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadUserDetails(row.id);
                  }}
                  disabled={isAnyActionLoading}
                  sx={{
                    opacity: isAnyActionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                    backgroundColor: isViewingThisUser ? 'action.selected' : 'transparent',
                  }}
                >
                  {isViewingThisUser ? <CircularProgress size={20} color="inherit" /> : <Visibility fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit User">
              <span>
                <IconButton
                  size="small"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(row);
                  }}
                  disabled={isAnyActionLoading}
                  sx={{
                    opacity: isAnyActionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete User">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(row);
                  }}
                  disabled={isAnyActionLoading}
                  sx={{
                    opacity: isAnyActionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access user management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <ManagementPageHeader
        title="User Management"
        subtitle="Manage student accounts, subscription status, linked parents, and learning progress."
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
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Refresh
            </Button>
          </>
        }
      />

      <ManagementSearchToolbar
        value={filters.search}
        onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        placeholder="Search users by username, email, phone, or school..."
      />

      {/* Loading Indicator (only show the bar on initial load) */}
      {loading && users.length === 0 && <TrainLoadingBar sx={{ mb: 3, borderRadius: 2 }} />}

      <SummaryStrip
        items={[
          { label: 'Total Users', value: stats.total, color: 'primary' },
          { label: 'Active', value: stats.active, color: 'success' },
          { label: 'Unpaid', value: stats.unpaid, color: 'warning' },
          { label: 'Expired', value: stats.expired, color: 'error' },
          { label: 'Parents Linked', value: stats.withParents, color: 'info' },
          { label: 'Top Learner', value: filteredUsers[0] ? `${filteredUsers[0].username} (${filteredUsers[0].streak_count || 0})` : '-', color: 'secondary' },
        ]}
      />

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Users
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>School</InputLabel>
                <Select
                  name="school_id"
                  value={filters.school_id}
                  onChange={handleFilterChange}
                  label="School"
                >
                  <MenuItem value="">All Schools</MenuItem>
                  {schools.map(school => (
                    <MenuItem key={school.id} value={school.id}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Parent Linked</InputLabel>
                <Select
                  name="parent_linked"
                  value={filters.parent_linked}
                  onChange={handleFilterChange}
                  label="Parent Linked"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setFilters(prev => ({ ...prev }));
                    setShowFilters(false);
                  }}
                  size="small"
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  size="small"
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Users Table - REMOVED onRowClick */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredUsers}
        loading={loading}
        onRefresh={handleRefresh}
        title="Users"
        rowKey="id"
        defaultOrder="desc"
        defaultOrderBy="progress_score"
      />

      {/* User Details Modal */}
      <Dialog
        open={viewModalOpen}
        onClose={() => !loadingDetails && setViewModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        {loadingDetails ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 3 }}>
              Loading user details...
            </Typography>
          </Box>
        ) : userDetails && (
          <>
            <DialogTitle sx={{ m: 0, p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={userDetails.user.profile_image}
                    sx={{ width: 56, height: 56 }}
                  >
                    {userDetails.user.username?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {userDetails.user.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {userDetails.user.id} • Joined: {new Date(userDetails.user.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton
                    onClick={() => openEditModal(userDetails.user)}
                    sx={{ mr: 1 }}
                    disabled={actionLoading}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => setViewModalOpen(false)}>
                    <Close />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
              {detailsRefreshing && !loadingDetails && (
                <TrainLoadingBar sx={{ height: 3 }} />
              )}
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}
                variant="scrollable"
              >
                <Tab icon={<Person />} label="Profile" />
                <Tab icon={<Book />} label="Progress" />
                <Tab icon={<LocalFireDepartment />} label="Streak" />
                <Tab icon={<LocalAtm />} label="Subscriptions" />
                <Tab icon={<Payment />} label="Payments" />
                <Tab icon={<Assessment />} label="Exams" />
                <Tab icon={<EmojiEvents />} label="Achievements" />
              </Tabs>

              <Box sx={{ p: 3, overflow: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
                {/* Profile Tab */}
                {tabValue === 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2.5 }}>
                        <Avatar
                          src={userDetails.user.profile_image}
                          sx={{ width: 120, height: 120, mx: 'auto', mb: 2, fontSize: 48 }}
                        >
                          {userDetails.user.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {userDetails.user.username}
                        </Typography>
                        {renderTableChip(formatStatusLabel(userDetails.user.account_status), {
                          color:
                            userDetails.user.account_status === 'active' ? 'success' :
                              userDetails.user.account_status === 'expired' ? 'warning' : 'default',
                        })}
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <LocalFireDepartment sx={{ color: userDetails.user.streak_count > 0 ? 'warning.main' : 'text.disabled' }} />
                            <Typography variant="h6">{userDetails.user.streak_count || 0}</Typography>
                            <Typography variant="caption">Streak</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Timer sx={{ color: 'info.main' }} />
                            <Typography variant="h6">{Math.round((userDetails.user.total_study_time || 0) / 60)}h</Typography>
                            <Typography variant="caption">Studied</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Payment sx={{ color: 'success.main' }} />
                            <Typography variant="h6">{userDetails.payments?.length || 0}</Typography>
                            <Typography variant="caption">Payments</Typography>
                          </Grid>
                        </Grid>
                        
                        {userDetails.user.parent_linked && (
                          <Box sx={{ mt: 2 }}>
                            <Chip
                              label="Parent Linked"
                              color="info"
                              size="small"
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CloudUpload />}
                              onClick={handleSendProgressToParent}
                              disabled={parentReportLoading}
                              sx={{ ml: 1, borderRadius: 2 }}
                            >
                              {parentReportLoading ? 'Sending...' : 'Send Progress'}
                            </Button>
                          </Box>
                        )}
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          User Information
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <DetailRow label="Email" value={userDetails.user.email || 'Not provided'} align="flex-start" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailRow label="Phone" value={userDetails.user.phone || 'Not provided'} align="flex-start" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailRow label="School" value={userDetails.user.school_name || 'Not assigned'} align="flex-start" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetailRow label="Parent Linked" value={userDetails.user.parent_linked ? 'Yes' : 'No'} align="flex-start" />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Admin Notes</Typography>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 2,
                                bgcolor: 'background.paper',
                                borderColor: 'divider',
                                color: 'text.primary',
                              }}
                            >
                              {userDetails.user.admin_notes || 'No notes'}
                            </Paper>
                          </Grid>
                        </Grid>
                      </Card>
                      
                      <SummaryStrip
                        sx={{ mt: 2, mb: 0 }}
                        items={[
                          { label: 'Active Subscriptions', value: userDetails.subscriptions?.filter(s => s.status === 'active').length || 0, color: 'success' },
                          { label: 'Total Payments', value: userDetails.payments?.length || 0, color: 'info' },
                        ]}
                      />
                    </Grid>
                  </Grid>
                )}

                {/* Progress Tab */}
                {tabValue === 1 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Learning Progress
                    </Typography>
                    
                    {(!userDetails.progress || 
                      (!userDetails.progress.chapters?.length && 
                       !userDetails.progress.recent_activity?.length)) ? (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Book sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Progress Data
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User hasn't started any chapters yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        <SummaryStrip
                          items={[
                            {
                              label: 'Chapters Started',
                              value: userDetails.progress.stats?.total_chapters_started ||
                                userDetails.progress.chapters?.length || 0,
                              color: 'primary',
                            },
                            {
                              label: 'Completed',
                              value: userDetails.progress.stats?.chapters_completed ||
                                userDetails.progress.chapters?.filter(c => c.completed).length || 0,
                              color: 'success',
                            },
                            {
                              label: 'Questions',
                              value: userDetails.progress.stats?.total_questions_attempted ||
                                userDetails.progress.chapters?.reduce((sum, c) => sum + (c.questions_attempted || 0), 0) || 0,
                              color: 'warning',
                            },
                            {
                              label: 'Study Time',
                              value: `${userDetails.progress.stats?.study_time_hours ||
                                Math.round((userDetails.user.total_study_time || 0) / 60)}h`,
                              color: 'info',
                            },
                          ]}
                        />

                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                          Chapter Progress
                        </Typography>
                        <List>
                          {(userDetails.progress.chapters || userDetails.progress.recent_activity || [])
                            .slice(progressPage * rowsPerPage, progressPage * rowsPerPage + rowsPerPage)
                            .map((chapter) => {
                              const videoProgress = Number(chapter.video_progress) || 0;
                              const questionsAttempted = Number(chapter.questions_attempted) || 0;
                              const questionsCorrect = Number(chapter.questions_correct) || 0;
                              const accuracy = questionsAttempted > 0 ? (questionsCorrect / questionsAttempted) * 100 : 0;
                              
                              return (
                                <Card key={chapter.id || chapter.chapter_id || Math.random()} variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderRadius: 2.5 }}>
                                  <ListItem
                                    button
                                    onClick={() => toggleChapterExpand(chapter.id || chapter.chapter_id)}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <ListItemIcon>
                                      {chapter.completed ? 
                                        <CheckCircle color="success" /> : 
                                        <RadioButtonUnchecked color="action" />
                                      }
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={
                                        <Typography variant="subtitle1" fontWeight="medium">
                                          {chapter.chapter_name || chapter.title || `Chapter ${chapter.chapter_id}`}
                                        </Typography>
                                      }
                                      secondary={
                                        <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                          <Chip
                                            size="small"
                                            label={`Video: ${videoProgress}%`}
                                            color={videoProgress > 0 ? 'info' : 'default'}
                                          />
                                          <Chip
                                            size="small"
                                            label={`Questions: ${questionsCorrect}/${questionsAttempted}`}
                                            color={questionsAttempted > 0 ? 'warning' : 'default'}
                                          />
                                          <Chip
                                            size="small"
                                            label={`Notes: ${chapter.notes_viewed ? 'Viewed' : 'Not Viewed'}`}
                                            color={chapter.notes_viewed ? 'success' : 'default'}
                                          />
                                        </Box>
                                      }
                                    />
                                    {expandedChapters[chapter.id || chapter.chapter_id] ? <ExpandLess /> : <ExpandMore />}
                                  </ListItem>
                                  
                                  <Collapse in={expandedChapters[chapter.id || chapter.chapter_id]} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 3, bgcolor: 'background.paper' }}>
                                      <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                          <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Video Progress
                                          </Typography>
                                          <TrainLoadingBar
                                            variant="determinate"
                                            value={videoProgress}
                                            sx={{ height: 8, borderRadius: 4, mb: 1 }}
                                          />
                                          <Typography variant="caption">
                                            {videoProgress}% completed
                                          </Typography>
                                        </Grid>
                                        
                                        <Grid item xs={12} md={6}>
                                          <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Questions Accuracy
                                          </Typography>
                                          <TrainLoadingBar
                                            variant="determinate"
                                            value={accuracy}
                                            sx={{ height: 8, borderRadius: 4, mb: 1 }}
                                          />
                                          <Typography variant="caption">
                                            {questionsCorrect}/{questionsAttempted} correct ({Math.round(accuracy)}%)
                                          </Typography>
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                          <Typography variant="body2" color="text.secondary">
                                            Last Accessed: {chapter.last_accessed 
                                              ? new Date(chapter.last_accessed).toLocaleString() 
                                              : 'Never'}
                                          </Typography>
                                        </Grid>
                                      </Grid>
                                    </Box>
                                  </Collapse>
                                </Card>
                              );
                            })}
                        </List>
                        
                        {(userDetails.progress.chapters?.length > rowsPerPage || 
                          userDetails.progress.recent_activity?.length > rowsPerPage) && (
                          <TablePagination
                            component="div"
                            count={userDetails.progress.chapters?.length || userDetails.progress.recent_activity?.length || 0}
                            page={progressPage}
                            onPageChange={(e, newPage) => setProgressPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[rowsPerPage]}
                          />
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* Streak Tab */}
                {tabValue === 2 && (
                  <Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2.5 }}>
                        <LocalFireDepartment sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                        <Typography variant="h2" fontWeight="bold" color="warning.main">
                          {userDetails.user.streak_count || 0}
                        </Typography>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          Current Streak
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last active: {userDetails.user.last_streak_date 
                            ? new Date(userDetails.user.last_streak_date).toLocaleDateString() 
                            : 'Never'}
                        </Typography>
                      </Card>
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <Card variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Streak Calendar (Last 30 Days)
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 3, justifyContent: 'center' }}>
                            {getStreakDays(userDetails.user, userDetails.streaks?.history).map((day, index) => (
                              <Tooltip key={index} title={day.date.toLocaleDateString()}>
                                <Box
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 1,
                                    bgcolor: day.hasStreak
                                      ? 'warning.main'
                                      : theme.palette.mode === 'dark'
                                        ? 'background.paper'
                                        : 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: day.hasStreak ? 'common.white' : 'text.secondary',
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                      transform: 'scale(1.1)',
                                      boxShadow: 2,
                                    },
                                  }}
                                >
                                  {day.date.getDate()}
                                </Box>
                              </Tooltip>
                            ))}
                          </Box>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Chip
                              icon={<LocalFireDepartment />}
                              label={`Current Streak: ${userDetails.user.streak_count || 0} days`}
                              color="warning"
                              variant="outlined"
                            />
                            <Chip
                              icon={<CalendarToday />}
                              label={`Last Active: ${userDetails.user.last_streak_date 
                                ? new Date(userDetails.user.last_streak_date).toLocaleDateString() 
                                : 'Never'}`}
                              variant="outlined"
                            />
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Subscriptions Tab */}
                {tabValue === 3 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Subscriptions ({userDetails.subscriptions?.length || 0})
                    </Typography>
                    
                    {(!userDetails.subscriptions || userDetails.subscriptions.length === 0) ? (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <LocalAtm sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Subscriptions Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User has no active or past subscriptions.
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Category</TableCell>
                                <TableCell>Billing</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>Expiry Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Days Left</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {userDetails.subscriptions
                                .slice(subscriptionsPage * rowsPerPage, subscriptionsPage * rowsPerPage + rowsPerPage)
                                .map((sub, index) => {
                                  const daysLeft = Math.round((new Date(sub.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                                  return (
                                    <TableRow key={index} hover>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                          {sub.category_name}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>{sub.billing_cycle}</TableCell>
                                      <TableCell>{new Date(sub.start_date).toLocaleDateString()}</TableCell>
                                      <TableCell>{new Date(sub.expiry_date).toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        <Chip
                                          label={sub.status}
                                          size="small"
                                          color={sub.status === 'active' ? 'success' : 'default'}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                                          size="small"
                                          color={daysLeft > 7 ? 'success' : daysLeft > 0 ? 'warning' : 'error'}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {userDetails.subscriptions.length > rowsPerPage && (
                          <TablePagination
                            component="div"
                            count={userDetails.subscriptions.length}
                            page={subscriptionsPage}
                            onPageChange={(e, newPage) => setSubscriptionsPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[rowsPerPage]}
                          />
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* Payments Tab */}
                {tabValue === 4 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Payment History ({userDetails.payments?.length || 0})
                    </Typography>
                    
                    {(!userDetails.payments || userDetails.payments.length === 0) ? (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Payment sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Payment History
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User hasn't made any payments yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        <SummaryStrip
                          items={[
                            { label: 'Total Payments', value: userDetails.payments.length, color: 'primary' },
                            {
                              label: 'Verified Amount',
                              value: `Birr ${userDetails.payments
                                .filter(p => p.status === 'verified')
                                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                                .toFixed(2)}`,
                              color: 'success',
                            },
                            {
                              label: 'Pending Amount',
                              value: `Birr ${userDetails.payments
                                .filter(p => p.status === 'pending')
                                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                                .toFixed(2)}`,
                              color: 'warning',
                            },
                          ]}
                        />

                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {userDetails.payments
                                .slice(paymentsPage * rowsPerPage, paymentsPage * rowsPerPage + rowsPerPage)
                                .map((payment) => (
                                  <TableRow key={payment.id} hover>
                                    <TableCell>{payment.id}</TableCell>
                                    <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{payment.category_name}</TableCell>
                                    <TableCell>
                                      <Typography fontWeight="bold" color="success.main">
                                        Birr {parseFloat(payment.amount).toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{payment.payment_method}</TableCell>
                                    <TableCell>{payment.payment_type}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={payment.status}
                                        size="small"
                                        color={
                                          payment.status === 'verified' ? 'success' :
                                          payment.status === 'pending' ? 'warning' : 'error'
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {userDetails.payments.length > rowsPerPage && (
                          <TablePagination
                            component="div"
                            count={userDetails.payments.length}
                            page={paymentsPage}
                            onPageChange={(e, newPage) => setPaymentsPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[rowsPerPage]}
                          />
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* Exams Tab */}
                {tabValue === 5 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Exam Results ({userDetails.exams?.length || 0})
                    </Typography>
                    
                    {(!userDetails.exams || userDetails.exams.length === 0) ? (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Assessment sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Exam Results
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User hasn't taken any exams yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Exam</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Score</TableCell>
                                <TableCell>Result</TableCell>
                                <TableCell>Questions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {userDetails.exams
                                .slice(examsPage * rowsPerPage, examsPage * rowsPerPage + rowsPerPage)
                                .map((exam, index) => {
                                  const passed = exam.score >= (exam.passing_score || 50);
                                  const scoreValue = Number(exam.score) || 0;
                                  
                                  return (
                                    <TableRow key={index} hover>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                          {exam.title || exam.exam_title}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>{exam.exam_type}</TableCell>
                                      <TableCell>
                                        {exam.completed_at ? new Date(exam.completed_at).toLocaleDateString() : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <TrainLoadingBar
                                            variant="determinate"
                                            value={scoreValue}
                                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                                          />
                                          <Typography variant="body2">
                                            {Math.round(scoreValue)}%
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={passed ? 'PASSED' : 'FAILED'}
                                          size="small"
                                          color={passed ? 'success' : 'error'}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {exam.correct_answers || 0}/{exam.total_questions || 0}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {userDetails.exams.length > rowsPerPage && (
                          <TablePagination
                            component="div"
                            count={userDetails.exams.length}
                            page={examsPage}
                            onPageChange={(e, newPage) => setExamsPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[rowsPerPage]}
                          />
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* Achievements Tab */}
                {tabValue === 6 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Achievements ({userDetails.achievements?.length || 0})
                    </Typography>
                    
                    {(!userDetails.achievements || userDetails.achievements.length === 0) ? (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <EmojiEvents sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Achievements Yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User hasn't unlocked any achievements.
                        </Typography>
                      </Paper>
                    ) : (
                      <Grid container spacing={2}>
                        {userDetails.achievements.map((achievement, index) => (
                          <Grid item xs={12} md={6} key={index}>
                            <Card variant="outlined" sx={{ display: 'flex', p: 2, borderRadius: 2.5 }}>
                              <Box
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 2,
                                  bgcolor: achievement.achievement_type?.includes('streak') ? 'warning.light' : 'info.light',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 2,
                                }}
                              >
                                <EmojiEvents sx={{ fontSize: 32, color: achievement.achievement_type?.includes('streak') ? 'warning.main' : 'info.main' }} />
                              </Box>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {achievement.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {achievement.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Earned: {new Date(achievement.earned_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => !actionLoading && setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Edit User Profile
            </Typography>
            <IconButton
              onClick={() => setEditModalOpen(false)}
              size="small"
              disabled={actionLoading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={editForm.account_status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, account_status: e.target.value }))}
                  disabled={actionLoading}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>School</InputLabel>
                <Select
                  value={editForm.school_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, school_id: e.target.value }))}
                  disabled={actionLoading}
                >
                  <MenuItem value="">No School</MenuItem>
                  {schools.map(school => (
                    <MenuItem key={school.id} value={school.id}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={actionLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                disabled={actionLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Admin Notes"
                value={editForm.admin_notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                disabled={actionLoading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setEditModalOpen(false)}
            variant="outlined"
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateUser}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${selectedUser?.username}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default UserManager;
