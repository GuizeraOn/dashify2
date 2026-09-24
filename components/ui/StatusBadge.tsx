'use client';

import { formatStatus } from '@/lib/status-helpers';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const formatted = formatStatus(status);
  
  let color = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  
  switch (formatted.category) {
    case 'approved':
      color = 'bg-green-500/10 text-green-400 border-green-500/20';
      break;
    case 'pending':
      color = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      break;
    case 'refused':
      color = 'bg-red-500/10 text-red-400 border-red-500/20';
      break;
    case 'cancelled':
      color = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      break;
    case 'refunded':
      color = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      break;
    default:
      color = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }

  const hasDetail = status && status.trim() !== formatted.label;

  return (
    <span
      title={hasDetail ? `Status original:\n${status}` : undefined}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${
        hasDetail ? 'cursor-help' : ''
      }`}
    >
      {formatted.label}
    </span>
  );
}
