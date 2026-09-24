# Phase 7: Migração das Rotas Analíticas - Research

**Phase:** 07-migracao-das-rotas-analiticas  
**Date:** 2026-09-24  

## 1. Mapeamento de Dependências das Rotas

Todas as 6 rotas analíticas importavam `getSheetsClient` e `getSpreadsheetId` de `@/lib/sheets` e faziam leituras de `db_vendas!A:W`:

| Rota | Função Principal | Entrada | Saída | Oportunidade com Supabase |
|---|---|---|---|---|
| `/api/sales-pulse` | Long-polling / verificação de novidades | Nenhuma | `{ rows: number, signature: string }` | Consulta de `MAX(updated_at)` e `COUNT(*)` via índice B-Tree em ~25ms. |
| `/api/summary` | Painel principal, KPIs, gráficos diários/horários, meios de pagamento, aprovação de cartão | `period`, `dateStart`, `dateEnd`, `product`, `campaign`, `country` | `{ kpis, daily_stats, payment_stats, card_approval, hourly_breakdown, country_ranking, available_products, ... }` | Elimina latência do Google Sheets (~1,5s) caindo para <100ms. |
| `/api/transactions` | Listagem tabular de transações | `period`, `dateStart`, `dateEnd`, `product` | `{ transactions: VendasRow[] }` | Ordenação direta no PostgreSQL por `date DESC`. |
| `/api/campaigns` | Relatório de campanhas / conjuntos / anúncios cruzando Meta + UTMs | `period`, `dateStart`, `dateEnd`, `level` | Hierarquia de campanhas/anúncios com vendas atribuídas | Consulta filtrada por data na tabela `sales`. |
| `/api/reports` | Heatmap semanal/horário, etapas do funil e ranking de países | `period`, `dateStart`, `dateEnd`, `product` | `{ heatmap, funnel, countryRanking }` | Agregações analíticas sobre dados limpos do banco. |
| `/api/products` | Tabela detalhada de produtos | `period`, `dateStart`, `dateEnd` | `{ products: ProductTotals[] }` | `product_code` já indexado na tabela `sales`. |

---

## 2. Camada de Abstração: `lib/sales-service.ts`

Para manter DRY e evitar duplicação de queries de paginação e conversão de schema entre as rotas, `lib/sales-service.ts` fornecerá:
1. `fetchSales(options: FetchSalesOptions): Promise<VendasRow[]>`:
   - Suporta filtros opcionais: `dateStart`, `dateEnd`, `products`, `country`, `status`.
   - Pagina em blocos de 1.000 se o número de linhas no período exceder 1.000 (garantindo que anos inteiros de dados não sejam truncados).
   - Converte `SalesRow` em `VendasRow` formatando a data de forma que `substring(0, 10)` devolva `YYYY-MM-DD` (garantindo 100% de compatibilidade com `filterVendasByDate` e gráficos).
2. `fetchSalesPulse(): Promise<{ rows: number; signature: string }>`:
   - Realiza count exato e busca a última venda modificada (`updated_at DESC LIMIT 1`).
   - Retorna assinatura única que muda instantaneamente a cada nova venda ou atualização de status.

---

## 3. Divisão dos Planos

- **Plan 07-01: Core Service & Rotas de Alto Impacto**
  - Implementar `lib/sales-service.ts`.
  - Migrar `/api/sales-pulse`, `/api/summary` e `/api/transactions`.
  - Testar com requisições HTTP e validar paridade de KPIs.

- **Plan 07-02: Rotas Especializadas & Validação Global**
  - Migrar `/api/campaigns`, `/api/reports` e `/api/products`.
  - Executar bateria de requisições de teste em todas as rotas.
  - Verificar tempo de resposta (< 200ms em média).
