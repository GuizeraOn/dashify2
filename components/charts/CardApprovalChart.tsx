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
import { formatStatus } from '@/lib/status-helpers';

interface CardApprovalStats {
  approved: number;
  refused: number;
  total: number;
  resolved?: number;
  approval_rate: number;
  breakdown: { status: string; count: number }[];
}

interface Props {
  data?: CardApprovalStats;
}

interface PieEntry {
  name: string;
  value: number;
  pct: string;
  color: string;
  rawMessages: string[];
}

export default function CardApprovalChart({ data }: Props) {
  const pieData = useMemo<PieEntry[]>(() => {
    if (!data || data.total === 0) return [];

    // Agrupa e simplifica os status/erros técnicos usando formatStatus
    const groups: Record<
      string,
      { label: string; count: number; color: string; rawMessages: string[] }
    > = {};

    data.breakdown.forEach((item) => {
      const formatted = formatStatus(item.status);
      if (!groups[formatted.label]) {
        groups[formatted.label] = {
          label: formatted.label,
          count: 0,
          color: formatted.color,
          rawMessages: [],
        };
      }
      groups[formatted.label].count += item.count;
      if (item.status && !groups[formatted.label].rawMessages.includes(item.status)) {
        groups[formatted.label].rawMessages.push(item.status);
      }
    });

    return Object.values(groups)
      .sort((a, b) => b.count - a.count)
      .map((g) => ({
        name: g.label,
        value: g.count,
        pct: data.total > 0 ? ((g.count / data.total) * 100).toFixed(1) : '0',
        color: g.color,
        rawMessages: g.rawMessages,
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
          <span className="text-xs text-gray-500">
            {data.resolved !== undefined && data.resolved !== data.total
              ? `${data.resolved} processadas (${data.total} total)`
              : `${data.total} transações`}
          </span>
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
              <span
                className="text-[11px] text-gray-500 mt-1 text-center leading-tight cursor-help"
                title="Calculado contra as aprovadas: Aprovadas ÷ (Aprovadas + Não Autorizado + Cartão Inválido + Cancelado + Outros). Aguardando e abandonos ficam de fora."
              >
                Taxa de<br/>aprovação
              </span>
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
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const entry = payload[0].payload as PieEntry;
                      const hasRawDetail =
                        entry.rawMessages &&
                        entry.rawMessages.some(
                          (m) => m.toLowerCase().trim() !== entry.name.toLowerCase().trim()
                        );

                      return (
                        <div className="bg-[#1E1E1E] border border-[#333] p-2.5 rounded-lg shadow-xl text-xs max-w-xs z-50">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-semibold text-white">{entry.name}</span>
                            <span className="text-gray-400">({entry.pct}%)</span>
                          </div>
                          <div className="text-gray-300 font-medium">
                            {entry.value} {entry.value === 1 ? 'transação' : 'transações'}
                          </div>
                          {hasRawDetail && (
                            <div className="mt-2 pt-2 border-t border-[#333] text-[11px] text-gray-400">
                              <span className="text-gray-500 font-medium block mb-1">
                                Motivo do Gateway:
                              </span>
                              {entry.rawMessages.map((msg, i) => (
                                <p key={i} className="leading-snug break-words italic text-gray-300 mb-1">
                                  "{msg}"
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom: full breakdown legend */}
          <div className="flex-shrink-0 flex flex-wrap gap-x-3 gap-y-1.5 pt-1.5 border-t border-[#2a2a2a] mt-1 max-h-20 overflow-y-auto">
            {pieData.map((entry, idx) => {
              const hasRawDetail =
                entry.rawMessages &&
                entry.rawMessages.some(
                  (m) => m.toLowerCase().trim() !== entry.name.toLowerCase().trim()
                );
              const tooltipText = hasRawDetail
                ? `${entry.name} (${entry.pct}%)\nMotivo do Gateway:\n${entry.rawMessages.join('\n')}`
                : `${entry.name} (${entry.pct}%)`;

              return (
                <div
                  key={idx}
                  title={tooltipText}
                  className="flex items-center gap-1.5 cursor-help transition-opacity hover:opacity-100 group"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-400 group-hover:text-gray-200 text-[11px] transition-colors">
                    {entry.name} <span className="text-gray-500">({entry.pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
