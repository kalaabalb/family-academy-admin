import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import settingsApi from '../../api/settings';
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
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import FastTextField from '../common/FastTextField';
import {
  renderPrimaryCell,
  renderTableChip,
} from '../common/tableFormatters';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Save,
  Close,
  Settings,
  Security,
  Payment,
  ContactMail,
  CloudUpload,
  School,
  DeviceHub,
  Code,
  Info,
  Warning,
  CheckCircle,
  Category as CategoryIcon,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  Search,
  AutoAwesome,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const SettingsManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, invalidateCache } = useUsers();
  
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    setting_key: '',
    setting_value: '',
    display_name: '',
    category: '',
    data_type: 'text',
    is_public: false,
    display_order: 0,
    description: '',
  });

  const getFriendlyFormError = (error, fallback, duplicateMessage = null) => {
    const rawMessage = String(error?.response?.data?.message || error?.message || '');
    if (duplicateMessage && /already exists|duplicate entry|unique constraint/i.test(rawMessage)) {
      return duplicateMessage;
    }
    return error?.userMessage || error?.response?.data?.message || fallback;
  };

  // Data type options with user-friendly labels
  const dataTypeOptions = [
    { value: 'text', label: 'Text', icon: '📝', description: 'Plain text value' },
    { value: 'number', label: 'Number', icon: '🔢', description: 'Numeric value' },
    { value: 'boolean', label: 'True/False', icon: '✅', description: 'Yes/No toggle' },
    { value: 'email', label: 'Email', icon: '📧', description: 'Email address' },
    { value: 'url', label: 'URL', icon: '🔗', description: 'Website link' },
    { value: 'password', label: 'Password', icon: '🔒', description: 'Hidden text (for passwords)' },
    { value: 'color', label: 'Color', icon: '🎨', description: 'Color picker value' },
    { value: 'json', label: 'JSON Data', icon: '📊', description: 'Structured data (for developers)' },
  ];

  // Category options with icons (NOTIFICATIONS REMOVED)
  const categoryOptions = [
    { value: 'general', label: 'General', icon: <Settings />, color: 'primary' },
    { value: 'payment', label: 'Payment', icon: <Payment />, color: 'success' },
    { value: 'security', label: 'Security', icon: <Security />, color: 'error' },
    { value: 'academic', label: 'Academic', icon: <School />, color: 'info' },
    { value: 'chatbot', label: 'Chatbot', icon: <Code />, color: 'secondary' },
    { value: 'telegram', label: 'Telegram', icon: <ContactMail />, color: 'info' },
    { value: 'parent_link', label: 'Parent Link', icon: <DeviceHub />, color: 'warning' },
    { value: 'support', label: 'Support', icon: <Info />, color: 'primary' },
    { value: 'system', label: 'System', icon: <DeviceHub />, color: 'secondary' },
    { value: 'contact', label: 'Contact', icon: <ContactMail />, color: 'primary' },
    { value: 'upload', label: 'Upload', icon: <CloudUpload />, color: 'success' },
  ];

  const categoryMeta = {
    all: {
      title: 'All settings',
      description: 'Review every configurable system value in one place.',
      tone: 'Use search to jump straight to the setting you want.',
    },
    general: {
      title: 'General experience',
      description: 'Branding, shared labels, and app-wide copy that shapes the overall feel.',
      tone: 'Best place for names, subtitles, and broad user-facing wording.',
    },
    payment: {
      title: 'Payments and plans',
      description: 'Billing messages, payment instructions, plan labels, and review expectations.',
      tone: 'These settings directly shape what students see before and after payment.',
    },
    security: {
      title: 'Security and device rules',
      description: 'Device-change limits, pairing windows, and other protection-focused settings.',
      tone: 'Private values here affect restrictions and security guardrails.',
    },
    academic: {
      title: 'Learning content',
      description: 'Messages and labels tied to chapter availability and academic experience.',
      tone: 'Use this for learning-state wording rather than payment or support text.',
    },
    chatbot: {
      title: 'Learning assistant',
      description: 'Chatbot availability, limits, and the study helper copy shown in the client.',
      tone: 'These settings now affect both chatbot text and real chatbot behavior.',
    },
    telegram: {
      title: 'Telegram connections',
      description: 'Bot links, support Telegram details, and parent-facing Telegram references.',
      tone: 'Keep these links accurate so parent and support flows stay trustworthy.',
    },
    parent_link: {
      title: 'Parent link journey',
      description: 'Texts and timing used when students connect a parent through Telegram.',
      tone: 'This section controls the parent-link experience more directly now.',
    },
    support: {
      title: 'Support experience',
      description: 'Support empty states, quick actions, FAQs, and help-screen messaging.',
      tone: 'Use this to make support feel clear, calm, and user-friendly.',
    },
    system: {
      title: 'System operations',
      description: 'Operational values and backend-oriented settings used by the platform itself.',
      tone: 'These are usually changed less often and should stay clean and intentional.',
    },
    contact: {
      title: 'Contact channels',
      description: 'Phone, email, WhatsApp, office hours, and other direct contact details.',
      tone: 'These values power what users can tap and contact immediately.',
    },
    upload: {
      title: 'Upload behavior',
      description: 'Upload-related configuration and storage-facing settings.',
      tone: 'Keep these aligned with how media and files are handled in production.',
    },
  };

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      const settingsData = await getCachedData(
        'settings-management',
        () => settingsApi.getAllSettings(),
        { forceRefresh, ttl: 5 * 60 * 1000 }
      );
      setSettings(Array.isArray(settingsData) ? settingsData : []);
      
    } catch (err) {
      devError('Failed to fetch settings:', err);
      setError(err.response?.data?.message || 'Failed to load settings');
      showError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, showError]);

  useEffect(() => {
    if (isAdmin()) {
      fetchSettings();
    }
  }, [isAdmin, fetchSettings]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDataTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      data_type: value,
      setting_value: '',
    }));
  };

  const resetForm = () => {
    setFormData({
      setting_key: '',
      setting_value: '',
      display_name: '',
      category: 'general',
      data_type: 'text',
      is_public: false,
      display_order: 0,
      description: '',
    });
    setIsEditing(false);
    setSelectedSetting(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.setting_key.trim() || !formData.display_name.trim() || !formData.category) {
        showError('Setting key, display name, and category are required');
        return;
      }

      // Validate setting key format
      if (!/^[a-z][a-z0-9_]*$/.test(formData.setting_key)) {
        showError('Setting key must be lowercase with underscores (e.g., payment_bank_name)');
        return;
      }

      // Validate based on data type
      let validatedValue = formData.setting_value;
      
      switch (formData.data_type) {
        case 'number':
          if (formData.setting_value && isNaN(formData.setting_value)) {
            showError('Please enter a valid number');
            return;
          }
          validatedValue = formData.setting_value ? parseFloat(formData.setting_value) : '';
          break;
        case 'boolean':
          validatedValue = formData.setting_value === 'true' || formData.setting_value === true;
          break;
        case 'email':
          if (formData.setting_value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.setting_value)) {
            showError('Please enter a valid email address');
            return;
          }
          break;
        case 'url':
          if (formData.setting_value && !/^https?:\/\/.+/.test(formData.setting_value)) {
            showError('Please enter a valid URL starting with http:// or https://');
            return;
          }
          break;
        case 'json':
          try {
            if (formData.setting_value) {
              JSON.parse(formData.setting_value);
            }
          } catch {
            showError('Invalid JSON format. Please check your JSON syntax.');
            return;
          }
          break;
        default:
          // For string and other types, no additional validation
          break;
      }

      setActionLoading(true);

      const normalizedDataType = ['text', 'email', 'url', 'password', 'color'].includes(formData.data_type)
        ? 'string'
        : formData.data_type;

      const settingData = {
        ...formData,
        data_type: normalizedDataType,
        setting_value: validatedValue,
        setting_key: formData.setting_key.toLowerCase().trim(),
      };

      await settingsApi.upsertSetting(settingData);
      showSuccess(isEditing ? 'Setting updated successfully' : 'Setting created successfully');

      setFormOpen(false);
      resetForm();
      invalidateCache('settings-management');
      await fetchSettings(true);
      
    } catch (err) {
      devError('Failed to save setting:', err);
      showError(
        getFriendlyFormError(
          err,
          'Failed to save setting',
          'A setting with that key already exists.'
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (setting) => {
    setSelectedSetting(setting);
    setIsEditing(true);
    
    setFormData({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value || '',
      display_name: setting.display_name,
      category: setting.category,
      data_type: setting.data_type || 'text',
      is_public: setting.is_public || false,
      display_order: setting.display_order || 0,
      description: setting.description || '',
    });
    
    setFormOpen(true);
  };

  const handleDelete = (setting) => {
    setSelectedSetting(setting);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSetting) return;

    try {
      setActionLoading(true);
      await settingsApi.deleteSetting(selectedSetting.setting_key);
      
      setSettings(prev => prev.filter(s => s.setting_key !== selectedSetting.setting_key));
      invalidateCache('settings-management');
      
      showSuccess(`Setting "${selectedSetting.display_name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setSelectedSetting(null);
      
    } catch (err) {
      devError('Failed to delete setting:', err);
      showError(getFriendlyFormError(err, 'Failed to delete setting'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!window.confirm('This will initialize default settings. Any existing settings will be updated. Continue?')) return;
    
    try {
      setActionLoading(true);
      await settingsApi.initializeDefaultSettings();
      showSuccess('Default settings initialized successfully');
      
      invalidateCache('settings-management');
      await fetchSettings(true);
    } catch (err) {
      devError('Failed to initialize defaults:', err);
      showError(getFriendlyFormError(err, 'Failed to initialize default settings'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSettings(true);
  };

  const categoryCounts = settings.reduce((acc, setting) => {
    acc[setting.category] = (acc[setting.category] || 0) + 1;
    return acc;
  }, {});

  const activeCategoryMeta = categoryMeta[activeTab] || categoryMeta.all;

  // Filter settings based on tab and search
  const filteredSettings = settings.filter(setting => {
    // Category filter
    if (activeTab !== 'all' && setting.category !== activeTab) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        setting.setting_key.toLowerCase().includes(query) ||
        setting.display_name.toLowerCase().includes(query) ||
        (setting.description && setting.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const handleOpenCreate = (presetCategory = null) => {
    resetForm();
    if (presetCategory && presetCategory !== 'all') {
      setFormData(prev => ({ ...prev, category: presetCategory }));
    } else if (activeTab !== 'all') {
      setFormData(prev => ({ ...prev, category: activeTab }));
    }
    setFormOpen(true);
  };

  const columns = [
    {
      field: 'setting_key',
      headerName: 'Key',
      width: 200,
      render: (value, row) => renderPrimaryCell({
        primary: row.display_name,
        secondary: value,
      }),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
      render: (value) => {
        const category = categoryOptions.find(cat => cat.value === value) || { label: value, icon: <Settings />, color: 'default' };
        return renderTableChip(category.label, {
          icon: category.icon,
          color: category.color,
        });
      },
    },
    {
      field: 'data_type',
      headerName: 'Type',
      width: 100,
      render: (value) => {
        const dataType = dataTypeOptions.find(opt => opt.value === value) || dataTypeOptions[0];
        return renderTableChip(dataType.label);
      },
    },
    {
      field: 'setting_value',
      headerName: 'Value',
      flex: 1,
      render: (value, row) => {
        if (row.data_type === 'password') {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                ••••••••
              </Typography>
            </Box>
          );
        }
        
        if (row.data_type === 'boolean') {
          return renderTableChip(value === true || value === 'true' ? 'Yes' : 'No', {
            color: value === true || value === 'true' ? 'success' : 'default',
          });
        }
        
        if (row.data_type === 'json') {
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {typeof value === 'string' ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : JSON.stringify(value).substring(0, 50) + '...'}
            </Typography>
          );
        }
        
        return (
          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
            {value || '-'}
          </Typography>
        );
      },
    },
    {
      field: 'is_public',
      headerName: 'Visibility',
      width: 100,
      render: (value) => renderTableChip(value ? 'Public' : 'Private', {
        color: value ? 'success' : 'default',
        icon: value ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />,
      }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      render: (value, row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Setting">
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
          <Tooltip title="Delete Setting">
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
        </Box>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access system settings.
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
            System Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure system-wide settings and parameters
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
            startIcon={<CheckCircle />}
            onClick={handleInitializeDefaults}
            disabled={loading || actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Reset Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenCreate()}
            disabled={loading || actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Add Setting
          </Button>
        </Stack>
      </Box>

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

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

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <FastTextField
          fullWidth
          size="small"
          placeholder="Search settings by key, name, or description..."
          value={searchQuery}
          onDebouncedChange={(v) => setSearchQuery(v)}
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {categoryOptions.map((category) => {
          const count = categoryCounts[category.value] || 0;
          const isActive = activeTab === category.value;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={category.value}>
              <Card
                onClick={() => setActiveTab(category.value)}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isActive ? 'primary.main' : 'divider',
                  boxShadow: isActive ? 4 : 0,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent sx={{ p: 2.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                        {category.icon}
                        <Typography variant="subtitle1" fontWeight={700}>
                          {category.label}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {count} setting{count === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                    {isActive ? <AutoAwesome color="primary" fontSize="small" /> : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Tabs for Categories - NOTIFICATIONS TAB REMOVED */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`All Settings (${settings.length})`} 
            value="all"
            icon={<Settings />}
            iconPosition="start"
          />
          {categoryOptions.map(category => (
            <Tab
              key={category.value}
              label={`${category.label} (${categoryCounts[category.value] || 0})`}
              value={category.value}
              icon={category.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {activeCategoryMeta.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820 }}>
              {activeCategoryMeta.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {activeCategoryMeta.tone}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Chip
              label={`${filteredSettings.length} visible`}
              color="primary"
              variant="outlined"
            />
            {activeTab !== 'all' && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleOpenCreate(activeTab)}
                disabled={loading || actionLoading}
                sx={{ borderRadius: 2 }}
              >
                Add in {categoryOptions.find(cat => cat.value === activeTab)?.label || 'Category'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Settings Table */}
      <DataTable
        showToolbar={false}
        columns={columns}
        data={filteredSettings}
        loading={loading}
        onRefresh={handleRefresh}
        title={`Settings (${filteredSettings.length})`}
        rowKey="setting_key"
        emptyMessage={
          activeTab === 'all'
            ? 'No settings match the current search.'
            : `No ${categoryOptions.find(cat => cat.value === activeTab)?.label || 'selected'} settings match the current filters.`
        }
      />

      {/* Add/Edit Setting Dialog */}
      <Dialog 
        open={formOpen} 
        onClose={() => !actionLoading && setFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Setting' : 'Add New Setting'}
            </Typography>
            <IconButton
              onClick={() => setFormOpen(false)}
              size="small"
              disabled={actionLoading}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FastTextField
                fullWidth
                label="Setting Key *"
                name="setting_key"
                value={formData.setting_key}
                onChange={handleInputChange}
                required
                disabled={isEditing || actionLoading}
                helperText="Lowercase with underscores (e.g., payment_bank_name)"
                variant="outlined"
                size="medium"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FastTextField
                fullWidth
                label="Display Name *"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                required
                helperText="User-friendly name for this setting"
                variant="outlined"
                size="medium"
                disabled={actionLoading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  label="Category *"
                  variant="outlined"
                  disabled={actionLoading}
                >
                  {categoryOptions.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {category.icon}
                        {category.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Data Type *</InputLabel>
                <Select
                  value={formData.data_type}
                  onChange={(e) => handleDataTypeChange(e.target.value)}
                  label="Data Type *"
                  variant="outlined"
                  disabled={actionLoading}
                >
                  {dataTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                        <Typography variant="h6">{option.icon}</Typography>
                        <Box>
                          <Typography variant="body2">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                Setting Value
              </Typography>
              {formData.data_type === 'boolean' ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.setting_value === true || formData.setting_value === 'true'}
                      onChange={(e) => setFormData(prev => ({ ...prev, setting_value: e.target.checked }))}
                      color="primary"
                      disabled={actionLoading}
                    />
                  }
                  label={formData.setting_value === true || formData.setting_value === 'true' ? 'Enabled (Yes)' : 'Disabled (No)'}
                />
              ) : formData.data_type === 'json' ? (
                <FastTextField
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.setting_value}
                  onChange={handleInputChange}
                  name="setting_value"
                  variant="outlined"
                  size="medium"
                  disabled={actionLoading}
                  InputProps={{ sx: { fontFamily: 'monospace' } }}
                  placeholder='{"key": "value"}'
                  helperText="Enter valid JSON data"
                />
              ) : formData.data_type === 'password' ? (
                <FastTextField
                  fullWidth
                  type="password"
                  value={formData.setting_value}
                  onChange={handleInputChange}
                  name="setting_value"
                  variant="outlined"
                  size="medium"
                  disabled={actionLoading}
                  helperText="Password will be stored securely"
                />
              ) : (
                <FastTextField
                  fullWidth
                  type={formData.data_type === 'number' ? 'number' : 'text'}
                  value={formData.setting_value}
                  onChange={handleInputChange}
                  name="setting_value"
                  variant="outlined"
                  size="medium"
                  disabled={actionLoading}
                  placeholder={`Enter ${formData.data_type} value...`}
                />
              )}
            </Grid>
            
            <Grid item xs={12}>
              <FastTextField
                fullWidth
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={2}
                variant="outlined"
                size="medium"
                disabled={actionLoading}
                placeholder="Describe what this setting does..."
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FastTextField
                fullWidth
                label="Display Order"
                name="display_order"
                type="number"
                value={formData.display_order}
                onChange={handleInputChange}
                variant="outlined"
                size="medium"
                disabled={actionLoading}
                InputProps={{ inputProps: { min: 0 } }}
                helperText="Lower numbers appear first"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    name="is_public"
                    color="primary"
                    disabled={actionLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Public Setting</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible to students and teachers
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setFormOpen(false)} 
            variant="outlined" 
            disabled={actionLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={actionLoading || !formData.setting_key.trim() || !formData.display_name.trim() || !formData.category}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Save />}
            sx={{ borderRadius: 2 }}
          >
            {actionLoading ? 'Saving...' : (isEditing ? 'Update Setting' : 'Create Setting')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Setting"
        message={`Are you sure you want to delete setting "${selectedSetting?.display_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        loading={actionLoading}
      />
    </Box>
  );
};

export default SettingsManager;
