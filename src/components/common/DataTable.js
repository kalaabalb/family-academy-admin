import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Button,
  useTheme,
  alpha,
  useMediaQuery,
} from '@mui/material';
import FastTextField from './FastTextField';
import { TrainLoadingBar } from './Loading';
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
  showToolbar = true,
  rowKey = 'id',
  selectable = false,
  bulkActions = false,
  showInlineLoadingBar = false,
  emptyMessage = 'No records found',
  sx,
  onBulkAction,
  onVisibleRowsChange,
  defaultOrder = 'asc',
  defaultOrderBy,
  ...props
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const headerBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.text.primary, 0.08)
    : 'rgba(0, 0, 0, 0.02)';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState(defaultOrder);
  const [orderBy, setOrderBy] = useState(defaultOrderBy || columns[0]?.field || '');
  const tableContainerRef = useRef(null);
  const lastStableDataRef = useRef(Array.isArray(data) ? data : []);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

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
      const allIds = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
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

  useEffect(() => {
    if (!loading) {
      lastStableDataRef.current = Array.isArray(data) ? data : [];
    }
  }, [data, loading]);

  const sourceData = useMemo(() => {
    const currentData = Array.isArray(data) ? data : [];
    if (loading && currentData.length === 0 && lastStableDataRef.current.length > 0) {
      return lastStableDataRef.current;
    }
    return currentData;
  }, [data, loading]);

  const filteredData = useMemo(() => {
    if (!search) return sourceData;
    
    const searchLower = search.toLowerCase();
    return sourceData.filter((row) =>
      columns.some((col) => {
        if (col.searchable === false) return false;
        
        const value = row[col.field];
        if (value == null) return false;
        
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [sourceData, search, columns]);

  const getSortValue = (row, column) => {
    if (typeof column?.sortValue === 'function') {
      return column.sortValue(row);
    }

    if (column?.sortField) {
      return row?.[column.sortField];
    }

    return row?.[column?.field];
  };

  const compareValues = (aValue, bValue, column) => {
    const aEmpty = aValue === null || aValue === undefined || aValue === '';
    const bEmpty = bValue === null || bValue === undefined || bValue === '';

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const aDateLike = column?.type === 'date' || column?.type === 'datetime';
    const bDateLike = column?.type === 'date' || column?.type === 'datetime';

    if (aDateLike || bDateLike) {
      const aTime = new Date(aValue).getTime();
      const bTime = new Date(bValue).getTime();
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return aTime - bTime;
      }
    }

    const aNumber = typeof aValue === 'number' ? aValue : Number(aValue);
    const bNumber = typeof bValue === 'number' ? bValue : Number(bValue);
    const aIsNumeric = Number.isFinite(aNumber) && String(aValue).trim() !== '';
    const bIsNumeric = Number.isFinite(bNumber) && String(bValue).trim() !== '';

    if (aIsNumeric && bIsNumeric) {
      return aNumber - bNumber;
    }

    if (typeof aValue === 'boolean' || typeof bValue === 'boolean') {
      return Number(Boolean(aValue)) - Number(Boolean(bValue));
    }

    return String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    const sortColumn = columns.find((column) => column.field === orderBy);
    
    return [...filteredData].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);
      const comparison = compareValues(aValue, bValue, sortColumn);

      if (comparison === 0) return 0;
      return order === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, orderBy, order, columns]);

  const paginatedData = useMemo(
    () => (
      pagination
        ? sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        : sortedData
    ),
    [pagination, sortedData, page, rowsPerPage]
  );

  useEffect(() => {
    if (typeof onVisibleRowsChange === 'function') {
      onVisibleRowsChange(paginatedData);
    }
  }, [onVisibleRowsChange, paginatedData]);

  const tableMinWidth = useMemo(() => {
    const baseColumnsWidth = columns.reduce((total, column) => {
      if (column.minWidth) return total + column.minWidth;
      if (column.width) return total + column.width;
      return total + 160;
    }, 0);

    const selectableWidth = selectable ? 60 : 0;
    const actionsWidth = (onView || onEdit || onDelete) ? 120 : 0;
    return baseColumnsWidth + selectableWidth + actionsWidth;
  }, [columns, selectable, onView, onEdit, onDelete]);

  const getRowId = (row, index) => {
    const primaryValue = row?.[rowKey];
    if (primaryValue !== undefined && primaryValue !== null && primaryValue !== '') {
      return primaryValue;
    }

    const fallbackKeys = ['id', 'source_id', 'device_id', 'user_id', 'uuid'];
    const fallbackParts = fallbackKeys
      .map((key) => row?.[key])
      .filter((value) => value !== undefined && value !== null && value !== '');

    if (fallbackParts.length > 0) {
      return fallbackParts.join('-');
    }

    return `row-${index}`;
  };

  const handlePointerDown = (event) => {
    const container = tableContainerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    };

    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  const handlePointerMove = (event) => {
    const container = tableContainerRef.current;
    if (!container || !dragStateRef.current.isDragging) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const handlePointerUp = () => {
    const container = tableContainerRef.current;
    dragStateRef.current.isDragging = false;

    if (container) {
      container.style.cursor = container.scrollWidth > container.clientWidth ? 'grab' : 'default';
      container.style.removeProperty('user-select');
    }
  };

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
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, minWidth: 0, ...sx }}>
      {showToolbar && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant="h6" fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
                {title} ({filteredData.length})
              </Typography>
            )}
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              justifyContent: { xs: 'stretch', md: 'flex-end' },
              flexWrap: 'wrap',
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {searchable && (
              <FastTextField
                size="small"
                placeholder="Search..."
                value={search}
                onImmediateChange={() => setPage(0)}
                onDebouncedChange={(v) => setSearch(v)}
                delay={120}
                sx={{ width: { xs: '100%', sm: 280, md: 250 }, minWidth: 0 }}
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
      )}

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

      {/* Optional inline loading bar for table-only loading states */}
      {showInlineLoadingBar && loading && sourceData.length > 0 && <TrainLoadingBar sx={{ width: '100%' }} />}

      {/* Table */}
      <TableContainer
        ref={tableContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        sx={{
          maxHeight: 600,
          overflowX: 'auto',
          overflowY: 'auto',
          cursor: tableMinWidth > 0 ? 'grab' : 'default',
          overscrollBehaviorX: 'contain',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            height: 10,
            width: 10,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.text.primary, 0.2),
            borderRadius: 999,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(theme.palette.text.primary, 0.06),
          },
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            minWidth: tableMinWidth,
            tableLayout: 'auto',
            '& .MuiTableCell-root': {
              borderBottomColor: alpha(theme.palette.divider, 0.8),
            },
          }}
        >
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
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    bgcolor: headerBg,
                    whiteSpace: 'nowrap',
                    wordBreak: 'normal',
                    minWidth: column.minWidth || column.width || 160,
                    maxWidth: column.maxWidth,
                    py: { xs: 1, sm: 1.25 },
                    px: 1.75,
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
                  sx={{ fontWeight: 700, fontSize: '0.8rem', bgcolor: headerBg }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading && sourceData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + ((onView || onEdit || onDelete) ? 1 : 0)} 
                  align="center" 
                  sx={{ py: 8 }}
                >
                  <Box sx={{ maxWidth: 280, mx: 'auto' }}>
                    <TrainLoadingBar />
                  </Box>
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
                      {emptyMessage}
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
                const rowId = getRowId(row, page * rowsPerPage + paginatedData.indexOf(row));
                const isSelected = selectedRows.includes(rowId);
                
                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    onClick={(e) => {
                      if (selectable) {
                        handleSelect(rowId);
                      } else if (onRowClick) {
                        onRowClick(row);
                      }
                    }}
                    sx={{
                      cursor: onRowClick || selectable ? 'pointer' : 'default',
                      opacity: loading ? 0.7 : 1,
                      transition: 'opacity 0.2s',
                      '&:hover td': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(rowId)}
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
                          minWidth: column.minWidth || column.width || 160,
                          maxWidth: column.maxWidth || 'auto',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          wordBreak: 'normal',
                          py: { xs: 1, sm: 1.25 },
                          px: 1.75,
                          fontSize: '0.875rem',
                          verticalAlign: 'middle',
                        }}
                      >
                        {renderCell(row, column)}
                      </TableCell>
                    ))}
                    
                    {/* Actions Column */}
                    {(onView || onEdit || onDelete) && (
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: { xs: 0.75, sm: 1 } }}>
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
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            '& .MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              gap: 1,
              px: { xs: 1, sm: 2 },
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            },
          }}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Paper>
  );
};

export default React.memo(DataTable);
