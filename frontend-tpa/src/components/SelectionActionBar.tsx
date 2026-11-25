import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { memo } from 'react';

interface SelectionActionBarProps {
  selectedIds: number[];
  selectedSingleStatus?: string;
  onView: (claimDbId: number) => void;
  onExport: (claimDbIds: number[]) => void | Promise<void>;
  onSubmitToCarrier?: (claimDbId: number) => void | Promise<void>;
}

export const SelectionActionBar = memo(({ selectedIds, selectedSingleStatus, onView, onExport, onSubmitToCarrier }: SelectionActionBarProps) => {
  const selectedCount = selectedIds.length;
  const canView = selectedCount === 1;
  const canExport = selectedCount > 0;
  const canSubmit = selectedCount === 1 && selectedSingleStatus === 'TPA Approved' && Boolean(onSubmitToCarrier);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        mb: 2.2,
        px: 2,
        py: 1.4,
        borderRadius: 2.5,
        border: '1px solid rgba(15,23,42,0.10)',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
        background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.06) 0%, rgba(99, 102, 241, 0.03) 100%)',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          <Chip
            label={`${selectedCount} selected`}
            sx={{
              fontWeight: 900,
              background: 'rgba(2, 132, 199, 0.16)',
              color: '#075985',
            }}
          />
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            Actions apply to the checked rows.
          </Typography>
        </Stack>

        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Tooltip title={canView ? 'View selected claim' : 'Select exactly one claim to view'}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityOutlinedIcon />}
                  disabled={!canView}
                  onClick={() => onView(selectedIds[0])}
                  sx={{ textTransform: 'none', fontWeight: 900 }}
                >
                  View Record
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                canSubmit
                  ? 'Submit the approved claim to carrier'
                  : selectedCount !== 1
                  ? 'Select exactly one claim to submit'
                  : selectedSingleStatus === 'TPA Approved'
                  ? 'Submit to carrier'
                  : 'Only Approved claims can be submitted'
              }
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<SendOutlinedIcon />}
                  disabled={!canSubmit}
                  onClick={() => onSubmitToCarrier?.(selectedIds[0])}
                  sx={{ textTransform: 'none', fontWeight: 900 }}
                >
                  Submit to Carrier
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Download claim decision report(s)">
              <span>
                <Button
                  variant="contained"
                  startIcon={<FileDownloadIcon />}
                  disabled={!canExport}
                  onClick={() => onExport(selectedIds)}
                  sx={{ textTransform: 'none', fontWeight: 900 }}
                >
                  Export PDF{selectedCount > 1 ? ` (${selectedCount})` : ''}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
});

SelectionActionBar.displayName = 'SelectionActionBar';
