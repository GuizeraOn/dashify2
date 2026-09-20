interface PerformanceBadgeProps {
  roas: number;
}

export function PerformanceBadge({ roas }: PerformanceBadgeProps) {
  let color = 'bg-red-500/10 text-red-500 border-red-500/20';
  let label = 'Baixa';

  if (roas >= 2.0) {
    color = 'bg-green-500/10 text-green-500 border-green-500/20';
    label = 'Alta';
  } else if (roas > 1.0) {
    color = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    label = 'Atenção';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}
