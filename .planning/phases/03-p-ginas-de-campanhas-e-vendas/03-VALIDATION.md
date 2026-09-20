# Phase 3 Nyquist Validation Strategy

## 1. Traceability
- **Goal**: Implement "Páginas de Campanhas e Vendas" with complete data tables and badges.
- **Constraints**: No cross-referencing UTMs (abort as per context). Client-side pagination. ROAS Badges (Green >= 2, Yellow > 1, Red <= 1).

## 2. Validation Axes
1. `api_campaigns_returns_valid_json`: Requesting `/api/campaigns` returns a 200 OK and groups data by campaign_name.
2. `api_transactions_returns_valid_json`: Requesting `/api/transactions` returns a 200 OK with list of vendas.
3. `datatable_sorting_works`: Clicking on a DataTable header toggles sorting (asc/desc) and updates the rows.
4. `performance_badge_colors`: A ROAS of 2.5 renders a green badge, 1.5 renders yellow, 0.5 renders red.
5. `client_side_pagination`: DataTable shows correctly 10 rows per page if `pageSize={10}` is configured.
6. `vendas_filters`: Selecting a status in the Vendas filter bar filters the table to show only those matching elements.
