'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { WeekdayStat } from '@/hooks/useSummary';
import ShareRing from '@/components/ui/ShareRing';

interface Props {
  data?: WeekdayStat[];
}

type View = 'bars' | 'ranking';

/** Azul da marca, o mesmo do logo e dos botoes. */
const BAR_COLOR = '#0f62fe';
/** O melhor dia ganha o tom cheio; os outros recuam. */
const BAR_COLOR_MUTED = '#1e40af';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

export default function SalesByWeekday({ data = [] }: Props) {
  const [view, setView] = useState<View>('bars');

  const hasSales = data.some((item) => item.revenue > 0);

  if (!data.length || !hasSales) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-sm text-gray-500">
        Sem vendas no período
      </div>
    );
  }

  const best = data.reduce((top, item) => (item.revenue > top.revenue ? item : top), data[0]);

  // O ranking ordena por faturamento; o grafico mantem a ordem da semana, que
  // e o que deixa enxergar o padrao de domingo a sabado.
  const ranked = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-200">Vendas por Dia da Semana</h3>

        <div className="flex items-center gap-4 text-xs">
          {(['bars', 'ranking'] as View[]).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={cn(
                'transition-colors',
                view === option ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {option === 'bars' ? 'Barras' : 'Ranking'}
            </button>
          ))}
        </div>
      </div>

      {view === 'bars' ? (
        <div className="min-h-0 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis
                dataKey="short"
                stroke="#666"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`}
                stroke="#666"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#242424',
                  borderColor: '#333',
                  color: '#fff',
                  borderRadius: '8px',
                }}
                formatter={(value: any, _name, item: any) => [
                  `${formatCurrency(Number(value))} · ${item?.payload?.orders ?? 0} venda${
                    item?.payload?.orders === 1 ? '' : 's'
                  }`,
                  'Faturamento',
                ]}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.label ?? ''}
              />
              {/* Sem a animacao de crescimento do recharts: quando o card e
                  redimensionado no grid, ou quando o fade de atualizacao
                  re-renderiza o cartao, ela congela no meio e as barras ficam
                  desenhadas numa fracao da altura certa. O painel ja tem a
                  propria animacao de recarga. */}
              <Bar
                dataKey="revenue"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell
                    key={item.weekday}
                    fill={item.weekday === best.weekday ? BAR_COLOR : BAR_COLOR_MUTED}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col">
            {ranked.map((item) => (
              <div
                key={item.weekday}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left"
              >
                <span className="min-w-0 flex-1 text-sm leading-tight text-gray-200">
                  {item.label}
                </span>

                <span className="flex-shrink-0 text-xs tabular-nums text-gray-500">
                  {item.orders} venda{item.orders === 1 ? '' : 's'}
                </span>

                <span className="flex-shrink-0 text-sm tabular-nums text-white">
                  {formatCurrency(item.revenue)}
                </span>

                <ShareRing share={item.share} color={BAR_COLOR} />

                <span className="w-14 flex-shrink-0 text-right text-sm tabular-nums text-gray-400">
                  {item.share.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
