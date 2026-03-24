import React from 'react';
import { Box, Typography } from '@mui/material';

const DetailRow = ({ label, value, valueColor = 'text.primary', align = 'space-between' }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: align, alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" color={valueColor} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
};

export default DetailRow;
