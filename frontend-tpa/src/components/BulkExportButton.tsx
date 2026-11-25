import { Button, Box, Snackbar, Alert } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useState, memo } from 'react';

interface BulkExportProps {
  selectedCount: number;
  onExport: () => void;
}

export const BulkExportButton = memo(({ selectedCount, onExport }: BulkExportProps) => {
  const [snackbar, setSnackbar] = useState(false);

  const handleClick = () => {
    if (selectedCount === 0) return;
    
    onExport();
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 3000);
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleClick}
          disabled={selectedCount === 0}
          sx={{
            backgroundColor: '#1976d2',
            color: '#fff',
            '.&:disabled': {
              backgroundColor: '#ccc',
              color: '#999',
            },
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Export {selectedCount > 0 ? `(${selectedCount})` : ''} to PDF
        </Button>
        {selectedCount > 0 && (
          <Box sx={{ fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>
            {selectedCount} claim{selectedCount !== 1 ? 's' : ''} selected
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {selectedCount} claim{selectedCount !== 1 ? 's' : ''} exported successfully!
        </Alert>
      </Snackbar>
    </>
  );
});

BulkExportButton.displayName = 'BulkExportButton';
