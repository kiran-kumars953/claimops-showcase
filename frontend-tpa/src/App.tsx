import { useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BoltIcon from '@mui/icons-material/Bolt';
import InboxIcon from '@mui/icons-material/Inbox';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Login } from './pages/Login';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import apiService from './services/api';
import { CarrierDashboard } from './pages/CarrierDashboard';
import { CarrierClaims } from './pages/CarrierClaims';

const DRAWER_WIDTH = 276;

function AppContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const role = apiService.getRole();
  const isCarrier = role === 'CARRIER';
  const sessionUser = apiService.getSessionUser();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const currentDateLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  const pageTitle = useMemo(() => {
    if (isLoginPage) return '';
    if (location.pathname.startsWith('/tpa/upload')) return 'Submit Claim';
    if (location.pathname.startsWith('/tpa/dashboard')) return 'Claims';
    if (location.pathname.startsWith('/carrier/claims')) return 'Claims';
    if (location.pathname.startsWith('/carrier/dashboard')) return 'Dashboard';
    return 'Claim Ops Hub';
  }, [isLoginPage, location.pathname]);

  const navigationItems = isCarrier
    ? [
        { label: 'Dashboard', path: '/carrier/dashboard', icon: DashboardIcon, hint: 'Queues, KPIs, and outcomes' },
        { label: 'Pending Claims', path: '/carrier/claims/pending', icon: InboxIcon, hint: 'Carrier review queue' },
      ]
    : [
        { label: 'Dashboard', path: '/tpa/dashboard', icon: DashboardIcon, hint: 'Queue, KPI, and decisions' },
        { label: 'Submit Claim', path: '/tpa/upload', icon: CloudUploadIcon, hint: 'Upload -> Review -> Validate' },
      ];

  const initials = (() => {
    const name = sessionUser?.fullName || sessionUser?.username || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();

  const drawerContent = (
    <Box sx={{ px: 2, py: 2.2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.15} alignItems="center" sx={{ mb: 2.2 }}>
        <Avatar
          sx={{
            bgcolor: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.16)',
            width: 40,
            height: 40,
          }}
        >
          <HealthAndSafetyIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 900, color: '#eaf2ff', letterSpacing: '-0.02em' }}>
            Claim Ops Hub
          </Typography>
          <Typography sx={{ fontSize: '0.74rem', color: 'rgba(226,232,240,0.78)' }}>
            {isCarrier ? 'Carrier Portal' : 'TPA Portal'}
          </Typography>
        </Box>
      </Stack>

      {!isCarrier ? (
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            navigate('/tpa/upload');
            if (isMobile) setMobileOpen(false);
          }}
          sx={{
            mb: 2,
            py: 1.05,
            borderRadius: 2,
            fontWeight: 900,
            color: '#0b1220',
            background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 100%)',
            '&:hover': { background: 'linear-gradient(90deg, #ffffff 0%, #e2e8f0 100%)' },
          }}
        >
          File A Claim
        </Button>
      ) : null}

      <List sx={{ p: 0, gap: 0.6, display: 'flex', flexDirection: 'column' }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  px: 1.3,
                  py: 1.05,
                  border: active ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
                  background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                  '&:hover': { background: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#eaf2ff' : 'rgba(226,232,240,0.74)' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.hint}
                  primaryTypographyProps={{ sx: { fontSize: '0.9rem', fontWeight: active ? 900 : 800, color: '#eaf2ff' } }}
                  secondaryTypographyProps={{ sx: { fontSize: '0.74rem', color: 'rgba(226,232,240,0.70)' } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.4 }}>
          <Chip
            icon={<HelpOutlineRoundedIcon />}
            label="Help"
            size="small"
            sx={{
              color: 'rgba(226,232,240,0.88)',
              borderColor: 'rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
            }}
            variant="outlined"
          />
          <Chip
            icon={<NotificationsNoneRoundedIcon />}
            label="Alerts"
            size="small"
            sx={{
              color: 'rgba(226,232,240,0.88)',
              borderColor: 'rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
            }}
            variant="outlined"
          />
        </Stack>

        <Box
          sx={{
            p: 1.2,
            borderRadius: 2.2,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'rgba(255,255,255,0.12)',
                color: '#eaf2ff',
                fontWeight: 900,
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#eaf2ff', fontWeight: 900, fontSize: '0.9rem', lineHeight: 1.15 }} noWrap>
                {sessionUser?.fullName || sessionUser?.username || 'User'}
              </Typography>
              <Typography sx={{ color: 'rgba(226,232,240,0.72)', fontSize: '0.76rem' }} noWrap>
                {role || 'VIEWER'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      {!isLoginPage && (
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (zTheme) => zTheme.zIndex.drawer + 1,
          backdropFilter: 'blur(10px)',
          background: 'rgba(250, 253, 255, 0.86)',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          color: '#0f172a',
        }}
      >
        <Toolbar sx={{ minHeight: 68, px: { xs: 1.5, sm: 2.4 } }}>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1.2 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: { xs: '1rem', sm: '1.12rem' },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: '"Sora","Manrope",sans-serif',
              }}
            >
              {pageTitle}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              {isCarrier ? 'Client-side validation and decision workflow' : 'Real-time underwriting and operational decision support'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip icon={<BoltIcon />} label="SLA 99.4%" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={currentDateLabel} variant="outlined" size="small" />
            {!isCarrier ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={() => navigate('/tpa/upload')}
                sx={{
                  ml: 0.5,
                  fontWeight: 900,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 60%, #14b8a6 100%)',
                }}
              >
                File A Claim
              </Button>
            ) : null}
            <Chip
              label="Logout"
              variant="outlined"
              size="small"
              onClick={() => {
                apiService.logout();
                navigate('/login');
              }}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Toolbar>
      </AppBar>
      )}

      {!isLoginPage && !isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(15,23,42,0.10)',
              background: 'linear-gradient(180deg, #0b1220 0%, #0a1530 52%, #0b1220 100%)',
              mt: '68px',
              height: 'calc(100vh - 68px)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {!isLoginPage && isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              mt: '68px',
              height: 'calc(100vh - 68px)',
              background: 'linear-gradient(180deg, #0b1220 0%, #0a1530 52%, #0b1220 100%)',
              borderRight: '1px solid rgba(255,255,255,0.10)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isLoginPage ? '100%' : { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: isLoginPage ? 0 : '68px',
          px: isLoginPage ? 0 : { xs: 1, sm: 1.8 },
          pb: 2,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Navigate to={isCarrier ? '/carrier/dashboard' : '/tpa/dashboard'} replace />
              </RequireAuth>
            }
          />

          <Route path="/upload" element={<Navigate to="/tpa/upload" replace />} />

          <Route
            path="/tpa/dashboard"
            element={
              <RequireRole allowedRoles={['ADMIN', 'AGENT', 'SUPERVISOR', 'AUDITOR', 'VIEWER']}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="/tpa/upload"
            element={
              <RequireRole allowedRoles={['ADMIN', 'AGENT', 'SUPERVISOR']}>
                <Upload />
              </RequireRole>
            }
          />

          <Route
            path="/carrier/dashboard"
            element={
              <RequireRole allowedRoles={['CARRIER']}>
                <CarrierDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/carrier/claims/pending"
            element={
              <RequireRole allowedRoles={['CARRIER']}>
                <CarrierClaims defaultStatus="CARRIER_PENDING" />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to={apiService.getToken() ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
