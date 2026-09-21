'use client';

import { useState, useEffect, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import { WidthProvider } from 'react-grid-layout/legacy';
import { useLayoutStore } from '@/store/layoutStore';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutWrapperProps {
  children: React.ReactNode[];
}

const LAYOUT_CACHE_KEY = 'dashboard_layout_cache';

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
    { i: 'chart-revenue_spend',  x: 0, y: 3, w: 6, h: 3, minW: 2 },
    { i: 'chart-payment',        x: 6, y: 3, w: 2, h: 3, minW: 2 },
    { i: 'chart-card_approval',  x: 0, y: 6, w: 4, h: 3, minW: 2 },
    { i: 'chart-funnel',         x: 4, y: 6, w: 4, h: 3, minW: 3 },
    { i: 'chart-country',        x: 0, y: 9, w: 5, h: 4, minW: 3 },
  ],
};

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

export default function GridLayoutWrapper({ children }: GridLayoutWrapperProps) {
  const { isEditingLayout } = useLayoutStore();
  const [mounted, setMounted] = useState(false);
  const [layouts, setLayouts] = useState<any>(DEFAULT_LAYOUTS);
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
    setMounted(true);

    async function loadLayout() {
      try {
        const res = await fetch('/api/settings?key=dashboard_layout');
        const json = await res.json();
        if (json.data && json.data.length > 0 && json.data[0].value) {
          setLayouts(withMissingDefaults(json.data[0].value));
          try {
            window.localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(json.data[0].value));
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

    loadLayout();
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

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    // So salva quando o usuario esta editando ativamente no desktop
    // (evita que normalizacoes automaticas do RGL — inclusive as dos
    // breakpoints menores — sobrescrevam o layout salvo)
    if (canEditLayout) {
      saveToSupabase(allLayouts);
      try {
        window.localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(allLayouts));
      } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      {canEditLayout && (
        <div className="absolute -top-7 right-0 text-xs text-gray-500 z-10">
          {isSaving ? 'Salvando...' : 'Layout salvo'}
        </div>
      )}
      <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
        <ResponsiveGridLayout
          className={`layout${ready ? '' : ' grid-booting'}`}
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={{ lg: 8, md: 4, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={110}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ enabled: canEditLayout }}
          resizeConfig={{ enabled: canEditLayout }}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          measureBeforeMount
        >
          {children}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
