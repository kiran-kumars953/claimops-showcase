import { FormControl, InputLabel, Select, MenuItem, Box, type SelectChangeEvent } from '@mui/material';

interface StatusFilterProps {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}

export const StatusFilter = ({ value, onChange, disabled = false }: StatusFilterProps) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <Box sx={{ minWidth: { xs: '100%', md: 240 } }}>
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel>Filter by Status</InputLabel>
        <Select
          value={value}
          label="Filter by Status"
          onChange={handleChange}
          sx={{
            borderRadius: 2,
            backgroundColor: '#f8fbff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(15, 23, 42, 0.12)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 95, 158, 0.35)',
            },
          }}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="TPA Approved">TPA Approved</MenuItem>
          <MenuItem value="Carrier Pending">Carrier Pending</MenuItem>
          <MenuItem value="Carrier Approved">Carrier Approved</MenuItem>
          <MenuItem value="Carrier Rejected">Carrier Rejected</MenuItem>
          <MenuItem value="Rejected">Rejected</MenuItem>
          <MenuItem value="Needs Manual Review">Needs Manual Review</MenuItem>
          <MenuItem value="Review">Review</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
