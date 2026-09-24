# Roadmap: Dashify

## Milestone v2.0 — Webhook Nativo Perfect Pay & Supabase Vendas

Substituição definitiva da leitura do Google Sheets por um receptor nativo de webhook da Perfect Pay, persistência no Supabase (PostgreSQL), importação do histórico existente e migração das rotas do dashboard para operarem 100% no banco de dados.

## Phases

- [x] **Phase 5: Modelagem Supabase e Receptor de Webhook Perfect Pay** - Criar tabela sales, parser dos eventos da Perfect Pay, rota de webhook com validação de token e liberação no proxy.
- [x] **Phase 6: Migração de Dados Históricos (Google Sheets para Supabase)** - Script de migração one-off importando todas as transações passadas para o Supabase com paridade de totais.
- [x] **Phase 7: Migração das Rotas Analíticas para o Supabase** - Atualizar summary, transactions, campaigns, reports, products e sales-pulse para consumirem o Supabase.
- [ ] **Phase 8: Aposentadoria do Google Sheets, Limpeza e Validação** - Remover lib/sheets.ts, dependência googleapis, variáveis legadas e validar fluxo end-to-end.

## Phase Details

### Phase 5: Modelagem Supabase e Receptor de Webhook Perfect Pay
**Goal**: Criar a estrutura de banco de dados para vendas e o endpoint de ingestão de webhooks protegido e idempotente.
**Depends on**: Nothing (primeira fase da v2.0)
**Requirements**: WH-01, WH-02, WH-03, WH-04, DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. Tabela `sales` existe no Supabase com chave primária em `code`, colunas indexadas e coluna `raw_payload JSONB`.
  2. Endpoint `/api/webhooks/perfectpay` aceita requisições HTTP POST públicas (liberado no `proxy.ts`).
  3. Requisições com token inválido recebem HTTP 401; requisições com token válido recebem HTTP 200 `{ success: true }`.
  4. Webhook realiza upsert idempotente por `code`, mapeando status (`sale_status_enum`), meio de pagamento, países e comissões para o schema canônico.
**Plans**: 2 plans

Plans:
- [x] 05-01: Modelagem Supabase (supabase_vendas.sql), Tipagens (lib/types.ts) e Parser Perfect Pay (lib/parsers/perfectpay.ts)
- [x] 05-02: Rota de Webhook (/api/webhooks/perfectpay), Liberação no proxy.ts e Testes Automatizados

### Phase 6: Migração de Dados Históricos (Google Sheets para Supabase)
**Goal**: Transferir todas as vendas da planilha atual para a nova tabela do Supabase mantendo histórico inalterado.
**Depends on**: Phase 5
**Requirements**: MIG-01, MIG-02, MIG-03
**Success Criteria** (what must be TRUE):
  1. Script `scripts/migrate-sheets-to-supabase.mjs` lê `db_vendas!A:W` e insere em lote no Supabase.
  2. Total de Faturamento Líquido e quantidade de vendas aprovadas no Supabase batem exatamente com a planilha.
**Plans**: 1 plan

Plans:
- [x] 06-01: Script de Migração One-off (scripts/migrate-sheets-to-supabase.mjs) e Auditoria de Paridade Absoluta

### Phase 7: Migração das Rotas Analíticas para o Supabase
**Goal**: Fazer com que todas as APIs do dashboard consultem diretamente o Supabase em vez do Google Sheets.
**Depends on**: Phase 6
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. `/api/summary`, `/api/transactions`, `/api/campaigns`, `/api/reports`, `/api/products` leem da tabela `sales`.
  2. `/api/sales-pulse` calcula assinatura leve a partir de `MAX(updated_at)` e `COUNT(*)` do Supabase em menos de 100ms.
  3. Dashboard carrega todas as telas sem dependência do Sheets API e com tempo de resposta inferior a 500ms.
**Plans**: 2 plans

Plans:
- [x] 07-01: Service de Consulta ao Supabase (lib/sales-service.ts) e Migração de /api/sales-pulse, /api/summary e /api/transactions
- [x] 07-02: Migração de /api/campaigns, /api/reports e /api/products com Verificação de Performance e Paridade

### Phase 8: Aposentadoria do Google Sheets, Limpeza e Validação
**Goal**: Remover dependências legadas do Google Sheets e validar operação autônoma.
**Depends on**: Phase 7
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `lib/sheets.ts` e `check-sheets.js` removidos; `googleapis` desinstalado do `package.json`.
  2. `npm run build` executa com sucesso sem erros.
  3. Webhook de teste simula ciclo completo de venda refletindo instantaneamente no dashboard.
**Plans**: 1 plan

Plans:
- [ ] 08-01: Remoção de Arquivos Legados, Desinstalação do googleapis, Atualização de Docs e Build E2E

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| Phase 5: Modelagem Supabase e Receptor de Webhook | 2/2 | Complete | 2026-09-24 |
| Phase 6: Migração de Dados Históricos | 1/1 | Complete | 2026-09-24 |
| Phase 7: Migração das Rotas Analíticas | 2/2 | Complete | 2026-09-24 |
| Phase 8: Aposentadoria do Sheets e Validação | 0/1 | Planned | - |
