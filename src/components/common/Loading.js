import React from 'react';
import { Box, Typography, Fade, Skeleton } from '@mui/material';

const CreativeLoader = ({ size = 56, label = 'Loading' }) => (
  <Box
    data-testid="creative-loader"
    aria-label={label}
    role="img"
    sx={{
      position: 'relative',
      width: size,
      height: size,
      mx: 'auto',
      flexShrink: 0,
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: 'rgba(25, 118, 210, 0.18)',
        borderTopColor: 'primary.main',
        borderRightColor: 'secondary.main',
        animation: 'loadingSpin 1.45s linear infinite',
        boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.04) inset',
        '@keyframes loadingSpin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 8,
        borderRadius: '50%',
        border: '2px dashed',
        borderColor: 'rgba(244, 67, 54, 0.22)',
        animation: 'loadingSpinReverse 2.4s linear infinite',
        '@keyframes loadingSpinReverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 18,
        borderRadius: '50%',
        bgcolor: 'background.paper',
        boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.08) inset, 0 8px 24px rgba(15, 23, 42, 0.12)',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 22,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        opacity: 0.2,
        animation: 'loadingPulse 1.8s ease-in-out infinite',
        '@keyframes loadingPulse': {
          '0%, 100%': { transform: 'scale(0.86)', opacity: 0.18 },
          '50%': { transform: 'scale(1)', opacity: 0.38 },
        },
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size * 0.18,
        height: size * 0.18,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        boxShadow: '0 0 18px rgba(25, 118, 210, 0.45)',
        transform: 'translate(-50%, -50%)',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        animation: 'loadingOrbit 1.8s linear infinite',
        '@keyframes loadingOrbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          left: '50%',
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          boxShadow: '0 0 14px rgba(244, 67, 54, 0.45)',
          transform: 'translateX(-50%)',
        }}
      />
    </Box>
  </Box>
);

export const TrainLoadingBar = ({ sx }) => (
  <Box
    data-testid="train-loading-bar"
    sx={{
      position: 'relative',
      width: '100%',
      height: 8,
      overflow: 'hidden',
      borderRadius: 999,
      bgcolor: 'rgba(25, 118, 210, 0.08)',
      border: '1px solid rgba(25, 118, 210, 0.12)',
      boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
      ...sx,
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg, rgba(25, 118, 210, 0) 0%, rgba(25, 118, 210, 0.08) 20%, rgba(25, 118, 210, 0.18) 50%, rgba(25, 118, 210, 0.08) 80%, rgba(25, 118, 210, 0) 100%)',
        animation: 'railGlow 1.8s ease-in-out infinite',
        '@keyframes railGlow': {
          '0%, 100%': { opacity: 0.45, transform: 'scaleX(0.96)' },
          '50%': { opacity: 1, transform: 'scaleX(1)' },
        },
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: -30,
        width: 28,
        height: 28,
        transform: 'translateY(-50%)',
        animation: 'trainRoll 1.55s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        '@keyframes trainRoll': {
          '0%': { left: -30 },
          '100%': { left: 'calc(100% + 2px)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 4,
          borderRadius: 999,
          bgcolor: 'primary.main',
          boxShadow: '0 0 12px rgba(25, 118, 210, 0.45)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 2,
          left: 4,
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          boxShadow: '0 0 8px rgba(244, 67, 54, 0.4)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          boxShadow: '0 0 8px rgba(244, 67, 54, 0.4)',
        }}
      />
    </Box>
  </Box>
);

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
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(25, 118, 210, 0.14), transparent 28%),
          radial-gradient(circle at 80% 30%, rgba(244, 67, 54, 0.10), transparent 24%),
          radial-gradient(circle at 50% 80%, rgba(76, 175, 80, 0.08), transparent 24%)
        `,
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
          <CreativeLoader size={64} label={title} />
        </Box>
        <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 700, mb: 1 }}>
          {title}
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65 }}>
            {message}
          </Typography>
        )}
        <TrainLoadingBar sx={{ mt: 2.5 }} />
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
          <CreativeLoader size={40} label={title} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {message}
            </Typography>
          </Box>
        </Box>
        <TrainLoadingBar />
      </Box>
    </Box>
  </Fade>
);

// Inline loading glyph
const InlineLoading = ({ message, size = 24 }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', py: 2 }}>
    <CreativeLoader size={size} label={message || 'Loading'} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

// Button loading glyph
const ButtonLoading = ({ size = 20 }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <CreativeLoader size={size} label="Loading" />
  </Box>
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
