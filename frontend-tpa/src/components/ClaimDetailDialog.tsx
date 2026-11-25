import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { memo, useEffect, useMemo, useState } from 'react';
import apiService, { API_BASE_URL, type Claim } from '../services/api';
import { StatusChip } from './StatusChip';

interface ClaimDetailDialogProps {
  open: boolean;
  claimId: number | null;
  onClose: () => void;
  onExport?: (claimDbId: number) => Promise<void>;
  onManualDecision?: (claimDbId: number, decision: 'APPROVE' | 'REJECT', reason?: string) => Promise<void>;
  onCarrierSubmitted?: () => void;
}

type TabKey = 'overview' | 'extracted' | 'documents' | 'rules';

const formatDate = (dateString?: string): string => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const kvPairs = (record?: Record<string, unknown>): Array<{ k: string; v: string }> => {
  if (!record) return [];
  return Object.entries(record)
    .filter(([k, v]) => k && v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => ({ k, v: typeof v === 'string' ? v : JSON.stringify(v) }))
    .sort((a, b) => a.k.localeCompare(b.k));
};

const toAbsolutePreviewUrl = (maybeRelative: string): string => {
  if (!maybeRelative) return '';
  if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) return maybeRelative;
  if (maybeRelative.startsWith('/')) return `${API_BASE_URL}${maybeRelative}`;
  return `${API_BASE_URL}/${maybeRelative}`;
};

