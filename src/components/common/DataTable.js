
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  Box,
  IconButton,
  Chip,
  CircularProgress,
  Typography,
  Menu,
  MenuItem,
  Checkbox,
  Tooltip,
  Fade,
  Alert,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Refresh,
  FilterList,
  ArrowUpward,
  ArrowDownward,
  Clear,
  Download,
  Upload,
  SelectAll,
  DeselectAll,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';

// Virtual scrolling implementation for large datasets
const VirtualTableRow = ({ row, columns, onRowClick, actions, renderCell, rowKey, selected, onSelect }) => {
  return (
    <TableRow
      hover
      selected={selected}
      onClick={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect(row[rowKey]);
        } else if (onRowClick) {
          onRowClick(row);
        }
      }}
      sx={{
        cursor: onRowClick || onSelect ? 'pointer' : 'default',
        '&:hover': { bgcolor: (onRowClick || onSelect) ? 'action.hover' : 'transparent' },
        transition: 'all 0.2s',
      }}
    >
      {onSelect && (
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(row[rowKey]);
            }}
          />
        </TableCell>
      )}
      
      {columns.map((column) => (
        <TableCell
          key={column.field}
          align={column.align || 'left'}
          sx={{
            maxWidth: column.maxWidth || 'auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            py: 1.5,
          }}
        >
          {renderCell(row, column)}
        </TableCell>
      ))}
    </TableRow>
  );
};

