import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Container, Snackbar, Stack, Typography } from '@mui/material';

import apiService, { type CarrierDashboardSummary, type Claim } from '../services/api';
import { ClaimTable } from '../components/ClaimTable';
import { SearchBar } from '../components/SearchBar';
import { CarrierStatusFilter } from '../components/carrier/CarrierStatusFilter';
import { CarrierClaimReviewDialog } from '../components/carrier/CarrierClaimReviewDialog';

export const CarrierDashboard = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('CARRIER_PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [summary, setSummary] = useState<CarrierDashboardSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        try {
          const s = await apiService.fetchCarrierDashboardSummary();
          setSummary(s);
        } catch {
          setSummary(null);
        }

        const response = await apiService.fetchCarrierClaims({
          page: currentPage,
          size: 10,
          status: statusFilter === 'All' ? undefined : statusFilter,
          searchTerm: searchTerm || undefined,
        });
        setClaims(response.data || []);
        setTotalItems(response.total || 0);
      } catch {
        setClaims([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    if (summary) {
      return { pending: summary.pending, approved: summary.approved, rejected: summary.rejected };
    }
    const pending = claims.filter((c) => c.status === 'Carrier Pending').length;
    const approved = claims.filter((c) => c.status === 'Carrier Approved').length;
    const rejected = claims.filter((c) => c.status === 'Carrier Rejected').length;
    return { pending, approved, rejected };
  }, [claims, summary]);

  const handleRowClick = useCallback((claim: Claim) => {
    setSelectedClaimId(claim.id);
    setDetailOpen(true);
  }, []);

  const handleExport = useCallback(async (claimDbId: number) => {
    try {
      await apiService.downloadClaimPDF(claimDbId);
      setToast({ open: true, message: `Downloaded claim report for #${claimDbId}` });
    } catch {
      setToast({ open: true, message: `Failed to download report for #${claimDbId}` });
    }
  }, []);

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <Box
      sx={{
        border: '1px solid rgba(15,23,42,0.12)',
        borderRadius: 2,
        px: 2,
        py: 1.4,
        background: '#fff',
        minWidth: 160,
      }}
    >
      <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>{value}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1, sm: 1.5 } }}>
      <Card sx={{ mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f1fbff 100%)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.6 } }}>
          <Typography variant="h5" sx={{ mb: 0.6 }}>
            Carrier Dashboard
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.92rem' }}>
            Review and decide on claims submitted to your carrier.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Kpi label="Pending" value={String(kpis.pending)} />
            <Kpi label="Approved" value={String(kpis.approved)} />
            <Kpi label="Rejected" value={String(kpis.rejected)} />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mt: 2 }}>
            <Box sx={{ flex: 1, width: '100%' }}>
              <SearchBar onChange={setSearchTerm} disabled={loading} />
            </Box>
            <CarrierStatusFilter value={statusFilter} onChange={setStatusFilter} disabled={loading} />
          </Stack>
        </CardContent>
      </Card>

      {claims.length === 0 && !loading ? <Alert severity="info">No claims found.</Alert> : null}

      <ClaimTable
        claims={claims}
        loading={loading}
        currentPage={currentPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onExport={handleExport}
        onRowClick={handleRowClick}
        selectedRows={[]}
        onSelectRows={() => {}}
        enableSelection={false}
      />

      <CarrierClaimReviewDialog
        open={detailOpen}
        claimId={selectedClaimId}
        onClose={() => setDetailOpen(false)}
        onDecisionApplied={() => {
          setToast({ open: true, message: 'Decision saved.' });
          setDetailOpen(false);
          setCurrentPage(1);
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={() => setToast({ open: false, message: '' })}
        message={toast.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Container>
  );
};
