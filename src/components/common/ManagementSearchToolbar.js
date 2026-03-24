import React from 'react';
import { IconButton, InputAdornment, Paper } from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import FastTextField from './FastTextField';

const ManagementSearchToolbar = ({
  value,
  onChange,
  placeholder = 'Search...',
  delay = 120,
  actions,
  sx,
}) => {
  return (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 3,
        borderRadius: 2.5,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 1.5,
        ...sx,
      }}
    >
      <FastTextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value}
        onDebouncedChange={onChange}
        delay={delay}
        sx={{ minWidth: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onChange('')}>
                <Close />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      {actions}
    </Paper>
  );
};

export default ManagementSearchToolbar;
