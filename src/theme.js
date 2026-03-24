import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const paletteTokens = {
  light: {
    primary: {
      main: '#365f8a',
      light: '#6286ab',
      dark: '#274867',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#8d6e63',
      light: '#b08b7f',
      dark: '#6b534b',
      contrastText: '#fcf8f6',
    },
    success: {
      main: '#4f7a65',
      light: '#789987',
      dark: '#375747',
    },
    warning: {
      main: '#b6844f',
      light: '#d1a472',
      dark: '#8c6337',
    },
    error: {
      main: '#b25b63',
      light: '#cb8087',
      dark: '#8a4248',
    },
    info: {
      main: '#4f7894',
      light: '#7998af',
      dark: '#39596f',
    },
    background: {
      default: '#f3efe8',
      paper: '#fbf8f3',
    },
    text: {
      primary: '#1f2933',
      secondary: '#5b6673',
      disabled: '#97a0aa',
    },
    divider: 'rgba(79, 89, 99, 0.14)',
    accentSurface: 'rgba(93, 121, 153, 0.08)',
    subtleSurface: 'rgba(255, 255, 255, 0.56)',
  },
  dark: {
    primary: {
      main: '#8ea8c7',
      light: '#b2c5db',
      dark: '#6f89a8',
      contrastText: '#111826',
    },
    secondary: {
      main: '#c4a694',
      light: '#d9c1b4',
      dark: '#a78979',
      contrastText: '#1c1411',
    },
    success: {
      main: '#7fb39a',
      light: '#9ac6b0',
      dark: '#5f9279',
    },
    warning: {
      main: '#d0a471',
      light: '#dfbd95',
      dark: '#b1844d',
    },
    error: {
      main: '#d28a90',
      light: '#dfaaae',
      dark: '#b46870',
    },
    info: {
      main: '#87aeca',
      light: '#a8c4d9',
      dark: '#678ca8',
    },
    background: {
      default: '#15181d',
      paper: '#1b2128',
    },
    text: {
      primary: 'rgba(245, 247, 250, 0.94)',
      secondary: 'rgba(221, 226, 232, 0.74)',
      disabled: 'rgba(193, 201, 209, 0.5)',
    },
    divider: 'rgba(210, 218, 227, 0.1)',
    accentSurface: 'rgba(142, 168, 199, 0.12)',
    subtleSurface: 'rgba(27, 33, 40, 0.8)',
  },
};

