export const formatDate = (value: unknown): string => {
  if (!value) return 'N/A';
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)) {
    try {
      const dateValue = (value as { toDate: () => Date }).toDate();
      return dateValue.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  }
  return 'N/A';
};

export const getStatusBadge = (status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } => {
  switch (status) {
    case 'approved':
      return { variant: 'default', label: 'Approved' };
    case 'pending':
      return { variant: 'secondary', label: 'Pending' };
    case 'rejected':
      return { variant: 'destructive', label: 'Rejected' };
    case 'suspended':
      return { variant: 'destructive', label: 'Suspended' };
    default:
      return { variant: 'outline', label: status };
  }
};

