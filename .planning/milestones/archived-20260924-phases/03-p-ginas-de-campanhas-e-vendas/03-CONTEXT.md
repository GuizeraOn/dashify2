# Phase 3 Context: Páginas de Campanhas e Vendas

## Domain
Creating fully functional "Campanhas" and "Vendas" pages with data tables, robust filters, and performance metrics.

## Decisions

### 1. Atribuição UTM (Meta vs Hotmart)
- **Decisão**: ABORTADA. O cruzamento UTM não será feito porque os parâmetros estão configurados incorretamente no Meta.
- **Impacto**: A tabela "Campanhas" exibirá **apenas** os dados nativos do Pixel presentes na aba `db_meta` (Gasto, Compras, Valor de Compra, ROAS do Pixel). A tabela "Vendas" exibirá **apenas** os dados da Hotmart presentes na aba `db_vendas`. Não haverá coluna "ROAS Efetivo" cruzando as duas plataformas.

### 2. Tabelas & Filtros (Vendas)
- **Decisão**: Paginação Client-Side.
- **Impacto**: Os endpoints `/api/campaigns` e `/api/transactions` enviarão os dados do período em um único JSON. O componente genérico `DataTable.tsx` fará a ordenação, filtros locais e paginação (ex: 10, 20, 50 por página) diretamente no navegador (React), garantindo velocidade imediata e sem reload na UI.

### 3. Métricas & Badges (Campanhas)
- **Decisão**: Limites padrão de ROAS para o componente `PerformanceBadge.tsx`.
- **Regras**:
  - **Alta (Verde)**: ROAS >= 2.0
  - **Atenção (Amarelo)**: ROAS > 1.0 e < 2.0
  - **Baixa (Vermelho)**: ROAS <= 1.0

## Canonical Refs
- `../ROADMAP.md`