const getTheme = (mode = 'light') => {
  const colors = paletteTokens[mode];
  const theme = createTheme({
    palette: {
      mode,
      primary: colors.primary,
      secondary: colors.secondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.info,
      background: colors.background,
      text: colors.text,
      divider: colors.divider,
    },
  typography: {
    fontFamily: [
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      '@media (max-width:900px)': {
        fontSize: '1.25rem',
      },
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      '@media (max-width:900px)': {
        fontSize: '1.1rem',
      },
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      '@media (max-width:900px)': {
        fontSize: '0.95rem',
      },
    },
    body1: {
      fontSize: '1rem',
      '@media (max-width:900px)': {
        fontSize: '0.95rem',
      },
    },
    body2: {
      fontSize: '0.875rem',
      '@media (max-width:900px)': {
        fontSize: '0.82rem',
      },
    },
    caption: {
      fontSize: '0.75rem',
      '@media (max-width:900px)': {
        fontSize: '0.7rem',
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background.default,
          backgroundImage:
            mode === 'dark'
              ? 'radial-gradient(circle at top left, rgba(142, 168, 199, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(196, 166, 148, 0.08), transparent 28%)'
              : 'radial-gradient(circle at top left, rgba(98, 134, 171, 0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(176, 139, 127, 0.1), transparent 30%)',
          backgroundAttachment: 'fixed',
        },
        '*::selection': {
          backgroundColor: mode === 'dark' ? 'rgba(142, 168, 199, 0.3)' : 'rgba(54, 95, 138, 0.18)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          minHeight: 40,
          paddingInline: 16,
          whiteSpace: 'nowrap',
          '@media (max-width:900px)': {
            minHeight: 36,
            paddingInline: 12,
            fontSize: '0.85rem',
          },
        },
        contained: {
          boxShadow: mode === 'dark'
            ? '0 12px 24px rgba(0, 0, 0, 0.18)'
            : '0 10px 24px rgba(54, 95, 138, 0.16)',
          '&:hover': {
            boxShadow: mode === 'dark'
              ? '0 14px 28px rgba(0, 0, 0, 0.24)'
              : '0 14px 28px rgba(54, 95, 138, 0.22)',
          },
        },
        outlined: {
          borderColor: mode === 'dark' ? 'rgba(142, 168, 199, 0.28)' : 'rgba(54, 95, 138, 0.18)',
          backgroundColor: mode === 'dark' ? 'rgba(142, 168, 199, 0.04)' : 'rgba(255, 255, 255, 0.55)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundImage: 'none',
          backgroundColor: colors.background.paper,
          border: `1px solid ${colors.divider}`,
          boxShadow: mode === 'dark'
            ? '0 14px 36px rgba(0, 0, 0, 0.24)'
            : '0 14px 36px rgba(37, 46, 55, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundImage: 'none',
          backgroundColor: colors.background.paper,
          border: `1px solid ${colors.divider}`,
          '@media (max-width:900px)': {
            borderRadius: 14,
          },
        },
        elevation1: {
          boxShadow: mode === 'dark'
            ? '0 14px 36px rgba(0, 0, 0, 0.22)'
            : '0 14px 32px rgba(37, 46, 55, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(14px)',
          backgroundColor: mode === 'dark'
            ? 'rgba(27, 33, 40, 0.84)'
            : 'rgba(251, 248, 243, 0.82)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.divider}`,
          '@media (max-width:900px)': {
            padding: '10px 12px',
            fontSize: '0.8rem',
          },
        },
        head: {
          fontWeight: 600,
          backgroundColor: colors.accentSurface,
          color: colors.text.secondary,
          letterSpacing: '0.01em',
          '@media (max-width:900px)': {
            lineHeight: 1.25,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: colors.accentSurface,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          minWidth: 0,
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          minHeight: 44,
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : colors.subtleSurface,
          '@media (max-width:900px)': {
            minHeight: 40,
          },
          '& fieldset': {
            borderColor: mode === 'dark' ? 'rgba(210, 218, 227, 0.14)' : 'rgba(79, 89, 99, 0.12)',
          },
          '&:hover fieldset': {
            borderColor: mode === 'dark' ? 'rgba(142, 168, 199, 0.28)' : 'rgba(54, 95, 138, 0.24)',
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1,
          },
          '&.Mui-focused': {
            boxShadow: 'none',
          },
        },
        input: {
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${
              mode === 'dark' ? 'rgba(255,255,255,0.02)' : colors.subtleSurface
            } inset`,
            WebkitTextFillColor: colors.text.primary,
            caretColor: colors.text.primary,
            transition: 'background-color 9999s ease-out 0s',
          },
          '&:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
            WebkitBoxShadow: `0 0 0 100px ${
              mode === 'dark' ? 'rgba(255,255,255,0.02)' : colors.subtleSurface
            } inset`,
            WebkitTextFillColor: colors.text.primary,
          },
          '@media (max-width:900px)': {
            fontSize: '0.9rem',
            paddingBlock: 11,
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.text.secondary,
          '&.Mui-focused': {
            color: colors.primary.main,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: colors.text.secondary,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: colors.accentSurface,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 16,
          width: 'calc(100% - 32px)',
          '@media (max-width:600px)': {
            margin: 12,
            width: 'calc(100% - 24px)',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          '@media (max-width:900px)': {
            padding: 16,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          maxWidth: '100%',
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },
  },
  });

  return responsiveFontSizes(theme, {
    breakpoints: ['sm', 'md'],
    factor: 2,
  });
};

export default getTheme;
