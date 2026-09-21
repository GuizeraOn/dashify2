'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import { CalendarDays } from 'lucide-react';
import 'react-day-picker/style.css';

interface Props {
  /** Datas atuais no formato YYYY-MM-DD, como vivem na URL. */
  dateStart?: string;
  dateEnd?: string;
  /** Chamado ao aplicar; datas tambem em YYYY-MM-DD. */
  onApply: (range: { dateStart: string; dateEnd: string }) => void;
}

/**
 * As datas circulam pelo app como YYYY-MM-DD puro, sem hora. Convertendo para
 * meia-noite local — e nao com `new Date('2026-09-20')`, que o JavaScript
 * interpreta como UTC e faria o dia voltar um no fuso de Brasilia.
 */
function parseDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatLabel(date?: Date): string {
  return date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

export default function DateRangePicker({ dateStart, dateEnd, onApply }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDay(dateStart),
    to: parseDay(dateEnd),
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantem o calendario em dia quando as datas mudam por fora (voltar do
  // navegador, link compartilhado).
  useEffect(() => {
    setRange({ from: parseDay(dateStart), to: parseDay(dateEnd) });
  }, [dateStart, dateEnd]);

  // Fecha ao clicar fora ou apertar Esc, como qualquer popover.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const label =
    range?.from && range?.to
      ? `${formatLabel(range.from)} — ${formatLabel(range.to)}`
      : range?.from
        ? `${formatLabel(range.from)} — selecione o fim`
        : 'Escolher datas';

  const canApply = Boolean(range?.from && range?.to);

  const handleApply = () => {
    if (!range?.from || !range?.to) return;
    onApply({ dateStart: formatDay(range.from), dateEnd: formatDay(range.to) });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-left text-sm text-white transition-colors hover:border-[#444]"
      >
        <span className="truncate">{label}</span>
        <CalendarDays size={15} className="flex-shrink-0 text-gray-400" />
      </button>

      {/* w-max: sem isso o popup herda a largura da coluna do filtro e os dois
          meses quebram um embaixo do outro. O teto pela viewport mantem o
          calendario dentro da tela no celular, onde ai sim os meses empilham. */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-xl border border-[#333] bg-[#1E1E1E] p-3 shadow-2xl">
          <DayPicker
            mode="range"
            locale={ptBR}
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            defaultMonth={range?.from}
            // Nao existe dado no futuro; deixar clicar so gera periodo vazio.
            disabled={{ after: new Date() }}
            className="dashify-calendar"
          />

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#333] pt-3">
            <button
              type="button"
              onClick={() => setRange(undefined)}
              className="text-xs text-gray-400 transition-colors hover:text-gray-200"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="rounded-md bg-[#0f62fe] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
