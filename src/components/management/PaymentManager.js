import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUsers } from '../../contexts/UserContext';
import paymentsApi from '../../api/payments';
import categoriesApi from '../../api/categories';
import usersApi from '../../api/users';
import DataTable from '../common/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import FastTextField from '../common/FastTextField';
import ManagementPageHeader from '../common/ManagementPageHeader';
import ManagementSearchToolbar from '../common/ManagementSearchToolbar';
import SummaryStrip from '../common/SummaryStrip';
import DetailRow from '../common/DetailRow';
import {
  formatLabel,
  renderCurrencyCell,
  renderPrimaryCell,
  renderTableChip,
  renderTableDate,
  renderTableId,
} from '../common/tableFormatters';
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
  Divider,
} from '@mui/material';
import {
  OpenInNew,
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
  ArrowUpward,
  ArrowDownward,
  AccountBalance,
  CreditCard,
  Close,
} from '@mui/icons-material';
import { devError } from '../../utils/devLogger';

const PaymentManager = () => {
  const { isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const { getCachedData, getCacheKey, invalidateCache } = useUsers();
  
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [visiblePayments, setVisiblePayments] = useState([]);
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
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);

  const getFriendlyActionError = (error, fallback) =>
    error?.userMessage || error?.response?.data?.message || fallback;
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const closeViewDetails = () => {
    setViewDetailsOpen(false);
    setViewingPayment(null);
  };

  const closeVerifyDialog = () => {
    setVerifyDialogOpen(false);
    setSelectedPayment(null);
    setAdminNotes('');
  };

  const closeRejectDialog = () => {
    setRejectDialogOpen(false);
    setSelectedPayment(null);
    setRejectionReason('');
  };

  const getReviewPriority = (payment) => {
    const createdAt = new Date(payment?.created_at || 0).getTime() || 0;
    const statusWeight = payment?.status === 'pending'
      ? 2e13
      : payment?.status === 'verified'
        ? 1e13
        : 0;

    return statusWeight + createdAt;
  };

  // Cache keys
  const paymentsCacheKey = 'payments';
  const categoriesCacheKey = 'categories';
  const usersCacheKey = 'users';

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const paymentsData = await getCachedData(
        paymentsCacheKey,
        () => paymentsApi.getAllPayments(),
        { forceRefresh }
      );
      
      const categoriesData = await getCachedData(
        categoriesCacheKey,
        () => categoriesApi.getAllCategories(),
        { forceRefresh }
      );
      
      const usersData = await getCachedData(
        usersCacheKey,
        () => usersApi.getAllUsers(),
        { forceRefresh }
      );
      
      const paymentsList = paymentsData || [];
      const enrichedPayments = paymentsList.map((payment) => ({
        ...payment,
        review_priority: getReviewPriority(payment),
      }));
      const sortedPayments = [...enrichedPayments].sort((a, b) => b.review_priority - a.review_priority);

      setPayments(enrichedPayments);
      setFilteredPayments(sortedPayments);
      setVisiblePayments(sortedPayments.slice(0, 10));
      setCategories(categoriesData || []);
      setUsers(usersData || []);
      
      // Calculate stats
      const total = enrichedPayments.length;
      const pending = enrichedPayments.filter(p => p.status === 'pending').length;
      const verified = enrichedPayments.filter(p => p.status === 'verified').length;
      const rejected = enrichedPayments.filter(p => p.status === 'rejected').length;
      const totalAmount = enrichedPayments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      setStats({ total, pending, verified, rejected, totalAmount });
      
    } catch (err) {
      devError('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load payments');
      showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [getCachedData, showError]);

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
        p.account_holder_name?.toLowerCase().includes(searchLower)
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
    
    const prioritized = filtered
      .map((payment) => ({
        ...payment,
        review_priority: getReviewPriority(payment),
      }))
      .sort((a, b) => b.review_priority - a.review_priority);

    setFilteredPayments(prioritized);
    setVisiblePayments(prioritized.slice(0, 10));
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
      setLoading(true);
      await paymentsApi.verifyPayment(selectedPayment.id, adminNotes);
      showSuccess('Payment verified successfully');
      
      // Invalidate caches
      invalidateCache(paymentsCacheKey);
      invalidateCache(/^users/);
      
      // Update local state
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: 'verified', admin_notes: adminNotes, verified_at: new Date().toISOString() }
          : p
      ));
      
      closeVerifyDialog();
      
    } catch (err) {
      devError('Failed to verify payment:', err);
      showError(getFriendlyActionError(err, 'Failed to verify payment'));
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;

    try {
      setLoading(true);
      await paymentsApi.rejectPayment(selectedPayment.id, rejectionReason);
      showSuccess('Payment rejected successfully');
      
      // Invalidate caches
      invalidateCache(paymentsCacheKey);
      invalidateCache(/^users/);
      
      // Update local state
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: 'rejected', rejection_reason: rejectionReason }
          : p
      ));
      
      closeRejectDialog();
      
    } catch (err) {
      devError('Failed to reject payment:', err);
      showError(getFriendlyActionError(err, 'Failed to reject payment'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payment) => {
    setViewingPayment(payment);
    setViewDetailsOpen(true);
  };

  const handleViewProof = (payment) => {
    if (payment.proof_image_path) {
      window.open(payment.proof_image_path, '_blank');
    } else {
      showError('No proof image available');
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const buildSpreadsheetHtml = (rows) => {
    const headers = Object.keys(rows[0] || {});
    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const headerHtml = headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join('');

    const rowHtml = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(row[header])}</td>`)
            .join('')}</tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=UTF-8" />
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d0d7de; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-weight: 700; }
      td { mso-number-format: "\\@"; }
    </style>
  </head>
  <body>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </body>
</html>`;
  };

  const downloadBlob = async (blob, defaultFileName) => {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: 'Excel-compatible spreadsheet',
            accept: {
              'application/vnd.ms-excel': ['.xls'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (visiblePayments.length === 0) {
      showError('There are no visible payments to export right now.');
      return;
    }

    const exportData = visiblePayments.map(payment => ({
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

    const html = buildSpreadsheetHtml(exportData);
    const blob = new Blob(['\ufeff', html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const today = new Date().toISOString().split('T')[0];

    try {
      await downloadBlob(blob, `payments_export_${today}.xls`);
      showSuccess(`Exported ${exportData.length} visible payments successfully`);
    } catch (err) {
      if (err?.name === 'AbortError') {
        return;
      }

      devError('Failed to export payments:', err);
      showError('Failed to export payments');
    }
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
        return <Payment fontSize="small" />;
      default:
        return <Payment fontSize="small" />;
    }
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      render: (value) => renderTableId(value),
    },
    {
      field: 'user_info',
      headerName: 'User',
      flex: 1,
      render: (value, row) => renderPrimaryCell({
        primary: row.user_username || 'Unknown User',
        secondary: row.user_id ? `User ID: ${row.user_id}` : null,
      }),
    },
    {
      field: 'review_priority',
      headerName: 'Queue',
      width: 140,
      render: (value, row) => renderPrimaryCell({
        primary: row.status === 'pending' ? 'Pending first' : row.status === 'verified' ? 'Verified' : 'Rejected',
        secondary: `Created ${formatDate(row.created_at)}`,
        primaryWeight: 700,
      }),
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 120,
      render: (value) => renderTableChip(value || 'Not Set', {
        color: 'primary',
        icon: <CategoryIcon fontSize="small" />,
      }),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      render: (value) => renderCurrencyCell(value, { color: 'success.main' }),
    },
    {
      field: 'payment_type',
      headerName: 'Payment Type',
      width: 100,
      render: (value) => renderTableChip(formatLabel(value), { color: 'secondary' }),
    },
    {
      field: 'payment_method',
      headerName: 'Payment Method',
      width: 120,
      render: (value) => renderTableChip(formatLabel(value), {
        icon: getPaymentMethodIcon(value),
      }),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      render: (value) => renderTableChip(
        value === 'verified' ? 'Verified' : value === 'pending' ? 'Pending' : 'Rejected',
        {
          color: value === 'verified' ? 'success' : value === 'pending' ? 'warning' : 'error',
          icon: value === 'verified' ? <CheckCircle fontSize="small" /> :
            value === 'pending' ? <AccessTime fontSize="small" /> :
              <Cancel fontSize="small" />,
        }
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 130,
      render: (value) => renderTableDate(value, { dateOnly: true }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      render: (value, row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(row)}
              color="info"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
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
          
          {row.proof_image_path && (
            <Tooltip title="View Full Screen Proof">
              <IconButton
                size="small"
                onClick={() => handleViewProof(row)}
                color="secondary"
              >
                <OpenInNew fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
      <Box sx={{ mb: 4 }}>
        <ManagementPageHeader
          title="Payment Management"
          subtitle="Verify and manage user payment submissions"
          sx={{ mb: 2 }}
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
              startIcon={<Download />}
              onClick={handleExport}
              disabled={filteredPayments.length === 0 || loading}
              sx={{ borderRadius: 2 }}
            >
              Export
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

        <SummaryStrip
          items={[
            { label: 'Total Payments', value: stats.total, color: 'primary' },
            { label: 'Pending', value: stats.pending, color: 'warning' },
            { label: 'Verified', value: stats.verified, color: 'success' },
            { label: 'Rejected', value: stats.rejected, color: 'error' },
            { label: 'Verified Revenue', value: formatAmount(stats.totalAmount), color: 'info' },
          ]}
        />
      </Box>

      <ManagementSearchToolbar
        value={filters.search}
        onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        placeholder="Search payments by user, category, account holder, or payment method..."
      />

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

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />}

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Filter Payments
          </Typography>
          
          <Grid container spacing={2}>
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
        showToolbar={false}
        columns={columns}
        data={filteredPayments}
        loading={loading}
        onRefresh={handleRefresh}
      title="Payments"
      rowKey="id"
      searchable={false}
      onVisibleRowsChange={setVisiblePayments}
      defaultOrderBy="review_priority"
      defaultOrder="desc"
    />

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsOpen}
        onClose={closeViewDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Payment />
              <Typography variant="h6" fontWeight="bold">
                Payment Details #{viewingPayment?.id}
              </Typography>
            </Box>
            <IconButton onClick={closeViewDetails} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {viewingPayment && (
            <Grid container spacing={3}>
              {/* Payment Information */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Payment Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <DetailRow
                      label="Amount"
                      value={formatAmount(viewingPayment.amount)}
                      valueColor="success.main"
                    />
                    <DetailRow
                      label="Type"
                      value={formatLabel(viewingPayment.payment_type)}
                    />
                    <DetailRow
                      label="Method"
                      value={formatLabel(viewingPayment.payment_method) || 'Unknown'}
                    />
                    <DetailRow
                      label="Status"
                      value={formatLabel(viewingPayment.status)}
                    />
                    <DetailRow
                      label="Submitted"
                      value={formatDate(viewingPayment.created_at)}
                    />
                    {viewingPayment.verified_at && (
                      <DetailRow
                        label="Verified"
                        value={formatDate(viewingPayment.verified_at)}
                      />
                    )}
                  </Box>
                </Card>
              </Grid>
              
              {/* User Information */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    User Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {viewingPayment.user_username?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {viewingPayment.user_username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          User ID: {viewingPayment.user_id}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <DetailRow label="Category" value={viewingPayment.category_name || '-'} />
                    <DetailRow label="Account Holder" value={viewingPayment.account_holder_name || '-'} />
                  </Box>
                </Card>
              </Grid>
              
              {/* Payment Proof */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Payment Proof
                  </Typography>
                  {viewingPayment.proof_image_path ? (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box
                        component="img"
                        src={viewingPayment.proof_image_path}
                        alt="Payment Proof"
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 400,
                          objectFit: 'contain',
                          borderRadius: 1,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<OpenInNew />}
                        onClick={() => handleViewProof(viewingPayment)}
                      >
                        Open in New Tab
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No proof image available
                    </Typography>
                  )}
                </Card>
              </Grid>
              
              {/* Admin Notes */}
              {viewingPayment.admin_notes && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Admin Notes
                    </Typography>
                    <Typography variant="body2">{viewingPayment.admin_notes}</Typography>
                  </Card>
                </Grid>
              )}
              
              {/* Rejection Reason */}
              {viewingPayment.rejection_reason && (
                <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: 'error.main' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="error.main">
                      Rejection Reason
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {viewingPayment.rejection_reason}
                    </Typography>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            variant="outlined"
            onClick={closeViewDetails}
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
          {viewingPayment?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  closeViewDetails();
                  setSelectedPayment(viewingPayment);
                  setVerifyDialogOpen(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Verify Payment
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  closeViewDetails();
                  setSelectedPayment(viewingPayment);
                  setRejectDialogOpen(true);
                }}
                sx={{ borderRadius: 2 }}
              >
                Reject Payment
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Verify Payment Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onClose={() => !loading && closeVerifyDialog()}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Verify Payment
            </Typography>
            <IconButton onClick={closeVerifyDialog} size="small" disabled={loading}>
              <Close />
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
              </Grid>
              
              <FastTextField
                fullWidth
                label="Admin Notes (Optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="Add any notes about this payment verification..."
                variant="outlined"
                disabled={loading}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={closeVerifyDialog}
            variant="outlined"
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyPayment}
            variant="contained"
            color="success"
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Verifying...' : 'Verify Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => !loading && closeRejectDialog()}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Reject Payment
            </Typography>
            <IconButton onClick={closeRejectDialog} size="small" disabled={loading}>
              <Close />
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
              
              <FastTextField
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
                disabled={loading}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={closeRejectDialog}
            variant="outlined"
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectPayment}
            variant="contained"
            color="error"
            disabled={loading || !rejectionReason.trim()}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Rejecting...' : 'Reject Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentManager;
