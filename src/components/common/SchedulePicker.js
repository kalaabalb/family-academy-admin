import React from 'react';
import { Grid, FormControlLabel, Switch, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const SchedulePicker = ({
  enabled,
  onEnabledChange,
  value,
  onChange,
  label = 'Schedule Date',
  helperText = 'Leave disabled for immediate availability',
  disabled = false,
  fullWidth = true,
}) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
              disabled={disabled}
            />
          }
          label="Schedule for later"
        />
      </Grid>
      {enabled && (
        <Grid item xs={12}>
          <DateTimePicker
            label={label}
            value={value}
            onChange={onChange}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth,
                helperText,
                disabled,
              },
            }}
          />
        </Grid>
      )}
    </Grid>
  );
};

const areEqual = (prevProps, nextProps) => {
  const prevValue = prevProps.value instanceof Date ? prevProps.value.getTime() : prevProps.value?.valueOf?.() ?? prevProps.value;
  const nextValue = nextProps.value instanceof Date ? nextProps.value.getTime() : nextProps.value?.valueOf?.() ?? nextProps.value;

  return (
    prevProps.enabled === nextProps.enabled &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.fullWidth === nextProps.fullWidth &&
    prevProps.label === nextProps.label &&
    prevProps.helperText === nextProps.helperText &&
    prevValue === nextValue
  );
};

export default React.memo(SchedulePicker, areEqual);
