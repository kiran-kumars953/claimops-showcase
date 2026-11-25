import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { memo, useEffect, useMemo, useState } from 'react';
import apiService, { API_BASE_URL, type AuditLogEntry, type Claim } from '../../services/api';
import { StatusChip } from '../StatusChip';

const toAbsolutePreviewUrl = (maybeRelative: string): string => {
  if (!maybeRelative) return '';
  if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) return maybeRelative;
  if (maybeRelative.startsWith('/')) return `${API_BASE_URL}${maybeRelative}`;
  return `${API_BASE_URL}/${maybeRelative}`;
};

export const CarrierClaimReviewDialog = memo(
  ({
    open,
    claimId,
    onClose,
    onDecisionApplied,
  }: {
    open: boolean;
    claimId: number | null;
    onClose: () => void;
    onDecisionApplied: () => void;
  }) => {
    const [claim, setClaim] = useState<Claim | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'docs' | 'fields' | 'timeline'>('docs');
    const [docIndex, setDocIndex] = useState(0);
    const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [reason, setReason] = useState('');
    const [approvedAmount, setApprovedAmount] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    useEffect(() => {
      if (!open || !claimId) return;
      let alive = true;
      setLoading(true);
      setError('');
      setDecision(null);
      setReason('');
      setApprovedAmount('');
      setTab('docs');
      setDocIndex(0);

      apiService
        .getCarrierClaimById(claimId)
        .then((data) => {
          if (!alive) return;
          setClaim(data);
        })
        .catch(() => {
          if (!alive) return;
          setClaim(null);
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });

      setAuditLoading(true);
      apiService
        .fetchCarrierAuditLogs(claimId)
        .then((rows) => {
          if (!alive) return;
          setAuditLogs(rows || []);
        })
        .catch(() => {
          if (!alive) return;
          setAuditLogs([]);
        })
        .finally(() => {
          if (!alive) return;
          setAuditLoading(false);
        });

      return () => {
        alive = false;
      };
    }, [open, claimId]);

    const docs = claim?.documents ?? [];
    const activeDoc = docs[docIndex];
    const activeDocUrl = activeDoc ? toAbsolutePreviewUrl(activeDoc.previewUrl) : '';

    const extractedPairs = useMemo(() => {
      const data = claim?.extractedData ?? {};
      return Object.entries(data)
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
        .map(([k, v]) => ({ k, v: typeof v === 'string' ? v : JSON.stringify(v) }))
        .sort((a, b) => a.k.localeCompare(b.k));
    }, [claim?.extractedData]);

    const handleSubmitDecision = async () => {
      if (!claim || !decision) return;
      if (claim.status !== 'Carrier Pending') {
        setError('This claim is not in Carrier Pending status.');
        return;
      }
      if (!reason.trim()) {
        setError('Reason is required.');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        const amt = approvedAmount.trim() ? Number(approvedAmount.trim()) : undefined;
        await apiService.submitCarrierDecision(claim.id, decision, reason.trim(), amt);
        onDecisionApplied();
      } catch {
        setError('Failed to submit decision.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle sx={{ px: 3, py: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 950 }}>
                  {claim?.claimId ?? (claimId ? `Claim #${claimId}` : 'Claim')}
                </Typography>
                {claim?.status ? <StatusChip status={claim.status} /> : null}
              </Stack>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.4 }}>
                Carrier review: validate documents and decide approve/reject.
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ px: 3, py: 2.4 }}>
          {loading ? (
            <Typography sx={{ color: 'text.secondary' }}>Loading...</Typography>
          ) : !claim ? (
            <Alert severity="error">Unable to load claim.</Alert>
          ) : (
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
              <Paper sx={{ flex: 1.35, p: 2, borderRadius: 2, border: '1px solid rgba(15,23,42,0.10)' }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{ minHeight: 40, mb: 1.2, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 900 } }}
                >
                  <Tab value="docs" label="Documents" />
                  <Tab value="fields" label="Extracted Fields" />
                  <Tab value="timeline" label="Timeline" />
                </Tabs>

                {tab === 'docs' ? (
                  <Stack spacing={1.2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                      {docs.map((doc, idx) => (
                        <Button
                          key={doc.id}
                          variant={idx === docIndex ? 'contained' : 'outlined'}
                          onClick={() => setDocIndex(idx)}
                          sx={{ textTransform: 'none', fontWeight: 900 }}
                        >
                          {doc.type.replaceAll('_', ' ')}
                        </Button>
                      ))}
                    </Stack>

                    {activeDoc ? (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography sx={{ fontWeight: 900 }}>{activeDoc.filename}</Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInNewIcon fontSize="small" />}
                            onClick={() => window.open(activeDocUrl, '_blank', 'noopener,noreferrer')}
                            sx={{ textTransform: 'none' }}
                          >
                            Open Full
                          </Button>
                        </Stack>
                        <Box sx={{ height: 520, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                          <object data={activeDocUrl} type="application/pdf" width="100%" height="100%">
                            <Box sx={{ p: 2 }}>
                              <Typography sx={{ mb: 1 }}>Preview not available.</Typography>
                              <Button variant="contained" onClick={() => window.open(activeDocUrl, '_blank', 'noopener,noreferrer')}>
                                Open Document
                              </Button>
                            </Box>
                          </object>
                        </Box>
                      </Box>
                    ) : (
                      <Alert severity="info">No documents available.</Alert>
                    )}
                  </Stack>
                ) : tab === 'fields' ? (
                  <Box sx={{ maxHeight: 560, overflow: 'auto' }}>
                    {extractedPairs.map((row) => (
                      <Box key={row.k} sx={{ py: 1.1, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: 'text.secondary' }}>{row.k}</Typography>
                        <Typography sx={{ fontSize: '0.92rem' }}>{row.v}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: 560, overflow: 'auto' }}>
                    {auditLoading ? (
                      <Typography sx={{ color: 'text.secondary' }}>Loading timeline...</Typography>
                    ) : auditLogs.length === 0 ? (
                      <Alert severity="info">No audit history yet.</Alert>
                    ) : (
                      <Stack spacing={1}>
                        {auditLogs.map((row) => (
                          <Box
                            key={row.id}
                            sx={{
                              p: 1.4,
                              borderRadius: 2,
                              border: '1px solid rgba(15,23,42,0.10)',
                              background: 'rgba(255,255,255,0.9)',
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
                              <Typography sx={{ fontWeight: 950, fontSize: '0.92rem' }}>{row.action}</Typography>
                              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                {new Date(row.createdAt).toLocaleString('en-US')}
                              </Typography>
                            </Stack>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.2 }}>
                              {row.actionType}
                              {row.actorUsername ? ` • ${row.actorUsername}` : ''}
                            </Typography>
                            {row.message ? (
                              <Typography sx={{ mt: 0.6, fontSize: '0.9rem', color: '#0f172a' }}>{row.message}</Typography>
                            ) : null}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </Paper>

              <Paper sx={{ flex: 0.85, p: 2, borderRadius: 2, border: '1px solid rgba(15,23,42,0.10)' }}>
                <Typography sx={{ fontWeight: 950, mb: 1.2 }}>Decision Panel</Typography>

                {claim.status !== 'Carrier Pending' ? (
                  <Alert severity="info" sx={{ mb: 1.2 }}>
                    Decisions are allowed only when status is <b>Carrier Pending</b>.
                  </Alert>
                ) : null}

                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 0.6 }}>Decision</Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1.4 }}>
                  <Button
                    variant={decision === 'APPROVE' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => setDecision('APPROVE')}
                    sx={{ textTransform: 'none', fontWeight: 900, flex: 1 }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={decision === 'REJECT' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => setDecision('REJECT')}
                    sx={{ textTransform: 'none', fontWeight: 900, flex: 1 }}
                  >
                    Reject
                  </Button>
                </Stack>

                {decision === 'APPROVE' ? (
                  <TextField
                    label="Approved Amount (optional)"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 1.4 }}
                  />
                ) : null}

                <TextField
                  label="Reason (required)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  sx={{ mb: 1.2 }}
                />

                {error ? (
                  <Alert severity="error" sx={{ mb: 1.2 }}>
                    {error}
                  </Alert>
                ) : null}

                <Button
                  variant="contained"
                  disabled={!decision || submitting || claim.status !== 'Carrier Pending'}
                  onClick={handleSubmitDecision}
                  sx={{ textTransform: 'none', fontWeight: 950, width: '100%' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Decision'}
                </Button>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

CarrierClaimReviewDialog.displayName = 'CarrierClaimReviewDialog';

