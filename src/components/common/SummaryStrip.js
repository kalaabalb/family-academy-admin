import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

const SummaryStrip = ({ items, sx }) => {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2.5, ...sx }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
        {items.map((item) => (
          <Box key={item.label} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="h6" fontWeight={700} color={`${item.color || 'text'}.main`}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default SummaryStrip;
