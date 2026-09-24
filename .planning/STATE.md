---
gsd_state_version: "1.0"
milestone: v2.0
milestone_name: Webhook Nativo Perfect Pay & Supabase Vendas
status: ready_to_plan
last_updated: "2026-09-24T16:12:00.000Z"
last_activity: 2026-09-24
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# STATE — Dashify

## Status Atual

- **Milestone ativo:** v2.0 — Webhook Nativo Perfect Pay & Supabase Vendas
- **Última atualização:** 2026-09-24

## Progresso por Fase (Milestone v2.0)

| Fase | Status | Conclusão |
|---|---|---|
| Fase 5 — Modelagem no Supabase e Receptor de Webhook Perfect Pay | ⚪ Não iniciada | 0% |
| Fase 6 — Migração de Dados Históricos (Google Sheets ➔ Supabase) | ⚪ Não iniciada | 0% |
| Fase 7 — Migração das Rotas Analíticas para o Supabase | ⚪ Não iniciada | 0% |
| Fase 8 — Aposentadoria do Google Sheets, Limpeza e Validação | ⚪ Não iniciada | 0% |

## Decisões Técnicas Registradas

- **2026-09-24:** Migração de arquitetura da v2.0 para desacoplar totalmente do Google Sheets e operar 100% sobre o Supabase (PostgreSQL).
- **2026-09-24:** O Dashify receberá webhooks POST diretos da Perfect Pay em `/api/webhooks/perfectpay`.
- **2026-09-24:** Proteção do webhook por validação de `token` no payload comparado a `PERFECTPAY_WEBHOOK_TOKEN` no `.env.local`.
- **2026-09-24:** O `proxy.ts` liberará `/api/webhooks/perfectpay` sem barrar com exigência de cookie de sessão Supabase.
- **2026-09-24:** Criação de script one-off para migrar o histórico atual da planilha para a tabela `sales` do Supabase antes de desativar o Google Sheets.
- **2026-09-24:** O Faturamento Líquido será calculado com base na comissão do Produtor extraída do array `commission` do webhook da Perfect Pay.

## Current Position

Phase: Phase 5 — Modelagem no Supabase e Receptor de Webhook Perfect Pay
Plan: —
Status: Ready to plan phase 5
Last activity: 2026-09-24 — Milestone v2.0 inicializado e documentado
