import React, { useState, useEffect, useCallback } from 'react';
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
  Radio,
  FormControlLabel,
  FormLabel,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Quiz,
  AddCircle,
  RemoveCircle,
  Visibility,
  Close,
  Save,
  FilterList,
  Search,
  Clear,
  ExpandMore,
  CheckCircle,
  RadioButtonChecked,
  RadioButtonUnchecked,
  Category as CategoryIcon,
  Book,
  MenuBook,
  Upload,
  Download,
} from '@mui/icons-material';

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
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // For cascading dropdowns
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    category_id: '',
    course_id: '',
    chapter_id: '',
    difficulty: '',
  });
  
  // Filtered lists for filters
  const [filterCoursesForFilter, setFilterCoursesForFilter] = useState([]);
  const [filterChaptersForFilter, setFilterChaptersForFilter] = useState([]);
  
  const [formData, setFormData] = useState({
    question_text: '',
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

  // Batch questions state
  const [batchForm, setBatchForm] = useState({
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

  // Cache keys
  const questionsCacheKey = 'questions';
  const categoriesCacheKey = 'categories';
  const coursesCacheKey = 'courses';
  const chaptersCacheKey = 'chapters';

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const categoriesData = await getCachedData(
        categoriesCacheKey,
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      const coursesData = await getCachedData(
        coursesCacheKey,
        () => coursesApi.getAllCourses(),
        { forceRefresh }
      );
      
      const chaptersData = await getCachedData(
        chaptersCacheKey,
        () => chaptersApi.getAllChapters(),
        { forceRefresh }
      );
      
      setCategories(categoriesData || []);
      setCourses(coursesData || []);
      setChapters(chaptersData || []);
      
      await fetchQuestions(forceRefresh);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      showError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, showError]);

  const fetchQuestions = useCallback(async (forceRefresh = false) => {
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
      
      // Enrich questions with chapter, course, and category names
      const enrichedQuestions = (questionsData || []).map(question => {
        const chapter = chapters.find(ch => ch.id === question.chapter_id);
        const course = chapter ? courses.find(c => c.id === chapter.course_id) : null;
        const category = course ? categories.find(c => c.id === course.category_id) : null;
        return {
          ...question,
          chapter_name: chapter?.name || 'Unknown Chapter',
          course_name: course?.name || 'Unknown Course',
          category_name: category?.name || 'Unknown Category',
        };
      });
      
      setQuestions(enrichedQuestions);
      
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      showError('Failed to fetch questions');
    }
  }, [filters, chapters, courses, categories, getCachedData, getCacheKey, showError]);

  useEffect(() => {
    if (isAdmin() || isTeacher()) {
      fetchData();
    }
  }, [isAdmin, isTeacher, fetchData]);

  // Update filter dropdowns
  useEffect(() => {
    if (filters.category_id) {
      const filtered = courses.filter(course => 
        course.category_id === parseInt(filters.category_id)
      );
      setFilterCoursesForFilter(filtered);
    } else {
      setFilterCoursesForFilter([]);
    }
  }, [filters.category_id, courses]);

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

  // Batch question handlers
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

  const handleBatchChapterChange = (chapterId) => {
    setBatchForm(prev => ({ ...prev, chapter_id: chapterId }));
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
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
        
        // Invalidate caches
        invalidateCache(/^questions/);
        invalidateCache(chaptersCacheKey);
      } else {
        await questionsApi.createQuestion(questionData);
        showSuccess('Practice question created successfully');
        
        // Invalidate caches
        invalidateCache(/^questions/);
        invalidateCache(chaptersCacheKey);
      }
      
      setFormOpen(false);
      resetForm();
      await fetchQuestions(true);
      
    } catch (err) {
      console.error('Failed to save question:', err);
      showError(err.response?.data?.message || 'Failed to save question');
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
      
      // Invalidate caches
      invalidateCache(/^questions/);
      invalidateCache(chaptersCacheKey);
      
      setBatchDialogOpen(false);
      resetBatchForm();
      await fetchQuestions(true);
      
    } catch (err) {
      console.error('Failed to create batch questions:', err);
      showError(err.response?.data?.message || 'Failed to create batch questions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (question) => {
    if (isTeacher() && question.created_by !== user.id) {
      showError('You can only edit questions you created');
      return;
    }

    setSelectedQuestion(question);
    setIsEditing(true);
    
    setFormData({
      question_text: question.question_text || '',
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
      
      // Invalidate caches
      invalidateCache(/^questions/);
      invalidateCache(chaptersCacheKey);
      
      setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
      showSuccess('Practice question deleted successfully');
      setDeleteConfirmOpen(false);
      setSelectedQuestion(null);
      
    } catch (err) {
      console.error('Failed to delete question:', err);
      showError(err.response?.data?.message || 'Failed to delete question');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  // Filter questions based on search
  const filteredQuestions = questions.filter(question => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      question.question_text.toLowerCase().includes(query) ||
      (question.chapter_name && question.chapter_name.toLowerCase().includes(query)) ||
      (question.course_name && question.course_name.toLowerCase().includes(query))
    );
  });

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary">
          #{value}
        </Typography>
      ),
    },
    {
      field: 'question_text',
      headerName: 'Question',
      flex: 1,
      render: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="500">
            {value && value.length > 80 ? value.substring(0, 80) + '...' : value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.chapter_name || 'No Chapter'} • {row.course_name || 'No Course'}
          </Typography>
        </Box>
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
      headerName: 'Correct',
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
      field: 'creator_role',
      headerName: 'Created By',
      width: 120,
      render: (value, row) => (
        <Box>
          <Typography variant="caption" display="block">
            {value || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.created_by === user?.id && '(You)'}
          </Typography>
        </Box>
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
            {canEdit && (
              <>
                <Tooltip title="Edit Question">
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
                <Tooltip title="Delete Question">
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
  ];

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
      {/* Header */}
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

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search questions by text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Filters Section */}
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

      {/* Questions Table */}
      <DataTable
        columns={columns}
        data={filteredQuestions}
        loading={loading}
        onRefresh={handleRefresh}
        title={`Practice Questions `}
        rowKey="id"
      />

      {/* Add/Edit Question Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !actionLoading && setFormOpen(false)}
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
              <TextField
                fullWidth
                label="Question Text *"
                name="question_text"
                value={formData.question_text}
                onChange={handleInputChange}
                multiline
                rows={3}
                required
                disabled={actionLoading}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Chapter *</InputLabel>
                <Select
                  name="chapter_id"
                  value={formData.chapter_id}
                  onChange={handleInputChange}
                  label="Chapter *"
                  disabled={actionLoading}
                >
                  <MenuItem value="">Select Chapter</MenuItem>
                  {chapters.map(chapter => (
                    <MenuItem key={chapter.id} value={chapter.id}>
                      {chapter.name} ({chapter.course_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                          value={formData[fieldName]}
                          onChange={handleInputChange}
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
              <TextField
                fullWidth
                label="Explanation (Optional)"
                name="explanation"
                value={formData.explanation}
                onChange={handleInputChange}
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

      {/* Batch Upload Dialog */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => !actionLoading && setBatchDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
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
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Chapter *</InputLabel>
                <Select
                  value={batchForm.chapter_id}
                  onChange={(e) => handleBatchChapterChange(e.target.value)}
                  label="Chapter *"
                  disabled={actionLoading}
                >
                  <MenuItem value="">Select Chapter</MenuItem>
                  {chapters.map(chapter => (
                    <MenuItem key={chapter.id} value={chapter.id}>
                      {chapter.name} ({chapter.course_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

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
                    sx={{ p: 2, mb: 2, position: 'relative', borderRadius: 2 }}
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

      {/* Delete Confirmation Dialog */}
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