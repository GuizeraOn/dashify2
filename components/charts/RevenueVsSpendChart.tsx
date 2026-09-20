import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartProps {
  data?: any[];
}

export default function RevenueVsSpendChart({ data = [] }: ChartProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (val: string) => {
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return val;
  };

  if (!data.length) {
    return <div className="h-[350px] flex items-center justify-center text-gray-500">Sem dados no período</div>;
  }

  return (
    <div className="h-full w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate} 
            stroke="#666"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={(val) => `R$ ${val / 1000}k`}
            stroke="#666"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#242424', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
            formatter={(value: any) => [formatCurrency(Number(value))]}
            labelFormatter={(val: any) => formatDate(String(val))}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            name="Faturamento" 
            stroke="#22c55e" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="spend" 
            name="Gastos" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorSpend)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
