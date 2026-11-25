import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  Stack,
  Tab,
  Tabs,
  Select,
  TextField,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import apiService, { API_BASE_URL, type CarrierOption } from '../services/api';
import type { Claim } from '../services/api';

interface UploadFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const PREVIEW_BASE_URL = API_BASE_URL;
const NUMERIC_FIELDS = new Set(['bill_amount', 'final_bill_amount', 'claimed_amount']);

const toEditableMap = (data: Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!data || Object.keys(data).length === 0) {
    return {
      policy_number: '',
      patient_name: '',
      hospital_name: '',
      diagnosis: '',
      claimed_amount: '',
      final_bill_amount: '',
    };
  }
  return { ...data };
};

const toSubmitData = (data: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) {
      result[key] = '';
      continue;
    }

    const textValue = String(value).trim();
    if (NUMERIC_FIELDS.has(key)) {
      const numericValue = Number(textValue);
      result[key] = Number.isNaN(numericValue) ? textValue : numericValue;
    } else {
      result[key] = textValue;
    }
  }
  return result;
};

export const UploadForm = ({ onSuccess, onError }: UploadFormProps) => {
  const [claimForm, setClaimForm] = useState<File | null>(null);
  const [combinedDocument, setCombinedDocument] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewClaim, setReviewClaim] = useState<Claim | null>(null);
  const [editableData, setEditableData] = useState<Record<string, unknown>>({});
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [jsonContent, setJsonContent] = useState('{}');
  const [selectedDocument, setSelectedDocument] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [completedClaim, setCompletedClaim] = useState<Claim | null>(null);
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [carrierId, setCarrierId] = useState<number | ''>('');
  const [carriersLoading, setCarriersLoading] = useState(false);

  const dataKeys = useMemo(() => Object.keys(editableData).sort(), [editableData]);
  const currentStep = reviewClaim ? 1 : completedClaim ? 2 : 0;
  const steps = ['Upload Documents', 'Review Extracted Data', 'Decision Complete'];

  useEffect(() => {
    let alive = true;
    setCarriersLoading(true);
    apiService.fetchCarriers()
      .then((data) => {
        if (!alive) return;
        setCarriers(data || []);
      })
      .catch(() => {
        if (!alive) return;
        setCarriers([]);
      })
      .finally(() => {
        if (!alive) return;
        setCarriersLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, PNG, and JPG files are allowed';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must not exceed 10MB';
    }
    return null;
  };

  const handleClaimFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const error = validateFile(file);
    if (error) {
      setErrors((prev) => [...prev.filter((e) => !e.includes('Claim Form')), `Claim Form: ${error}`]);
      setClaimForm(null);
      return;
    }

    setClaimForm(file);
    setErrors((prev) => prev.filter((e) => !e.includes('Claim Form')));
  };

  const handleCombinedDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const error = validateFile(file);
    if (error) {
      setErrors((prev) => [...prev.filter((e) => !e.includes('Combined Document')), `Combined Document: ${error}`]);
      setCombinedDocument(null);
      return;
    }

    setCombinedDocument(file);
    setErrors((prev) => prev.filter((e) => !e.includes('Combined Document')));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!carrierId) {
      newErrors.push('Carrier selection is required');
    }
    if (!claimForm) {
      newErrors.push('Claim Form is required');
    }
    if (!combinedDocument) {
      newErrors.push('Combined Document is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleExtract = async () => {
    if (!validateForm()) {
      onError('Please fill all required fields correctly');
      return;
    }

    if (!claimForm || !combinedDocument) {
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      setCompletedClaim(null);
      setUploadProgress(35);
      const claim = await apiService.uploadClaimForReview(claimForm, combinedDocument, Number(carrierId));
      const mappedData = toEditableMap(claim.extractedData);

      setReviewClaim(claim);
      setEditableData(mappedData);
      setJsonContent(JSON.stringify(mappedData, null, 2));
      setSelectedDocument(0);
      setUploadProgress(100);
      onSuccess('OCR extraction completed. Review and edit data, then confirm to run rule validation.');
    } catch {
      onError('Failed to extract data from uploaded PDFs. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTableFieldChange = (key: string, value: string) => {
    const updated = { ...editableData, [key]: value };
    setEditableData(updated);
    setJsonContent(JSON.stringify(updated, null, 2));
  };

  const handleJsonBlur = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setEditableData(parsed as Record<string, unknown>);
        setErrors((prev) => prev.filter((e) => e !== 'JSON format is invalid'));
      } else {
        setErrors((prev) => [...prev.filter((e) => e !== 'JSON format is invalid'), 'JSON format is invalid']);
      }
    } catch {
      setErrors((prev) => [...prev.filter((e) => e !== 'JSON format is invalid'), 'JSON format is invalid']);
    }
  };

  const handleFinalize = async () => {
    if (!reviewClaim) {
      return;
    }

    let payloadData = editableData;
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(jsonContent);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          onError('Fix JSON formatting errors before confirming.');
          return;
        }
        payloadData = parsed as Record<string, unknown>;
        setEditableData(payloadData);
      } catch {
        onError('Fix JSON formatting errors before confirming.');
        return;
      }
    }

    setFinalizing(true);
    try {
      const payload = toSubmitData(payloadData);
      const result = await apiService.confirmClaim(reviewClaim.id, payload);
      setCompletedClaim(result);
      setReviewClaim(null);
      setEditableData({});
      setJsonContent('{}');
      setClaimForm(null);
      setCombinedDocument(null);
      setErrors([]);

      const fileInput1 = document.getElementById('claim-form-input') as HTMLInputElement;
      const fileInput2 = document.getElementById('combined-doc-input') as HTMLInputElement;
      if (fileInput1) {
        fileInput1.value = '';
      }
      if (fileInput2) {
        fileInput2.value = '';
      }

      onSuccess(`Claim processed successfully. Final status: ${result.status}`);
    } catch {
      onError('Unable to complete claim validation. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const canExtract = claimForm !== null && combinedDocument !== null && !uploading;

  if (!reviewClaim) {
    return (
      <Card sx={{ maxWidth: 700, mx: 'auto' }}>
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {completedClaim && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>
                    Last processed claim: {completedClaim.claimId} | Status: {completedClaim.status}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem' }}>
                    Triggered rules: {(completedClaim.triggeredRules || []).join(', ') || 'None'}
                    {completedClaim.carrierReferenceId ? ` | Carrier Ref: ${completedClaim.carrierReferenceId}` : ''}
                  </Typography>
                </Box>

                {completedClaim.status === 'TPA Approved' ? (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={async () => {
                      try {
                        const updated = await apiService.submitToCarrier(completedClaim.id);
                        setCompletedClaim(updated);
                        onSuccess(`Submitted to carrier. Ref: ${updated.carrierReferenceId || 'N/A'}`);
                      } catch {
                        onError('Failed to submit to carrier.');
                      }
                    }}
                    sx={{ textTransform: 'none', fontWeight: 800 }}
                  >
                    Submit to Carrier
                  </Button>
                ) : null}
              </Stack>
            </Alert>
          )}

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Upload Claim Documents
          </Typography>

          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Stack spacing={1}>
                {errors.map((error, index) => (
                  <Typography key={index} variant="body2">
                    - {error}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Carrier *
              </Typography>
              <FormControl fullWidth size="small" disabled={carriersLoading || uploading}>
                <InputLabel>Select Carrier</InputLabel>
                <Select
                  label="Select Carrier"
                  value={carrierId}
                  onChange={(event) => setCarrierId(event.target.value as number | '')}
                  sx={{ backgroundColor: '#f5f5f5' }}
                >
                  {carriers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {errors.some((e) => e.toLowerCase().includes('carrier')) && (
                <FormHelperText sx={{ color: '#d32f2f' }}>Carrier selection is required</FormHelperText>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Claim Form (PDF / Image) *
              </Typography>
              <input
                id="claim-form-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleClaimFormChange}
                style={{
                  display: 'block',
                  padding: '12px',
                  border: errors.some((e) => e.includes('Claim Form')) ? '2px solid #d32f2f' : '2px dashed #1976d2',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#f5f5f5',
                }}
              />
              {claimForm && (
                <FormHelperText sx={{ color: '#2e7d32', mt: 1 }}>
                  {claimForm.name}
                </FormHelperText>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Discharge Summary + Final Bill (Single Combined PDF/Image) *
              </Typography>
              <input
                id="combined-doc-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleCombinedDocumentChange}
                style={{
                  display: 'block',
                  padding: '12px',
                  border: errors.some((e) => e.includes('Combined Document')) ? '2px solid #d32f2f' : '2px dashed #1976d2',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#f5f5f5',
                }}
              />
              {combinedDocument && (
                <FormHelperText sx={{ color: '#2e7d32', mt: 1 }}>
                  {combinedDocument.name}
                </FormHelperText>
              )}
            </Box>

            {uploading && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Uploading and extracting... {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleExtract}
              disabled={!canExtract}
              fullWidth
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {uploading ? `Extracting (${uploadProgress}%)` : 'Upload & Extract Data'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const documents = reviewClaim.documents || [];
  const selectedDoc = documents[selectedDocument];
  const selectedDocUrl = selectedDoc ? `${PREVIEW_BASE_URL}${selectedDoc.previewUrl}` : '';
  const selectedDocName = selectedDoc?.filename?.toLowerCase() || '';
  const isImageDoc = selectedDocName.endsWith('.png') || selectedDocName.endsWith('.jpg') || selectedDocName.endsWith('.jpeg');

  return (
    <Card sx={{ mx: 'auto' }}>
      <CardContent>
        <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Review Extracted Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Claim: {reviewClaim.claimId} | OCR Confidence: {reviewClaim.extractionConfidence ?? 0}
        </Typography>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Stack spacing={0.5}>
              {errors.map((error, index) => (
                <Typography key={index} variant="body2">
                  - {error}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Document Preview
            </Typography>
            {documents.length > 0 ? (
              <>
                <Tabs
                  value={selectedDocument}
                  onChange={(_, value) => setSelectedDocument(value)}
                  variant="scrollable"
                  sx={{ mb: 1 }}
                >
                  {documents.map((doc) => (
                    <Tab key={doc.id} label={doc.filename} />
                  ))}
                </Tabs>
                <Box sx={{ border: '1px solid #ddd', borderRadius: 1, height: 560, overflow: 'hidden' }}>
                  {selectedDoc ? (
                    isImageDoc ? (
                      <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', backgroundColor: '#f8fbff' }}>
                        <img
                          src={selectedDocUrl}
                          alt={selectedDoc.filename}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                    ) : (
                      <object
                        data={selectedDocUrl}
                        type="application/pdf"
                        width="100%"
                        height="100%"
                        aria-label={selectedDoc.filename}
                      >
                        <Box sx={{ p: 2 }}>
                          <Alert severity="warning" sx={{ mb: 1.5 }}>
                            PDF preview is blocked by browser settings. Open it in a new tab.
                          </Alert>
                          <Link href={selectedDocUrl} target="_blank" rel="noreferrer">
                            Open {selectedDoc.filename}
                          </Link>
                        </Box>
                      </object>
                    )
                  ) : null}
                </Box>
                {selectedDoc && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="text"
                      component="a"
                      href={selectedDocUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in new tab
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="warning">No uploaded documents available for preview.</Alert>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Extracted Data (Editable)
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => {
                if (!value) {
                  return;
                }
                setViewMode(value);
                if (value === 'json') {
                  setJsonContent(JSON.stringify(editableData, null, 2));
                }
              }}
              size="small"
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="table">Tabular View</ToggleButton>
              <ToggleButton value="json">JSON View</ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'table' ? (
              <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 1.5, maxHeight: 560, overflowY: 'auto' }}>
                <Stack spacing={1.25}>
                  {dataKeys.map((key) => (
                    <TextField
                      key={key}
                      label={key}
                      value={editableData[key] == null ? '' : String(editableData[key])}
                      onChange={(event) => handleTableFieldChange(key, event.target.value)}
                      fullWidth
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            ) : (
              <TextField
                value={jsonContent}
                onChange={(event) => setJsonContent(event.target.value)}
                onBlur={handleJsonBlur}
                fullWidth
                multiline
                minRows={23}
                sx={{ fontFamily: 'monospace' }}
              />
            )}
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setReviewClaim(null);
              setEditableData({});
              setJsonContent('{}');
            }}
            disabled={finalizing}
          >
            Back to Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleFinalize}
            disabled={finalizing}
          >
            {finalizing ? 'Validating Rules...' : 'Confirm & Run Rule Engine'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
