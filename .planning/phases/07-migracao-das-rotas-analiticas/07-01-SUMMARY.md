# Phase 7: Plan 07-01 Summary

**Camada de Serviço Centralizada (`lib/sales-service.ts`) e Migração de `/api/sales-pulse`, `/api/summary` e `/api/transactions`**

## O que foi entregue
1. **Camada de Acesso a Dados (`lib/sales-service.ts`):**
   - Função `fetchSales(options)`:
     - Filtros opcionais de data (`dateStart`, `dateEnd` normalizados no fuso `America/Sao_Paulo` com offset `-03:00`), produtos, país e status.
     - Paginação automática por lotes de 1.000 para contornar o limite rígido do PostgREST sem perda de linhas.
     - Conversão canônica e segura para `VendasRow`, mapeando datas, valores numéricos, status capitalizado para badges visuais e preservação de UTMs e dados de clientes.
   - Função `fetchSalesPulse()`:
     - Consulta ultrarrápida combinando `COUNT(*)` exato e `SELECT updated_at, code, status ORDER BY updated_at DESC LIMIT 1`.
     - Hash FNV-1a de 32 bits para assinatura leve (<30ms).

2. **Refatoração de `/api/sales-pulse/route.ts`:**
   - Removida dependência da leitura completa de `db_vendas!A:W` da planilha.
   - Resposta instantânea consumindo `fetchSalesPulse()`, mantendo 100% de compatibilidade com o hook `useSalesWatcher`.

3. **Refatoração de `/api/summary/route.ts`:**
   - Removida dependência de `@/lib/sheets` e `@/lib/parsers/vendas`.
   - Consulta paralela `Promise.all([fetchMetaInsights, fetchSales, loadFrontProducts])`.
   - Todos os cálculos analíticos de KPIs (Faturamento Líquido, Margem, Lucro Real com 13% de impostos, ROI, ROAS, CPA), gráficos diários, distribuição horária, divisão de pagamento e ranking por país mantidos integralmente.

4. **Refatoração de `/api/transactions/route.ts`:**
   - Removida dependência do Google Sheets.
   - Consulta direta da tabela `sales` ordenada por data decrescente.

## Verificação
- `npx tsc --noEmit` executado sem erros.
- Rotas validadas consumindo a tabela `sales` do Supabase.
