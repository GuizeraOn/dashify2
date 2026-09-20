interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toLowerCase();
  
  let color = 'bg-gray-500/10 text-gray-400 border-gray-500/20'; // default
  
  if (s.includes('aprovado') || s.includes('completo')) {
    color = 'bg-green-500/10 text-green-500 border-green-500/20';
  } else if (s.includes('cancelado') || s.includes('devolvido') || s.includes('reclamado') || s.includes('chargeback')) {
    color = 'bg-red-500/10 text-red-500 border-red-500/20';
  } else if (s.includes('boleto') || s.includes('pix') || s.includes('aguardando')) {
    color = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status || 'Desconhecido'}
    </span>
  );
}
