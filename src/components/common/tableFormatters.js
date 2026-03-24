import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

export const formatLabel = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const renderTableId = (value) => (
  <Typography variant="body2" color="text.secondary" fontWeight={600}>
    {value ?? '-'}
  </Typography>
);

export const renderTableDate = (value, options = {}) => {
  const { dateOnly = false, fallback = '-' } = options;

  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        {fallback}
      </Typography>
    );
  }

  const parsed = new Date(value);
  const formatted = Number.isNaN(parsed.getTime())
    ? fallback
    : dateOnly
      ? parsed.toLocaleDateString()
      : parsed.toLocaleString();

  return (
    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
      {formatted}
    </Typography>
  );
};

export const renderPrimaryCell = ({
  primary,
  secondary,
  tertiary,
  primaryWeight = 600,
  secondarySx,
}) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      variant="body2"
      fontWeight={primaryWeight}
      sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {primary || '-'}
    </Typography>
    {secondary ? (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mt: 0.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...secondarySx,
        }}
      >
        {secondary}
      </Typography>
    ) : null}
    {tertiary ? (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        {tertiary}
      </Typography>
    ) : null}
  </Box>
);

export const renderTableChip = (label, options = {}) => {
  const {
    color = 'default',
    icon,
    fallback = '-',
  } = options;

  return (
    <Chip
      label={formatLabel(label, fallback)}
      size="small"
      color={color}
      variant="outlined"
      icon={icon}
      sx={{ fontWeight: 500 }}
    />
  );
};

export const renderCountChip = (value, options = {}) => {
  const { color = 'primary', emptyColor = 'default' } = options;
  const safeValue = Number(value) || 0;

  return (
    <Chip
      label={safeValue}
      size="small"
      color={safeValue > 0 ? color : emptyColor}
      variant="outlined"
      sx={{ fontWeight: 500, minWidth: 48 }}
    />
  );
};
