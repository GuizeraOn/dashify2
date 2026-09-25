'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, ExternalLink } from 'lucide-react';

import { useProducts, ProductRow } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatInt = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

/**
 * Etapa do funil. O front-end e o que a campanha paga para vender; os upsells
 * vem de graca depois, e por isso merecem cor diferente.
 */
function FunnelBadge({ step }: { step: string }) {
  const isFront = step.toLowerCase().includes('front');

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        isFront
          ? 'border-[#0f62fe]/30 bg-[#0f62fe]/10 text-[#4d94ff]'
          : 'border-purple-500/20 bg-purple-500/10 text-purple-400'
      )}
    >
      {step || 'Sem etapa'}
    </span>
  );
}

/** Numero grande com rotulo pequeno, o par que se repete pelo card. */
function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={cn(
          'mt-0.5 text-lg font-semibold',
          tone === 'positive' && 'text-green-500',
          tone === 'negative' && 'text-red-500',
          !tone && 'text-gray-100'
        )}
      >
        {value}
      </span>
      {hint && <span className="mt-0.5 text-xs text-gray-600">{hint}</span>}
    </div>
  );
}

/**
 * Link do checkout, com botao de copiar.
 *
 * O codigo do produto nao esta na planilha — vem do JSON cru da Perfect Pay,
 * guardado no log de webhooks. Produto que nunca apareceu naquele log fica sem
 * link, e o card diz isso em vez de mostrar um botao quebrado.
 */
function CheckoutLink({ product }: { product: ProductRow }) {
  const [copied, setCopied] = useState(false);

  if (!product.checkout_url) {
    return (
      <p className="text-xs text-gray-600">
        Código do produto ainda não identificado — ele aparece assim que chegar uma venda nova
        deste produto.
      </p>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(product.checkout_url!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Navegador sem permissao de area de transferencia: o link continua
      // clicavel, que e o que importa.
    }
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={product.checkout_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-1.5 rounded-md bg-[#252525] px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:bg-[#2f2f2f] hover:text-white"
      >
        <span className="truncate font-mono">{product.checkout_url}</span>
        <ExternalLink size={12} className="flex-shrink-0 text-gray-500" />
      </a>

      <button
        onClick={handleCopy}
        title="Copiar link do checkout"
        className="flex-shrink-0 rounded-md bg-[#252525] p-1.5 text-gray-400 transition-colors hover:bg-[#2f2f2f] hover:text-white"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function ProductCard({ product }: { product: ProductRow }) {
  const lost = product.cancelled + product.pending;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#333] bg-[#1E1E1E] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white" title={product.name}>
            {product.name}
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500">
            {product.code || 'sem código'}
            {product.guarantee !== null && (
              <span className="ml-2 font-sans text-gray-600">
                · garantia de {product.guarantee} dias
              </span>
            )}
          </p>
        </div>
        <FunnelBadge step={product.funnel_step} />
      </div>

      <CheckoutLink product={product} />

      <div className="grid grid-cols-2 gap-4 border-t border-[#2a2a2a] pt-4 sm:grid-cols-4">
        <Metric label="Vendas" value={formatInt(product.sales)} />
        <Metric label="Faturamento" value={formatCurrency(product.revenue)} />
        <Metric label="Ticket médio" value={formatCurrency(product.average_ticket)} />
        <Metric
          label="Aprovação"
          value={formatPercent(product.approval_rate)}
          hint={`${formatInt(product.attempts)} tentativa${product.attempts === 1 ? '' : 's'}`}
        />
      </div>

      {/* Participacao no faturamento do periodo: mostra de onde o dinheiro
          esta vindo de verdade, que nem sempre e de onde vem o volume. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Participação no faturamento</span>
          <span className="font-medium text-gray-300">{formatPercent(product.revenue_share)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
          <div
            className="h-full rounded-full bg-[#0f62fe] transition-all"
            style={{ width: `${Math.min(product.revenue_share, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#2a2a2a] pt-4 text-xs">
        {product.top_countries.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Países:</span>
            <span className="text-gray-300">
              {product.top_countries.map((c) => `${c.label} (${c.count})`).join(', ')}
            </span>
          </div>
        )}

        {product.top_payment_methods.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Pagamento:</span>
            <span className="capitalize text-gray-300">
              {product.top_payment_methods.map((m) => m.label).join(', ')}
            </span>
          </div>
        )}

        {product.refunded > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Reembolsos:</span>
            <span className="text-red-400">
              {formatInt(product.refunded)} ({formatCurrency(product.refunded_value)})
            </span>
          </div>
        )}

        {lost > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Não aprovadas:</span>
            <span className="text-gray-400">{formatInt(lost)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProdutosPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'today';
  const dateStart = searchParams.get('dateStart') || undefined;
  const dateEnd = searchParams.get('dateEnd') || undefined;

  const { data, isLoading, isError } = useProducts({ period, dateStart, dateEnd });

  if (isLoading) {
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full flex-1 items-center justify-center text-red-500">
        Erro ao carregar produtos.
      </div>
    );
  }

  const products = data?.products || [];

  return (
    <div className="animate-in fade-in flex w-full flex-1 flex-col duration-500">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-white">Produtos</h1>
        <p className="text-sm text-gray-400">
          Um card por produto vendido no período, com o link do checkout e como cada um se comporta.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-[#333] bg-[#1E1E1E] px-6 py-10 text-center text-sm text-gray-500">
          Nenhuma venda no período selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
