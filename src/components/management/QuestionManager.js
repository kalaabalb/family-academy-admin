import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import questionsApi from '../../api/questions';
import categoriesApi from '../../api/categories';
import coursesApi from '../../api/courses';
import chaptersApi from '../../api/chapters';
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
  Radio,
  FormControlLabel,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  FormHelperText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Quiz,
  Upload,
  Visibility,
  Close,
  Save,
  FilterList,
  Search,
  Clear,
  Category as CategoryIcon,
  Book,
  MenuBook,
} from '@mui/icons-material';
import ContentAssignmentFields from '../common/ContentAssignmentFields';
import FastTextField from '../common/FastTextField';
import DetailRow from '../common/DetailRow';
import { renderTableChip } from '../common/tableFormatters';
import { devError } from '../../utils/devLogger';

const QuestionManager = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  
  const [filters, setFilters] = useState({
    category_id: '',
    course_id: '',
    chapter_id: '',
    difficulty: '',
  });
  
  const [filterCoursesForFilter, setFilterCoursesForFilter] = useState([]);
  const [filterChaptersForFilter, setFilterChaptersForFilter] = useState([]);
  
  const [formData, setFormData] = useState({
    question_text: '',
    category_id: '',
    course_id: '',
    chapter_id: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    option_f: '',
    correct_option: 'a',
    explanation: '',
    difficulty: 'medium',
  });

  const [batchForm, setBatchForm] = useState({
    category_id: '',
    course_id: '',
    chapter_id: '',
    questions: [{
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
    }]
  });

  const getFriendlyFormError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const categoriesData = await getCachedData(
        'categories',
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      const coursesData = await getCachedData(
        'courses',
        () => coursesApi.getAllCourses(),
        { forceRefresh }
      );
      
      const chaptersData = await getCachedData(
        'chapters',
        () => chaptersApi.getAllChapters(),
        { forceRefresh }
      );
      
      // FIX: Filter courses for teachers based on assigned_courses
      let filteredCoursesData = coursesData || [];
      let filteredCategoriesData = categoriesData || [];
      
      if (isTeacher()) {
        const assignedCourseIds = user?.assigned_courses || [];
        
        filteredCoursesData = coursesData.filter(course => 
          assignedCourseIds.includes(course.id)
        );
        
        const accessibleCategoryIds = new Set(
          filteredCoursesData.map(c => c.category_id)
        );
        filteredCategoriesData = categoriesData.filter(cat => 
          accessibleCategoryIds.has(cat.id)
        );
      }
      
      setCategories(filteredCategoriesData || []);
      setCourses(filteredCoursesData || []);
      setChapters(chaptersData || []);
      
      await fetchQuestions(forceRefresh, {
        chaptersData: chaptersData || [],
        coursesData: filteredCoursesData || [],
        categoriesData: filteredCategoriesData || [],
      });
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user, getCachedData, showError]);

  const fetchQuestions = useCallback(async (forceRefresh = false, lookupData = null) => {
    try {
      const params = {
        question_type: 'practice',
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });
      
      const questionsData = await getCachedData(
        getCacheKey('questions', params),
        () => questionsApi.getAllQuestions(params),
        { forceRefresh }
      );
      
      const availableChapters = lookupData?.chaptersData || chapters;
      const availableCourses = lookupData?.coursesData || courses;
      const availableCategories = lookupData?.categoriesData || categories;

      const enrichedQuestions = (questionsData || []).map(question => {
        const chapter = availableChapters.find(ch => ch.id === question.chapter_id);
        const course =
          availableCourses.find(c => c.id === question.course_id) ||
          (chapter ? availableCourses.find(c => c.id === chapter.course_id) : null);
        const category = course ? availableCategories.find(c => c.id === course.category_id) : null;
        return {
          ...question,
          chapter_name: question.chapter_name || chapter?.name || 'Unknown Chapter',
          course_name: question.course_name || course?.name || 'Unknown Course',
          category_name: question.category_name || category?.name || 'Unknown Category',
        };
      });
      
      setQuestions(enrichedQuestions);
      
    } catch (err) {
      devError('Failed to fetch questions:', err);
      showError('Failed to fetch questions');
    }
  }, [filters, chapters, courses, categories, getCachedData, getCacheKey, showError]);

  const handlePreview = (question) => {
    setSelectedQuestion(question);
    setPreviewOpen(true);
  };

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  useEffect(() => {
    // FIX: Use filtered courses based on teacher's assignments
    let availableCourses = courses;
    
    if (isTeacher()) {
      const assignedCourseIds = user?.assigned_courses || [];
      availableCourses = courses.filter(course => 
        assignedCourseIds.includes(course.id)
      );
    }
    
    if (filters.category_id) {
      const filtered = availableCourses.filter(course => 
        course.category_id === parseInt(filters.category_id)
      );
      setFilterCoursesForFilter(filtered);
    } else {
      setFilterCoursesForFilter([]);
    }
  }, [filters.category_id, courses, isTeacher, user]);

  useEffect(() => {
    if (filters.course_id) {
      const filtered = chapters.filter(chapter => 
        chapter.course_id === parseInt(filters.course_id)
      );
      setFilterChaptersForFilter(filtered);
    } else {
      setFilterChaptersForFilter([]);
    }
  }, [filters.course_id, chapters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      if (name === 'category_id') {
        newFilters.course_id = '';
        newFilters.chapter_id = '';
      }
      if (name === 'course_id') {
        newFilters.chapter_id = '';
      }
      
      return newFilters;
    });
  };

  const applyFilters = () => {
    setActionLoading(true);
    fetchQuestions(true).finally(() => setActionLoading(false));
  };

  const clearFilters = () => {
    setFilters({
      category_id: '',
      course_id: '',
      chapter_id: '',
      difficulty: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleBatchInputChange = (index, field, value) => {
    const updatedQuestions = [...batchForm.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setBatchForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const addBatchQuestion = () => {
    setBatchForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
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
        }
      ]
    }));
  };

  const removeBatchQuestion = (index) => {
    if (batchForm.questions.length === 1) return;
    const updatedQuestions = batchForm.questions.filter((_, i) => i !== index);
    setBatchForm(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const handleBatchAssignmentChange = (updates) => {
    setBatchForm((prev) => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      category_id: '',
      course_id: '',
      chapter_id: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      option_f: '',
      correct_option: 'a',
      explanation: '',
      difficulty: 'medium',
    });
    setIsEditing(false);
    setSelectedQuestion(null);
  };

  const resetBatchForm = () => {
    setBatchForm({
      category_id: '',
      course_id: '',
      chapter_id: '',
      questions: [{
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
      }]
    });
  };

  const validateForm = () => {
    if (!formData.question_text.trim()) {
      showError('Question text is required');
      return false;
    }
    
    if (!formData.chapter_id) {
      showError('Please select a chapter');
      return false;
    }
    
    if (!formData.option_a.trim() || !formData.option_b.trim()) {
      showError('At least two options (A and B) are required');
      return false;
    }
    
    if (!formData.correct_option) {
      showError('Please select the correct option');
      return false;
    }
    
    return true;
  };

  const validateBatchForm = () => {
    if (!batchForm.chapter_id) {
      showError('Please select a chapter');
      return false;
    }
    
    for (let i = 0; i < batchForm.questions.length; i++) {
      const q = batchForm.questions[i];
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
      const questionData = {
        question_text: formData.question_text.trim(),
        chapter_id: parseInt(formData.chapter_id),
        question_type: 'practice',
        option_a: formData.option_a.trim(),
        option_b: formData.option_b.trim(),
        option_c: formData.option_c.trim() || null,
        option_d: formData.option_d.trim() || null,
        option_e: formData.option_e.trim() || null,
        option_f: formData.option_f.trim() || null,
        correct_option: formData.correct_option,
        explanation: formData.explanation.trim() || null,
        difficulty: formData.difficulty,
      };
      
      if (isEditing && selectedQuestion) {
        if (isTeacher() && selectedQuestion.created_by !== user.id) {
          showError('You can only edit questions you created');
          setActionLoading(false);
          return;
        }
        
        await questionsApi.updateQuestion(selectedQuestion.id, questionData);
        showSuccess('Practice question updated successfully');
        
        invalidateCache(/^questions/);
      } else {
        await questionsApi.createQuestion(questionData);
        showSuccess('Practice question created successfully');
        
        invalidateCache(/^questions/);
      }
      
      setFormOpen(false);
      resetForm();
      await fetchQuestions(true);
      
    } catch (err) {
      devError('Failed to save question:', err);
      showError(getFriendlyFormError(err, 'Failed to save question'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!validateBatchForm()) return;
    
    setActionLoading(true);
    
    try {
      const batchData = {
        chapter_id: parseInt(batchForm.chapter_id),
        questions: batchForm.questions.map(q => ({
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
        }))
      };
      
      await questionsApi.createBatchQuestions(batchData.chapter_id, batchData.questions);
      showSuccess(`Successfully created ${batchData.questions.length} practice questions!`);
      
      invalidateCache(/^questions/);
      
      setBatchDialogOpen(false);
      resetBatchForm();
      await fetchQuestions(true);
      
    } catch (err) {
      devError('Failed to create batch questions:', err);
      showError(getFriendlyFormError(err, 'Failed to create batch questions'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (question) => {
    if (isTeacher() && question.created_by !== user.id) {
      showError('You can only edit questions you created');
      return;
    }

    const chapter = chapters.find((item) => item.id === question.chapter_id);
    const course = chapter ? courses.find((item) => item.id === chapter.course_id) : null;

    setSelectedQuestion(question);
    setIsEditing(true);
    
    setFormData({
      question_text: question.question_text || '',
      category_id: course?.category_id?.toString() || '',
      course_id: course?.id?.toString() || '',
      chapter_id: question.chapter_id?.toString() || '',
      option_a: question.option_a || '',
      option_b: question.option_b || '',
      option_c: question.option_c || '',
      option_d: question.option_d || '',
      option_e: question.option_e || '',
      option_f: question.option_f || '',
      correct_option: question.correct_option || 'a',
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'medium',
    });
    
    setFormOpen(true);
  };

  const handleDelete = (question) => {
    if (isTeacher() && question.created_by !== user.id) {
      showError('You can only delete questions you created');
      return;
    }
    
    setSelectedQuestion(question);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedQuestion) return;

    setActionLoading(true);
    
    try {
      await questionsApi.deleteQuestion(selectedQuestion.id);
      
      invalidateCache(/^questions/);
      
      setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
      showSuccess('Practice question deleted successfully');
      setDeleteConfirmOpen(false);
      setSelectedQuestion(null);
      
    } catch (err) {
      devError('Failed to delete question:', err);
      showError(getFriendlyFormError(err, 'Failed to delete question'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const filteredQuestions = useMemo(() => questions.filter(question => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      question.question_text.toLowerCase().includes(query) ||
      (question.chapter_name && question.chapter_name.toLowerCase().includes(query)) ||
      (question.course_name && question.course_name.toLowerCase().includes(query))
    );
  }), [questions, searchQuery]);

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
      field: 'question_text',
      headerName: 'Question Text',
      flex: 1,
      render: (value) => (
        <Typography variant="body2" fontWeight="500">
          {value && value.length > 80 ? value.substring(0, 80) + '...' : value}
        </Typography>
      ),
    },
    {
      field: 'chapter_name',
      headerName: 'Chapter',
      width: 150,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value || 'Unknown Chapter'}
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
      field: 'difficulty',
      headerName: 'Difficulty',
      width: 100,
      render: (value) => (
        <Chip
          label={value || 'medium'}
          size="small"
          color={
            value === 'easy' ? 'success' :
            value === 'medium' ? 'warning' : 'error'
          }
          variant="outlined"
        />
      ),
    },
    {
      field: 'correct_option',
      headerName: 'Correct Option',
      width: 90,
      render: (value) => (
        <Chip
          label={`Option ${value ? value.toUpperCase() : 'A'}`}
          size="small"
          color="success"
          variant="outlined"
        />
      ),
    },
    {
      field: 'created_by_name',
      headerName: 'Created By',
      width: 170,
      render: (value) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {value || 'Unknown'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 120,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      render: (value, row) => {
        const canEdit = isAdmin() || (isTeacher() && row.created_by === user.id);
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Question">
              <span>
                <IconButton
                  size="small"
                  onClick={() => handlePreview(row)}
                  color="info"
                  disabled={actionLoading}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Edit Question">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(row)}
                      color="primary"
                      disabled={actionLoading}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete Question">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(row)}
                      color="error"
                      disabled={actionLoading}
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
  ], [actionLoading, handleDelete, handleEdit, handlePreview, isAdmin, isTeacher, user?.id]);

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
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Practice Questions Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage practice questions for chapters
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
          {(isAdmin() || isTeacher()) && (
            <>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => {
                  resetBatchForm();
                  setBatchDialogOpen(true);
                }}
                disabled={actionLoading}
                sx={{ borderRadius: 2 }}
              >
                Batch Upload
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetForm();
                  setFormOpen(true);
                }}
                disabled={actionLoading}
                sx={{ borderRadius: 2 }}
              >
                Add Question
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
          <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <FastTextField
          fullWidth
          size="small"
          placeholder="Search questions by text..."
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
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Questions
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={filters.category_id}
                  onChange={handleFilterChange}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Course</InputLabel>
                <Select
                  name="course_id"
                  value={filters.course_id}
                  onChange={handleFilterChange}
                  label="Course"
                  disabled={!filters.category_id}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {filterCoursesForFilter.map(course => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Chapter</InputLabel>
                <Select
                  name="chapter_id"
                  value={filters.chapter_id}
                  onChange={handleFilterChange}
                  label="Chapter"
                  disabled={!filters.course_id}
                >
                  <MenuItem value="">All Chapters</MenuItem>
                  {filterChaptersForFilter.map(chapter => (
                    <MenuItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Difficulty</InputLabel>
                <Select
                  name="difficulty"
                  value={filters.difficulty}
                  onChange={handleFilterChange}
                  label="Difficulty"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={applyFilters}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={20} /> : 'Apply'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredQuestions}
        loading={loading}
        onRefresh={handleRefresh}
        title={`Practice Questions `}
        rowKey="id"
      />

      <Dialog
        open={formOpen}
        onClose={() => !actionLoading && setFormOpen(false)}
        keepMounted
        disableRestoreFocus
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Practice Question' : 'Add New Practice Question'}
            </Typography>
            <IconButton
              onClick={() => {
                if (!actionLoading) {
                  setFormOpen(false);
                  resetForm();
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
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Assignment
              </Typography>
            </Grid>
            <ContentAssignmentFields
              categories={categories}
              courses={courses}
              chapters={chapters}
              values={formData}
              onChange={handleAssignmentChange}
              disabled={actionLoading}
              showCategory
              showCourse
              showChapter
            />

            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Question Text *"
                name="question_text"
                value={formData.question_text}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, question_text: value }))}
                delay={80}
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
                        <FastTextField
                          fullWidth
                          label={`Option ${letter} ${letter <= 'B' ? '*' : ''}`}
                          name={fieldName}
                          value={formData[fieldName]}
                          onDebouncedChange={(value) =>
                            setFormData((prev) => ({ ...prev, [fieldName]: value }))
                          }
                          delay={80}
                          required={letter <= 'B'}
                          disabled={actionLoading}
                          size="small"
                        />
                        <Radio
                          checked={formData.correct_option === letter.toLowerCase()}
                          onChange={() => setFormData(prev => ({ ...prev, correct_option: letter.toLowerCase() }))}
                          value={letter.toLowerCase()}
                          color="success"
                          disabled={actionLoading}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                * Click the radio button to mark the correct answer
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  label="Difficulty"
                  disabled={actionLoading}
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Explanation (Optional)"
                name="explanation"
                value={formData.explanation}
                onDebouncedChange={(value) => setFormData((prev) => ({ ...prev, explanation: value }))}
                delay={80}
                multiline
                rows={2}
                disabled={actionLoading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setFormOpen(false);
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
            disabled={
              actionLoading || 
              !formData.question_text.trim() || 
              !formData.chapter_id || 
              !formData.option_a.trim() || 
              !formData.option_b.trim()
            }
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Saving...' : (isEditing ? 'Update Question' : 'Create Question')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={batchDialogOpen}
        onClose={() => !actionLoading && setBatchDialogOpen(false)}
        keepMounted
        disableRestoreFocus
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Batch Upload Practice Questions
            </Typography>
            <IconButton
              onClick={() => {
                if (!actionLoading) {
                  setBatchDialogOpen(false);
                  resetBatchForm();
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
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              Create multiple practice questions at once for the same chapter.
            </Typography>
          </Alert>

          <Grid container spacing={3}>
            <ContentAssignmentFields
              categories={categories}
              courses={courses}
              chapters={chapters}
              values={batchForm}
              onChange={handleBatchAssignmentChange}
              disabled={actionLoading}
              showCategory
              showCourse
              showChapter
            />

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Questions ({batchForm.questions.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={addBatchQuestion}
                  disabled={actionLoading}
                >
                  Add Another Question
                </Button>
              </Box>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {batchForm.questions.map((q, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2.5, mb: 2, position: 'relative', borderRadius: 2.5 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Question #{index + 1}
                      </Typography>
                      {batchForm.questions.length > 1 && (
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
                          onChange={(e) => handleBatchInputChange(index, 'question_text', e.target.value)}
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
                                onChange={(e) => handleBatchInputChange(index, fieldName, e.target.value)}
                                disabled={actionLoading}
                              />
                              <Radio
                                checked={q.correct_option === letter.toLowerCase()}
                                onChange={() => handleBatchInputChange(index, 'correct_option', letter.toLowerCase())}
                                value={letter.toLowerCase()}
                                color="success"
                                disabled={actionLoading}
                                size="small"
                              />
                            </Box>
                          </Grid>
                        );
                      })}

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Difficulty</InputLabel>
                          <Select
                            value={q.difficulty}
                            onChange={(e) => handleBatchInputChange(index, 'difficulty', e.target.value)}
                            label="Difficulty"
                            disabled={actionLoading}
                          >
                            <MenuItem value="easy">Easy</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="hard">Hard</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Explanation (Optional)"
                          value={q.explanation}
                          onChange={(e) => handleBatchInputChange(index, 'explanation', e.target.value)}
                          disabled={actionLoading}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setBatchDialogOpen(false);
              resetBatchForm();
            }}
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBatchSubmit}
            disabled={actionLoading || !batchForm.chapter_id || batchForm.questions.some(q => !q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim())}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Upload />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Uploading...' : `Upload ${batchForm.questions.length} Questions`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">View Practice Question</Typography>
            <IconButton onClick={() => setPreviewOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2">{selectedQuestion?.question_text || '-'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Stack spacing={1.25}>
                <DetailRow label="Chapter" value={selectedQuestion?.chapter_name || 'Unknown Chapter'} />
                <DetailRow label="Course" value={selectedQuestion?.course_name || 'Unknown Course'} />
                <DetailRow
                  label="Difficulty"
                  value={selectedQuestion?.difficulty ? renderTableChip(selectedQuestion.difficulty, {
                    color:
                      selectedQuestion.difficulty === 'easy' ? 'success' :
                      selectedQuestion.difficulty === 'medium' ? 'warning' : 'error',
                  }) : '-'}
                />
                <DetailRow label="Correct Option" value={selectedQuestion?.correct_option?.toUpperCase() || '-'} />
                <DetailRow label="Created By" value={selectedQuestion?.created_by_name || 'Unknown'} />
              </Stack>
            </Paper>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Answer Options</Typography>
            <Stack spacing={1}>
              {['a', 'b', 'c', 'd', 'e', 'f']
                .filter((option) => selectedQuestion?.[`option_${option}`])
                .map((option) => (
                  <Paper
                    key={option}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor:
                        selectedQuestion?.correct_option === option ? 'success.main' : 'divider',
                      bgcolor: (theme) =>
                        selectedQuestion?.correct_option === option
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(46, 125, 50, 0.18)'
                            : 'rgba(46, 125, 50, 0.08)'
                          : 'transparent',
                    }}
                  >
                    <Typography variant="body2">
                      <strong>{option.toUpperCase()}.</strong> {selectedQuestion?.[`option_${option}`]}
                    </Typography>
                  </Paper>
                ))}
            </Stack>
            {selectedQuestion?.explanation ? (
              <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">Explanation</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="body2">{selectedQuestion.explanation}</Typography>
                </Paper>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setPreviewOpen(false);
              handleEdit(selectedQuestion);
            }}
            disabled={!selectedQuestion}
            sx={{ borderRadius: 2 }}
          >
            Edit Question
          </Button>
          <Button variant="outlined" onClick={() => setPreviewOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Practice Question"
        message="Are you sure you want to delete this practice question?"
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default QuestionManager;
