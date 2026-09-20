import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useMemo } from 'react';

interface ChartProps {
  data?: any[];
}

const FALLBACK_COLORS = ['#ec4899', '#8b5cf6', '#10b981', '#f97316', '#6366f1'];

export default function PaymentMethodChart({ data = [] }: ChartProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const totalValue = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  if (!data.length) {
    return <div className="h-[350px] flex items-center justify-center text-gray-500 bg-[#1E1E1E] rounded-xl shadow-sm">Sem dados no período</div>;
  }

  const formattedData = data.map((item, index) => {
    const rawName = item.name.toLowerCase().trim();
    
    let color;
    if (rawName.includes('pix')) color = '#0f62fe';
    else if (rawName.includes('cartão') || rawName.includes('cartao')) color = '#38bdf8';
    else if (rawName.includes('boleto')) color = '#facc15';
    else color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];

    // Formatação: Maiúscula inicial
    const displayName = item.name.charAt(0).toUpperCase() + item.name.slice(1);

    return {
      ...item,
      color,
      displayName
    };
  });

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden">
      {/* Chart Area */}
      <div className="relative flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="65%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
              formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Absolute Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-gray-400 text-xs">Total</span>
          <span className="text-white font-medium text-sm">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Custom HTML Legend that wraps dynamically */}
      <div className="flex-shrink-0 flex flex-wrap justify-center gap-x-3 gap-y-1 py-1">
        {formattedData.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
            <span className="text-gray-300 text-xs">{entry.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
