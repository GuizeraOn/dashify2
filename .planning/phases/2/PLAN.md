# PLAN: Fase 2 — Dashboard e Layout Global

## Objetivo
Implementar a interface principal (Dashboard) consumindo os endpoints criados na Fase 1. Isso inclui a configuração de cache no frontend (TanStack Query), componentes de layout globais (Sidebar, Header, BottomNav), o grid de KPIs com tratamento de cores e os gráficos iniciais usando Recharts, tudo com visual dark mode fiel à especificação UTMify.

## Tracer Slice (Fatia Vertical Inicial)
Antes de construir todo o layout complexo e múltiplos componentes, vamos garantir que a comunicação cliente-servidor e o cache via React Query funcionam corretamente:
- Instalar dependências (TanStack Query, Recharts, Lucide Icons, etc.).
- Configurar `app/providers.tsx` com `QueryClientProvider` e `staleTime` de 5 minutos.
- Criar o hook de dados simplificado `useSummary()`.
- Renderizar uma página `/dashboard` limpa apenas com um valor bruto (ex: Gastos Totais) para validar o carregamento cliente-servidor.

## Tarefas de Implementação

### 1. Tracer Slice: Infra de Cache Frontend
- [x] 1.1 **Dependências:** Instalar `@tanstack/react-query`, `recharts`, `lucide-react` (para ícones) e `clsx` / `tailwind-merge` (se necessário).
- [x] 1.2 **Providers (`app/providers.tsx`):** Criar o provedor do TanStack Query configurando globalmente o `staleTime` padrão para `1000 * 60 * 5` (5 minutos) e o `refetchOnWindowFocus` para `false` para não sobrecarregar a API do Google.
- [x] 1.3 **RootLayout Update (`app/layout.tsx`):** Envolver a aplicação com o `<Providers>` criado.
- [x] 1.4 **Hook Simples (`hooks/useSummary.ts`):** Criar o hook inicial que faz um fetch simples para `/api/summary?period=this_month` sem filtros reativos ainda.
- [x] 1.5 **Dashboard Básico (`app/dashboard/page.tsx`):** Criar a página que consome o `useSummary()` e renderiza o valor de "spend" na tela, provando o funcionamento da camada. Alterar o redirect do `app/page.tsx` para `/dashboard`.

### 2. Layout Global (Shell)
- [x] 2.1 **Sidebar (`components/layout/Sidebar.tsx`):** Componente para navegação lateral em Desktop (links: Dashboard, Meta Ads, Campanhas, Produtos, Vendas, Relatórios).
- [x] 2.2 **BottomNav (`components/layout/BottomNav.tsx`):** Componente alternativo para Mobile com ícones na barra inferior.
- [x] 2.3 **Estado de Filtros (`hooks/useDashboardStore.ts` ou Context):** Implementar gerenciamento simples de estado global para os filtros (`period` e `campaign`), para que Header e Gráficos compartilhem os mesmos dados.
- [x] 2.4 **Header (`components/layout/Header.tsx`):** Barra superior contendo:
  - Seletores de período (Hoje, Esta Semana, Este Mês, Custom).
  - Select de Campanhas.
  - Botão de "Atualizar" que invoca um `queryClient.invalidateQueries()`.
- [x] 2.5 **Client Layout:** Criar um layout específico (`app/dashboard/layout.tsx` ou similar) que combine a estrutura completa (Sidebar + Header + Área de conteúdo).

### 3. Componentes de UI (KPIs)
- [x] 3.1 **KPICard (`components/KPICard.tsx`):** Card flexível contendo `Label`, `Valor Principal`, mudança de cor (verde para lucros e vermelho para negativos/NA), e formatação monetária/percentual embutida.
- [x] 3.2 **Tooltip (`components/Tooltip.tsx`):** Implementar um pequeno ícone (ⓘ) no topo dos cards que exibe um balão com dicas (pode usar Radix UI tooltip ou CSS puramente).
- [x] 3.3 **Loading Skeletons (`components/LoadingSkeleton.tsx`):** Componente de estado de carregamento exibindo blocos pulsantes enquanto o TanStack Query não finaliza o fetch.

### 4. Gráficos (Recharts)
- [x] 4.1 **Revenue vs Spend Chart (`components/charts/RevenueVsSpendChart.tsx`):** Gráfico de área/linha cruzando `Faturamento` (verde) e `Gasto` (vermelho) no tempo. Requer atualização do endpoint `/api/summary` para agrupar faturamento e gastos num array de time-series (`daily_stats`).
- [x] 4.2 **Payment Method Chart (`components/charts/PaymentMethodChart.tsx`):** Gráfico tipo `Donut` com legenda lateral distribuindo PIX, Cartão, PayPal, etc. Requer endpoint `/api/summary` para agrupar totais por pagamento (`payment_stats`).
- [x] 4.3 **Ajuste na API (`app/api/summary/route.ts`):** Modificar a rota implementada na Fase 1 para gerar as novas chaves `daily_stats` e `payment_stats` em resposta aos requisitos dos novos gráficos.

### 5. Consolidação do Dashboard
- [x] 5.1 **Atualização do Hook (`hooks/useSummary.ts`):** Tornar o hook reativo ao contexto de filtros (quando o Header muda, refaz o fetch passando os novos params na URL).
- [x] 5.2 **Página Dashboard Completa (`app/dashboard/page.tsx`):** 
  - Grid responsivo de KPIs no topo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
  - Alocar os 8 KPIs oficiais previstos (Gasto, Lucro, ROI, CPA, Faturamento, ROAS, Margem, Vendas Pendentes).
  - Incluir os gráficos na metade inferior.

## Verificação e Critérios de Aceite (UAT)
- [x] Navegar para `/dashboard` exibe o layout base corretamente, incluindo Sidebar apenas no desktop e BottomNav apenas no mobile.
- [x] A tela exibe Loading Skeletons nas requisições, sem congelamento na UI.
- [x] Se eu altero o filtro no topo de "Este Mês" para "Esta Semana", a requisição é disparada novamente e os números mudam sem o refresh inteiro da página.
- [x] Clicar no botão "Atualizar" puxa os dados recentes da planilha (invalidando o cache).
- [x] Valores que dão prejuízo (Lucro negativo) ou "N/A" ficam destacados em vermelho.
- [x] Gráficos renderizam perfeitamente com a paleta de cores correta do Dark Mode.

---
**Status da Fase:** Concluída.
