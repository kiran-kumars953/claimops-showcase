import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Chip,
  Paper,
  Link,
  Button,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StatusChip } from './StatusChip';
import { memo, useEffect, useState } from 'react';

import type { Claim } from '../services/api';

interface ClaimDetailDrawerProps {
  open: boolean;
  claim: Claim | null;
  onClose: () => void;
  onManualDecision?: (claimId: number, decision: 'APPROVE' | 'REJECT', reason?: string) => Promise<void>;
}

const DetailRow = memo(({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography
      sx={{
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        mb: 0.75,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '1rem',
        fontWeight: 500,
        color: '#333',
      }}
    >
      {value}
    </Typography>
  </Box>
));

DetailRow.displayName = 'DetailRow';

export const ClaimDetailDrawer = memo(({ open, claim, onClose, onManualDecision }: ClaimDetailDrawerProps) => {
  const [manualReason, setManualReason] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  useEffect(() => {
    setManualReason('');
    setManualSubmitting(false);
    setManualError('');
  }, [claim?.id, open]);

  if (!claim) return null;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const daysInProcess = claim.processedDate
    ? Math.floor(
      (new Date(claim.processedDate).getTime() - new Date(claim.createdDate).getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : 0;

  const handleManualAction = async (decision: 'APPROVE' | 'REJECT') => {
    if (!onManualDecision) {
      return;
    }
    if (decision === 'REJECT' && !manualReason.trim()) {
      setManualError('Rejection reason is required.');
      return;
    }

    setManualSubmitting(true);
    setManualError('');
    try {
      await onManualDecision(claim.id, decision, manualReason.trim() || undefined);
      onClose();
    } catch {
      setManualError('Failed to update manual review decision.');
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 3,
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1976d2',
              }}
            >
              {claim.claimId}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#666',
                mt: 0.5,
              }}
            >
              Claim Details
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#666' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {/* Status Section */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              Current Status
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status={claim.status} />
              <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                {daysInProcess} days in process
              </Typography>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Basic Information */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              mb: 2,
              color: '#333',
            }}
          >
            Claim Information
          </Typography>

          <DetailRow label="Claim ID" value={claim.claimId} />
          <DetailRow label="Policy Number" value={claim.policyNumber} />
          <DetailRow label="Policy Name" value={claim.policyName} />

          <Divider sx={{ my: 3 }} />

          {/* Customer Information */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              mb: 2,
              color: '#333',
            }}
          >
            Customer Information
          </Typography>

          <DetailRow label="Customer Name" value={claim.customerName} />
          <DetailRow label="Carrier" value={claim.carrierName} />

          <Divider sx={{ my: 3 }} />

          {/* Dates */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              mb: 2,
              color: '#333',
            }}
          >
            Timeline
          </Typography>

          <DetailRow label="Created Date" value={formatDate(claim.createdDate)} />
          <DetailRow label="Processed Date" value={formatDate(claim.processedDate)} />

          <Divider sx={{ my: 3 }} />

          {/* Reason */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              mb: 2,
              color: '#333',
            }}
          >
            Decision Reason
          </Typography>

          <Paper
            sx={{
              p: 2,
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              mb: 3,
            }}
          >
            <Typography sx={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.6 }}>
              {claim.reason}
            </Typography>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Documents */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              mb: 2,
              color: '#333',
            }}
          >
            Documents
          </Typography>

          <Stack spacing={1.5}>
            <Paper
              sx={{
                p: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                  borderColor: '#1976d2',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <Link
                href="#"
                underline="none"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#1976d2',
                }}
              >
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  Claim Form PDF
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                  {Math.random() * 5 + 0.5} MB
                </Typography>
              </Link>
            </Paper>

            <Paper
              sx={{
                p: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                  borderColor: '#1976d2',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
                },
              }}
            >
              <Link
                href="#"
                underline="none"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#1976d2',
                }}
              >
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  Supporting Documents
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                  {Math.random() * 5 + 1} MB
                </Typography>
              </Link>
            </Paper>
          </Stack>
        </Box>

        {/* Footer - Action Section */}
        <Box
          sx={{
            p: 3,
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', color: '#666', mb: 1.5 }}>
            Last Updated: {formatDate(claim.processedDate)}
          </Typography>
          {claim.status === 'Needs Manual Review' && onManualDecision && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#333', fontWeight: 600, mb: 1 }}>
                Manual Review Action
              </Typography>
              <TextField
                value={manualReason}
                onChange={(event) => setManualReason(event.target.value)}
                label="Reason (required for reject)"
                fullWidth
                size="small"
                multiline
                minRows={2}
                sx={{ mb: 1.5 }}
              />
              {manualError && (
                <Typography sx={{ fontSize: '0.8rem', color: '#d32f2f', mb: 1.25 }}>
                  {manualError}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={manualSubmitting}
                  onClick={() => handleManualAction('APPROVE')}
                  sx={{ flex: 1, textTransform: 'none' }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  disabled={manualSubmitting}
                  onClick={() => handleManualAction('REJECT')}
                  sx={{ flex: 1, textTransform: 'none' }}
                >
                  Reject
                </Button>
              </Stack>
            </Box>
          )}
          <Chip
            label="View Full File"
            variant="outlined"
            icon={undefined}
            onClick={onClose}
            sx={{
              width: '100%',
              height: '40px',
              color: '#1976d2',
              borderColor: '#1976d2',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#e3f2fd',
              },
            }}
          />
        </Box>
      </Box>
    </Drawer>
  );
});

ClaimDetailDrawer.displayName = 'ClaimDetailDrawer';
