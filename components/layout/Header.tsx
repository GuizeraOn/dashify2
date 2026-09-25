import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { Select } from '../ui/Select';
import { MultiSelect } from '../ui/MultiSelect';
import DateRangePicker from '../ui/DateRangePicker';
import { resolvePeriod, startOfToday, formatDay } from '@/lib/dates';
import { useSummary } from '@/hooks/useSummary';
import { useSalesWatcher } from '@/hooks/useSalesWatcher';
import { useRefreshStore } from '@/store/refreshStore';

const periods = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 7 dias', value: 'last_7_days' },
  { label: 'Últimos 14 dias', value: 'last_14_days' },
  { label: 'Últimos 30 dias', value: 'last_30_days' },
  { label: 'Este mês', value: 'this_month' },
  { label: 'Mês passado', value: 'last_month' },
  { label: 'Máximo', value: 'maximum' },
  { label: 'Personalizado', value: 'custom' },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Compartilhado com os cards: eles escondem os numeros enquanto isto durar.
  const { isRefreshing, setRefreshing } = useRefreshStore();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [autoOpenCustom, setAutoOpenCustom] = useState(false);

  const currentPeriod = searchParams.get('period') || 'today';
  // Repetido na URL (?product=A&product=B) em vez de separado por virgula:
  // nome de produto e texto livre, e qualquer separador escolhido acabaria
  // aparecendo dentro de um nome algum dia.
  const selectedProducts = searchParams.getAll('product');
  const dateStart = searchParams.get('dateStart') || undefined;
  const dateEnd = searchParams.get('dateEnd') || undefined;

  // React Query vai reaproveitar o cache gerado pela page.tsx
  const { data } = useSummary({
    period: currentPeriod,
    dateStart,
    dateEnd,
    products: selectedProducts.length > 0 ? selectedProducts : undefined,
  });

  // Vigia a planilha: quando entra venda nova (ou uma muda de status), os
  // dados sao invalidados e o painel recarrega com a mesma animacao do botao.
  useSalesWatcher(() => setLastSynced(new Date()));

  const handlePeriodChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', val);
    if (val === 'custom') {
      // Se não havia datas personalizadas definidas, inicializa com o intervalo do período atual
      // ou hoje, para JAMAIS carregar o "máximo" de surpresa!
      if (!params.get('dateStart') || !params.get('dateEnd')) {
        const resolved = resolvePeriod(currentPeriod === 'custom' ? 'today' : currentPeriod);
        const todayStr = formatDay(startOfToday());
        const start = resolved.dateStart || todayStr;
        const end = resolved.dateEnd || todayStr;
        params.set('dateStart', start);
        params.set('dateEnd', end);
      }
      setAutoOpenCustom(true);
    } else {
      setAutoOpenCustom(false);
      params.delete('dateStart');
      params.delete('dateEnd');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCustomRange = (range: { dateStart: string; dateEnd: string }) => {
    setAutoOpenCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'custom');
    params.set('dateStart', range.dateStart);
    params.set('dateEnd', range.dateEnd);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleProductsChange = (next: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('product');
    next.forEach((value) => params.append('product', value));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sem a linha "Qualquer": no MultiSelect ela e a propria lista vazia, e vem
  // pronta no componente.
  const productOptions = data?.available_products?.map(p => ({ label: p, value: p })) || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/meta/sync', { method: 'POST' });
      // invalidateQueries so resolve depois que as consultas ativas terminam
      // de buscar, entao a bandeira cobre o ciclo inteiro.
      await queryClient.invalidateQueries();
      setLastSynced(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 md:p-4 shadow-sm mb-6">
      
      {/* Top Section: Title & Refresh */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">Resumo</h1>
          <span className="text-gray-400 text-sm hidden md:inline">
            {lastSynced
              ? `Atualizado às ${lastSynced.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Sincronizando...'}
          </span>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
          <span className="text-gray-400 text-sm md:hidden">Atualizado agora</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-[#333] mb-4" />

      {/* Filters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Período */}
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-300 text-xs font-medium flex items-center gap-1.5">
            Período
            <Tooltip content={<p className="text-center">Filtra os dados pelo período selecionado.</p>}>
              <button className="text-gray-500 hover:text-gray-300 outline-none">
                <Info size={14} />
              </button>
            </Tooltip>
          </label>
          <Select 
            value={currentPeriod}
            onChange={handlePeriodChange}
            options={periods}
          />
        </div>

        {/* Intervalo personalizado — so aparece quando escolhido */}
        {currentPeriod === 'custom' && (
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-gray-300 text-xs font-medium">Intervalo</label>
            <DateRangePicker
              dateStart={dateStart}
              dateEnd={dateEnd}
              autoOpen={autoOpenCustom}
              onApply={handleCustomRange}
            />
          </div>
        )}

        {/* Conta de Anúncio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-300 text-xs font-medium">Conta</label>
          <Select 
            value="todas"
            options={[{ label: 'Todas', value: 'todas' }]}
            disabled
          />
        </div>

        {/* Plataformas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-300 text-xs font-medium">Plataformas</label>
          <Select 
            value="qualquer"
            options={[{ label: 'Qualquer', value: 'qualquer' }]}
            disabled
          />
        </div>

        {/* Produtos */}
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-300 text-xs font-medium">Produtos</label>
          <MultiSelect
            selected={selectedProducts}
            onChange={handleProductsChange}
            options={productOptions}
            noun="produtos"
          />
        </div>

        {/* Fonte de tráfego */}
        <div className="flex flex-col gap-1.5 col-span-2 lg:col-span-1">
          <label className="text-gray-300 text-xs font-medium">Fonte</label>
          <Select 
            value="qualquer"
            options={[{ label: 'Qualquer', value: 'qualquer' }]}
            disabled
          />
        </div>

      </div>
    </div>
  );
}
