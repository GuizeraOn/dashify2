# Phase 4: Relatórios e Polimento Final

## 1. Goal
Implement the final "Relatórios" page with advanced data visualizations (Heatmap, Funnel, Rankings). Implement the global mobile `BottomNav` and Radix UI tooltips for the Dashboard KPIs. Add UI Skeletons.

## 2. Approach
- **Backend Endpoint**: Create `/api/reports/route.ts` to supply aggregated data for the Funnel, Heatmap, and Country rankings from `db_vendas`.
- **Hooks**: Create `hooks/useReports.ts` using React Query.
- **Charts**: 
  - `HourlyHeatmap.tsx`: A Custom CSS Grid (7 rows for days, 24 columns for hours) visualizing sales density.
  - `ConversionFunnel.tsx`: Recharts FunnelChart or custom CSS flex layout showing step drop-offs.
  - `CountryRanking.tsx`: Horizontal Bar chart for top countries by revenue.
- **Mobile Navigation**: Create `BottomNav.tsx` component and update `app/dashboard/layout.tsx` to hide `Sidebar` and show `BottomNav` on `max-md` breakpoints.
- **KPI Tooltips**: Install `@radix-ui/react-tooltip`. Create `Tooltip.tsx` and inject the KPI definitions into `KPICard.tsx`.
- **Loading Skeletons**: Create `LoadingSkeleton.tsx` and use it in `loading.tsx` or inside the chart components while loading.

## 3. Tasks

### 3.1: API and Hooks
- **[NEW] `app/api/reports/route.ts`**: Extract data from `db_vendas`. Aggregate:
  - `heatmapData`: Sales count grouped by `[dayOfWeek][hourOfDay]`.
  - `funnelData`: Sales count grouped by `funnel_step`.
  - `countryData`: Net revenue grouped by `country`, sorted descending.
- **[NEW] `hooks/useReports.ts`**: Setup `useQuery` for `/api/reports`.

### 3.2: Advanced Charts
- **[NEW] `components/charts/HourlyHeatmap.tsx`**: CSS Grid implementation of a Heatmap.
- **[NEW] `components/charts/ConversionFunnel.tsx`**: Custom UI with percentage drop-off arrows.
- **[NEW] `components/charts/CountryRanking.tsx`**: Recharts BarChart (horizontal) for countries.
- **[NEW] `app/dashboard/relatorios/page.tsx`**: Assemble the three charts in a responsive grid.

### 3.3: Mobile BottomNav
- **[NEW] `components/layout/BottomNav.tsx`**: Fixed bottom bar with icons for Dashboard, Campanhas, Vendas, Relatórios.
- **[MODIFY] `components/layout/Sidebar.tsx`**: Add `hidden md:flex` to hide on mobile.
- **[MODIFY] `app/dashboard/layout.tsx`**: Render `<BottomNav />` inside a `md:hidden` wrapper at the bottom.

### 3.4: Tooltips & Skeletons
- **[NEW] `components/ui/Tooltip.tsx`**: Wrap `@radix-ui/react-tooltip`.
- **[MODIFY] `components/KPICard.tsx`**: Add the Tooltip over the Info Icon (ℹ️), taking a `tooltipText` prop.
- **[NEW] `lib/kpi-tooltips.ts`**: Export a dictionary of tooltips text for each KPI metric.
- **[NEW] `components/ui/LoadingSkeleton.tsx`**: A simple pulsing gray box to display while charts load.

## 4. Verification
- Validate the Funnel calculates the percentage drop-off correctly.
- Open DevTools (Mobile View) and verify `BottomNav` appears and `Sidebar` disappears.
- Hover over the Info icon on a KPICard on desktop and verify Radix UI Tooltip appears.
