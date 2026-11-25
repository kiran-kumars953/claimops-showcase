import { useState } from 'react';
import { Box, Container, Snackbar, Alert, Typography, Card, CardContent, Stack } from '@mui/material';
import { UploadForm } from '../components/UploadForm';

export const Upload = () => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSuccess = (message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'success',
    });
  };

  const handleError = (message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'error',
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3.2 }}>
      <Card sx={{ mb: 2.2, background: 'linear-gradient(125deg, #ffffff 0%, #f0fbf8 100%)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Submit New Claim
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload documents, review OCR extraction side-by-side, fix any fields, and then run rule validation for final decisioning.
          </Typography>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2.4 }}>
        <InfoCard title="Required Files" text="1) Claim Form 2) Combined discharge summary + final bill in one file." />
        <InfoCard title="Decision Pipeline" text="OCR Extraction -> Human Review -> Rule Engine -> Confidence Gate." />
        <InfoCard title="Final Outcomes" text="Approved, Rejected, or Needs Manual Review with full reasoning." />
      </Stack>

      <Box sx={{ mb: 2.8 }}>
        <Typography variant="h6" sx={{ mb: 0.6 }}>
          Submit New Claim
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload PDFs/images, review extracted fields in table or JSON, then confirm to continue processing.
        </Typography>
      </Box>

      <UploadForm onSuccess={handleSuccess} onError={handleError} />

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

const InfoCard = ({ title, text }: { title: string; text: string }) => (
  <Card sx={{ flex: 1, minWidth: 0 }}>
    <CardContent sx={{ p: 1.8 }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#005f9e', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', lineHeight: 1.45 }}>{text}</Typography>
    </CardContent>
  </Card>
);
