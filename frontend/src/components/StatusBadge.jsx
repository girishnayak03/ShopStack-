import React from 'react';

const statusColors = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PACKED: '#8b5cf6',
  SHIPPED: '#6366f1',
  OUT_FOR_DELIVERY: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',

  RETURNED: '#f97316',
  RETURN_REQUESTED: '#f97316',
  RETURN_APPROVED: '#f97316',
  RETURN_PICKED: '#f97316',
  RETURN_RECEIVED: '#f97316',

  REFUND_INITIATED: '#a855f7',
  REFUND_COMPLETED: '#10b981',
  REFUNDED: '#10b981',
};

const formatStatus = (status = 'PENDING') => String(status).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StatusBadge({ status }) {
  const normalizedStatus = String(status || 'PENDING').toUpperCase().replace(/ /g, '_');
  const color = statusColors[normalizedStatus] || 'var(--text-muted)';
  return <span style={{ color, background: `${color}20`, border: `1px solid ${color}55`, borderRadius: '999px', padding: '3px 9px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatStatus(normalizedStatus)}</span>;
}
