# Phase 5: Modelagem Supabase e Receptor de Webhook Perfect Pay - Context

**Gathered:** 2026-09-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a infraestrutura de dados para vendas no Supabase e o endpoint receptor do webhook da Perfect Pay.
Ela NÃO migra ainda as rotas do dashboard nem remove o Google Sheets (isso ocorre nas Fases 6, 7 e 8).
O objetivo é ter a tabela criada e o webhook plenamente apto a receber, validar, normalizar e gravar vendas em tempo real.
</domain>

<decisions>
## Implementation Decisions

### Banco de Dados (Supabase / PostgreSQL)
- **D-01 (Tabela `sales`):** Criar a tabela `sales` no Supabase com chave primária no código da venda (`code TEXT PRIMARY KEY`), colunas para identificação temporal (`date TIMESTAMP WITH TIME ZONE`, `date_approved TIMESTAMP WITH TIME ZONE`, `created_at`, `updated_at`), dados do cliente (`customer_name`, `customer_email`, `customer_phone`, `country`, `state`, `city`), dados do produto (`product_code`, `product_name`, `plan_code`, `plan_name`, `funnel_step`), valores (`gross_revenue_brl`, `net_revenue_brl`, `installments`, `currency`), status normalizado (`status`), método de pagamento (`payment_method`), UTMs (`utm_source`, `utm_campaign`, `utm_medium`, `utm_content`, `utm_term`, `src`) e coluna `raw_payload JSONB` para preservar o JSON integral da Perfect Pay.
- **D-02 (Índices de Performance):** Criar índices B-Tree em `date`, `status`, `product_name`, `country`, `utm_campaign`, `utm_content` para suportar consultas analíticas ultrarrápidas.

### Segurança e Roteamento (Next.js 16)
- **D-03 (Validação de Token):** Validar a chave `token` recebida no corpo do webhook contra a variável de ambiente `PERFECTPAY_WEBHOOK_TOKEN`. Rejeitar com HTTP 401 se ausente ou inválida.
- **D-04 (Isenção no `proxy.ts`):** O middleware `proxy.ts` bloqueia todas as rotas `/api/*` se não houver cookie de sessão do Supabase. É mandatório adicionar `/api/webhooks/` à lista de exclusão do proxy para que a Perfect Pay consiga enviar requisições sem autenticação por sessão de usuário.

### Normalização e Regras de Negócio (Parser)
- **D-05 (Mapeamento de Status):** Mapear `sale_status_enum`:
  - 1 -> `'aguardando'` (boleto pendente)
  - 2, 8, 10 -> `'aprovado'` (venda aprovada / autorizada / completada)
  - 6 -> `'cancelado'`
  - 7 -> `'reembolsado'`
  - 9 -> `'chargeback'`
  - 5 -> `'recusado'`
  - Outros -> `'outro'` (com `sale_status_detail` preservado)
- **D-06 (Faturamento Líquido):** Extrair do array `commission` a comissão do produtor (`affiliation_type_enum: 1`), ou alternativamente `sale_amount` deduzindo taxa da Perfect Pay (`affiliation_type_enum: 0`) e afiliados.
- **D-07 (Normalização de Países):** Reutilizar a lógica canônica já existente em `lib/parsers/vendas.ts` para converter códigos ISO (ex: `"BR"`, `"AR"`, `"MX"`) e nomes para português (`"Brasil"`, `"Argentina"`, etc.).
- **D-08 (Idempotência):** Operação de UPSERT na tabela `sales` com `onConflict: 'code'`, atualizando status, data de aprovação, faturamento líquido e timestamp de atualização.
- **D-09 (Fast Return):** O endpoint responde `HTTP 200 { success: true }` de forma rápida após o salvamento para evitar timeouts e retentativas desnecessárias da plataforma.

</decisions>

<specifics>
## Specific Ideas

Exemplo real de payload enviado pela Perfect Pay recebido na documentação:
- `token`: token md5/hexadecimal configurado na plataforma.
- `code`: ex. `"PPCPMTB58MNF4E"`.
- `product.code`: `"PPPB3A07"`, `product.name`: `"Herus Caps"`.
- `customer.country`: `"BR"`, `phone_area_code`: `"47"`, `phone_number`: `"9965568558"`.
- `metadata.utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`.
- `commission`: lista com comissões de plataforma e produtor.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — Requisitos WH-01 a WH-04 e DB-01 a DB-04
- `.planning/ROADMAP.md` — Especificação da Phase 5
- `proxy.ts` — Middleware de autenticação que precisa liberar o webhook
- `lib/parsers/vendas.ts` — Normalizações de países e compatibilidade com o frontend
- `lib/supabase.ts` — Cliente admin com service role para gravação no banco
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase.ts`: `getSupabaseAdmin()` já está configurado com `SUPABASE_SERVICE_ROLE_KEY` e deve ser usado para gravar na tabela `sales` no backend.
- `lib/parsers/vendas.ts`: `countryMap` e lógica de normalização de países.

### Established Patterns
- Rotas de API em `app/api/.../route.ts` retornam `NextResponse.json(...)`.
- Tratamento de datas com fuso horário `America/Sao_Paulo`.
</code_context>

<deferred>
## Deferred Ideas
- Migração de dados históricos (Phase 6).
- Alteração das rotas `/api/summary` e demais endpoints analíticos (Phase 7).
- Desinstalação da biblioteca `googleapis` (Phase 8).
</deferred>
