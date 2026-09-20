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
/** Espessura minima, para uma etapa perto de zero ainda aparecer. */
const MIN_THICKNESS = 2.5;

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

  const start = steps[0].count;

  // Numero principal: quanto do trafego inicial sobrou nesta etapa. E o que a
  // fita representa — o volume que ainda esta fluindo.
  const shares = steps.map((step) => step.count / start);

  // Numero secundario: quanto a etapa reteve da anterior. E aqui que se enxerga
  // onde esta o gargalo, que a fatia acumulada sozinha nao mostra.
  const stepRates = steps.map((step, index) => {
    if (index === 0) return null;
    const previous = steps[index - 1].count;
    return previous > 0 ? step.count / previous : null;
  });

  const thicknesses = shares.map((share) => {
    // Proporcao direta: a fita fica tao fina quanto a fatia que sobrou. Uma
    // etapa de 1% tem que parecer 1% — comprimir a escala para deixar o fim do
    // funil mais gordo mentiria sobre o tamanho da queda.
    const bounded = Math.min(Math.max(share, 0), 1);
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
            <div className="text-[10px] tabular-nums text-gray-600">
              {index === 0 ? ' ' : `${formatRate(stepRates[index])} da anterior`}
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
                {formatRate(shares[index])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
