# Phase 3 Research: Páginas de Campanhas e Vendas

## Current Architecture
- The frontend uses Next.js 15 (App Router).
- Dashboards use Tailwind CSS, Recharts.
- The UI relies heavily on `bg-[#121212]` for the global background and `bg-[#1E1E1E]` for cards.
- The data is fetched server-side from Google Sheets via `/api/...`.
- For Campaigns: `metaData` provides `spend`, `purchases`, `purchase_value`, `roas`.
- For Vendas: `vendasData` provides `gross_value_usd`, `net_revenue_brl`, `status`, `country`, `payment_method`, etc.
- Cross-referencing UTMs is officially ABORTED per `03-CONTEXT.md`.

## Integration Points
- `/api/campaigns/route.ts`: Needs to parse `db_meta` and group by `campaign_name`. Should apply date filtering.
- `/api/transactions/route.ts`: Needs to parse `db_vendas`. Should apply date filtering.
- Client-side filtering: The user wants client-side pagination and sorting. We will build a reusable `DataTable` component.

## Technical Risks & Constraints
- High payload size if `db_vendas` has tens of thousands of rows. Client-side pagination will require sending all data to the client. Since this is an MVP/V1, it is acceptable. 
- Re-use of the `Select` component from the Dashboard Header for the Vendas page filters.

## Validation Architecture
- Dimension 1: `/api/campaigns` and `/api/transactions` return 200 OK.
- Dimension 2: The `DataTable` correctly sorts columns when headers are clicked.
- Dimension 3: Pagination works client-side.
- Dimension 4: `PerformanceBadge` renders Green/Yellow/Red correctly based on ROAS logic.
