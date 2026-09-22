'use client';

import { useEffect } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CARD_GROUPS, DASHBOARD_CARDS } from '@/lib/dashboard-cards';

interface Props {
  hidden: string[];
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onClose: () => void;
}

/**
 * Seletor de cards do modo de edicao.
 *
 * A lista completa fica visivel de uma vez, com os desligados apagados no
 * lugar de sumirem: e preciso enxergar o que esta fora para poder trazer de
 * volta — um card escondido que tambem some da lista vira um card perdido.
 */
export default function CardVisibilityModal({ hidden, onToggle, onShowAll, onClose }: Props) {
  // Esc fecha, como em qualquer dialogo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hiddenSet = new Set(hidden);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-[#333] bg-[#1E1E1E] shadow-xl"
        // O clique de dentro nao deve fechar junto com o do fundo.
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-[#2a2a2a] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">Cards do painel</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {hidden.length === 0
                ? 'Todos visíveis'
                : `${hidden.length} oculto${hidden.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hidden.length > 0 && (
              <button
                onClick={onShowAll}
                className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#2a2a2a] hover:text-white"
              >
                Mostrar todos
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md p-1 text-gray-500 transition-colors hover:bg-[#2a2a2a] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {CARD_GROUPS.map((group) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                {group}
              </p>

              {DASHBOARD_CARDS.filter((card) => card.group === group).map((card) => {
                const isHidden = hiddenSet.has(card.key);

                return (
                  <button
                    key={card.key}
                    onClick={() => onToggle(card.key)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        isHidden ? 'text-gray-600' : 'text-[#0f62fe]'
                      )}
                    >
                      {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </span>

                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm transition-colors',
                        isHidden ? 'text-gray-600 line-through' : 'text-gray-200'
                      )}
                    >
                      {card.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 border-t border-[#2a2a2a] px-5 py-3">
          <p className="text-xs text-gray-600">
            Card oculto sai do painel mas guarda a posição — ao reativar, volta para onde estava.
          </p>
        </div>
      </div>
    </div>
  );
}
