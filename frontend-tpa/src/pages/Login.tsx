import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Checkbox,
  IconButton,
  InputAdornment,
  Link,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export const Login = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<'ADMIN' | 'CARRIER'>('ADMIN');
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const presets = useMemo(
    () => ({
      ADMIN: { label: 'Admin', username: 'admin', password: 'admin123', icon: AdminPanelSettingsRoundedIcon, tone: '#005f9e' },
      CARRIER: { label: 'Carrier', username: 'carrier', password: 'carrier123', icon: LocalShippingRoundedIcon, tone: '#0d9488' },
    }),
    []
  );

  const applyPreset = (key: 'ADMIN' | 'CARRIER') => {
    const p = presets[key];
    setPreset(key);
    setUsernameOrEmail(p.username);
    setPassword(p.password);
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      // Token persistence is handled by the API service (localStorage) for this demo.
      // "Remember me" is a UI hint (no refresh-token strategy implemented yet).
      void rememberMe;
      const session = await apiService.login(usernameOrEmail.trim(), password);
      // Single portal app routes based on role.
      if (session.user?.role === 'CARRIER') {
        navigate('/carrier/dashboard');
      } else {
        navigate('/tpa/dashboard');
      }
    } catch {
      setError('Login failed. Check username/password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        // Match the "two-panel enterprise login" vibe while keeping our blue/teal brand.
        background: 'linear-gradient(135deg, #6d28d9 0%, #0ea5e9 45%, #14b8a6 100%)',
        py: 6,
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: -240,
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 72%), radial-gradient(closest-side, rgba(0,0,0,0.10), transparent 74%)',
          filter: 'blur(18px)',
          transform: 'translate3d(0,0,0)',
          animation: 'loginMesh 14s ease-in-out infinite alternate',
          pointerEvents: 'none',
        },
        '@keyframes loginMesh': {
          '0%': { transform: 'translate(-4%, -2%) scale(1)' },
          '100%': { transform: 'translate(4%, 2%) scale(1.03)' },
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Card
          sx={{
            borderRadius: 3.2,
            border: '1px solid rgba(255,255,255,0.20)',
            boxShadow: '0 30px 90px rgba(15, 23, 42, 0.28)',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
              minHeight: { xs: 'auto', md: 520 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                p: { xs: 3, sm: 4 },
                color: '#ffffff',
                background:
                  'linear-gradient(135deg, rgba(2,132,199,1) 0%, rgba(13,148,136,1) 55%, rgba(30,64,175,1) 100%)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.9,
                  background:
                    'radial-gradient(1200px 800px at 15% 10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(900px 700px at 85% 60%, rgba(0,0,0,0.14), transparent 62%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: -140,
                  bottom: -200,
                  width: 620,
                  height: 620,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.14)',
                  filter: 'blur(0px)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  right: -180,
                  top: -220,
                  width: 560,
                  height: 560,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.10)',
                }}
              />

              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.10em', opacity: 0.95, fontFamily: '"Sora","Manrope",sans-serif' }}>
                  TPA CLAIM OPS HUB
                </Typography>

                <Typography
                  sx={{
                    mt: 6,
                    fontSize: { xs: '2.1rem', sm: '2.6rem' },
                    fontFamily: '"Sora","Manrope",sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.05,
                    textShadow: '0 18px 40px rgba(0,0,0,0.20)',
                  }}
                >
                  Welcome to your
                  <br />
                  decision console.
                </Typography>

                <Typography sx={{ mt: 2, maxWidth: 440, opacity: 0.95, lineHeight: 1.6, fontSize: '0.98rem' }}>
                  Upload claims, validate rules, and collaborate with carriers. Built for audit-ready workflows and operational clarity.
                </Typography>

                <Stack spacing={1.05} sx={{ mt: 3.6, maxWidth: 440 }}>
                  <Feature text="OCR + LLM extraction with editable review" />
                  <Feature text="Rule engine with explainable outcomes" />
                  <Feature text="Carrier decisions + timeline audit history" />
                </Stack>

                <Box sx={{ mt: 'auto', pt: 3.5 }}>
                  <Typography sx={{ opacity: 0.9, fontSize: '0.8rem' }}>Environment: Dev • SLA 99.4%</Typography>
                </Box>
              </Box>
            </Box>

            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={2.2}>
                <Box>
                  <Typography sx={{ fontSize: { xs: '1.6rem', sm: '1.9rem' }, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: '"Sora","Manrope",sans-serif' }}>
                    Login
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', mt: 0.6 }}>
                    Select a role preset to auto-fill credentials.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.2}>
                  {(['ADMIN', 'CARRIER'] as const).map((key) => {
                    const p = presets[key];
                    const Icon = p.icon;
                    const active = preset === key;
                    return (
                      <Paper
                        key={key}
                        variant="outlined"
                        onClick={() => applyPreset(key)}
                        sx={{
                          cursor: 'pointer',
                          flex: 1,
                          p: 1.2,
                          borderRadius: 2.2,
                          borderColor: active ? `${p.tone}55` : 'rgba(15,23,42,0.12)',
                          background: active ? `${p.tone}10` : 'transparent',
                          transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 12px 28px rgba(15,23,42,0.10)' },
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Avatar sx={{ bgcolor: `${p.tone}22`, color: p.tone, width: 40, height: 40 }}>
                            <Icon fontSize="small" />
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{p.label}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Auto-fill</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <TextField
                  label="User Name"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="username"
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                          {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" />
                    }
                    label={<Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>Remember me</Typography>}
                  />
                  <Link
                    component="button"
                    type="button"
                    onClick={() => setError('Password reset is not enabled in this demo.')}
                    underline="hover"
                    sx={{ fontSize: '0.9rem' }}
                  >
                    Forgot password?
                  </Link>
                </Stack>

                <Button
                  variant="contained"
                  disabled={submitting || !usernameOrEmail.trim() || !password}
                  onClick={handleSubmit}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    py: 1.15,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 55%, #14b8a6 100%)',
                    boxShadow: '0 16px 36px rgba(37,99,235,0.22)',
                    '&:hover': { boxShadow: '0 20px 44px rgba(20,184,166,0.22)' },
                  }}
                >
                  {submitting ? 'Signing in...' : 'Login'}
                </Button>

                <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                  Quick presets only: <b>Admin</b> and <b>Carrier</b>.
                </Typography>
              </Stack>
            </CardContent>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

const Feature = ({ text }: { text: string }) => (
  <Stack direction="row" spacing={1.1} alignItems="flex-start">
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        mt: '0.45rem',
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 10px 22px rgba(0,0,0,0.16)',
        flex: '0 0 auto',
      }}
    />
    <Typography sx={{ opacity: 0.95, lineHeight: 1.45, fontSize: '0.98rem' }}>{text}</Typography>
  </Stack>
);
