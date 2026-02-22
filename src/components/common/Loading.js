import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, Fade } from '@mui/material';

// Full screen loading
const FullScreenLoading = ({ message = 'Loading...' }) => (
  <Fade in timeout={300}>
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.paper',
        zIndex: 9999,
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      {message && (
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  </Fade>
);

// Inline loading spinner
const InlineLoading = ({ message, size = 24 }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', py: 2 }}>
    <CircularProgress size={size} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

// Button loading spinner
const ButtonLoading = ({ size = 20 }) => (
  <CircularProgress size={size} color="inherit" />
);

// Skeleton table rows
const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box sx={{ width: '100%' }}>
    {[...Array(rows)].map((_, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {[...Array(columns)].map((_, j) => (
          <Skeleton 
            key={j} 
            variant="rectangular" 
            height={40} 
            sx={{ flex: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);

// Skeleton card
const CardSkeleton = ({ count = 1 }) => (
  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
    {[...Array(count)].map((_, i) => (
      <Box key={i} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
        </Box>
      </Box>
    ))}
  </Box>
);

// Skeleton chart
const ChartSkeleton = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="30%" sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 1 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} variant="circular" width={8} height={8} />
      ))}
    </Box>
  </Box>
);

// Main Loading component with variants
const Loading = ({ 
  type = 'fullscreen', // 'fullscreen', 'inline', 'button', 'table', 'card', 'chart'
  message,
  size,
  rows,
  columns,
  count,
}) => {
  switch (type) {
    case 'fullscreen':
      return <FullScreenLoading message={message} />;
    case 'inline':
      return <InlineLoading message={message} size={size} />;
    case 'button':
      return <ButtonLoading size={size} />;
    case 'table':
      return <TableSkeleton rows={rows} columns={columns} />;
    case 'card':
      return <CardSkeleton count={count} />;
    case 'chart':
      return <ChartSkeleton />;
    default:
      return <InlineLoading message={message} size={size} />;
  }
};

export default Loading;