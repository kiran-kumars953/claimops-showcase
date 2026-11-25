import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

interface CarrierStatusFilterProps {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}

export const CarrierStatusFilter = ({ value, onChange, disabled = false }: CarrierStatusFilterProps) => {
  return (
    <Box sx={{ minWidth: { xs: '100%', md: 260 } }}>
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel>Status</InputLabel>
        <Select value={value} label="Status" onChange={(e) => onChange(String(e.target.value))}>
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="CARRIER_PENDING">Pending</MenuItem>
          <MenuItem value="CARRIER_APPROVED">Approved</MenuItem>
          <MenuItem value="CARRIER_REJECTED">Rejected</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

