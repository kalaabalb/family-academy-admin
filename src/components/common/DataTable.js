import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  Checkbox,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Clear,
  Download,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

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
  searchable = true,
  pagination = true,
  title,
  onRefresh,
  rowKey = 'id',
  selectable = false,
  bulkActions = false,
  sx,
  onBulkAction,
  ...props
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState(columns[0]?.field || '');

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

  const handleSelectAll = () => {
    if (onSelect) {
      const allIds = filteredData().slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(row => row[rowKey]);
      
      if (selectedRows.length === allIds.length) {
        onSelect([]);
      } else {
        onSelect(allIds);
      }
    }
  };

  const handleSelect = (id) => {
    if (onSelect) {
      const newSelected = selectedRows.includes(id)
        ? selectedRows.filter(rowId => rowId !== id)
        : [...selectedRows, id];
      onSelect(newSelected);
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
        
        return String(value).toLowerCase().includes(searchLower);
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

  const renderCell = (row, column) => {
    const value = row[column.field];
    
    if (column.render) {
      return column.render(value, row);
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

  const renderActions = (row) => {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {onView && (
          <Tooltip title="View">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(row);
                }}
                color="info"
                disabled={loading}
                sx={{
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip title="Edit">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
                color="primary"
                disabled={loading}
                sx={{
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete">
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row);
                }}
                color="error"
                disabled={loading}
                sx={{
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, ...sx }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          {title && (
            <Typography variant="h6" fontWeight="bold">
              {title} ({filteredData.length})
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
          
          {onRefresh && (
            <Tooltip title="Refresh">
              <span>
                <IconButton 
                  onClick={onRefresh} 
                  size="small"
                  disabled={loading}
                >
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Bulk Actions Bar */}
      {selectable && selectedRows.length > 0 && (
        <Box sx={{ 
          p: 1.5, 
          bgcolor: 'primary.light', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Typography variant="body2" color="white">
            {selectedRows.length} item(s) selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={() => onSelect([])}
            >
              Clear
            </Button>
            {bulkActions && onBulkAction && (
              <Button
                size="small"
                variant="contained"
                onClick={() => onBulkAction('export', selectedRows)}
              >
                Export
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ width: '100%' }} />}

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 60 }}>
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedData.length}
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    disabled={loading || paginatedData.length === 0}
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
              
              {/* Actions Column Header */}
              {(onView || onEdit || onDelete) && (
                <TableCell 
                  align="center"
                  sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading && data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + ((onView || onEdit || onDelete) ? 1 : 0)} 
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
                  colSpan={columns.length + (selectable ? 1 : 0) + ((onView || onEdit || onDelete) ? 1 : 0)} 
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
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const isSelected = selectedRows.includes(row[rowKey]);
                
                return (
                  <TableRow
                    key={row[rowKey]}
                    hover
                    selected={isSelected}
                    onClick={(e) => {
                      if (selectable) {
                        handleSelect(row[rowKey]);
                      } else if (onRowClick) {
                        onRowClick(row);
                      }
                    }}
                    sx={{
                      cursor: onRowClick || selectable ? 'pointer' : 'default',
                      opacity: loading ? 0.7 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(row[rowKey])}
                          onClick={(e) => e.stopPropagation()}
                          disabled={loading}
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
                    
                    {/* Actions Column */}
                    {(onView || onEdit || onDelete) && (
                      <TableCell align="center">
                        {renderActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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
        />
      )}
    </Paper>
  );
};

export default DataTable;