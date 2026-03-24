import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Loading from './Loading';

describe('Loading Component', () => {
  test('renders full screen loading with message', () => {
    render(<Loading type="fullscreen" message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('renders inline loading', () => {
    render(<Loading type="inline" message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  test('renders button loading', () => {
    render(<Loading type="button" />);
    // Check for CircularProgress
    const progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();
  });
});