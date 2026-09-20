'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import { CreditCard } from 'lucide-react';

interface CardApprovalStats {
  approved: number;
  refused: number;
  total: number;
  approval_rate: number;
  breakdown: { status: string; count: number }[];
}

interface Props {
  data?: CardApprovalStats;
}

// Cores por status normalizado
const STATUS_COLORS: Record<string, string> = {
  'aprovado':           '#22c55e',
  'cancelado':          '#ef4444',
  'recusado':           '#ef4444',
  'recusada':           '#ef4444',
  'chargeback':         '#f97316',
  'aguardando pagamento': '#facc15',
  'expirado':           '#6b7280',
  'reembolsado':        '#8b5cf6',
};

function getColor(status: string): string {
  const key = status.toLowerCase().trim();
  return STATUS_COLORS[key] ?? '#64748b';
}

export default function CardApprovalChart({ data }: Props) {
  const pieData = useMemo(() => {
    if (!data || data.total === 0) return [];
    return data.breakdown.map(item => ({
      name: item.status,
      value: item.count,
      pct: data.total > 0 ? ((item.count / data.total) * 100).toFixed(1) : '0',
      color: getColor(item.status),
    }));
  }, [data]);

  const noData = !data || data.total === 0;

  const rateColor =
    !data ? 'text-gray-400'
    : data.approval_rate >= 75 ? 'text-green-400'
    : data.approval_rate >= 50 ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">Taxa de Aprovação — Cartão</span>
        </div>
        {data && data.total > 0 && (
          <span className="text-xs text-gray-500">{data.total} transações</span>
        )}
      </div>

      {noData ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Sem dados de cartão no período
        </div>
      ) : (
        <>
          {/* Big rate + donut */}
          <div className="flex flex-row items-center flex-1 min-h-0 gap-4">
            {/* Left: big number */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 w-28">
              <span className={`text-4xl font-bold tabular-nums ${rateColor}`}>
                {data!.approval_rate}%
              </span>
              <span className="text-[11px] text-gray-500 mt-1 text-center leading-tight">Taxa de<br/>aprovação</span>
              <div className="mt-3 flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
                  <span className="text-gray-300">{data!.approved} aprovadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"/>
                  <span className="text-gray-300">{data!.refused} recusadas</span>
                </div>
              </div>
            </div>

            {/* Right: donut */}
            <div className="flex-1 h-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="65%"
                    dataKey="value"
                    stroke="none"
                    paddingAngle={1}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#242424', borderColor: '#333', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value} (${props.payload.pct}%)`,
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom: full breakdown legend */}
          <div className="flex-shrink-0 flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-[#2a2a2a] mt-1">
            {pieData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-400 text-[11px]">{entry.name} ({entry.pct}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
