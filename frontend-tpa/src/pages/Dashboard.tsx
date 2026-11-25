import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ClaimTable } from '../components/ClaimTable';
import { SearchBar } from '../components/SearchBar';
import { StatusFilter } from '../components/StatusFilter';
import { KPISummary } from '../components/KPISummary';
import { ClaimDetailDialog } from '../components/ClaimDetailDialog';
import { SelectionActionBar } from '../components/SelectionActionBar';
import apiService from '../services/api';
import type { Claim, TpaDashboardSummary } from '../services/api';

export const Dashboard = () => {
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [dashboardSummary, setDashboardSummary] = useState<TpaDashboardSummary | null>(null);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const loadClaims = async () => {
      try {
        setLoading(true);
        // Summary is global (not page-scoped) so KPI cards stay accurate.
        try {
          const summary = await apiService.fetchDashboardSummary();
          setDashboardSummary(summary);
        } catch {
          setDashboardSummary(null);
        }

        const response = await apiService.fetchClaims({
          page: currentPage,
          size: 10,
          status: statusFilter === 'All' ? undefined : statusFilter,
          searchTerm: searchTerm || undefined,
        });

        if (response && response.data) {
          setAllClaims(response.data);
          setTotalItems(response.total || 0);
          setFilteredClaims(response.data);
          setSelectedRows([]);
        } else {
          setAllClaims([]);
          setTotalItems(0);
          setFilteredClaims([]);
          setSelectedRows([]);
        }

        setLastSyncAt(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (error) {
        console.error('Failed to load claims:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load claims from server',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadClaims();
  }, [currentPage, statusFilter, searchTerm, refreshKey]);

  useEffect(() => {
    setFilteredClaims(allClaims);
  }, [allClaims]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleExport = useCallback(async (claimDbId: number) => {
    try {
      setSnackbar({
        open: true,
        message: `Downloading claim report for #${claimDbId}...`,
        severity: 'info',
      });
      await apiService.downloadClaimPDF(claimDbId);
      setSnackbar({
        open: true,
        message: `Claim report downloaded for #${claimDbId}`,
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: `Failed to download claim report for #${claimDbId}`,
        severity: 'error',
      });
    }
  }, []);

  const handleRowClick = useCallback((claim: Claim) => {
    setSelectedClaimId(claim.id);
    setDetailOpen(true);
  }, []);

  const handleSelectRowsDbIds = useCallback((claimDbIds: number[]) => {
    setSelectedRows(claimDbIds);
  }, []);

  const handleViewSelected = useCallback((claimDbId: number) => {
    setSelectedClaimId(claimDbId);
    setDetailOpen(true);
  }, []);

  const handleExportSelected = useCallback(
    async (claimDbIds: number[]) => {
      if (claimDbIds.length === 0) return;

      try {
        setSnackbar({
          open: true,
          message:
            claimDbIds.length === 1
              ? `Downloading claim report for #${claimDbIds[0]}...`
              : `Starting downloads for ${claimDbIds.length} claim reports...`,
          severity: 'info',
        });

        let successCount = 0;
        for (const id of claimDbIds) {
          // Keep it sequential; many browsers block parallel "download" clicks.
          await apiService.downloadClaimPDF(id);
          successCount++;
        }

        setSnackbar({
          open: true,
          message: successCount === 1 ? 'Claim report downloaded.' : `${successCount} claim reports downloaded.`,
          severity: 'success',
        });

        setSelectedRows([]);
      } catch {
        setSnackbar({
          open: true,
          message: 'Failed to download one or more claim reports. Try exporting one claim at a time.',
          severity: 'error',
        });
      }
    },
    []
  );

  const handleSubmitToCarrier = useCallback(
    async (claimDbId: number) => {
      try {
        setSnackbar({
          open: true,
          message: `Submitting claim #${claimDbId} to carrier...`,
          severity: 'info',
        });
        await apiService.submitToCarrier(claimDbId);
        setSnackbar({
          open: true,
          message: `Claim #${claimDbId} submitted to carrier.`,
          severity: 'success',
        });
        setSelectedRows([]);
        setRefreshKey((prev) => prev + 1);
      } catch {
        setSnackbar({
          open: true,
          message: `Failed to submit claim #${claimDbId} to carrier.`,
          severity: 'error',
        });
      }
    },
    []
  );

  const handleManualDecision = useCallback(
    async (claimId: number, decision: 'APPROVE' | 'REJECT', reason?: string) => {
      try {
        await apiService.applyManualReviewDecision(claimId, decision, reason);
        setSnackbar({
          open: true,
          message: `Manual review updated: ${decision}`,
          severity: 'success',
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Failed to update manual review decision',
          severity: 'error',
        });
        throw error;
      }
    },
    []
  );

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const operationalMetrics = useMemo(() => {
    const reviewQueue = allClaims.filter((item) => item.status === 'Needs Manual Review').length;
    const approved = allClaims.filter((item) => item.status === 'TPA Approved' || item.status === 'Carrier Approved').length;
    const autoDecisionRate = allClaims.length === 0 ? 0 : Math.round((approved / allClaims.length) * 100);
    const extractionAvg =
      allClaims.length === 0
        ? 0
        : Math.round(
            (allClaims.reduce((sum, item) => sum + (item.extractionConfidence ?? 0), 0) / allClaims.length) * 100
          );

    return { reviewQueue, autoDecisionRate, extractionAvg };
  }, [allClaims]);

  const selectedSingleStatus = useMemo(() => {
    if (selectedRows.length !== 1) return undefined;
    const selected = allClaims.find((c) => c.id === selectedRows[0]);
    return selected?.status;
  }, [allClaims, selectedRows]);

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1, sm: 1.5 } }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.6 }}>
            Claims
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.92rem' }}>
            Search, review, validate, and submit claims with full audit visibility.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <FormControlLabel
            control={<Switch checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />}
            label="Auto refresh (30s)"
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setRefreshKey((prev) => prev + 1)}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          mb: 2.2,
          p: { xs: 1.2, sm: 1.6 },
          borderRadius: 2.5,
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
          <MetricPill label="Manual Queue" value={operationalMetrics.reviewQueue.toString()} tone="#c96a16" />
          <MetricPill label="Auto Decision Rate" value={`${operationalMetrics.autoDecisionRate}%`} tone="#0d9488" />
          <MetricPill label="Avg Confidence" value={`${operationalMetrics.extractionAvg}%`} tone="#005f9e" />
          <MetricPill label="Last Sync" value={lastSyncAt || '--'} tone="#475569" />
        </Stack>
      </Paper>

      <KPISummary claims={allClaims} loading={loading} summary={dashboardSummary ?? undefined} />

      <Paper
        variant="outlined"
        sx={{
          mb: 2.0,
          p: 1.8,
          borderRadius: 2.5,
          background: 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1, width: '100%' }}>
            <SearchBar onChange={handleSearch} disabled={loading} />
          </Box>
          <StatusFilter value={statusFilter} onChange={handleStatusFilterChange} disabled={loading} />
        </Stack>
      </Paper>

      <SelectionActionBar
        selectedIds={selectedRows}
        selectedSingleStatus={selectedSingleStatus}
        onView={handleViewSelected}
        onExport={handleExportSelected}
        onSubmitToCarrier={handleSubmitToCarrier}
      />

      <ClaimTable
        claims={filteredClaims}
        loading={loading}
        currentPage={currentPage}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onExport={handleExport}
        onSubmitToCarrier={handleSubmitToCarrier}
        onRowClick={handleRowClick}
        selectedRows={selectedRows}
        onSelectRows={handleSelectRowsDbIds}
      />

      <ClaimDetailDialog
        open={detailOpen}
        claimId={selectedClaimId}
        onClose={() => setDetailOpen(false)}
        onManualDecision={handleManualDecision}
        onExport={handleExport}
        onCarrierSubmitted={() => setRefreshKey((prev) => prev + 1)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const MetricPill = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <Box
    sx={{
      border: '1px solid rgba(15,23,42,0.12)',
      borderRadius: 999,
      px: 1.4,
      py: 0.72,
      background: '#fff',
      minWidth: { xs: '100%', sm: 'auto' },
    }}
  >
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.2 }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.86rem', fontWeight: 800, color: tone }}>{value}</Typography>
  </Box>
);
