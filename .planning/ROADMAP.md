# ROADMAP — ads-performance-hub

## Milestone 1 — Dashboard Funcional com KPIs Reais

**Objetivo:** Dashboard conectado à Sheets API com os 8 KPIs calculados, filtros de período funcionando e layout visual fiel ao UTMify. Todas as 4 páginas implementadas.

**Critério de conclusão:** Um gestor de tráfego consegue abrir o dashboard, selecionar um período, ver os KPIs calculados corretamente e navegar pelas 4 páginas sem erros.

---

## Fase 1 — Fundação e Infraestrutura de Dados

**Objetivo:** Projeto Next.js configurado, integração com Google Sheets funcionando, parsers tipados e endpoints de API retornando dados corretos.

**Entregáveis:**
- Projeto Next.js 14 com TypeScript e Tailwind CSS inicializado
- Lib de autenticação com Google Sheets API (service account)
- `parseMeta()` — parser completo com substituição de vírgula por ponto
- `parseVendas()` — parser completo com normalização de países e meios de pagamento
- `GET /api/data/meta` e `GET /api/data/vendas` retornando dados tipados
- `GET /api/summary` com os 8 KPIs calculados e suporte a filtros de query

**Tarefas:**
- [ ] 1.1 — Setup Next.js 14 + TypeScript + Tailwind CSS + ESLint
- [ ] 1.2 — Configurar variáveis de ambiente (`GOOGLE_SERVICE_ACCOUNT_JSON`, `SPREADSHEET_ID`)
- [ ] 1.3 — Criar cliente Google Sheets API com autenticação por service account (`lib/sheets.ts`)
- [ ] 1.4 — Definir schemas TypeScript para `MetaRow` e `VendasRow` (`lib/types.ts`)
- [ ] 1.5 — Implementar `parseMeta()` com substituição vírgula→ponto e tipagem completa (`lib/parsers/meta.ts`)
- [ ] 1.6 — Implementar `parseVendas()` com normalização de países, lowercase e tratamento de Telefone como String (`lib/parsers/vendas.ts`)
- [ ] 1.7 — Implementar as 8 funções puras de KPI (`lib/kpis.ts`)
- [ ] 1.8 — Criar `GET /api/data/meta` (`app/api/data/meta/route.ts`)
- [ ] 1.9 — Criar `GET /api/data/vendas` (`app/api/data/vendas/route.ts`)
- [ ] 1.10 — Criar `GET /api/summary` com filtros `period`, `dateStart`, `dateEnd`, `campaign`, `status` (`app/api/summary/route.ts`)
- [ ] 1.11 — Validar KPIs manualmente contra planilha real (smoke test)

**Critério de aceite (UAT):**
- Chamar `/api/summary?period=this_month` retorna JSON com os 8 KPIs corretos
- Valores de `spend` batem com a soma manual da planilha (tolerância < 0,01)
- Vendas com status != "Aprovado" não entram no Faturamento Líquido
- Quando `spend = 0`, ROI e ROAS retornam `null` (não zero)
- `parseMeta()` converte "1.234,56" → 1234.56 corretamente

---

## Fase 2 — Dashboard e Layout Global

**Objetivo:** Layout completo com sidebar, header com filtros, e página Dashboard com todos os KPI cards e gráficos funcionando em dark mode.

**Entregáveis:**
- RootLayout com Sidebar (desktop) e Bottom Nav (mobile)
- Header com filtros de período e campanha
- Componente `KPICard` reutilizável
- Página Dashboard com grid de 8 KPI cards
- Gráfico de linha dupla (Faturamento vs Gasto por dia)
- Gráfico de rosca (Vendas por Meio de Pagamento)
- Configuração React Query com `staleTime: 5 min`

