# Phase 4 Context: Relatórios e Polimento Final

## Domain
Creating the "Relatórios" page with advanced visualizations (Heatmap, Funnel, Country Ranking), adding mobile-responsive BottomNav, and Tooltips for KPIs.

## Decisions

### 1. Gráficos Avançados (Heatmap & Funil)
- **Funil**: Baseado estritamente na contagem da coluna `funnel_step` (`etapa do funil`) de `db_vendas`.
- **Heatmap**: Baseado na extração de Dia da Semana e Hora do Dia da coluna `date` (`data / hora`) de `db_vendas`. Como o Recharts não tem Heatmap nativo, será implementado via CSS Grid renderizando os blocos coloridos por intensidade térmica.

### 2. Responsividade Mobile
- **BottomNav**: Confirmado estilo "App Nativo". Em telas móveis (`< md`), a Sidebar padrão desaparece e dá lugar a uma barra fixa na base da tela (`fixed bottom-0 w-full`) com os ícones principais de navegação.

### 3. Tooltips dos KPIs
- **Tecnologia**: Usar `@radix-ui/react-tooltip`.
- **Interação**: Hover no Desktop, Tap no Mobile. Vai mostrar a fórmula matemática/definição do respectivo KPI.

## Canonical Refs
- `../ROADMAP.md`
