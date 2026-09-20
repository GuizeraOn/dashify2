# Phase 3 Discussion Log

- **Atribuição UTM (Meta vs Hotmart)**: O usuário informou que as UTMs estão configuradas incorretamente no Meta e não chegam à Hotmart. Portanto, optamos por descartar o cruzamento e manter os dados das tabelas independentes (Campanhas usa apenas Pixel/Meta, Vendas usa apenas Hotmart).
- **Tabelas & Filtros (Vendas)**: O usuário prefere paginação client-side para manter a velocidade instantânea na ordenação e filtros.
- **Métricas & Badges (Campanhas)**: Acordamos os thresholds do ROAS para as badges: Verde (>= 2), Amarelo (> 1 e < 2), Vermelho (<= 1).
