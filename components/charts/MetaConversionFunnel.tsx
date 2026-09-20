'use client';

import { cn } from '@/lib/utils';
import { FunnelStats } from '@/hooks/useSummary';

interface Props {
  data?: FunnelStats;
}

/**
 * O desenho e feito num sistema de coordenadas fixo e esticado para o tamanho
 * do card (preserveAspectRatio="none"). Por isso so a fita vai no SVG: os
 * textos ficam em HTML por cima, senao esticariam junto.
 */
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 100;

/** Fracao da altura que a fita pode ocupar no seu ponto mais grosso. */
const MAX_THICKNESS = 0.92;
/** Espessura minima, para uma etapa de 1% ainda aparecer como um fio. */
const MIN_THICKNESS = 2;

/**
 * Monta a fita: uma curva suave passando pela espessura de cada etapa.
 *
 * `thicknesses` tem um valor por etapa. A fita comeca e termina reta, com a
 * espessura da primeira e da ultima, e faz uma curva em S entre os centros das
 * etapas — e isso que da a leitura de fluxo continuo em vez de barras soltas.
 */
function buildRibbonPath(thicknesses: number[]): string {
  const stageWidth = VIEW_WIDTH / thicknesses.length;
  const centers = thicknesses.map((_, index) => (index + 0.5) * stageWidth);

  // Ponta reta na entrada e na saida.
  const xs = [0, ...centers, VIEW_WIDTH];
  const ts = [thicknesses[0], ...thicknesses, thicknesses[thicknesses.length - 1]];

  const top = (t: number) => (VIEW_HEIGHT - t) / 2;
  const bottom = (t: number) => (VIEW_HEIGHT + t) / 2;

  /** Curva de `from` ate `to`, com as alcas na metade do caminho. */
  const curve = (from: number, to: number, edge: (t: number) => number) => {
    const handle = (xs[to] - xs[from]) / 2;
    return (
      `C ${xs[from] + handle} ${edge(ts[from])}, ` +
      `${xs[to] - handle} ${edge(ts[to])}, ` +
      `${xs[to]} ${edge(ts[to])}`
    );
  };

  const last = xs.length - 1;

  // Borda de cima, da esquerda para a direita.
  let path = `M ${xs[0]} ${top(ts[0])}`;
  for (let i = 1; i <= last; i++) path += ` ${curve(i - 1, i, top)}`;

  // Desce na ponta direita e volta pela borda de baixo.
  path += ` L ${xs[last]} ${bottom(ts[last])}`;
  for (let i = last; i > 0; i--) path += ` ${curve(i, i - 1, bottom)}`;

  return `${path} Z`;
}

export default function MetaConversionFunnel({ data }: Props) {
  const steps = data?.steps ?? [];

  if (!steps.length || steps[0].count === 0) {
    return (
      <div className="w-full h-full min-h-[200px] flex items-center justify-center text-sm text-gray-500">
        Sem dados do Meta no período
      </div>
    );
  }

  // Cada etapa mostra quanto reteve da etapa anterior; a primeira e a base.
  const rates = steps.map((step, index) => {
    if (index === 0) return 1;
    const previous = steps[index - 1].count;
    return previous > 0 ? step.count / previous : null;
  });

  const thicknesses = rates.map((rate) => {
    if (rate === null) return MIN_THICKNESS;
    // Vendas iniciadas conta pedidos de todas as origens, entao pode passar de
    // 100% da etapa anterior. O numero exibido continua real; so o desenho
    // para de crescer.
    const bounded = Math.min(rate, 1);
    return Math.max(MIN_THICKNESS, bounded * VIEW_HEIGHT * MAX_THICKNESS);
  });

  const formatRate = (rate: number | null) => {
    if (rate === null) return '—';
    const percent = rate * 100;
    if (percent >= 100) return `${Math.round(percent)}%`;
    return `${percent >= 10 ? percent.toFixed(1) : percent.toFixed(2)}%`;
  };

  const formatCount = (count: number) => count.toLocaleString('pt-BR');

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      {/* Rotulos das etapas */}
      <div className="grid flex-shrink-0" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={cn(
              'px-1 pb-2 text-center',
              index > 0 && 'border-l border-white/15'
            )}
          >
            <div className="text-xs font-semibold leading-tight text-gray-200 md:text-sm">
              {step.label}
            </div>
            <div className="mt-0.5 text-[11px] tabular-nums text-gray-500">
              {formatCount(step.count)}
            </div>
          </div>
        ))}
      </div>

      {/* Fita + porcentagens */}
      <div className="relative flex-1 min-h-0">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="funnel-flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f62fe" />
              <stop offset="55%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d={buildRibbonPath(thicknesses)} fill="url(#funnel-flow)" />
        </svg>

        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
        >
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={cn(
                'flex items-center justify-center',
                index > 0 && 'border-l border-white/15'
              )}
            >
              <span className="text-sm font-bold tabular-nums text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] md:text-base">
                {formatRate(rates[index])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
