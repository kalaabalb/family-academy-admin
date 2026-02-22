import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import paymentsApi from '../../api/payments';
import categoriesApi from '../../api/categories';
import usersApi from '../../api/users';
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
  Stack,
  Avatar,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Cancel,
  Visibility,
  Download,
  FilterList,
  Payment,
  Person,
  Category as CategoryIcon,
  AccessTime,
  MonetizationOn,
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  AttachMoney,
  AccountBalance,
  CreditCard,
  CloudUpload,
  PersonOutline,
} from '@mui/icons-material';

const PaymentManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    totalAmount: 0,
  });
  
  const [filters, setFilters] = useState({
    status: '',
    category_id: '',
    user_id: '',
    payment_type: '',
    search: '',
    date_from: '',
    date_to: '',
  });
  
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch payments
      const paymentsRes = await paymentsApi.getAllPayments();
      const paymentsData = paymentsRes.data.data || [];
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      
      // Calculate stats
      const total = paymentsData.length;
      const pending = paymentsData.filter(p => p.status === 'pending').length;
      const verified = paymentsData.filter(p => p.status === 'verified').length;
      const rejected = paymentsData.filter(p => p.status === 'rejected').length;
      const totalAmount = paymentsData
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      setStats({ total, pending, verified, rejected, totalAmount });
      
      // Fetch categories for filter
      const categoriesRes = await categoriesApi.getAllCategories();
      setCategories(categoriesRes.data.data || []);
      
      // Fetch users for filter
      const usersRes = await usersApi.getAllUsers();
      setUsers(usersRes.data.data || []);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errMsg = err.response?.data?.message || 'Failed to load payments';
      setError(errMsg);
      showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  useEffect(() => {
    applyFilters();
  }, [filters, payments]);

  const applyFilters = () => {
    let filtered = [...payments];
    
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    if (filters.category_id) {
      filtered = filtered.filter(p => p.category_id === parseInt(filters.category_id));
    }
    
    if (filters.user_id) {
      filtered = filtered.filter(p => p.user_id === parseInt(filters.user_id));
    }
    
    if (filters.payment_type) {
      filtered = filtered.filter(p => p.payment_type === filters.payment_type);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.user_username?.toLowerCase().includes(searchLower) ||
        p.category_name?.toLowerCase().includes(searchLower) ||
        p.payment_method?.toLowerCase().includes(searchLower) ||
        p.account_holder_name?.toLowerCase().includes(searchLower) ||
        p.admin_notes?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      filtered = filtered.filter(p => new Date(p.created_at) >= fromDate);
    }
    
    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.created_at) <= toDate);
    }
    
    setFilteredPayments(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      category_id: '',
      user_id: '',
      payment_type: '',
      search: '',
      date_from: '',
      date_to: '',
    });
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;

    try {
      await paymentsApi.verifyPayment(selectedPayment.id, adminNotes);
      showSuccess('Payment verified successfully');
      
      // Update payment status locally
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: 'verified', admin_notes: adminNotes, verified_at: new Date().toISOString() }
          : p
      ));
      
      setVerifyDialogOpen(false);
      setSelectedPayment(null);
      setAdminNotes('');
      
    } catch (err) {
      console.error('Failed to verify payment:', err);
      const errMsg = err.response?.data?.message || 'Failed to verify payment';
      showError(errMsg);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;

    try {
      await paymentsApi.rejectPayment(selectedPayment.id, rejectionReason);
      showSuccess('Payment rejected successfully');
      
      // Update payment status locally
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: 'rejected', rejection_reason: rejectionReason }
          : p
      ));
      
      setRejectDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
      
    } catch (err) {
      console.error('Failed to reject payment:', err);
      const errMsg = err.response?.data?.message || 'Failed to reject payment';
      showError(errMsg);
    }
  };

  const handleViewProof = (payment) => {
    if (payment.proof_image_path) {
      window.open(payment.proof_image_path, '_blank');
    } else {
      showError('No proof image available');
    }
  };

  const handleExport = () => {
    // Prepare data for export
    const exportData = filteredPayments.map(payment => ({
      ID: payment.id,
      User: payment.user_username,
      Category: payment.category_name,
      Amount: `Birr ${parseFloat(payment.amount || 0).toFixed(2)}`,
      Type: payment.payment_type,
      Method: payment.payment_method,
      'Account Holder': payment.account_holder_name || '',
      Status: payment.status,
      'Submitted At': new Date(payment.created_at).toLocaleString(),
      'Verified At': payment.verified_at ? new Date(payment.verified_at).toLocaleString() : '',
      'Admin Notes': payment.admin_notes || '',
      'Rejection Reason': payment.rejection_reason || '',
    }));
    
    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess(`Exported ${exportData.length} payments successfully`);
  };

  const formatAmount = (amount) => {
    return `Birr ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'bank_transfer':
        return <AccountBalance fontSize="small" />;
      case 'credit_card':
        return <CreditCard fontSize="small" />;
      case 'mobile_money':
        return <MonetizationOn fontSize="small" />;
      default:
        return <AttachMoney fontSize="small" />;
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => (
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          #{value}
        </Typography>
      ),
    },
    {
      field: 'user_info',
      headerName: 'User',
      flex: 1,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
            {row.user_username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.user_username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {row.user_id}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 120,
      render: (value) => (
        <Chip
          label={value}
          size="small"
          color="primary"
          variant="outlined"
          icon={<CategoryIcon fontSize="small" />}
        />
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      render: (value) => (
        <Typography variant="body2" fontWeight="bold" color="success.main">
          {formatAmount(value)}
        </Typography>
      ),
    },
    {
      field: 'payment_type',
      headerName: 'Type',
      width: 100,
      render: (value) => (
        <Chip
          label={value.replace('_', ' ')}
          size="small"
          color="secondary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'payment_method',
      headerName: 'Method',
      width: 120,
      render: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getPaymentMethodIcon(value)}
          <Typography variant="body2">
            {value?.replace('_', ' ') || 'Unknown'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'account_holder_name',
      headerName: 'Account Holder',
      width: 150,
      render: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PersonOutline fontSize="small" color="action" />
          <Typography variant="body2">
            {value || row.account_holder_name || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => (
        <Chip
          label={value === 'verified' ? 'Verified' : value === 'pending' ? 'Pending' : 'Rejected'}
          size="small"
          color={value === 'verified' ? 'success' : value === 'pending' ? 'warning' : 'error'}
          icon={value === 'verified' ? <CheckCircle fontSize="small" /> : 
                value === 'pending' ? <AccessTime fontSize="small" /> : 
                <Cancel fontSize="small" />}
          variant="outlined"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Submitted',
      width: 130,
      render: (value) => (
        <Typography variant="caption" color="text.secondary">
          {formatDate(value)}
        </Typography>
      ),
    },
    {
      field: 'verified_at',
      headerName: 'Verified',
      width: 130,
      render: (value, row) => (
        row.status === 'verified' ? (
          <Typography variant="caption" color="text.secondary">
            {formatDate(value)}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Pending
          </Typography>
        )
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      render: (value, row) => (
        <Stack direction="row" spacing={0.5}>
          {row.status === 'pending' && (
            <>
              <Tooltip title="Verify Payment">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedPayment(row);
                    setVerifyDialogOpen(true);
                  }}
                  color="success"
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Payment">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedPayment(row);
                    setRejectDialogOpen(true);
                  }}
                  color="error"
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="View Proof">
            <span> {/* Add span wrapper for disabled state */}
              <IconButton
                size="small"
                onClick={() => handleViewProof(row)}
                color="info"
                disabled={!row.proof_image_path}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Access Denied - Only administrators can access payment management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Payment Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verify and manage user payment submissions
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
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
              startIcon={<Download />}
              onClick={handleExport}
              disabled={filteredPayments.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchData}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Payments
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 2, height: '100%', borderColor: 'warning.light' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 2, height: '100%', borderColor: 'success.light' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Verified
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.verified}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 2, height: '100%', borderColor: 'error.light' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Rejected
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {stats.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 2, height: '100%', borderColor: 'info.light' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Revenue
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {formatAmount(stats.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError('')}
        >
          {error}
          <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Payments
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                size="small"
                placeholder="Search by user, category, method, account holder..."
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
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
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select
                  name="user_id"
                  value={filters.user_id}
                  onChange={handleFilterChange}
                  label="User"
                >
                  <MenuItem value="">All Users</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  name="payment_type"
                  value={filters.payment_type}
                  onChange={handleFilterChange}
                  label="Payment Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="first_time">First Time</MenuItem>
                  <MenuItem value="repayment">Repayment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="From Date"
                name="date_from"
                type="date"
                value={filters.date_from}
                onChange={handleFilterChange}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="To Date"
                name="date_to"
                type="date"
                value={filters.date_to}
                onChange={handleFilterChange}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  sx={{ borderRadius: 2 }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="contained"
                  onClick={applyFilters}
                  sx={{ borderRadius: 2 }}
                >
                  Apply Filters
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        onRefresh={fetchData}
        title={`Payments`}
        tableId="payments-table"
        searchable={false} // We have our own search in filters
        pagination={true}
        rowKey="id"
      />

      {/* Verify Payment Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Verify Payment
            </Typography>
            <IconButton onClick={() => setVerifyDialogOpen(false)} size="small">
              <Cancel />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedPayment && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedPayment.user_username}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="success.main">
                    {formatAmount(selectedPayment.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.category_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.payment_type?.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Account Holder
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedPayment.account_holder_name || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    startIcon={<Visibility />}
                    onClick={() => handleViewProof(selectedPayment)}
                    sx={{ borderRadius: 2 }}
                  >
                    View Payment Proof
                  </Button>
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Admin Notes (Optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="Add any notes about this payment verification..."
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setVerifyDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyPayment}
            variant="contained"
            color="success"
            sx={{ borderRadius: 2 }}
          >
            Verify Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Reject Payment
            </Typography>
            <IconButton onClick={() => setRejectDialogOpen(false)} size="small">
              <Cancel />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedPayment && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                  Are you sure you want to reject this payment? The user will be notified and will need to submit a new payment.
                </Typography>
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedPayment.user_username}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatAmount(selectedPayment.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Account Holder
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedPayment.account_holder_name || 'Not specified'}
                  </Typography>
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Rejection Reason *"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                multiline
                rows={3}
                required
                placeholder="Explain why this payment is being rejected..."
                variant="outlined"
                error={!rejectionReason.trim()}
                helperText={!rejectionReason.trim() ? "Rejection reason is required" : ""}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectPayment}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
            sx={{ borderRadius: 2 }}
          >
            Reject Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date().toLocaleString()} • 
          Showing {filteredPayments.length} of {payments.length} payments
        </Typography>
      </Box>
    </Box>
  );
};

export default PaymentManager;