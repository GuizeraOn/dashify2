# Phase 8: Aposentadoria do Google Sheets, Limpeza e Validação - Research

**Phase:** 08-aposentadoria-do-google-sheets-limpeza-e-validacao  
**Date:** 2026-09-24  

## 1. Impacto da Remoção de `googleapis`

- A biblioteca `googleapis` é uma das maiores do ecossistema Node.js (>150 MB descompactada).
- Sua remoção acelerará drasticamente o tempo de build e deploy na Vercel e reduzirá o tamanho dos containers / lambdas.
- `lib/sheets.ts` e `check-sheets.js` eram os únicos arquivos do projeto que importavam `googleapis`.
- `scripts/migrate-sheets-to-supabase.mjs` pode ser mantido como script histórico arquivado ou adaptado caso não seja executado novamente, mas como a migração já ocorreu e foi commitada, `googleapis` não é mais necessário em tempo de execução da aplicação.

---

## 2. Limpeza de Variáveis de Ambiente

As seguintes variáveis devem ser removidas de `.env.example`:
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `SPREADSHEET_ID`

A seguinte variável deve ser mantida e destacada:
- `PERFECTPAY_WEBHOOK_TOKEN` (chave secreta para validação dos postbacks em `/api/webhooks/perfectpay`)

---

## 3. Validação End-to-End

O teste final deve comprovar:
1. `npm run build`: O Next.js 16 compila todas as páginas e rotas com zero warnings/erros.
2. Webhook functional test: Executar `node scripts/test-webhook.mjs` para verificar a robustez do parser e simular um postback real de venda.
3. Long-polling pulse check: Garantir que `/api/sales-pulse` responde imediatamente.
