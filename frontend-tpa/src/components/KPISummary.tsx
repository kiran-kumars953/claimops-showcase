import { Card, CardContent, Typography, Box, Stack, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { memo, type ElementType } from 'react';

import type { Claim } from '../services/api';

interface KPISummaryProps {
  claims: Claim[];
  loading?: boolean;
  summary?: {
    totalClaims: number;
    carrierApproved: number;
    manualReview: number;
    rejectedTotal: number;
  };
}

const KPICard = memo(
  ({ icon: Icon, label, value, tone, progress }: { icon: ElementType; label: string; value: string; tone: string; progress: number }) => (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(247,251,255,0.95) 100%)',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <CardContent sx={{ p: 2.1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontSize: '0.77rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '1.95rem', fontWeight: 800, color: tone, lineHeight: 1.2 }}>{value}</Typography>
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              background: `${tone}20`,
              color: tone,
            }}
          >
            <Icon fontSize="small" />
          </Box>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.max(5, Math.min(progress, 100))}
          sx={{
            mt: 1.7,
            height: 7,
            borderRadius: 20,
            backgroundColor: `${tone}20`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 20,
              backgroundColor: tone,
            },
          }}
        />
      </CardContent>
    </Card>
  )
);

KPICard.displayName = 'KPICard';

export const KPISummary = memo(({ claims, loading = false, summary }: KPISummaryProps) => {
  const totalClaims = claims.length;
  // Status strings here are frontend labels (mapped in services/api.ts).
  const fallbackApproved = claims.filter((c) => c.status === 'Carrier Approved').length;
  const fallbackRejected = claims.filter((c) => c.status === 'Rejected' || c.status === 'Carrier Rejected').length;
  const fallbackReview = claims.filter((c) => c.status === 'Needs Manual Review').length;

  const approvedClaims = summary ? summary.carrierApproved : fallbackApproved;
  const rejectedClaims = summary ? summary.rejectedTotal : fallbackRejected;
  const reviewClaims = summary ? summary.manualReview : fallbackReview;
  const total = summary ? summary.totalClaims : totalClaims;

  const percentage = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

  const kpis = [
    {
      label: 'Total Claims',
      value: total,
      icon: AssignmentIcon,
      tone: '#005f9e',
      progress: 100,
    },
    {
      label: 'Approved',
      value: approvedClaims,
      icon: CheckCircleIcon,
      tone: '#1f9d55',
      progress: percentage(approvedClaims),
    },
    {
      label: 'Manual Review',
      value: reviewClaims,
      icon: PendingActionsIcon,
      tone: '#c96a16',
      progress: percentage(reviewClaims),
    },
    {
      label: 'Rejected',
      value: rejectedClaims,
      icon: CancelIcon,
      tone: '#b42318',
      progress: percentage(rejectedClaims),
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1.6 }}>
        Portfolio Snapshot
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={loading ? '...' : String(kpi.value)}
            icon={kpi.icon}
            tone={kpi.tone}
            progress={kpi.progress}
          />
        ))}
      </Box>
    </Box>
  );
});

KPISummary.displayName = 'KPISummary';