const DataTable = ({
  columns,
  data,
  loading,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  onSelect,
  selectedRows = [],
  actions = true, // Default to true but can be overridden
  searchable = true,
  pagination = true,
  title,
  onRefresh,
  rowKey = 'id',
  tableId,
  selectable = false,
  bulkActions = false,
  sx,
  onBulkAction,
  ...props
}) => {
  // Load saved state from localStorage if tableId provided
  const loadSavedState = (key, defaultValue) => {
    if (!tableId) return defaultValue;
    try {
      const saved = localStorage.getItem(`datatable_${tableId}_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const saveState = (key, value) => {
    if (!tableId) return;
    try {
      localStorage.setItem(`datatable_${tableId}_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving table state:', error);
    }
  };

  const [page, setPage] = useState(() => loadSavedState('page', 0));
  const [rowsPerPage, setRowsPerPage] = useState(() => loadSavedState('rowsPerPage', 10));
  const [search, setSearch] = useState(() => loadSavedState('search', ''));
  const [order, setOrder] = useState(() => loadSavedState('order', 'asc'));
  const [orderBy, setOrderBy] = useState(() => loadSavedState('orderBy', columns[0]?.field || ''));
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  // Save state changes
  useEffect(() => {
    if (tableId) {
      saveState('page', page);
    }
  }, [page, tableId]);

  useEffect(() => {
    if (tableId) {
      saveState('rowsPerPage', rowsPerPage);
    }
  }, [rowsPerPage, tableId]);

  useEffect(() => {
    if (tableId) {
      saveState('search', search);
    }
  }, [search, tableId]);

  useEffect(() => {
    if (tableId) {
      saveState('order', order);
    }
  }, [order, tableId]);

  useEffect(() => {
    if (tableId && orderBy) {
      saveState('orderBy', orderBy);
    }
  }, [orderBy, tableId]);

  useEffect(() => {
    if (columns.length > 0 && !orderBy) {
      setOrderBy(columns[0].field);
    }
  }, [columns, orderBy]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleBulkMenuOpen = (event) => {
    setBulkMenuAnchor(event.currentTarget);
  };

  const handleBulkMenuClose = () => {
    setBulkMenuAnchor(null);
  };

  const handleAction = (action) => {
    if (!selectedRow) return;
    
    switch (action) {
      case 'view':
        onView?.(selectedRow);
        break;
      case 'edit':
        onEdit?.(selectedRow);
        break;
      case 'delete':
        onDelete?.(selectedRow);
        break;
      default:
        break;
    }
    handleMenuClose();
  };

  const handleBulkAction = (action) => {
    if (onBulkAction) {
      onBulkAction(action, selectedRows);
    }
    handleBulkMenuClose();
  };

  const handleSelectAll = () => {
    if (onSelect) {
      const allIds = filteredData().slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(row => row[rowKey]);
      onSelect(allIds);
    }
  };

  const handleDeselectAll = () => {
    if (onSelect) {
      onSelect([]);
    }
  };

  const filteredData = useMemo(() => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        if (col.searchable === false) return false;
        
        const value = row[col.field];
        if (value == null) return false;
        
        // Check if value is an object with toString method
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return stringValue.toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, columns]);

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue == null || bValue == null) return 0;
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, orderBy, order]);

  const paginatedData = pagination
    ? sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : sortedData;

  const totalSelected = selectedRows.length;
  const pageSelected = paginatedData.filter(row => 
    selectedRows.includes(row[rowKey])
  ).length;
  const allSelected = pageSelected > 0 && pageSelected === paginatedData.length;

  const renderCell = (row, column) => {
    const value = row[column.field];
    
    if (column.render) {
      return column.render(value, row, {
        expanded: expandedRows[row[rowKey]],
        toggleExpand: () => {
          setExpandedRows(prev => ({
            ...prev,
            [row[rowKey]]: !prev[row[rowKey]]
          }));
        }
      });
    }
    
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    if (column.type === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (column.type === 'status') {
      const color = value === 'active' ? 'success' :
                   value === 'pending' ? 'warning' :
                   value === 'inactive' ? 'error' : 'default';
      return (
        <Chip
          label={String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          size="small"
          color={color}
          variant="outlined"
        />
      );
    }
    
    return value || '-';
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const clearSearch = () => {
    setSearch('');
    setPage(0);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Export data:', sortedData);
    // This could trigger a CSV download or open an export dialog
  };

  const handleRowExpand = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  return (
    <Paper sx={{ 
      width: '100%', 
      overflow: 'hidden', 
      borderRadius: 2,
      ...sx 
    }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            {title && (
              <Typography variant="h6" fontWeight="bold">
                {title} ({filteredData.length})
              </Typography>
            )}
            {search && (
              <Typography variant="caption" color="text.secondary">
                Showing {filteredData.length} of {data.length} records for "{search}"
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="Search..."
                value={search}
                onChange={handleSearchChange}
                sx={{ width: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={clearSearch}
                        sx={{ p: 0 }}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {onRefresh && (
                <Tooltip title="Refresh">
                  <span> {/* Add span wrapper for disabled IconButton */}
                    <IconButton 
                      onClick={handleRefresh} 
                      size="small"
                      disabled={loading}
                    >
                      <Refresh />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              
              <Tooltip title="Export">
                <span> {/* Add span wrapper for disabled IconButton */}
                  <IconButton 
                    onClick={handleExport} 
                    size="small"
                    disabled={loading || sortedData.length === 0}
                  >
                    <Download />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>
        
        {/* Bulk Actions Bar */}
        {selectable && totalSelected > 0 && (
          <Fade in={totalSelected > 0}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'primary.light', 
              borderRadius: 1,
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="white">
                  {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
                </Typography>
                <Button
                  size="small"
                  onClick={handleDeselectAll}
                  sx={{ color: 'white' }}
                >
                  Clear Selection
                </Button>
              </Box>
              
              {bulkActions && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    onClick={handleBulkMenuOpen}
                    endIcon={<KeyboardArrowDown />}
                  >
                    Bulk Actions
                  </Button>
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <LinearProgress sx={{ width: '100%' }} />
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 60 }}>
                  <Checkbox
                    indeterminate={pageSelected > 0 && !allSelected}
                    checked={allSelected}
                    onChange={allSelected ? handleDeselectAll : handleSelectAll}
                  />
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  align={column.align || 'left'}
                  sortDirection={orderBy === column.field ? order : false}
                  sx={{
                    fontWeight: 'bold',
                    bgcolor: 'grey.50',
                    whiteSpace: 'nowrap',
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : 'asc'}
                      onClick={() => handleRequestSort(column.field)}
                      IconComponent={order === 'asc' ? ArrowUpward : ArrowDownward}
                    >
                      {column.headerName}
                    </TableSortLabel>
                  ) : (
                    column.headerName
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading && data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  align="center" 
                  sx={{ py: 8 }}
                >
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  align="center" 
                  sx={{ py: 8 }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No records found
                    </Typography>
                    {search && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Try adjusting your search criteria
                      </Typography>
                    )}
                    {!loading && data.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No data available. Create your first record.
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <VirtualTableRow
                  key={row[rowKey]}
                  row={row}
                  columns={columns}
                  onRowClick={onRowClick}
                  actions={actions}
                  renderCell={renderCell}
                  rowKey={rowKey}
                  selected={selectedRows.includes(row[rowKey])}
                  onSelect={onSelect}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: 1, borderColor: 'divider' }}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      )}

      {/* Action Menu */}
      {actions && (onView || onEdit || onDelete) && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {onView && (
            <MenuItem onClick={() => handleAction('view')}>
              <Visibility fontSize="small" sx={{ mr: 1 }} />
              View Details
            </MenuItem>
          )}
          {onEdit && (
            <MenuItem onClick={() => handleAction('edit')}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          )}
        </Menu>
      )}

      {/* Bulk Actions Menu */}
      {bulkActions && (
        <Menu
          anchorEl={bulkMenuAnchor}
          open={Boolean(bulkMenuAnchor)}
          onClose={handleBulkMenuClose}
        >
          <MenuItem onClick={() => handleBulkAction('export')}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            Export Selected
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('delete')} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Selected
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('update')}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Update Selected
          </MenuItem>
        </Menu>
      )}
    </Paper>
  );
};

export default DataTable;
