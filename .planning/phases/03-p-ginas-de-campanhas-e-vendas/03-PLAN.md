# Phase 3: Páginas de Campanhas e Vendas

## 1. Goal
Implement the core tabular data views for the Ads Performance Hub: 
- A Campaigns table showing Meta Ads performance with color-coded ROAS badges.
- A Vendas (Transactions) table showing Hotmart sales with robust client-side pagination, sorting, and filtering.

*Note: Cross-referencing UTMs was aborted by the user. The tables will reflect data directly from their respective source platforms without cross-joining.*

## 2. Approach
- **Backend**: Create two new Next.js Route Handlers (`/api/campaigns` and `/api/transactions`) that load data via `getSheetsClient()`. They will accept date filters exactly like `/api/summary`.
- **Hooks**: Create `useCampaigns` and `useTransactions` using `@tanstack/react-query`.
- **Components**:
  - `DataTable`: A flexible, reusable client-side table component with built-in pagination (10/20/50 rows) and column sorting.
  - `PerformanceBadge`: Returns a styled tailwind badge based on ROAS (Green >= 2.0, Yellow > 1.0, Red <= 1.0).
  - `StatusBadge`: Returns a styled badge for Vendas status (Aprovado, Cancelado, etc).
- **Pages**: Create the route pages `app/dashboard/campanhas/page.tsx` and `app/dashboard/vendas/page.tsx` integrating the data tables.

## 3. Tasks

### 3.1: API Endpoints
- **[NEW] `app/api/campaigns/route.ts`**: Parse `db_meta`, apply `dateStart`/`dateEnd` filters, aggregate metrics (`spend`, `purchases`, `purchase_value`) grouped by `campaign_name`, and calculate final `roas`, `cpa`, `cpc`, `ctr`.
- **[NEW] `app/api/transactions/route.ts`**: Parse `db_vendas`, apply `dateStart`/`dateEnd` filters, and return the raw list of transactions (to be paginated client-side).

### 3.2: Data Hooks
- **[NEW] `hooks/useCampaigns.ts`**: Setup `useQuery` for `/api/campaigns`.
- **[NEW] `hooks/useTransactions.ts`**: Setup `useQuery` for `/api/transactions`.

### 3.3: UI Components
- **[NEW] `components/ui/PerformanceBadge.tsx`**: Accepts a `roas` value and returns a badge (Green, Yellow, or Red).
- **[NEW] `components/ui/StatusBadge.tsx`**: Accepts a Hotmart `status` and returns a corresponding colored badge.
- **[NEW] `components/ui/DataTable.tsx`**: A robust client-side table using React state. Features: Column sorting (asc/desc arrows), Pagination controls (Prev/Next, Page X of Y), and Page Size selector (10, 20, 50).

### 3.4: Páginas
- **[NEW] `app/dashboard/campanhas/page.tsx`**: Render the Campaigns DataTable. Columns: Campanha, Gasto, Compras, Faturamento, CPA, ROAS, Status (PerformanceBadge).
- **[NEW] `app/dashboard/vendas/page.tsx`**: Render the Vendas DataTable. Include a top filter bar (Status, País, Produto, Pagamento) that filters the data locally before passing to the DataTable. Columns: Data, Cliente, Produto, País, Pagamento, Status (StatusBadge), Líquido R$.

## 4. Verification
- Verify that navigating to `/dashboard/campanhas` and `/dashboard/vendas` works.
- Verify that sorting by "Gasto" descending works.
- Verify that changing rows per page to "50" updates the table correctly.
- Verify ROAS badges display correct colors based on thresholds.