export const ClaimDetailDialog = memo(({ open, claimId, onClose, onExport, onManualDecision, onCarrierSubmitted }: ClaimDetailDialogProps) => {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('overview');
  const [manualReason, setManualReason] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [carrierSubmitting, setCarrierSubmitting] = useState(false);
  const [carrierError, setCarrierError] = useState('');
  const [docIndex, setDocIndex] = useState(0);

  useEffect(() => {
    if (!open || !claimId) return;

    let alive = true;
    setLoading(true);
    setClaim(null);
    setTab('overview');
    setManualReason('');
    setManualSubmitting(false);
    setManualError('');
    setCarrierSubmitting(false);
    setCarrierError('');
    setDocIndex(0);

    apiService
      .getClaimById(claimId)
      .then((data) => {
        if (!alive) return;
        setClaim(data);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, claimId]);

  const extractedRows = useMemo(() => kvPairs(claim?.extractedData), [claim?.extractedData]);
  const docs = claim?.documents ?? [];
  const activeDoc = docs[docIndex];
  const activeDocUrl = activeDoc ? toAbsolutePreviewUrl(activeDoc.previewUrl) : '';

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(claim?.extractedData ?? {}, null, 2));
    } catch {
      // ignore; clipboard blocked
    }
  };

  const handleManualAction = async (decision: 'APPROVE' | 'REJECT') => {
    if (!claim || !onManualDecision) return;
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

  const handleSubmitToCarrier = async () => {
    if (!claim) return;
    setCarrierSubmitting(true);
    setCarrierError('');
    try {
      const updated = await apiService.submitToCarrier(claim.id);
      setClaim(updated);
      onCarrierSubmitted?.();
    } catch {
      setCarrierError('Failed to submit to carrier.');
    } finally {
      setCarrierSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: 0.2 }}>
                {claim?.claimId ?? (claimId ? `Claim #${claimId}` : 'Claim')}
              </Typography>
              {claim?.status ? <StatusChip status={claim.status} /> : null}
              {typeof claim?.extractionConfidence === 'number' ? (
                <Chip
                  size="small"
                  label={`Confidence ${(claim.extractionConfidence * 100).toFixed(0)}%`}
                  sx={{
                    fontWeight: 700,
                    background: 'rgba(2, 132, 199, 0.12)',
                    color: '#075985',
                  }}
                />
              ) : null}
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
              Review extracted fields, rule outcomes, and decision audit details.
            </Typography>
          </Box>

          <IconButton onClick={onClose} size="small" sx={{ color: '#0f172a' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <Box sx={{ px: 3, pt: 1.5 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': { textTransform: 'none', minHeight: 40, fontWeight: 800 },
          }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="extracted" label="Extracted Data" />
          <Tab value="documents" label="Documents" />
          <Tab value="rules" label="Rules & Audit" />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !claim ? (
          <Alert severity="error">Unable to load claim details.</Alert>
        ) : tab === 'overview' ? (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <Paper sx={{ flex: 1, p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1.5, color: '#0f172a' }}>Claim Summary</Typography>
              <InfoRow label="Policy Number" value={claim.policyNumber || '--'} />
              <InfoRow label="Policy Name" value={claim.policyName || '--'} />
              <InfoRow label="Customer" value={claim.customerName || '--'} />
              <InfoRow label="Carrier" value={claim.carrierName || '--'} />
              <InfoRow label="Created" value={formatDate(claim.createdDate)} />
              <InfoRow label="Processed" value={formatDate(claim.processedDate)} />
              <InfoRow label="Carrier Ref" value={claim.carrierReferenceId || '--'} />
            </Paper>

            <Paper sx={{ flex: 1, p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1.5, color: '#0f172a' }}>Decision Context</Typography>
              <InfoRow label="Recommendation" value={claim.recommendationStatus || '--'} />
              <InfoRow
                label="Rule Failures"
                value={`${claim.rulesFailedCount ?? 0} / ${claim.rulesExecutedCount ?? 0}`}
              />
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: 'text.secondary', mb: 0.8 }}>
                  Triggered Rules
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {(claim.triggeredRules ?? []).length === 0 ? (
                    <Chip size="small" label="None" />
                  ) : (
                    (claim.triggeredRules ?? []).map((r) => <Chip key={r} size="small" label={r} />)
                  )}
                </Stack>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: 'text.secondary', mb: 0.8 }}>
                Reason
              </Typography>
              <Paper sx={{ p: 1.6, borderRadius: 2, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
                <Typography sx={{ fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.55 }}>
                  {claim.reason || '--'}
                </Typography>
              </Paper>
            </Paper>
          </Stack>
        ) : tab === 'extracted' ? (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <Paper sx={{ flex: 1, p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>Tabular View</Typography>
                <Tooltip title="Copy JSON">
                  <IconButton onClick={handleCopyJson} size="small">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Box sx={{ maxHeight: 460, overflow: 'auto', pr: 0.5 }}>
                {extractedRows.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>No extracted data available.</Typography>
                ) : (
                  extractedRows.map((row) => (
                    <Box key={row.k} sx={{ py: 1.1, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: 'text.secondary' }}>
                        {row.k}
                      </Typography>
                      <Typography sx={{ fontSize: '0.92rem', color: '#0f172a' }}>{row.v}</Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>

            <Paper sx={{ flex: 1, p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1.2, color: '#0f172a' }}>JSON View</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.6,
                  borderRadius: 2,
                  background: '#0b1220',
                  color: '#e2e8f0',
                  overflow: 'auto',
                  maxHeight: 460,
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(claim.extractedData ?? {}, null, 2)}
              </Box>
            </Paper>
          </Stack>
        ) : tab === 'documents' ? (
          <Stack spacing={2}>
            <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1.5, color: '#0f172a' }}>Document Set</Typography>
              {docs.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>No document preview links available.</Typography>
              ) : (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                  {docs.map((doc, idx) => (
                    <Paper
                      key={doc.id}
                      onClick={() => setDocIndex(idx)}
                      sx={{
                        flex: 1,
                        p: 1.6,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: idx === docIndex ? '1px solid rgba(2, 132, 199, 0.55)' : '1px solid rgba(15,23,42,0.08)',
                        background: idx === docIndex ? 'rgba(2, 132, 199, 0.06)' : '#fff',
                        transition: 'all 160ms ease',
                        '&:hover': { borderColor: 'rgba(2, 132, 199, 0.75)' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                            {doc.type.replaceAll('_', ' ')}
                          </Typography>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                            {doc.filename}
                          </Typography>
                        </Box>
                        <Tooltip title="Open in new tab">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(toAbsolutePreviewUrl(doc.previewUrl), '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>

            {activeDoc ? (
              <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>{activeDoc.filename}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{activeDoc.type}</Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={() => window.open(activeDocUrl, '_blank', 'noopener,noreferrer')}
                    sx={{ textTransform: 'none' }}
                  >
                    Open Full
                  </Button>
                </Stack>
                <Box
                  sx={{
                    height: 520,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(15,23,42,0.10)',
                    background: '#fff',
                  }}
                >
                  <object data={activeDocUrl} type="application/pdf" width="100%" height="100%">
                    <Box sx={{ p: 2 }}>
                      <Typography sx={{ mb: 1 }}>Preview not available in this browser.</Typography>
                      <Button
                        variant="contained"
                        onClick={() => window.open(activeDocUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Open Document
                      </Button>
                    </Box>
                  </object>
                </Box>
              </Paper>
            ) : null}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1.2, color: '#0f172a' }}>Rule Execution</Typography>
              <InfoRow label="Rules executed" value={(claim.rulesExecutedCount ?? 0).toString()} />
              <InfoRow label="Rules failed" value={(claim.rulesFailedCount ?? 0).toString()} />
              <InfoRow label="Recommendation" value={claim.recommendationStatus || '--'} />
              <Divider sx={{ my: 1.6 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: 'text.secondary', mb: 0.8 }}>
                Triggered Rules
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {(claim.triggeredRules ?? []).length === 0 ? (
                  <Chip size="small" label="None" />
                ) : (
                  (claim.triggeredRules ?? []).map((r) => <Chip key={r} size="small" label={r} />)
                )}
              </Stack>
            </Paper>

            {claim.status === 'Needs Manual Review' && onManualDecision ? (
              <Paper sx={{ p: 2.2, borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.10)' }}>
                <Typography sx={{ fontWeight: 900, mb: 1.2, color: '#0f172a' }}>Manual Review Action</Typography>
                <TextField
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  label="Reason (required for reject)"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                />
                {manualError ? (
                  <Typography sx={{ mt: 1, fontSize: '0.85rem', color: '#b91c1c' }}>{manualError}</Typography>
                ) : null}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.4 }}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={manualSubmitting}
                    onClick={() => handleManualAction('APPROVE')}
                    sx={{ textTransform: 'none', fontWeight: 900 }}
                  >
                    Approve (Manual)
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    disabled={manualSubmitting}
                    onClick={() => handleManualAction('REJECT')}
                    sx={{ textTransform: 'none', fontWeight: 900 }}
                  >
                    Reject (Manual)
                  </Button>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%', justifyContent: 'space-between' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
              Close
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {carrierError ? (
              <Alert severity="error" sx={{ py: 0.2, alignItems: 'center' }}>
                {carrierError}
              </Alert>
            ) : null}
            {claim?.status === 'TPA Approved' ? (
              <Button
                variant="contained"
                color="primary"
                disabled={carrierSubmitting}
                onClick={handleSubmitToCarrier}
                sx={{ textTransform: 'none', fontWeight: 900 }}
              >
                {carrierSubmitting ? 'Submitting...' : 'Submit to Carrier'}
              </Button>
            ) : claim?.status === 'Carrier Pending' ? (
              <Button variant="outlined" disabled sx={{ textTransform: 'none', fontWeight: 900 }}>
                Carrier Pending
              </Button>
            ) : null}
            <Button
              variant="contained"
              disabled={!claim || !onExport}
              onClick={() => claim && onExport?.(claim.id)}
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Export PDF
            </Button>
          </Stack>
        </Stack>
      </DialogActions>
    </Dialog>
  );
});

ClaimDetailDialog.displayName = 'ClaimDetailDialog';

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', py: 0.9 }}>
    <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);
