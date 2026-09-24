# Phase 8: Aposentadoria do Google Sheets, Limpeza e Validação - Context

**Gathered:** 2026-09-24  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Esta é a fase final do Milestone v2.0 do Dashify. Ela remove definitivamente todos os artefatos legados do Google Sheets (`lib/sheets.ts`, `check-sheets.js` e a dependência pesada `googleapis` no `package.json`), atualiza a documentação e variáveis de ambiente (`.env.example`, `.env.local` e `README.md`) e valida o ciclo de ponta a ponta com `npm run build` e simulação funcional de webhook.
</domain>

<decisions>
## Implementation Decisions

### Remoção de Dependências Legadas
- **D-01 (Remover `lib/sheets.ts` e `check-sheets.js`):** Como todas as rotas em `app/api/` já foram 100% migradas para `lib/sales-service.ts`, esses arquivos não têm mais consumidores e devem ser deletados.
- **D-02 (Desinstalar `googleapis`):** Executar `npm uninstall googleapis` para remover a dependência de ~150 MB do `node_modules` e de `package.json`.
- **D-03 (Limpeza de Comentários):** Ajustar comentários em `hooks/useSalesWatcher.ts` que mencionavam cotas do Google Sheets.

### Variáveis de Ambiente e Documentação
- **D-04 (Limpar `.env.example` e `.env.local`):** Remover `GOOGLE_SERVICE_ACCOUNT_JSON` e `SPREADSHEET_ID`. Garantir que `PERFECTPAY_WEBHOOK_TOKEN` esteja claramente documentado.
- **D-05 (Atualizar `README.md`):** Descrever a arquitetura v2.0 (Webhook Nativo Perfect Pay + Supabase), instruções para configurar o webhook da Perfect Pay e o script `supabase_vendas.sql`.

### Verificação e Validação Final
- **D-06 (Build de Produção):** Executar `npm run build` garantindo compilação estática e de servidor sem erros ou avisos residuais.
- **D-07 (Teste Funcional de Webhook End-to-End):** Disparar uma venda de teste contra `/api/webhooks/perfectpay`, validar que a tabela `sales` recebe o upsert, e que `/api/sales-pulse` detecta a nova assinatura.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/REQUIREMENTS.md` — Requisitos CLEAN-01, CLEAN-02 e CLEAN-03
- `.planning/ROADMAP.md` — Especificação da Phase 8
- `package.json` — Dependências do projeto
- `.env.example` e `README.md` — Documentação e configuração
</canonical_refs>
