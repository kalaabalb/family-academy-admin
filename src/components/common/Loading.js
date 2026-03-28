import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, Fade, LinearProgress } from '@mui/material';

// Full screen loading
const FullScreenLoading = ({
  title = 'Checking your access',
  message = 'We are restoring your session and opening the admin tools you can use.',
}) => (
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
        px: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 3,
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
          <CircularProgress size={44} />
        </Box>
        <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 700, mb: 1 }}>
          {title}
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65 }}>
            {message}
          </Typography>
        )}
        <Box sx={{ mt: 3 }}>
          <LinearProgress sx={{ height: 6, borderRadius: 999 }} />
          <Skeleton variant="rounded" height={14} sx={{ mt: 2, borderRadius: 999 }} />
          <Skeleton variant="rounded" width="72%" height={14} sx={{ mt: 1.5, borderRadius: 999 }} />
        </Box>
      </Box>
    </Box>
  </Fade>
);

const PageLoading = ({
  title = 'Opening this page',
  message = 'We are loading the latest records for this section.',
}) => (
  <Fade in timeout={220}>
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 180px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          p: 3,
          borderRadius: 3,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={30} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {message}
            </Typography>
          </Box>
        </Box>
        <LinearProgress sx={{ height: 6, borderRadius: 999, mb: 2.5 }} />
        <Skeleton variant="rounded" height={18} sx={{ borderRadius: 999, mb: 1.5 }} />
        <Skeleton variant="rounded" width="78%" height={18} sx={{ borderRadius: 999, mb: 2.5 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
          <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
        </Box>
      </Box>
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
  title,
  message,
  size,
  rows,
  columns,
  count,
}) => {
  switch (type) {
    case 'fullscreen':
      return <FullScreenLoading title={title} message={message} />;
    case 'page':
      return <PageLoading title={title} message={message} />;
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
