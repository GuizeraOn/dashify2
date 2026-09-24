# Phase 5: Plan 05-01 Summary

**Modelagem Supabase (supabase_vendas.sql), Tipagens (lib/types.ts) e Parser Perfect Pay (lib/parsers/perfectpay.ts)**

## O que foi entregue
1. **Migration SQL da tabela `sales` (`supabase_vendas.sql`):**
   - Criação da tabela com chave primária em `code`, colunas tipadas para cliente, produto, valores bruto/líquido, status, meio de pagamento, UTMs e `raw_payload JSONB`.
   - 8 índices B-Tree para alta performance em filtros de data, status, produto, país, UTMs e ordenação.
   - Habilitação de RLS e política para service role.

2. **Tipagens TypeScript (`lib/types.ts`):**
   - Interface `SalesRow` estruturada refletindo a tabela `sales`.
   - Interface `PerfectPayWebhookPayload` e sub-interfaces (`PerfectPayCustomer`, `PerfectPayProduct`, `PerfectPayCommission`, etc.) detalhando com precisão o contrato da API da Perfect Pay.

3. **Parser e Normalizador (`lib/parsers/perfectpay.ts`):**
   - `parsePerfectPayPayload`: converte o payload bruto para `SalesRow`.
   - Normalização de status (`sale_status_enum` para 'aprovado', 'aguardando', 'cancelado', 'reembolsado', etc.).
   - Mapeamento de meios de pagamento e normalização de países via ISO code.
   - Extração do faturamento líquido a partir da comissão do produtor (`affiliation_type_enum: 1`) ou abatimento de taxas.

## Verificação
- `npx tsc --noEmit` executado com sucesso (zero erros de tipo).
- Teste com payload de exemplo oficial validou extração de comissão, normalização de país ("BR" -> "Brasil") e mapeamento de status.
