import { Chip } from '@mui/material';

interface StatusChipProps {
  status:
    | 'TPA Approved'
    | 'Carrier Pending'
    | 'Carrier Approved'
    | 'Carrier Rejected'
    | 'Rejected'
    | 'Needs Manual Review'
    | 'Processing'
    | 'Review'
    | 'Pending';
}

export const StatusChip = ({ status }: StatusChipProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TPA Approved':
        return { bgColor: '#e8f5e9', textColor: '#2e7d32' };
      case 'Carrier Approved':
        return { bgColor: '#dcfce7', textColor: '#166534' };
      case 'Rejected':
        return { bgColor: '#ffebee', textColor: '#c62828' };
      case 'Carrier Rejected':
        return { bgColor: '#fee2e2', textColor: '#991b1b' };
      case 'Needs Manual Review':
        return { bgColor: '#fff3e0', textColor: '#e65100' };
      case 'Processing':
        return { bgColor: '#e3f2fd', textColor: '#1565c0' };
      case 'Carrier Pending':
        return { bgColor: '#e0f2fe', textColor: '#075985' };
      case 'Review':
        return { bgColor: '#fef3c7', textColor: '#92400e' };
      case 'Pending':
        return { bgColor: '#f5f5f5', textColor: '#616161' };
      default:
        return { bgColor: '#f5f5f5', textColor: '#616161' };
    }
  };

  const { bgColor, textColor } = getStatusColor(status);

  return (
    <Chip
      label={status}
      sx={{
        backgroundColor: bgColor,
        color: textColor,
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
};