**Tarefas:**
- [ ] 2.1 — Criar `RootLayout` com sidebar lateral e dark theme global (`app/layout.tsx`)
- [ ] 2.2 — Implementar `Sidebar` com logo, links de navegação e seletor de workspace (`components/layout/Sidebar.tsx`)
- [ ] 2.3 — Implementar `BottomNav` para mobile com 5 ícones (`components/layout/BottomNav.tsx`)
- [ ] 2.4 — Implementar `Header` com filtros de período (Hoje/Semana/Mês/Custom) e dropdown de campanha (`components/layout/Header.tsx`)
- [ ] 2.5 — Configurar TanStack Query com Provider e `staleTime: 5 minutos` (`app/providers.tsx`)
- [ ] 2.6 — Criar hook `useSummary(filters)` com React Query (`hooks/useSummary.ts`)
- [ ] 2.7 — Implementar `KPICard` com label, valor grande, ícone ⓘ + tooltip, cor dinâmica verde/vermelho (`components/KPICard.tsx`)
- [ ] 2.8 — Criar `LoadingSkeleton` animado para KPI cards (`components/LoadingSkeleton.tsx`)
- [ ] 2.9 — Implementar página Dashboard com grid de 8 KPI cards (`app/dashboard/page.tsx`)
- [ ] 2.10 — Implementar `LineChart` (Recharts) com Faturamento vs Gasto por dia (`components/charts/RevenueVsSpendChart.tsx`)
- [ ] 2.11 — Implementar `DonutChart` (Recharts) com vendas por Meio de Pagamento (`components/charts/PaymentMethodChart.tsx`)
- [ ] 2.12 — Conectar filtros de período ao estado global e propagar para todos os hooks
- [ ] 2.13 — Implementar botão "Atualizar" com timestamp de última atualização

**Critério de aceite (UAT):**
- Selecionar "Esta Semana" atualiza todos os KPI cards sem reload da página
- Card de Lucro exibe valor em verde se positivo, vermelho se negativo
- ROI e ROAS exibem "N/A" em vermelho quando spend = 0 no período
- Gráfico de linha exibe dados corretos por dia com legenda
- No mobile, sidebar desaparece e bottom nav aparece
- Loading skeletons aparecem enquanto os dados carregam

---

### Phase 3: Páginas de Campanhas e Vendas

**Objetivo:** Páginas de Campanhas e Vendas completamente funcionais com tabelas, filtros específicos e badges de status.

**Entregáveis:**
- Página Campanhas com tabela completa e badges de performance
- Página Vendas com tabela de transações e filtros por status/país/produto/pagamento
- Cruzamento UTM implementado (ROAS Efetivo por campanha)

**Tarefas:**
- [x] 3.1 — Criar endpoints para dados de campanhas e transações (`app/api/campaigns/route.ts`, `app/api/transactions/route.ts`)
- [x] 3.2 — Implementar hook `useCampaigns(filters)` (`hooks/useCampaigns.ts`)
- [x] 3.3 — Implementar hook `useTransactions(filters)` (`hooks/useTransactions.ts`)
- [x] 3.4 — Implementar lógica de cruzamento UTM para ROAS Efetivo (`lib/attribution.ts`) [ABORTADO]
- [x] 3.5 — Criar componente `DataTable` genérico com ordenação por coluna (`components/DataTable.tsx`)
- [x] 3.6 — Implementar `StatusBadge` colorido: verde=Aprovado, amarelo=Aguardando, vermelho=Cancelado (`components/StatusBadge.tsx`)
- [x] 3.7 — Implementar `PerformanceBadge` por campanha: Alta/Atenção/Baixa baseado em ROAS (`components/PerformanceBadge.tsx`)
- [x] 3.8 — Criar página Campanhas com tabela completa e ambos os ROAS (`app/campanhas/page.tsx`)
- [x] 3.9 — Criar página Vendas com tabela de transações (`app/vendas/page.tsx`)
- [x] 3.10 — Implementar painel de filtros da página Vendas (Status, País, Produto, Meio de Pagamento, Etapa do Funil)

**Critério de aceite (UAT):**
- Tabela de Campanhas exibe ROAS (Meta) e ROAS Efetivo em colunas separadas com valores distintos
- Badge de performance muda conforme ROAS: verde > 2.0, amarelo 1.0–2.0, vermelho < 1.0
- Filtro por Status na página Vendas atualiza a tabela instantaneamente
- Campo Telefone exibe como string (ex: "+5511999999999"), sem notação científica
- Tabelas são ordenáveis por qualquer coluna com clique no header

---

### Phase 4: Relatórios e Polimento Final

**Objetivo:** Página de Relatórios completa, responsividade mobile refinada, loading states polidos e tooltips informativos em todos os KPIs.

**Entregáveis:**
- Página Relatórios com heatmap horário, ranking de países, funil de conversão, análise de order bumps
- Responsividade mobile completa e testada
- Tooltips nos ícones ⓘ de cada KPI card
- Loading skeletons em todas as páginas

