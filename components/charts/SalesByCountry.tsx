'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CountryStat } from '@/hooks/useSummary';
import { lookupCountryCoords, projectLngLat } from '@/lib/geo';
import { WORLD_HEIGHT, WORLD_LAND_PATH, WORLD_WIDTH } from '@/lib/world-map';
import ShareRing from '@/components/ui/ShareRing';

interface Props {
  data?: CountryStat[];
  /** Pais atualmente filtrando o dashboard, se houver. */
  selected?: string;
  /** Clicar num pais filtra o dashboard; clicar de novo no mesmo limpa. */
  onSelect?: (country: string | null) => void;
}

/** Raio dos pontos, no sistema de coordenadas do mapa. */
const MIN_RADIUS = 5;
const MAX_RADIUS = 26;

type View = 'ranking' | 'map';

interface Marker extends CountryStat {
  x: number;
  y: number;
  radius: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

export default function SalesByCountry({ data = [], selected, onSelect }: Props) {
  const [view, setView] = useState<View>('map');
  const [hovered, setHovered] = useState<string | null>(null);

  const maxRevenue = data.length ? Math.max(...data.map((item) => item.revenue)) : 0;

  const markers = useMemo<Marker[]>(() => {
    return data.flatMap((item) => {
      const coords = lookupCountryCoords(item.country);
      if (!coords) return [];

      const { x, y } = projectLngLat(coords[0], coords[1]);

      // Area proporcional ao faturamento, nao o raio: e a area que o olho le
      // como quantidade, e usar o raio exageraria os paises grandes.
      const ratio = maxRevenue > 0 ? item.revenue / maxRevenue : 0;
      const radius = MIN_RADIUS + Math.sqrt(ratio) * (MAX_RADIUS - MIN_RADIUS);

      return [{ ...item, x, y, radius }];
    });
  }, [data, maxRevenue]);

  const handleSelect = (country: string) => {
    onSelect?.(country === selected ? null : country);
  };

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-sm text-gray-500">
        Sem vendas no período
      </div>
    );
  }

  const active = hovered ?? selected ?? null;
  const activeStat = data.find((item) => item.country === active);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Titulo e alternancia dividem a linha, como na referencia */}
      <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-200">Vendas por País</h3>

        <div className="flex items-center gap-4 text-xs">
          {selected && (
            <button
              onClick={() => onSelect?.(null)}
              className="text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Limpar {selected}
            </button>
          )}
          {(['ranking', 'map'] as View[]).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={cn(
                'transition-colors',
                view === option ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {option === 'ranking' ? 'Ranking' : 'Mapa'}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="country-glow">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Contexto: os continentes ficam de proposito com pouco contraste */}
            <path d={WORLD_LAND_PATH} fill="#1e3a8a" fillOpacity="0.6" />

            {markers.map((marker) => {
              const isActive = active === marker.country;
              return (
                <g
                  key={marker.country}
                  onMouseEnter={() => setHovered(marker.country)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleSelect(marker.country)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={marker.radius * 2.2}
                    fill="url(#country-glow)"
                  />
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={marker.radius}
                    fill="#22d3ee"
                    fillOpacity={isActive ? 0.95 : 0.7}
                    stroke="#ecfeff"
                    strokeWidth={isActive ? 2.5 : 1}
                  />
                </g>
              );
            })}
          </svg>

          {/* Detalhe fica no canto, nao sobre o ponto: rotulo em cima de cada
              marcador sujaria o mapa e esconderia os paises vizinhos. */}
          {activeStat && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-white/10 bg-[#0b1220]/90 px-3 py-2 text-xs shadow-lg">
              <div className="font-semibold text-white">{activeStat.country}</div>
              <div className="text-gray-300">{formatCurrency(activeStat.revenue)}</div>
              <div className="text-gray-500">
                {activeStat.share.toFixed(1)}% · {activeStat.orders} venda
                {activeStat.orders === 1 ? '' : 's'}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col">
            {data.map((item) => {
              const isActive = active === item.country;
              return (
                <button
                  key={item.country}
                  onMouseEnter={() => setHovered(item.country)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleSelect(item.country)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5',
                    isActive && 'bg-white/5'
                  )}
                >
                  {/* O nome fica livre para quebrar em duas linhas: pais de nome
                      longo nao deve espremer os numeros da direita. */}
                  <span className="min-w-0 flex-1 text-sm leading-tight text-gray-200">
                    {item.country}
                  </span>

                  <span className="flex-shrink-0 text-sm tabular-nums text-white">
                    {formatCurrency(item.revenue)}
                  </span>

                  <ShareRing share={item.share} isActive={isActive} />

                  <span className="w-14 flex-shrink-0 text-right text-sm tabular-nums text-gray-400">
                    {item.share.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
