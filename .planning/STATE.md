---
gsd_state_version: "1.0"
milestone: v2.0
milestone_name: Webhook Nativo Perfect Pay & Supabase Vendas
status: in_progress
last_updated: "2026-09-24T16:26:00.000Z"
last_activity: 2026-09-24
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 50
---

# STATE — Dashify

## Status Atual

- **Milestone ativo:** v2.0 — Webhook Nativo Perfect Pay & Supabase Vendas
- **Última atualização:** 2026-09-24

## Progresso por Fase (Milestone v2.0)

| Fase | Status | Conclusão |
|---|---|---|
| Fase 5 — Modelagem no Supabase e Receptor de Webhook Perfect Pay | 🟢 Concluída (2 planos) | 100% |
| Fase 6 — Migração de Dados Históricos (Google Sheets ➔ Supabase) | 🟢 Concluída (1 plano) | 100% |
| Fase 7 — Migração das Rotas Analíticas para o Supabase | ⚪ Não iniciada | 0% |
| Fase 8 — Aposentadoria do Google Sheets, Limpeza e Validação | ⚪ Não iniciada | 0% |

## Decisões Técnicas Registradas

- **2026-09-24:** Migração de arquitetura da v2.0 para desacoplar totalmente do Google Sheets e operar 100% sobre o Supabase (PostgreSQL).
- **2026-09-24:** O Dashify receberá webhooks POST diretos da Perfect Pay em `/api/webhooks/perfectpay`.
- **2026-09-24:** Proteção do webhook por validação de `token` no payload comparado a `PERFECTPAY_WEBHOOK_TOKEN` no `.env.local`.
- **2026-09-24:** O `proxy.ts` liberará `/api/webhooks/` sem barrar com exigência de cookie de sessão Supabase.
- **2026-09-24:** Criação de script one-off para migrar o histórico atual da planilha para a tabela `sales` do Supabase antes de desativar o Google Sheets.
- **2026-09-24:** O Faturamento Líquido será calculado com base na comissão do Produtor extraída do array `commission` do webhook da Perfect Pay.
- **2026-09-24:** Fase 5 concluída: DDL `sales`, tipos TypeScript, parser robusto com 27 testes unitários, liberação no proxy e rota idempotente de webhook.
- **2026-09-24:** Fase 6 concluída: 1.058 vendas históricas migradas para a tabela `sales` do Supabase com 100% de paridade (723 aprovadas, R$ 62.010,30 de receita líquida).

## Current Position

Phase: Phase 6 — Migração de Dados Históricos (Google Sheets para Supabase)
Plan: Complete (06-01)
Status: Completed
Last activity: 2026-09-24 — Phase 6 completed with absolute parity (1058 sales, 723 approved, R$ 62.010,30)
