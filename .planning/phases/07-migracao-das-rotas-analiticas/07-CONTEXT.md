# Phase 7: Migração das Rotas Analíticas para o Supabase - Context

**Gathered:** 2026-09-24  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Esta fase migra todos os 6 endpoints de API do Dashify para consumirem a tabela `sales` do Supabase em vez da API do Google Sheets (`db_vendas!A:W` e `Log_Webhooks!C:C`):
1. `GET /api/sales-pulse`
2. `GET /api/summary`
3. `GET /api/transactions`
4. `GET /api/campaigns`
5. `GET /api/reports`
6. `GET /api/products`

O frontend não deve sofrer alterações de contrato: os retornos JSON, nomes de propriedades, filtros (período, produto, campanha, país) e lógicas de cálculo de KPIs (13% de impostos sobre Meta Ads, produtos front no CPA, deduções de cancelamento/reembolso) devem ser 100% preservados.
</domain>

<decisions>
## Implementation Decisions

### Arquitetura de Acesso a Dados
- **D-01 (Módulo Centralizado `lib/sales-service.ts`):** Criar uma camada de serviço reutilizável para consultar a tabela `sales` no Supabase utilizando `getSupabaseAdmin()`. Esta camada encapsula:
  - Filtros de data (`dateStart`, `dateEnd`) convertidos para timestamps com offset de São Paulo (`-03:00`).
  - Filtros de produto (`product_name in (...)`).
  - Paginação automática transparente caso o intervalo retorne mais de 1.000 registros (superando o limite padrão do PostgREST).
  - Conversão canônica de `SalesRow` para `VendasRow` garantindo compatibilidade total com `lib/kpis.ts`.

### Otimizações Específicas por Rota
- **D-02 (`/api/sales-pulse`):** Substituir a leitura pesada de 2.000 linhas da planilha por duas queries ultra-leves e indexadas: `COUNT(*)` exato e `SELECT updated_at, code, status ORDER BY updated_at DESC LIMIT 1`. Gerar assinatura rápida baseada em hash FNV-1a. Tempo esperado: < 40ms (contra ~1.500ms anteriormente).
- **D-03 (`/api/summary`):** Manter a chamada paralela `Promise.all([fetchMetaInsights, fetchSales, loadFrontProducts])`. Toda a geração de `daily_stats`, `hourly_breakdown`, `card_approval`, `payment_stats` e `country_ranking` continua executando a mesma lógica matemática comprovada.
- **D-04 (`/api/transactions`):** Consultar diretamente o Supabase com ordenação decrescente por data (`order('date', { ascending: false })`).
- **D-05 (`/api/campaigns`):** Manter o algoritmo de matching de 3 níveis (`campaignIndex`, `adsetIndex`, `adIndex`) cruzando `utm_campaign`, `utm_term` e `utm_content` com os dados do Meta Insights.
- **D-06 (`/api/reports`):** Gerar heatmap de dias/horas e funil diretamente dos dados do Supabase.
- **D-07 (`/api/products`):** Calcular métricas de produtos a partir da tabela `sales`, aproveitando `product_code` já persistido e catálogo de `app_settings`.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/REQUIREMENTS.md` — Requisitos API-01 a API-06
- `.planning/ROADMAP.md` — Especificação da Phase 7
- `lib/kpis.ts` — Lógica de cálculo dos KPIs, 13% Meta tax multiplier e CPA
- `lib/meta-insights.ts` — Consulta aos dados do Meta Ads no Supabase
- `lib/types.ts` — Interfaces `VendasRow`, `SalesRow`, `KPIs`
</canonical_refs>
