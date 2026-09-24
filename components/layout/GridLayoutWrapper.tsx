'use client';

import { useState, useEffect, useRef, useMemo, isValidElement } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import { useLayoutStore } from '@/store/layoutStore';
import CardVisibilityModal from '@/components/layout/CardVisibilityModal';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutWrapperProps {
  children: React.ReactNode[];
}

const LAYOUT_CACHE_KEY = 'dashboard_layout_cache';
const HIDDEN_CACHE_KEY = 'dashboard_hidden_cards_cache';
const HIDDEN_SETTING_KEY = 'dashboard_hidden_cards';

// Layout default - 8 colunas no lg para permitir resize fino
const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'kpi-net_revenue',     x: 0, y: 0, w: 2, h: 1, minW: 1 },
    { i: 'kpi-spend',           x: 2, y: 0, w: 2, h: 1, minW: 1 },
    { i: 'kpi-profit',         x: 4, y: 0, w: 2, h: 1, minW: 1 },
    { i: 'kpi-roi',            x: 6, y: 0, w: 2, h: 1, minW: 1 },
    { i: 'kpi-cpa',            x: 0, y: 1, w: 2, h: 1, minW: 1 },
    { i: 'kpi-roas',           x: 2, y: 1, w: 2, h: 1, minW: 1 },
    { i: 'kpi-margin',         x: 4, y: 1, w: 2, h: 1, minW: 1 },
    { i: 'kpi-pending',          x: 6, y: 1, w: 2, h: 1, minW: 1 },
    { i: 'kpi-refunded',         x: 0, y: 2, w: 2, h: 1, minW: 1 },
    { i: 'kpi-results',          x: 2, y: 2, w: 2, h: 1, minW: 1 },
    { i: 'kpi-checkout_conv',    x: 4, y: 2, w: 2, h: 1, minW: 1 },
    { i: 'kpi-ics',              x: 6, y: 2, w: 2, h: 1, minW: 1 },
    { i: 'kpi-cost_per_ic',      x: 0, y: 3, w: 2, h: 1, minW: 1 },
    { i: 'kpi-cpc',              x: 2, y: 3, w: 2, h: 1, minW: 1 },
    { i: 'kpi-ctr',              x: 4, y: 3, w: 2, h: 1, minW: 1 },
    { i: 'kpi-connect_rate',     x: 6, y: 3, w: 2, h: 1, minW: 1 },
    { i: 'kpi-cpm',              x: 0, y: 4, w: 2, h: 1, minW: 1 },
    { i: 'chart-revenue_spend',  x: 0, y: 5, w: 6, h: 3, minW: 2 },
    { i: 'chart-payment',        x: 6, y: 5, w: 2, h: 3, minW: 2 },
    { i: 'chart-card_approval',  x: 0, y: 8, w: 4, h: 3, minW: 2 },
    { i: 'chart-funnel',         x: 4, y: 8, w: 4, h: 3, minW: 3 },
    { i: 'chart-country',        x: 0, y: 11, w: 5, h: 4, minW: 3 },
    { i: 'chart-weekday',        x: 5, y: 11, w: 3, h: 4, minW: 2 },
    { i: 'chart-country_approval', x: 0, y: 15, w: 4, h: 4, minW: 2 },
  ],
};

/**
 * Achata os filhos preservando a chave de cada card.
 *
 * A pagina passa os KPIs como um `.map()`, que chega aqui como array dentro do
 * array de filhos. Para saber quais cards existem — e quais estao ocultos — e
 * preciso enxergar essa lista plana, e `React.Children.toArray` nao serve:
 * ele reescreve as chaves dos arrays aninhados, e sao justamente elas que
 * casam com o layout salvo.
 */
function flattenChildren(children: React.ReactNode): React.ReactElement[] {
  const out: React.ReactElement[] = [];

  const walk = (node: React.ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (isValidElement(node)) out.push(node);
  };

  walk(children);
  return out;
}

/**
 * Completa um layout salvo com os cards que ele ainda nao conhece.
 *
 * Um layout guardado antes de um card novo existir nao tem entrada para ele, e
 * o react-grid-layout posiciona o desconhecido no tamanho minimo (1x1). Aqui os
 * ausentes entram com as medidas do DEFAULT_LAYOUTS, empilhados abaixo do que
 * ja existe para nao colidir com o que o usuario arrumou.
 */
function withMissingDefaults(saved: any) {
  if (!saved || typeof saved !== 'object') return DEFAULT_LAYOUTS;

  const merged: any = { ...saved };

  for (const breakpoint of Object.keys(merged)) {
    const items = merged[breakpoint];
    if (!Array.isArray(items)) continue;

    const present = new Set(items.map((item: any) => item.i));
    const missing = DEFAULT_LAYOUTS.lg.filter((item) => !present.has(item.i));
    if (!missing.length) continue;

    const nextRow = items.reduce((max: number, item: any) => Math.max(max, item.y + item.h), 0);
    merged[breakpoint] = [
      ...items,
      ...missing.map((item, index) => ({ ...item, x: 0, y: nextRow + index })),
    ];
  }

  return merged;
}

