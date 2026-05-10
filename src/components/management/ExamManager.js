import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import examsApi from '../../api/exams';
import questionsApi from '../../api/questions';
import coursesApi from '../../api/courses';
import categoriesApi from '../../api/categories';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
  Checkbox,
  Radio,
  FormControlLabel,
  InputAdornment,
  LinearProgress,

} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ContentAssignmentFields from '../common/ContentAssignmentFields';
import FastTextField from '../common/FastTextField';
import DetailRow from '../common/DetailRow';
import { renderTableChip } from '../common/tableFormatters';
import { devError } from '../../utils/devLogger';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Quiz,
  QuestionAnswer,
  Close,
  Save,
  FilterList,
  Search,
  Category ,
 
  Event,
  ImportExport,
  Upload,

} from '@mui/icons-material';

const ExamManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  // Main states
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState(0); // 0: List, 1: Create/Edit
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Question management states
  const [examQuestions, setExamQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionCreateDialogOpen, setQuestionCreateDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  
  // Single question creation form
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    option_f: '',
    correct_option: 'a',
    explanation: '',
    difficulty: 'medium',
    marks: 1,
  });
  
  // Batch questions for exam
  const [batchQuestions, setBatchQuestions] = useState([{
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    option_f: '',
    correct_option: 'a',
    explanation: '',
    difficulty: 'medium',
    marks: 1,
  }]);
  
  // Filters for available questions
  const [questionFilters, setQuestionFilters] = useState({
    course_id: '',
    chapter_id: '',
    difficulty: '',
    search: '',
  });
  
  // Exam form data
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    course_id: '',
    exam_type: 'weekly',
    start_date: '',
    end_date: '',
    duration: 60,
    user_time_limit: '',
    passing_score: 50,
    max_attempts: 1,
    auto_submit: true,
    show_results_immediately: false,
  });

  const getFriendlyFormError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;

  const toSafeDate = useCallback((value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const toSafeIsoString = useCallback((value) => {
    const date = toSafeDate(value);
    return date ? date.toISOString() : '';
  }, [toSafeDate]);

  // Cache keys
  const coursesCacheKey = 'courses';

  const blurActiveElement = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === 'function') {
      activeElement.blur();
    }
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const coursesData = await getCachedData(
        coursesCacheKey,
        () => coursesApi.getAllCourses(),
        { forceRefresh }
      );

      const categoriesData = await getCachedData(
        'categories',
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      let coursesList = coursesData || [];
      
      if (isTeacher()) {
        const assignedCourseIds = user?.assigned_courses || [];
        coursesList = coursesList.filter(course => 
          assignedCourseIds.includes(course.id)
        );
      }
      
      const availableCategoryIds = new Set(coursesList.map((course) => course.category_id));
      setCategories((categoriesData || []).filter((category) => availableCategoryIds.has(category.id)));
      setCourses(coursesList);
      await fetchExams(forceRefresh);
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, getCachedData, showError]);

  const fetchExams = useCallback(async (forceRefresh = false) => {
    try {
      const params = {};
      if (isTeacher()) {
        params.created_by = user.id;
      }
      
      const examsData = await getCachedData(
        getCacheKey('exams', params),
        () => examsApi.getAllExams(params),
        { forceRefresh }
      );
      
      // Enrich exams with course names
      const enrichedExams = (examsData || []).map(exam => {
        const course = courses.find(c => c.id === exam.course_id);
        const category = course ? categories.find(c => c.id === course.category_id) : null;
        return {
          ...exam,
          course_name: exam.course_name || course?.name || 'Unknown Course',
          category_name: exam.category_name || category?.name || 'Unknown Category',
          status: getExamStatus(exam),
        };
      });
      
      setExams(enrichedExams);
      
    } catch (err) {
      devError('Failed to fetch exams:', err);
      showError('Failed to fetch exams');
    }
  }, [isTeacher, user, courses, getCachedData, getCacheKey, showError]);

  const handlePreview = (exam) => {
    setSelectedExam(exam);
    fetchExamQuestions(exam.id, true);
    setPreviewOpen(true);
  };

  const fetchExamQuestions = useCallback(async (examId, forceRefresh = false) => {
    if (!examId) return;
    
    try {
      const data = await getCachedData(
        `exam:${examId}:questions`,
        () => examsApi.getExamQuestions(examId),
        { forceRefresh, ttl: 2 * 60 * 1000 } // 2 minutes TTL
      );
      setExamQuestions(data || []);
    } catch (err) {
      devError('Failed to fetch exam questions:', err);
      showError('Failed to fetch exam questions');
    }
  }, [getCachedData, showError]);

  const fetchAvailableQuestions = useCallback(async (forceRefresh = false) => {
    try {
      const params = {
        question_type: 'practice',
        ...questionFilters
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });
      
      const data = await getCachedData(
        getCacheKey('available-questions', params),
        () => questionsApi.getQuestionsForExam(
          questionFilters.course_id || formData.course_id,
          params
        ),
        { forceRefresh, ttl: 2 * 60 * 1000 } // 2 minutes TTL
      );
      
      setAvailableQuestions(data || []);
      
    } catch (err) {
      devError('Failed to fetch available questions:', err);
      showError('Failed to fetch available questions');
    }
  }, [questionFilters, formData.course_id, getCachedData, getCacheKey, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'duration' || name === 'passing_score' || name === 'max_attempts' || name === 'user_time_limit'
          ? value ? parseInt(value) : ''
          : value,
      }));
    }
  };

  const handleQuestionFormChange = (e) => {
    const { name, value } = e.target;
    setQuestionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleBatchQuestionChange = (index, field, value) => {
    const updatedQuestions = [...batchQuestions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setBatchQuestions(updatedQuestions);
  };

  const addBatchQuestion = () => {
    setBatchQuestions([...batchQuestions, {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      option_f: '',
      correct_option: 'a',
      explanation: '',
      difficulty: 'medium',
      marks: 1,
    }]);
  };

  const removeBatchQuestion = (index) => {
    if (batchQuestions.length === 1) return;
    const updatedQuestions = batchQuestions.filter((_, i) => i !== index);
    setBatchQuestions(updatedQuestions);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: '',
      course_id: '',
      exam_type: 'weekly',
      start_date: '',
      end_date: '',
      duration: 60,
      user_time_limit: '',
      passing_score: 50,
      max_attempts: 1,
      auto_submit: true,
      show_results_immediately: false,
    });
    setIsEditing(false);
    setSelectedExam(null);
    setExamQuestions([]);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      option_f: '',
      correct_option: 'a',
      explanation: '',
      difficulty: 'medium',
      marks: 1,
    });
  };

  const resetBatchQuestions = () => {
    setBatchQuestions([{
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      option_f: '',
      correct_option: 'a',
      explanation: '',
      difficulty: 'medium',
      marks: 1,
    }]);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showError('Exam title is required');
      return false;
    }
    
    if (!formData.course_id) {
      showError('Please select a course');
      return false;
    }
    
    const startDate = toSafeDate(formData.start_date);
    const endDate = toSafeDate(formData.end_date);
    const now = new Date();

    if (startDate && startDate <= now) {
      showError('Start date must be in the future');
      return false;
    }

    if (endDate && endDate <= now) {
      showError('End date must be in the future');
      return false;
    }
    
    if (startDate && endDate && endDate <= startDate) {
      showError('End date must be after start date');
      return false;
    }
    
    if (formData.duration < 30 || formData.duration > 180) {
      showError('Duration must be between 30 and 180 minutes');
      return false;
    }
    
    return true;
  };

  const validateQuestionForm = () => {
    if (!questionForm.question_text.trim()) {
      showError('Question text is required');
      return false;
    }
    
    if (!questionForm.option_a.trim() || !questionForm.option_b.trim()) {
      showError('At least two options (A and B) are required');
      return false;
    }
    
    if (!questionForm.correct_option) {
      showError('Please select the correct option');
      return false;
    }
    
    return true;
  };

  const validateBatchForm = () => {
    for (let i = 0; i < batchQuestions.length; i++) {
      const q = batchQuestions[i];
      if (!q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.correct_option) {
        showError(`Question ${i + 1}: Text and at least two options are required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setActionLoading(true);
    
    try {
      const examData = {
        title: formData.title.trim(),
        course_id: parseInt(formData.course_id),
        exam_type: formData.exam_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        duration: formData.duration,
        user_time_limit: formData.user_time_limit ? parseInt(formData.user_time_limit) : null,
        passing_score: formData.passing_score,
        max_attempts: formData.max_attempts,
        auto_submit: formData.auto_submit,
        show_results_immediately: formData.show_results_immediately,
      };
      
      if (isEditing && selectedExam) {
        await examsApi.updateExam(selectedExam.id, examData);
        showSuccess('Exam updated successfully');
        
        // Invalidate caches
        invalidateCache(/^exams/);
        invalidateCache(coursesCacheKey);
      } else {
        const response = await examsApi.createExam(examData);
        const newExamId = response.data.data.id;
        
        if (selectedQuestions.length > 0) {
          await examsApi.addQuestionToExam(newExamId, selectedQuestions);
        }
        
        showSuccess('Exam created successfully');
        
        // Invalidate caches
        invalidateCache(/^exams/);
        invalidateCache(coursesCacheKey);
      }
      
      setFormOpen(false);
      resetForm();
      setSelectedQuestions([]);
      await fetchExams(true);
      setActiveTab(0);
      
    } catch (err) {
      devError('Failed to save exam:', err);
      showError(getFriendlyFormError(err, 'Failed to save exam'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateExamQuestion = async () => {
    if (!selectedExam || !validateQuestionForm()) return;
    
    setActionLoading(true);
    
    try {
      const questionData = {
        question_text: questionForm.question_text.trim(),
        option_a: questionForm.option_a.trim(),
        option_b: questionForm.option_b.trim(),
        option_c: questionForm.option_c.trim() || null,
        option_d: questionForm.option_d.trim() || null,
        option_e: questionForm.option_e.trim() || null,
        option_f: questionForm.option_f.trim() || null,
        correct_option: questionForm.correct_option,
        explanation: questionForm.explanation.trim() || null,
        difficulty: questionForm.difficulty,
        marks: questionForm.marks,
      };
      
      await examsApi.createExamQuestion(selectedExam.id, questionData);
      showSuccess('Exam question created successfully');
      
      // Invalidate caches
      invalidateCache(`exam:${selectedExam.id}:questions`);
      invalidateCache(/^exams/);
      
      setQuestionCreateDialogOpen(false);
      resetQuestionForm();
      await fetchExamQuestions(selectedExam.id, true);
      await fetchExams(true);
      
    } catch (err) {
      devError('Failed to create exam question:', err);
      showError(getFriendlyFormError(err, 'Failed to create exam question'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchCreateExamQuestions = async () => {
    if (!selectedExam || !validateBatchForm()) return;
    
    setActionLoading(true);
    
    try {
      let successCount = 0;
      const errors = [];
      
      for (let i = 0; i < batchQuestions.length; i++) {
        const q = batchQuestions[i];
        try {
          const questionData = {
            question_text: q.question_text.trim(),
            option_a: q.option_a.trim(),
            option_b: q.option_b.trim(),
            option_c: q.option_c.trim() || null,
            option_d: q.option_d.trim() || null,
            option_e: q.option_e.trim() || null,
            option_f: q.option_f.trim() || null,
            correct_option: q.correct_option,
            explanation: q.explanation.trim() || null,
            difficulty: q.difficulty,
            marks: q.marks,
          };
          
          await examsApi.createExamQuestion(selectedExam.id, questionData);
          successCount++;
        } catch (err) {
          errors.push(`Question ${i + 1}: ${err.response?.data?.message || err.message}`);
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Successfully created ${successCount} exam question(s). ${errors.length} failed.`);
        
        // Invalidate caches
        invalidateCache(`exam:${selectedExam.id}:questions`);
        invalidateCache(/^exams/);
        
        await fetchExamQuestions(selectedExam.id, true);
        await fetchExams(true);
      }
      
      if (errors.length > 0) {
        devError('Batch upload errors:', errors);
        setError(errors.join('; '));
      }
      
      setQuestionCreateDialogOpen(false);
      resetBatchQuestions();
      
    } catch (err) {
      devError('Failed to create batch exam questions:', err);
      showError(getFriendlyFormError(err, 'Failed to create batch exam questions'));
    } finally {
      setActionLoading(false);
    }
  };

  // FIXED: Edit navigation now works properly
  const handleEdit = (exam) => {
    blurActiveElement();
    setSelectedExam(exam);
    setIsEditing(true);
    const course = courses.find((item) => item.id === exam.course_id);
    
    setFormData({
      title: exam.title || '',
      category_id: course?.category_id?.toString() || '',
      course_id: exam.course_id?.toString() || '',
      exam_type: exam.exam_type || 'weekly',
      start_date: exam.start_date || '',
      end_date: exam.end_date || '',
      duration: exam.duration || 60,
      user_time_limit: exam.user_time_limit || '',
      passing_score: exam.passing_score || 50,
      max_attempts: exam.max_attempts || 1,
      auto_submit: exam.auto_submit === 1 || exam.auto_submit === true,
      show_results_immediately: exam.show_results_immediately === 1 || exam.show_results_immediately === true,
    });
    
    // Navigate to create/edit tab
    setActiveTab(1);
    setFormOpen(false); // Don't open dialog, just show the form in tab
  };

  const handleManageQuestions = (exam) => {
    blurActiveElement();
    setSelectedExam(exam);
    fetchExamQuestions(exam.id);
    setActiveTab(2); // Switch to questions tab
  };

  const handleDelete = (exam) => {
    setSelectedExam(exam);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedExam) return;

    setActionLoading(true);
    
    try {
      await examsApi.deleteExam(selectedExam.id);
      
      // Invalidate caches
      invalidateCache(/^exams/);
      invalidateCache(`exam:${selectedExam.id}:questions`);
      invalidateCache(coursesCacheKey);
      
      setExams(prev => prev.filter(e => e.id !== selectedExam.id));
      showSuccess(`Exam "${selectedExam.title}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedExam(null);
      
      if (activeTab === 2) {
        setActiveTab(0);
      }
      
    } catch (err) {
      devError('Failed to delete exam:', err);
      showError(getFriendlyFormError(err, 'Failed to delete exam'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuestions = async () => {
    if (!selectedExam || selectedQuestions.length === 0) return;
    
    setActionLoading(true);
    
    try {
      await examsApi.addQuestionToExam(selectedExam.id, selectedQuestions);
      showSuccess(`${selectedQuestions.length} question(s) added to exam`);
      
      // Invalidate caches
      invalidateCache(`exam:${selectedExam.id}:questions`);
      invalidateCache(/^exams/);
      
      setQuestionDialogOpen(false);
      setSelectedQuestions([]);
      await fetchExamQuestions(selectedExam.id, true);
      await fetchExams(true);
      
    } catch (err) {
      devError('Failed to add questions:', err);
      showError(getFriendlyFormError(err, 'Failed to add questions'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!selectedExam) return;
    
    setActionLoading(true);
    
    try {
      await examsApi.removeQuestionFromExam(selectedExam.id, questionId);
      
      // Invalidate caches
      invalidateCache(`exam:${selectedExam.id}:questions`);
      invalidateCache(/^exams/);
      
      setExamQuestions(prev => prev.filter(q => q.id !== questionId));
      await fetchExams(true);
      showSuccess('Question removed from exam');
      
    } catch (err) {
      devError('Failed to remove question:', err);
      showError(getFriendlyFormError(err, 'Failed to remove question'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuestionFilterChange = (e) => {
    const { name, value } = e.target;
    setQuestionFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyQuestionFilters = () => {
    setActionLoading(true);
    fetchAvailableQuestions(true).finally(() => setActionLoading(false));
  };

  const clearQuestionFilters = () => {
    setQuestionFilters({
      course_id: '',
      chapter_id: '',
      difficulty: '',
      search: '',
    });
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestions.length === availableQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(availableQuestions.map(q => q.id));
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const getExamStatus = (exam) => {
    const now = new Date();
    const startDate = exam.start_date ? new Date(exam.start_date) : null;
    const endDate = exam.end_date ? new Date(exam.end_date) : null;
    
    if (startDate && now < startDate) return 'upcoming';
    if (endDate && now > endDate) return 'ended';
    return 'active';
  };

  // Filter exams based on search
  const filteredExams = useMemo(() => exams.filter(exam => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exam.title.toLowerCase().includes(query) ||
      (exam.course_name && exam.course_name.toLowerCase().includes(query)) ||
      exam.exam_type.toLowerCase().includes(query)
    );
  }), [exams, searchQuery]);

  const columns = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      render: (value) => (
        <Typography variant="body2" fontWeight="500">
          {value}
        </Typography>
      ),
    },
    {
      field: 'course_name',
      headerName: 'Course',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Course'}
        </Typography>
      ),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Category'}
        </Typography>
      ),
    },
    {
      field: 'exam_type',
      headerName: 'Exam Type',
      width: 100,
      render: (value) => (
        <Chip
          label={value}
          size="small"
          color={value === 'weekly' ? 'primary' : value === 'mid' ? 'warning' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => (
        <Chip
          label={value}
          size="small"
          color={value === 'active' ? 'success' : value === 'upcoming' ? 'info' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'question_count',
      headerName: 'Question Count',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 0}
          size="small"
          color={value > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'start_date',
      headerName: 'Start Date',
      width: 120,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'end_date',
      headerName: 'End Date',
      width: 120,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'created_by_name',
      headerName: 'Created By',
      width: 170,
      render: (value) => (
        <Typography variant="body2" color="text.primary">
          {value || 'Unknown'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.created_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Exam">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handlePreview(row)}
                  color="info"
                  disabled={actionLoading}
                  sx={{
                    opacity: actionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Manage Questions">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<QuestionAnswer />}
                  onClick={() => handleManageQuestions(row)}
                  disabled={actionLoading}
                  sx={{
                    opacity: actionLoading ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {row.question_count || 0} Q
                </Button>
              </span>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Edit Exam">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(row)}
                      color="primary"
                      disabled={actionLoading}
                      sx={{
                        opacity: actionLoading ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete Exam">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(row)}
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
              </>
            )}
          </Box>
        );
      },
    },
  ], [actionLoading, examQuestions.length, handleDelete, handleEdit, handleManageQuestions, handlePreview, isAdmin, isTeacher, user.id]);

  const questionColumns = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'question_text',
      headerName: 'Question',
      flex: 1,
      render: (value) => (
        <Typography variant="body2">
          {value && value.length > 80 ? value.substring(0, 80) + '...' : value}
        </Typography>
      ),
    },
    {
      field: 'difficulty',
      headerName: 'Difficulty',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 'medium'}
          size="small"
          color={value === 'easy' ? 'success' : value === 'medium' ? 'warning' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'marks',
      headerName: 'Marks',
      width: 80,
      render: (value) => (
        <Chip
          label={value || 1}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      render: (value, row) => (
        <Tooltip title="Remove from Exam">
          <span>
            <IconButton
              size="small"
              onClick={() => handleRemoveQuestion(row.id)}
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
      ),
    },
  ], [actionLoading, handleRemoveQuestion]);

  if (!isAdmin() && !isTeacher()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Exam Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage exams with questions
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
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
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {(isAdmin() || isTeacher()) && activeTab !== 2 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setActiveTab(1);
              }}
              disabled={actionLoading}
              sx={{ borderRadius: 2 }}
            >
              Create Exam
            </Button>
          )}
        </Stack>
      </Box>

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
          <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Exams List" />
          <Tab label="Create/Edit Exam" disabled={activeTab !== 1 && !isEditing} />
          {selectedExam && <Tab label={`Manage Questions (${examQuestions.length})`} />}
        </Tabs>
      </Box>

      {/* Search Bar (only in list tab) */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <FastTextField
            fullWidth
            size="small"
            placeholder="Search exams by title or course..."
            value={searchQuery}
            onDebouncedChange={(value) => setSearchQuery(value)}
            delay={120}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      )}

      {/* Tab 0: Exams List */}
      {activeTab === 0 && (
        <DataTable
          showToolbar={false}
          columns={columns}
          data={filteredExams}
          loading={loading}
          onRefresh={handleRefresh}
          title={`Exams `}
          rowKey="id"
        />
      )}

      {/* Tab 1: Create/Edit Exam Form */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {isEditing ? 'Edit Exam' : 'Create New Exam'}
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={8}>
              <FastTextField
                fullWidth
                label="Exam Title *"
                name="title"
                value={formData.title}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                delay={80}
                required
                disabled={actionLoading}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Exam Type *</InputLabel>
                <Select
                  name="exam_type"
                  value={formData.exam_type}
                  onChange={handleInputChange}
                  label="Exam Type *"
                  disabled={actionLoading}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="mid">Mid-term</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <ContentAssignmentFields
              categories={categories}
              courses={courses}
              chapters={[]}
              values={formData}
              onChange={handleAssignmentChange}
              disabled={actionLoading}
              showCategory
              showCourse
              showChapter={false}
              categoryLabel="Category *"
              courseLabel="Course *"
            />

            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="Start Date & Time"
                value={toSafeDate(formData.start_date)}
                minDateTime={new Date()}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: toSafeIsoString(date),
                  }))
                }
                disabled={actionLoading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'This uses the same scheduler picker style as content releases',
                  },
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="End Date & Time"
                value={toSafeDate(formData.end_date)}
                minDateTime={
                  toSafeDate(formData.start_date) || new Date()
                }
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    end_date: toSafeIsoString(date),
                  }))
                }
                disabled={actionLoading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Leave empty to let the backend default it from the start time',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Duration (minutes) *"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleInputChange}
                inputProps={{ min: 30, max: 180 }}
                disabled={actionLoading}
                helperText="Default exam timer. This is used when no per-user time limit override is set."
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Per-User Time Limit"
                name="user_time_limit"
                type="number"
                value={formData.user_time_limit}
                onChange={handleInputChange}
                inputProps={{ min: 30, max: 180 }}
                disabled={actionLoading}
                helperText="Optional override for each student's attempt countdown. Leave empty to use Duration."
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Passing Score (%)"
                name="passing_score"
                type="number"
                value={formData.passing_score}
                onChange={handleInputChange}
                inputProps={{ min: 0, max: 100 }}
                disabled={actionLoading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Max Attempts"
                name="max_attempts"
                type="number"
                value={formData.max_attempts}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 10 }}
                disabled={actionLoading}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.auto_submit}
                    onChange={handleInputChange}
                    name="auto_submit"
                    disabled={actionLoading}
                  />
                }
                label="Auto-submit when time ends"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.show_results_immediately}
                    onChange={handleInputChange}
                    name="show_results_immediately"
                    disabled={actionLoading}
                  />
                }
                label="Show results immediately"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    blurActiveElement();
                    setActiveTab(0);
                    resetForm();
                  }}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={actionLoading || !formData.title.trim() || !formData.course_id}
                  startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
                  sx={{ borderRadius: 2 }}
                >
                  {actionLoading ? 'Saving...' : (isEditing ? 'Update Exam' : 'Create Exam')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tab 2: Manage Exam Questions */}
      {activeTab === 2 && selectedExam && (
        <Box>
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold">
                  {selectedExam.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Course: {selectedExam.course_name} • Type: {selectedExam.exam_type} • Duration: {selectedExam.duration} mins
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Chip
                    icon={<Quiz />}
                    label={`${examQuestions.length} Questions`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Event />}
                    label={selectedExam.start_date ? new Date(selectedExam.start_date).toLocaleDateString() : 'No start date'}
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      blurActiveElement();
                      setActiveTab(1);
                    }}
                    disabled={actionLoading}
                  >
                    Edit Exam
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Question Management Actions */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => {
                resetBatchQuestions();
                setQuestionCreateDialogOpen(true);
              }}
              disabled={actionLoading}
            >
              Batch Upload
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetQuestionForm();
                setQuestionCreateDialogOpen(true);
              }}
              disabled={actionLoading}
            >
              Add Question
            </Button>
          </Box>

          {examQuestions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Quiz sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No questions added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add questions to this exam from your practice question bank or create new ones
              </Typography>
            </Paper>
          ) : (
            <DataTable
              showToolbar={false}
              columns={questionColumns}
              data={examQuestions}
              loading={loading || actionLoading}
              onRefresh={() => fetchExamQuestions(selectedExam.id, true)}
              title="Exam Questions"
              rowKey="id"
            />
          )}
        </Box>
      )}

      {/* Add/Edit Exam Question Dialog */}
      <Dialog
        open={questionCreateDialogOpen}
        onClose={() => !actionLoading && setQuestionCreateDialogOpen(false)}
        keepMounted
        disableRestoreFocus
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography component="div" variant="h6" fontWeight="bold">
              Add Exam Question
            </Typography>
            <IconButton
              onClick={() => {
                if (!actionLoading) {
                  setQuestionCreateDialogOpen(false);
                  resetQuestionForm();
                  resetBatchQuestions();
                }
              }}
              size="small"
              disabled={actionLoading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Tabs
            value={batchQuestions.length > 1 ? 1 : 0}
            onChange={(e, newValue) => {
              if (newValue === 0) {
                resetBatchQuestions();
              } else {
                resetQuestionForm();
                if (batchQuestions.length === 1) {
                  addBatchQuestion();
                }
              }
            }}
            sx={{ mb: 3 }}
          >
            <Tab label="Single Question" />
            <Tab label="Batch Upload" />
          </Tabs>

          {batchQuestions.length === 1 ? (
            // Single Question Form
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Question Text *"
                  name="question_text"
                  value={questionForm.question_text}
                  onChange={handleQuestionFormChange}
                  multiline
                  rows={3}
                  required
                  disabled={actionLoading}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Options
                </Typography>
                <Grid container spacing={2}>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => {
                    const fieldName = `option_${letter.toLowerCase()}`;
                    return (
                      <Grid item xs={12} md={6} key={letter}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            fullWidth
                            label={`Option ${letter} ${letter <= 'B' ? '*' : ''}`}
                            name={fieldName}
                            value={questionForm[fieldName]}
                            onChange={handleQuestionFormChange}
                            required={letter <= 'B'}
                            disabled={actionLoading}
                            size="small"
                          />
                          <Radio
                            checked={questionForm.correct_option === letter.toLowerCase()}
                            onChange={() => setQuestionForm(prev => ({ ...prev, correct_option: letter.toLowerCase() }))}
                            value={letter.toLowerCase()}
                            color="success"
                            disabled={actionLoading}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    name="difficulty"
                    value={questionForm.difficulty}
                    onChange={handleQuestionFormChange}
                    label="Difficulty"
                    disabled={actionLoading}
                  >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Marks"
                  name="marks"
                  type="number"
                  value={questionForm.marks}
                  onChange={handleQuestionFormChange}
                  inputProps={{ min: 1 }}
                  disabled={actionLoading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Explanation (Optional)"
                  name="explanation"
                  value={questionForm.explanation}
                  onChange={handleQuestionFormChange}
                  multiline
                  rows={2}
                  disabled={actionLoading}
                />
              </Grid>
            </Grid>
          ) : (
            // Batch Questions Form
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Questions ({batchQuestions.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={addBatchQuestion}
                  disabled={actionLoading}
                >
                  Add Another
                </Button>
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {batchQuestions.map((q, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2, mb: 2, position: 'relative', borderRadius: 2 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Question #{index + 1}
                      </Typography>
                      {batchQuestions.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => removeBatchQuestion(index)}
                          color="error"
                          disabled={actionLoading}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Question Text *"
                          value={q.question_text}
                          onChange={(e) => handleBatchQuestionChange(index, 'question_text', e.target.value)}
                          disabled={actionLoading}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => {
                        const fieldName = `option_${letter.toLowerCase()}`;
                        return (
                          <Grid item xs={12} md={6} key={letter}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TextField
                                fullWidth
                                size="small"
                                label={`Option ${letter} ${letter <= 'B' ? '*' : ''}`}
                                value={q[fieldName]}
                                onChange={(e) => handleBatchQuestionChange(index, fieldName, e.target.value)}
                                disabled={actionLoading}
                              />
                              <Radio
                                checked={q.correct_option === letter.toLowerCase()}
                                onChange={() => handleBatchQuestionChange(index, 'correct_option', letter.toLowerCase())}
                                value={letter.toLowerCase()}
                                color="success"
                                disabled={actionLoading}
                                size="small"
                              />
                            </Box>
                          </Grid>
                        );
                      })}

                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Difficulty</InputLabel>
                          <Select
                            value={q.difficulty}
                            onChange={(e) => handleBatchQuestionChange(index, 'difficulty', e.target.value)}
                            label="Difficulty"
                            disabled={actionLoading}
                          >
                            <MenuItem value="easy">Easy</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="hard">Hard</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Marks"
                          type="number"
                          value={q.marks}
                          onChange={(e) => handleBatchQuestionChange(index, 'marks', parseInt(e.target.value) || 1)}
                          disabled={actionLoading}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Explanation (Optional)"
                          value={q.explanation}
                          onChange={(e) => handleBatchQuestionChange(index, 'explanation', e.target.value)}
                          disabled={actionLoading}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setQuestionCreateDialogOpen(false);
              resetQuestionForm();
              resetBatchQuestions();
            }}
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={batchQuestions.length > 1 ? handleBatchCreateExamQuestions : handleCreateExamQuestion}
            disabled={
              actionLoading ||
              (batchQuestions.length > 1
                ? batchQuestions.some(q => !q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim())
                : !questionForm.question_text.trim() || !questionForm.option_a.trim() || !questionForm.option_b.trim())
            }
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Creating...' : `Create ${batchQuestions.length > 1 ? batchQuestions.length + ' Questions' : 'Question'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Questions Dialog */}
      <Dialog
        open={questionDialogOpen}
        onClose={() => !actionLoading && setQuestionDialogOpen(false)}
        keepMounted
        disableRestoreFocus
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography component="div" variant="h6" fontWeight="bold">
              Import Questions to Exam
            </Typography>
            <IconButton
              onClick={() => {
                if (!actionLoading) {
                  setQuestionDialogOpen(false);
                  setSelectedQuestions([]);
                }
              }}
              size="small"
              disabled={actionLoading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {/* Question Filters */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search questions..."
                  value={questionFilters.search}
                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, search: e.target.value }))}
                  disabled={actionLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Chapter</InputLabel>
                  <Select
                    name="chapter_id"
                    value={questionFilters.chapter_id}
                    onChange={handleQuestionFilterChange}
                    label="Chapter"
                    disabled={actionLoading}
                  >
                    <MenuItem value="">All Chapters</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    name="difficulty"
                    value={questionFilters.difficulty}
                    onChange={handleQuestionFilterChange}
                    label="Difficulty"
                    disabled={actionLoading}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={applyQuestionFilters}
                    disabled={actionLoading}
                    sx={{ flex: 1 }}
                  >
                    {actionLoading ? <CircularProgress size={20} /> : 'Apply'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={clearQuestionFilters}
                    disabled={actionLoading}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Select All Bar */}
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'background.paper', borderRadius: 2.5, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Checkbox
                  checked={selectedQuestions.length > 0 && selectedQuestions.length === availableQuestions.length}
                  indeterminate={selectedQuestions.length > 0 && selectedQuestions.length < availableQuestions.length}
                  onChange={handleSelectAllQuestions}
                  disabled={actionLoading || availableQuestions.length === 0}
                />
                <Typography variant="body2">
                  {selectedQuestions.length} selected
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {availableQuestions.length} questions available
              </Typography>
            </Box>
          </Paper>

          {/* Questions List */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {availableQuestions.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No questions found
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Create practice questions first in the Questions Manager
                </Typography>
              </Paper>
            ) : (
              availableQuestions.map((question) => (
                <Paper
                  key={question.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    cursor: actionLoading ? 'default' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                      bgcolor: actionLoading ? 'transparent' : 'action.hover',
                    },
                  }}
                  onClick={() => !actionLoading && toggleQuestionSelection(question.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Checkbox
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => toggleQuestionSelection(question.id)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={actionLoading}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="500">
                        {question.question_text}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Chip
                          label={question.chapter_name || 'No Chapter'}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={question.difficulty || 'medium'}
                          size="small"
                          color={
                            question.difficulty === 'easy' ? 'success' :
                            question.difficulty === 'medium' ? 'warning' : 'error'
                          }
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setQuestionDialogOpen(false);
              setSelectedQuestions([]);
            }}
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddQuestions}
            disabled={actionLoading || selectedQuestions.length === 0}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Add />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Adding...' : `Add ${selectedQuestions.length} Question(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">View Exam</Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedExam?.title || '-'}
              </Typography>
              <Stack spacing={1.25}>
                <DetailRow label="Course" value={selectedExam?.course_name || 'Unknown Course'} />
                <DetailRow label="Category" value={selectedExam?.category_name || 'Unknown Category'} />
                <DetailRow label="Exam Type" value={selectedExam?.exam_type || '-'} />
                <DetailRow
                  label="Status"
                  value={selectedExam?.status ? renderTableChip(selectedExam.status, {
                    color: selectedExam.status === 'published' ? 'success' : 'warning',
                  }) : '-'}
                />
                <DetailRow label="Question Count" value={selectedExam?.question_count || 0} />
                <DetailRow label="Created By" value={selectedExam?.created_by_name || 'Unknown'} />
              </Stack>
            </Paper>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Exam Questions</Typography>
            {examQuestions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No questions found for this exam.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {examQuestions.map((question, index) => (
                  <Paper key={question.id || index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                      {index + 1}. {question.question_text || 'Untitled question'}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                      <Chip
                        label={question.chapter_name || 'No Chapter'}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={question.difficulty || 'medium'}
                        size="small"
                        color={
                          question.difficulty === 'easy' ? 'success' :
                          question.difficulty === 'medium' ? 'warning' : 'error'
                        }
                        variant="outlined"
                      />
                      <Chip
                        label={`Answer: ${(question.correct_option || '-').toUpperCase()}`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Stack>
                    <Stack spacing={0.75}>
                      {['a', 'b', 'c', 'd', 'e', 'f']
                        .filter((option) => question[`option_${option}`])
                        .map((option) => (
                          <Paper
                            key={option}
                            variant="outlined"
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              borderColor:
                                question.correct_option === option ? 'success.main' : 'divider',
                              bgcolor: (theme) =>
                                question.correct_option === option
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(46, 125, 50, 0.18)'
                                    : 'rgba(46, 125, 50, 0.08)'
                                  : 'transparent',
                            }}
                          >
                            <Typography variant="body2">
                              <strong>{option.toUpperCase()}.</strong> {question[`option_${option}`]}
                            </Typography>
                          </Paper>
                        ))}
                    </Stack>
                    {question.explanation ? (
                      <Box sx={{ mt: 1.25 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Explanation
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                          <Typography variant="body2">{question.explanation}</Typography>
                        </Paper>
                      </Box>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setPreviewOpen(false);
              handleEdit(selectedExam);
            }}
            disabled={!selectedExam}
            sx={{ borderRadius: 2 }}
          >
            Edit Exam
          </Button>
          <Button variant="outlined" onClick={() => setPreviewOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Exam"
        message={`Are you sure you want to delete exam "${selectedExam?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
    </LocalizationProvider>
  );
};

export default ExamManager;
