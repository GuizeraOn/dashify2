'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import { CalendarDays, Check, X } from 'lucide-react';
import 'react-day-picker/style.css';
import { resolvePeriod, startOfToday, formatDay } from '@/lib/dates';

interface Props {
  /** Datas atuais no formato YYYY-MM-DD, como vivem na URL. */
  dateStart?: string;
  dateEnd?: string;
  /** Abre o popover automaticamente na montagem */
  autoOpen?: boolean;
  /** Chamado ao aplicar; datas também em YYYY-MM-DD. */
  onApply: (range: { dateStart: string; dateEnd: string }) => void;
}

/**
 * Converte YYYY-MM-DD para objeto Date local (meia-noite local).
 * Evita o bug de fuso horário onde new Date('YYYY-MM-DD') seria lido em UTC.
 */
function parseDay(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(date?: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(date?: Date): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const PRESET_OPTIONS = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 7 dias', value: 'last_7_days' },
  { label: 'Últimos 14 dias', value: 'last_14_days' },
  { label: 'Últimos 30 dias', value: 'last_30_days' },
  { label: 'Este mês', value: 'this_month' },
  { label: 'Mês passado', value: 'last_month' },
];

export default function DateRangePicker({ dateStart, dateEnd, autoOpen, onApply }: Props) {
  const [isOpen, setIsOpen] = useState(autoOpen ?? false);
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: parseDay(dateStart),
    to: parseDay(dateEnd),
  }));

  const [inputStart, setInputStart] = useState(dateStart || '');
  const [inputEnd, setInputEnd] = useState(dateEnd || '');
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastAppliedRef = useRef<{ dateStart?: string; dateEnd?: string }>({ dateStart, dateEnd });

  // Detecta tela mobile para exibir 1 mês em vez de 2, evitando quebrar o layout
  useEffect(() => {
    const updateSize = () => setIsMobile(window.innerWidth < 768);
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Sincroniza estado quando as props externas mudam
  useEffect(() => {
    setRange({ from: parseDay(dateStart), to: parseDay(dateEnd) });
    setInputStart(dateStart || '');
    setInputEnd(dateEnd || '');
    lastAppliedRef.current = { dateStart, dateEnd };
  }, [dateStart, dateEnd]);

  // Aplica o intervalo atual
  const applyRange = useCallback(
    (start: Date, end?: Date) => {
      const actualEnd = end || start;
      const [dStart, dEnd] = start <= actualEnd ? [start, actualEnd] : [actualEnd, start];
      const startStr = toInputDate(dStart);
      const endStr = toInputDate(dEnd);

      lastAppliedRef.current = { dateStart: startStr, dateEnd: endStr };
      onApply({ dateStart: startStr, dateEnd: endStr });
      setIsOpen(false);
    },
    [onApply]
  );

  // Fecha ao clicar fora ou apertar Esc, aplicando o que estiver selecionado
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        // Se o usuário selecionou uma data e clicou fora, aplica para não perder!
        if (range?.from) {
          const s = toInputDate(range.from);
          const e = toInputDate(range.to || range.from);
          if (s !== lastAppliedRef.current.dateStart || e !== lastAppliedRef.current.dateEnd) {
            applyRange(range.from, range.to);
            return;
          }
        }
        setIsOpen(false);
      }
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
  }, [isOpen, range, applyRange]);

  // Gerencia o clique no dia no calendário com suporte a auto-apply de 2 cliques
  const handleSelect = (selectedRange: DateRange | undefined, triggerDate: Date) => {
    // 1. Se já havia um intervalo completo selecionado (from E to),
    // um novo clique limpa e começa uma nova seleção a partir do dia clicado.
    if (!range?.from || (range.from && range.to)) {
      setRange({ from: triggerDate, to: undefined });
      setInputStart(toInputDate(triggerDate));
      setInputEnd('');
      return;
    }

    // 2. Se já tínhamos o dia inicial (from) e não tínhamos o final (to):
    // o segundo clique completa o intervalo e APLICA IMEDIATAMENTE!
    if (range.from && !range.to) {
      const [start, end] = range.from <= triggerDate ? [range.from, triggerDate] : [triggerDate, range.from];
      const completed = { from: start, to: end };
      setRange(completed);
      setInputStart(toInputDate(start));
      setInputEnd(toInputDate(end));
      applyRange(start, end);
    }
  };

  // Clique em atalhos pré-definidos (Hoje, Ontem, etc.)
  const handlePresetSelect = (presetVal: string) => {
    const resolved = resolvePeriod(presetVal);
    if (resolved.dateStart && resolved.dateEnd) {
      const dStart = parseDay(resolved.dateStart);
      const dEnd = parseDay(resolved.dateEnd);
      if (dStart && dEnd) {
        setRange({ from: dStart, to: dEnd });
        setInputStart(resolved.dateStart);
        setInputEnd(resolved.dateEnd);
        applyRange(dStart, dEnd);
      }
    }
  };

  // Aplicar inputs manuais de data
  const handleManualApply = () => {
    const dStart = parseDay(inputStart);
    const dEnd = parseDay(inputEnd || inputStart);
    if (dStart && dEnd) {
      setRange({ from: dStart, to: dEnd });
      applyRange(dStart, dEnd);
    }
  };

  const label =
    range?.from && range?.to
      ? toInputDate(range.from) === toInputDate(range.to)
        ? formatDisplayDate(range.from)
        : `${formatDisplayDate(range.from)} — ${formatDisplayDate(range.to)}`
      : range?.from
        ? `${formatDisplayDate(range.from)} (clique na data final)`
        : 'Escolher intervalo...';

  const canApply = Boolean(range?.from || (inputStart && parseDay(inputStart)));

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-left text-sm text-white transition-colors hover:border-[#444] focus:border-[#0f62fe] focus:outline-none"
      >
        <span className="truncate font-medium">{label}</span>
        <CalendarDays size={16} className="flex-shrink-0 text-gray-400" />
      </button>

      {/* Popover do Calendário */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#333] bg-[#1E1E1E] p-4 shadow-2xl">
          {/* Barra de atalhos rápidos */}
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[#333] pb-3">
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetSelect(p.value)}
                className="rounded-md border border-[#383838] bg-[#2a2a2a] px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-[#0f62fe] hover:bg-[#0f62fe]/10 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Inputs de data manual para controle exato */}
          <div className="mb-3 flex items-center gap-2 border-b border-[#333] pb-3 text-xs">
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-[#383838] bg-[#141414] px-2.5 py-1.5">
              <span className="text-gray-400">De:</span>
              <input
                type="date"
                value={inputStart}
                max={toInputDate(startOfToday())}
                onChange={(e) => {
                  setInputStart(e.target.value);
                  const d = parseDay(e.target.value);
                  if (d) setRange((prev) => ({ from: d, to: prev?.to }));
                }}
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-[#383838] bg-[#141414] px-2.5 py-1.5">
              <span className="text-gray-400">Até:</span>
              <input
                type="date"
                value={inputEnd}
                min={inputStart}
                max={toInputDate(startOfToday())}
                onChange={(e) => {
                  setInputEnd(e.target.value);
                  const d = parseDay(e.target.value);
                  if (d) setRange((prev) => ({ from: prev?.from, to: d }));
                }}
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
          </div>

          {/* Calendário Interativo */}
          <div className="flex justify-center overflow-x-auto">
            <DayPicker
              mode="range"
              locale={ptBR}
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={range?.from || startOfToday()}
              disabled={{ after: new Date() }}
              className="dashify-calendar"
            />
          </div>

          {/* Rodapé com Ações */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#333] pt-3">
            <button
              type="button"
              onClick={() => {
                setRange(undefined);
                setInputStart('');
                setInputEnd('');
              }}
              className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-200"
            >
              <X size={14} />
              Limpar
            </button>

            <button
              type="button"
              onClick={() => {
                if (range?.from) {
                  applyRange(range.from, range.to);
                } else if (inputStart) {
                  handleManualApply();
                }
              }}
              disabled={!canApply}
              className="flex items-center gap-1.5 rounded-md bg-[#0f62fe] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0353e9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={15} />
              Aplicar Intervalo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
