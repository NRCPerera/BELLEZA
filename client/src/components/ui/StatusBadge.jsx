import Badge from './Badge';

const StatusBadge = ({ status }) => {
  const tones = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    completed: 'neutral',
    'no-show': 'danger',
  };

  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    'no-show': 'No-show',
  };

  return (
    <Badge tone={tones[status] || 'neutral'}>
      {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

export default StatusBadge;
