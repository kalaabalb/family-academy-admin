import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';

// FastTextField keeps local state for immediate keystroke responsiveness
// and calls `onDebouncedChange` after a short debounce to avoid heavy parent re-renders.
const FastTextField = ({ value = '', onDebouncedChange, delay = 150, onImmediateChange, ...props }) => {
  const [local, setLocal] = useState(value ?? '');
  const timer = useRef(null);
  const latestValue = useRef(value ?? '');

  // Sync external value into local when it changes (but avoid overwriting while user is typing if same)
  useEffect(() => {
    const nextValue = value ?? '';
    latestValue.current = nextValue;
    setLocal((prev) => (prev === nextValue ? prev : nextValue));
  }, [value]);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    latestValue.current = v;
    setLocal(v);
    // Call immediate handler if provided (useful for local-only effects)
    onImmediateChange?.(v);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onDebouncedChange?.(v);
      timer.current = null;
    }, delay);
  };

  const handleBlur = (event) => {
    if (timer.current) {
      clearTimeout(timer.current);
      onDebouncedChange?.(latestValue.current);
      timer.current = null;
    }

    props.onBlur?.(event);
  };

  return <TextField {...props} value={local} onChange={handleChange} onBlur={handleBlur} />;
};

export default React.memo(FastTextField);
