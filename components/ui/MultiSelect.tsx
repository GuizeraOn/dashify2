'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  /** Vazio quer dizer "qualquer" — sem filtro. */
  selected: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  /** Texto do botao quando nada esta marcado. */
  emptyLabel?: string;
  /** Substantivo usado no resumo "3 produtos". */
  noun?: string;
  disabled?: boolean;
}

/**
 * Seletor de varios valores, com a mesma cara do Select de um valor so.
 *
 * Nenhuma marcacao significa "qualquer", e nao "nenhum": num filtro, lista
 * vazia so pode querer dizer que o usuario ainda nao restringiu nada — a
 * leitura oposta deixaria o painel zerado sem motivo.
 *
 * A lista nao fecha a cada clique, de proposito: quem abre para marcar dois
 * produtos nao quer reabrir entre um e outro.
 */
export function MultiSelect({
  selected,
  onChange,
  options,
  emptyLabel = 'Qualquer',
  noun = 'itens',
  disabled,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  // Com um marcado, o nome cabe e diz mais; de dois em diante vira contagem.
  const label =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label || selected[0]
        : `${selected.length} ${noun}`;

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full bg-[#1E1E1E] border text-left flex items-center justify-between px-3 py-2.5 text-sm transition-colors rounded-md',
          isOpen ? 'border-[#0f62fe] text-gray-200' : 'border-gray-600 hover:border-gray-500 text-gray-200',
          disabled && 'cursor-not-allowed opacity-70 hover:border-gray-600'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          className={cn(
            'text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full origin-top overflow-y-auto rounded-md border border-[#333] bg-[#242424] py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-100 max-h-72">
          {/* "Qualquer" e uma linha como as outras, e nao um X escondido no
              canto: limpar o filtro e a acao mais repetida daqui. */}
          <button
            onClick={() => onChange([])}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
              selected.length === 0
                ? 'bg-[#38bdf8]/10 text-[#38bdf8]'
                : 'text-gray-300 hover:bg-[#333] hover:text-white'
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                selected.length === 0 ? 'border-[#38bdf8] bg-[#38bdf8]' : 'border-gray-600'
              )}
            >
              {selected.length === 0 && <Check size={11} className="text-[#242424]" />}
            </span>
            <span className="truncate">{emptyLabel}</span>
          </button>

          <div className="my-1 border-t border-[#333]" />

          {options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <button
                key={option.value}
                onClick={() => toggle(option.value)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-[#38bdf8]/10 text-[#38bdf8]'
                    : 'text-gray-300 hover:bg-[#333] hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                    isSelected ? 'border-[#38bdf8] bg-[#38bdf8]' : 'border-gray-600'
                  )}
                >
                  {isSelected && <Check size={11} className="text-[#242424]" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
