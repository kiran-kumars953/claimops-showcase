import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App.tsx'
import './index.css'

const theme = createTheme({
  palette: {
    primary: { main: '#005f9e' },
    secondary: { main: '#0d9488' },
    success: { main: '#1f9d55' },
    warning: { main: '#c96a16' },
    error: { main: '#b42318' },
    background: {
      default: '#f2f6fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  typography: {
    // Body: Manrope. Headings: Sora for more "product" feel.
    fontFamily: '"Manrope","Avenir Next","Segoe UI Variable","Segoe UI",sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 800,
    h4: { fontFamily: '"Sora","Manrope",sans-serif', fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontFamily: '"Sora","Manrope",sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontFamily: '"Sora","Manrope",sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    button: { fontWeight: 800, letterSpacing: '0.01em' },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Manrope","Avenir Next","Segoe UI Variable","Segoe UI",sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 14px 40px rgba(5, 37, 64, 0.08)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        },
        head: {
          fontWeight: 800,
          fontSize: '0.78rem',
          color: '#0f172a',
          backgroundColor: 'rgba(248, 250, 252, 0.9)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(2,132,199,0.06)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 800,
        },
      },
    },
  },
})

window.onerror = (message, _source, _lineno, _colno, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Something went wrong!</h2>
      <pre>${message}</pre>
      <pre>${error?.stack}</pre>
    </div>`;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)

