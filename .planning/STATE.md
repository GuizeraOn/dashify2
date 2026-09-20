# STATE — ads-performance-hub

## Status Atual

- **Milestone ativo:** Milestone Concluído
- **Última atualização:** 2026-09-20

## Progresso por Fase (Milestone 2)

| Fase | Status | Conclusão |
|---|---|---|
| Fase 1 — Setup da Infraestrutura e Sync | 🟢 Concluída | 100% |
| Fase 2 — Transição de Leitura para o Banco | 🟢 Concluída | 100% |

## Decisões Técnicas Registradas

- **2026-09-20:** O fluxo do Meta Ads sai do Google Apps Script e passa a ser disparado por Next.js para o Supabase (PostgreSQL).
- **2026-09-20:** Os dados da Hotmart continuam sendo lidos via Google Sheets API (não migrados ainda).
- **2026-09-20:** Chaves salvas no `.env.local` e cliente `@supabase/supabase-js` configurado.
- **2026-09-20:** `app/api/summary/route.ts` e `app/api/campaigns/route.ts` 100% migrados para puxar dados do Supabase (`meta_ads_insights`). O parser antigo `lib/parsers/meta.ts` foi removido com sucesso.

## Próximo Passo

Milestone 2 concluído! O app está usando dados do Supabase.
