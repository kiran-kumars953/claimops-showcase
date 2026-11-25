import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Container, Snackbar, Stack, Typography } from '@mui/material';

import apiService, { type Claim } from '../services/api';
import { ClaimTable } from '../components/ClaimTable';
import { SearchBar } from '../components/SearchBar';
import { CarrierStatusFilter } from '../components/carrier/CarrierStatusFilter';
import { CarrierClaimReviewDialog } from '../components/carrier/CarrierClaimReviewDialog';

export const CarrierClaims = ({ defaultStatus }: { defaultStatus: string }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
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

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1, sm: 1.5 } }}>
      <Card sx={{ mb: 2.5, background: 'linear-gradient(135deg, #ffffff 0%, #f1fbff 100%)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.6 } }}>
          <Typography variant="h5" sx={{ mb: 0.6 }}>
            Pending Claims
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.92rem' }}>
            Review submitted claims for your carrier. Approve or reject with reasons.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mt: 2 }}>
            <Box sx={{ flex: 1, width: '100%' }}>
              <SearchBar onChange={setSearchTerm} disabled={loading} />
            </Box>
            <CarrierStatusFilter value={statusFilter} onChange={setStatusFilter} disabled={loading} />
          </Stack>
        </CardContent>
      </Card>

      {claims.length === 0 && !loading ? <Alert severity="info">No claims found for the selected filters.</Alert> : null}

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
