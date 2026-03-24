import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

const ManagementPageHeader = ({ title, subtitle, actions, sx }) => {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', lg: 'center' },
        gap: 2,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions ? (
        <Stack
          direction="row"
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
          justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
        >
          {actions}
        </Stack>
      ) : null}
    </Box>
  );
};

export default ManagementPageHeader;
