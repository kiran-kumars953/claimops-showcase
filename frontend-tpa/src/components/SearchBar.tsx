import { TextField, Box, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const SearchBar = ({ onChange, disabled = false }: SearchBarProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value.toLowerCase());
  };

  return (
    <Box sx={{ mb: { xs: 1.2, md: 0 } }}>
      <TextField
        fullWidth
        placeholder="Search by Claim ID or Policy Number..."
        variant="outlined"
        size="small"
        onChange={handleChange}
        disabled={disabled}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#f8fbff',
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'rgba(15, 23, 42, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 95, 158, 0.35)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#005f9e',
              borderWidth: '1px',
            },
          },
        }}
      />
    </Box>
  );
};