// Le o ultimo layout conhecido do localStorage para que o primeiro paint ja
// aconteca nas posicoes certas, sem esperar o fetch do Supabase.
function readCachedLayouts() {
  if (typeof window === 'undefined') return DEFAULT_LAYOUTS;
  try {
    const raw = window.localStorage.getItem(LAYOUT_CACHE_KEY);
    return raw ? withMissingDefaults(JSON.parse(raw)) : DEFAULT_LAYOUTS;
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

// Mesma ideia para os cards ocultos: sem isto, um card desligado piscaria na
// tela a cada carregamento, ate a resposta do Supabase chegar.
function readCachedHidden(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function GridLayoutWrapper({ children }: GridLayoutWrapperProps) {
  const { isEditingLayout } = useLayoutStore();
  const [mounted, setMounted] = useState(false);
  const [layouts, setLayouts] = useState<any>(DEFAULT_LAYOUTS);
  const [hidden, setHidden] = useState<string[]>([]);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Enquanto false, o grid fica montado (para medir largura e calcular
  // posicoes) porem invisivel e sem transicoes — assim o usuario nunca ve os
  // cards se reorganizando.
  const [ready, setReady] = useState(false);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Arrastar/redimensionar so no desktop: 1024px e o breakpoint `lg`, o mesmo
  // do layout que fica salvo. Em telas menores os cards ficam fixos.
  const [isDesktop, setIsDesktop] = useState(false);
  const canEditLayout = isEditingLayout && isDesktop;

  // Bloqueia saves ate o carregamento inicial do Supabase terminar.
  // O react-grid-layout dispara onLayoutChange ao montar — sem essa trava,
  // o layout padrao sobrescreveria o layout salvo antes do fetch completar.
  const isInitialLoadDone = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLayouts(readCachedLayouts());
    setHidden(readCachedHidden());
    setMounted(true);

    async function loadSettings() {
      try {
        const [layoutRes, hiddenRes] = await Promise.all([
          fetch('/api/settings?key=dashboard_layout'),
          fetch(`/api/settings?key=${HIDDEN_SETTING_KEY}`),
        ]);

        const layoutJson = await layoutRes.json();
        if (layoutJson.data && layoutJson.data.length > 0 && layoutJson.data[0].value) {
          setLayouts(withMissingDefaults(layoutJson.data[0].value));
          try {
            window.localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(layoutJson.data[0].value));
          } catch {}
        }

        const hiddenJson = await hiddenRes.json();
        const storedHidden = hiddenJson.data?.[0]?.value;
        if (Array.isArray(storedHidden)) {
          setHidden(storedHidden);
          try {
            window.localStorage.setItem(HIDDEN_CACHE_KEY, JSON.stringify(storedHidden));
          } catch {}
        }
      } catch (e) {
        console.warn('Erro ao carregar layout:', e);
      } finally {
        // Libera o save somente apos carregar (ou falhar)
        isInitialLoadDone.current = true;
        setLayoutLoaded(true);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Revela o grid apenas depois que o layout final foi aplicado e o
  // WidthProvider ja mediu a largura real do container (2 frames).
  useEffect(() => {
    if (!mounted || !layoutLoaded) return;
    let second: number;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [mounted, layoutLoaded]);

  const saveToSupabase = (allLayouts: any) => {
    // Ignora disparos antes do carregamento inicial terminar
    if (!isInitialLoadDone.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'dashboard_layout', value: allLayouts }),
        });
      } catch (e) {
        console.warn('Erro ao salvar layout:', e);
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const persistHidden = async (next: string[]) => {
    setHidden(next);
    try {
      window.localStorage.setItem(HIDDEN_CACHE_KEY, JSON.stringify(next));
    } catch {}

    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: HIDDEN_SETTING_KEY, value: next }),
      });
    } catch (e) {
      console.warn('Erro ao salvar cards ocultos:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  /**
   * Cada card visivel ganha uma casca com a lixeira do canto.
   *
   * A casca precisa carregar a chave original: e por ela que o
   * react-grid-layout casa o filho com a entrada do layout salvo. Como o RGL
   * clona o filho de primeiro nivel para aplicar posicao e tamanho, quem
   * recebe as medidas passa a ser a casca — e o card de dentro, que ja vinha
   * com `h-full w-full`, continua preenchendo tudo.
   */
  const visibleChildren = useMemo(
    () =>
      flattenChildren(children)
        .filter((child) => !hiddenSet.has(String(child.key)))
        .map((child) => {
          const key = String(child.key);

          return (
            // `relative` e a garantia de que a lixeira se posicione pelo card,
            // e nao pelo grid inteiro. Quando o RGL escreve position:absolute
            // no style, o inline vence a classe — e absoluto tambem serve de
            // referencia; quando nao escreve, a classe assume.
            // `hover:z-30` resolve um detalhe traicoeiro: o RGL posiciona cada
            // card com `transform`, e transform cria contexto de empilhamento
            // proprio. Sem subir o card inteiro, a lixeira que se projeta para
            // fora da borda fica por baixo do card vizinho — visivel, mas
            // impossivel de clicar. O `relative` garante que ela se posicione
            // pelo card, e nao pelo grid inteiro (quando o RGL escreve
            // position:absolute no style, o inline vence a classe — e absoluto
            // tambem serve de referencia).
            <div key={key} className="group relative hover:z-30">
              {child}

              {canEditLayout && (
                <button
                  // A classe e o que o `cancel` do RGL procura para nao
                  // confundir este clique com o inicio de um arrasto.
                  className="card-remove absolute -right-2 -top-2 z-20 rounded-full border border-[#3a3a3a] bg-[#252525] p-1.5 text-gray-400 opacity-0 shadow-lg transition-all hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                  title="Ocultar card"
                  aria-label="Ocultar card"
                  // O mousedown e onde o arrasto comeca; parar aqui garante
                  // que o card nao saia do lugar junto com o clique.
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    persistHidden([...hidden, key]);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        }),
    // `hidden` entra na lista porque o clique acima o le para montar o proximo
    // estado; sem ele, esconder dois cards seguidos perderia o primeiro.
    [children, hiddenSet, canEditLayout, hidden] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * O que vai para o grid e so o layout dos cards visiveis: entrada de layout
   * sem filho correspondente deixa o react-grid-layout reservando um buraco no
   * lugar do card oculto.
   */
  const visibleLayouts = useMemo(() => {
    const filtered: any = {};
    for (const breakpoint of Object.keys(layouts || {})) {
      const items = layouts[breakpoint];
      if (!Array.isArray(items)) continue;
      filtered[breakpoint] = items.filter((item: any) => !hiddenSet.has(item.i));
    }
    return filtered;
  }, [layouts, hiddenSet]);

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    /**
     * O grid so conhece os cards visiveis, entao o que ele devolve nao inclui
     * os ocultos. Guardar isso direto apagaria a posicao deles — e, ao
     * reativar, o card voltaria empilhado no fim em vez de onde estava. Por
     * isso as entradas ocultas sao recolocadas antes de salvar.
     */
    const merged: any = {};
    const breakpoints = new Set([...Object.keys(layouts || {}), ...Object.keys(allLayouts || {})]);

    breakpoints.forEach((breakpoint) => {
      const incoming = allLayouts?.[breakpoint] || [];
      const preserved = (layouts?.[breakpoint] || []).filter((item: any) => hiddenSet.has(item.i));
      merged[breakpoint] = [...incoming, ...preserved];
    });

    setLayouts(merged);

    // So salva quando o usuario esta editando ativamente no desktop
    // (evita que normalizacoes automaticas do RGL — inclusive as dos
    // breakpoints menores — sobrescrevam o layout salvo)
    if (canEditLayout) {
      saveToSupabase(merged);
      try {
        window.localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(merged));
      } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      {canEditLayout && (
        <div className="absolute -top-8 right-0 z-10 flex items-center gap-3 text-xs">
          <span className="text-gray-500">{isSaving ? 'Salvando...' : 'Layout salvo'}</span>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#333] bg-[#1E1E1E] px-2.5 py-1 text-gray-300 transition-colors hover:bg-[#2a2a2a] hover:text-white"
          >
            <SlidersHorizontal size={13} />
            Cards
            {hidden.length > 0 && <span className="text-gray-500">({hidden.length} oculto{hidden.length === 1 ? '' : 's'})</span>}
          </button>
        </div>
      )}

      {isPickerOpen && (
        <CardVisibilityModal
          hidden={hidden}
          onToggle={(key) =>
            persistHidden(
              hiddenSet.has(key) ? hidden.filter((item) => item !== key) : [...hidden, key]
            )
          }
          onShowAll={() => persistHidden([])}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
        <ResponsiveGridLayout
          className={`layout${ready ? '' : ' grid-booting'}`}
          layouts={visibleLayouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={{ lg: 8, md: 4, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={110}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ enabled: canEditLayout, cancel: '.card-remove' }}
          resizeConfig={{ enabled: canEditLayout }}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          measureBeforeMount
        >
          {visibleChildren}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