**Tarefas:**
- [x] 4.1 — Criar endpoint para dados de relatórios agregados (`app/api/reports/route.ts`)
- [x] 4.2 — Implementar heatmap 24h de vendas e gasto (`components/charts/HourlyHeatmap.tsx`)
- [x] 4.3 — Implementar ranking de países com barras de progresso (`components/charts/CountryRanking.tsx`)
- [x] 4.4 — Implementar visualização de funil de conversão (Front-End -> Upsell 01 -> Upsell 02) (`components/charts/ConversionFunnel.tsx`)
- [x] 4.5 — Implementar análise de Order Bumps com percentual e valor (`components/charts/OrderBumpAnalysis.tsx`) [ABORTADO POR FALTA DE DADOS CLAROS]
- [x] 4.6 — Criar página Relatórios com todos os componentes (`app/dashboard/relatorios/page.tsx`)
- [x] 4.7 — Adicionar conteúdo dos tooltips ℹ️ para cada KPI (definição + fórmula) (`lib/kpi-tooltips.ts`)
- [x] 4.8 — Implementar componente `Tooltip` acessível com keyboard support (`components/Tooltip.tsx`)
- [x] 4.9 — Audit de responsividade mobile em todas as páginas e correções (BottomNav, Sidebar hidden)
- [x] 4.10 — Adicionar loading skeletons em Campanhas, Vendas e Relatórios
- [x] 4.11 — Criar página inicial (`app/page.tsx`) com redirect para `/dashboard` [JÁ FEITO NA FASE 1]
- [x] 4.12 — Teste end-to-end com dados reais: validar todos os KPIs contra planilha manual

**Critério de aceite (UAT):**
- Heatmap horário identifica corretamente os horários de pico de vendas e gasto
- Funil mostra queda percentual correta entre etapas (Front-End > Upsell 01 > Upsell 02)
- Tooltip do ícone ⓘ exibe a fórmula e definição do KPI ao hover/focus
- Layout completo no mobile sem overflow horizontal
- Todos os KPIs do dashboard batem com cálculo manual na planilha (QA final)

---

# Milestone 2: Banco de Dados Próprio e Sincronização em Tempo Real (Supabase)

**Objetivo Geral:** Eliminar a dependência do Google Apps Script para o Meta Ads, conectando o painel diretamente à API do Graph e salvando os dados no Supabase (PostgreSQL) para garantir tempo real.

### Phase 1: Setup da Infraestrutura e Sincronização
- [x] 1.1 — Configurar credenciais no `.env.local` (Supabase, Meta) e inicializar `supabase-js`
- [x] 1.2 — Criar tabela `meta_ads_insights` via script SQL no Supabase
- [x] 1.3 — Criar rota de sync `/api/meta/sync` para consumir do Facebook Graph API e fazer UPSERT no banco
- [x] 1.4 — Atualizar o botão "Atualizar" no Header para acionar o Sync do Meta antes de revalidar a cache

### Phase 2: Transição de Leitura para o Banco
- [x] 2.1 — Refatorar `app/api/summary/route.ts` para buscar `db_meta` do Supabase em vez do Google Sheets
- [x] 2.2 — Refatorar `app/api/campaigns/route.ts` para usar Supabase
- [x] 2.3 — Validar cruzamento de dados com a Hotmart (que continua no Sheets)
- [x] 2.4 — Desligar/descartar completamente o arquivo `meta.ts` de parse antigo e aposentar aba `db_meta` da planilha

---

## Estrutura de Diretórios Alvo

```
ads-performance-hub/
├── app/
│   ├── api/
│   │   ├── data/
│   │   │   ├── meta/route.ts
│   │   │   └── vendas/route.ts
│   │   ├── summary/route.ts
│   │   ├── campaigns/route.ts
│   │   ├── transactions/route.ts
│   │   └── reports/route.ts
│   ├── dashboard/page.tsx
│   ├── campanhas/page.tsx
│   ├── vendas/page.tsx
│   ├── relatorios/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   ├── charts/
│   │   ├── RevenueVsSpendChart.tsx
│   │   ├── PaymentMethodChart.tsx
│   │   ├── HourlyHeatmap.tsx
│   │   ├── CountryRanking.tsx
│   │   ├── ConversionFunnel.tsx
│   │   └── OrderBumpAnalysis.tsx
│   ├── KPICard.tsx
│   ├── DataTable.tsx
│   ├── StatusBadge.tsx
│   ├── PerformanceBadge.tsx
│   ├── LoadingSkeleton.tsx
│   └── Tooltip.tsx
├── hooks/
│   ├── useSummary.ts
│   ├── useCampaigns.ts
│   └── useTransactions.ts
├── lib/
│   ├── sheets.ts
│   ├── types.ts
│   ├── kpis.ts
│   ├── attribution.ts
│   ├── kpi-tooltips.ts
│   └── parsers/
│       ├── meta.ts
│       └── vendas.ts
├── .env.local (não commitado)
├── .env.example
└── .planning/
```
