# Phase 6: Plan 06-01 Summary

**Migração de Dados Históricos do Google Sheets para Supabase e Auditoria de Paridade Absoluta**

## O que foi entregue
1. **Script de Migração One-off (`scripts/migrate-sheets-to-supabase.mjs`):**
   - Conexão e extração de todas as 1.058 vendas válidas de `DB_Vendas!A:W`, descartando 994 linhas vazias legadas do Google Sheets.
   - Enriquecimento com 216 payloads de webhook de `Log_Webhooks!C:C` e catálogo de produtos em `app_settings.product_codes`.
   - Conversor flexível de datas (ISO `YYYY-MM-DD` e formato brasileiro `DD/MM/YYYY`) normalizado com fuso de São Paulo (`-03:00`).
   - Mapeamento robusto de valores, status canônicos, meios de pagamento e países normalizados.
   - Upsert em lotes (chunks de 200) com idempotência garantida por `code` (`onConflict: 'code'`).
   - Implementação de paginação por blocos de 1.000 para superar o limite padrão de retorno do PostgREST.

2. **Auditoria de Paridade Pós-Migração:**
   - Comparação direta entre os dados históricos da planilha e a tabela `sales` no Supabase:
     - **Total de Vendas Gravadas:** 1.058 (100% gravadas)
     - **Vendas Aprovadas:** 723 (100% exatas)
     - **Faturamento Líquido (BRL):** R$ 62.010,30 (100% exato, R$ 0,00 de divergência)

## Verificação
- `node --env-file=.env.local scripts/migrate-sheets-to-supabase.mjs --dry-run`: passou com sucesso.
- `node --env-file=.env.local scripts/migrate-sheets-to-supabase.mjs`: executou com sucesso gravando 6 lotes no banco.
- `node --env-file=.env.local scripts/migrate-sheets-to-supabase.mjs --verify-only`: confirmou 100% de paridade.
