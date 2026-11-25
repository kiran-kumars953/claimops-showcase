import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Box,
  Typography,
  Tooltip,
  Pagination,
  Checkbox,
  TableSortLabel,
  Stack,
  LinearProgress,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { memo, useState, useCallback, useMemo } from 'react';
import { StatusChip } from './StatusChip';
import type { Claim } from '../services/api';

interface ClaimTableProps {
  claims: Claim[];
  loading: boolean;
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onExport: (claimDbId: number) => void;
  onSubmitToCarrier?: (claimDbId: number) => void;
  onRowClick: (claim: Claim) => void;
  selectedRows: number[];
  onSelectRows: (claimDbIds: number[]) => void;
  enableSelection?: boolean;
}

const ITEMS_PER_PAGE = 10;
type SortField = 'claimId' | 'customerName' | 'status' | 'createdDate';
type SortOrder = 'asc' | 'desc';

export const ClaimTable = memo(
  ({
    claims,
    loading,
    currentPage,
    onPageChange,
    totalItems,
    onExport,
    onSubmitToCarrier,
    onRowClick,
    selectedRows,
    onSelectRows,
    enableSelection = true,
  }: ClaimTableProps) => {
    const [sortField, setSortField] = useState<SortField>('createdDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = useCallback((field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    }, [sortField, sortOrder]);

    const sortedClaims = useMemo(() => {
      const sorted = [...claims];
      sorted.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === 'createdDate') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortField === 'status') {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      return sorted;
    }, [claims, sortField, sortOrder]);

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedClaims = sortedClaims; // Already paginated from server

    const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        onSelectRows(paginatedClaims.map((c) => c.id));
      } else {
        onSelectRows([]);
      }
    }, [paginatedClaims, onSelectRows]);

    const handleSelectRow = useCallback(
      (claimDbId: number) => {
        if (selectedRows.includes(claimDbId)) {
          onSelectRows(selectedRows.filter((id) => id !== claimDbId));
        } else {
          onSelectRows([...selectedRows, claimDbId]);
        }
      },
      [selectedRows, onSelectRows]
    );

    const isAllSelected = paginatedClaims.length > 0 && paginatedClaims.every((c) => selectedRows.includes(c.id));

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      );
    }

    if (claims.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6" color="text.secondary">
            No claims found
          </Typography>
        </Box>
      );
    }

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <Box>
        <TableContainer
          component={Paper}
          sx={{
            mb: 3,
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.1)',
            borderRadius: '14px',
            border: '1px solid rgba(15, 23, 42, 0.09)',
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {enableSelection ? (
                  <TableCell padding="checkbox" sx={{ py: 1.2, px: 1.5 }}>
                    <Checkbox
                      indeterminate={
                        paginatedClaims.length > 0 &&
                        selectedRows.some((id) => paginatedClaims.map((c) => c.id).includes(id)) &&
                        !isAllSelected
                      }
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      size="small"
                    />
                  </TableCell>
                ) : null}
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'claimId'}
                    direction={sortField === 'claimId' ? sortOrder : 'asc'}
                    onClick={() => handleSort('claimId')}
                  >
                    Claim ID
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  Policy #
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'customerName'}
                    direction={sortField === 'customerName' ? sortOrder : 'asc'}
                    onClick={() => handleSort('customerName')}
                  >
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  Carrier
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  Policy Name
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'createdDate'}
                    direction={sortField === 'createdDate' ? sortOrder : 'asc'}
                    onClick={() => handleSort('createdDate')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  Processed
                </TableCell>
                <TableCell sx={{ py: 1.2, px: 1.5, minWidth: 140 }}>Confidence</TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.2,
                    px: 1.5,
                  }}
                >
                  Reason
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: 'center',
                    py: 1.2,
                    px: 1.5,
                    width: 160,
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedClaims.map((claim) => (
                <TableRow
                  key={claim.claimId}
                  selected={enableSelection ? selectedRows.includes(claim.id) : false}
                  hover
                  onClick={() => onRowClick(claim)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f8f9fa !important',
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#e3f2fd',
                      '&:hover': {
                        backgroundColor: '#e3f2fd !important',
                      },
                    },
                  }}
                >
                  {enableSelection ? (
                    <TableCell padding="checkbox" sx={{ py: 1, px: 1.5 }}>
                      <Checkbox
                        checked={selectedRows.includes(claim.id)}
                        onChange={() => handleSelectRow(claim.id)}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      py: 1,
                      px: 1.5,
                      color: '#1976d2',
                      cursor: 'pointer',
                    }}
                  >
                    {claim.claimId}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, px: 1.5 }}>
                    {claim.policyNumber}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: '0.8rem', py: 1, px: 1.5, cursor: 'pointer' }}
                  >
                    {claim.customerName}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, px: 1.5 }}>
                    {claim.carrierName}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, px: 1.5, maxWidth: 150 }}>
                    {claim.policyName}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, px: 1.5 }}>
                    {formatDate(claim.createdDate)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, px: 1.5 }}>
                    {formatDate(claim.processedDate)}
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Stack spacing={0.6}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                        {Math.round(((claim.extractionConfidence ?? 0) as number) * 100)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(2, Math.min(100, ((claim.extractionConfidence ?? 0) as number) * 100))}
                        sx={{
                          height: 7,
                          borderRadius: 20,
                          backgroundColor: 'rgba(15,23,42,0.10)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 20,
                            background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 60%, #14b8a6 100%)',
                          },
                        }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <StatusChip status={claim.status} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', maxWidth: 180, py: 1, px: 1.5 }}>
                    <Tooltip title={claim.reason}>
                      <span>{claim.reason.length > 25 ? `${claim.reason.substring(0, 25)}...` : claim.reason}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1, px: 1.5 }}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View record">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowClick(claim);
                          }}
                          size="small"
                          sx={{ color: '#0f172a' }}
                        >
                          <VisibilityOutlinedIcon sx={{ fontSize: '1.05rem' }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Download PDF">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            onExport(claim.id);
                          }}
                          size="small"
                          sx={{ color: '#1976d2' }}
                        >
                          <FileDownloadIcon sx={{ fontSize: '1.05rem' }} />
                        </IconButton>
                      </Tooltip>

                      {claim.status === 'TPA Approved' && onSubmitToCarrier ? (
                        <Tooltip title="Submit to carrier">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              onSubmitToCarrier(claim.id);
                            }}
                            size="small"
                            sx={{ color: '#075985' }}
                          >
                            <SendRoundedIcon sx={{ fontSize: '1.05rem' }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            size="small"
          />
        </Box>
      </Box>
    );
  }
);

ClaimTable.displayName = 'ClaimTable';
