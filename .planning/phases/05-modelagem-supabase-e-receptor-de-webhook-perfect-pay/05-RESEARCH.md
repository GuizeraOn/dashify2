# Phase 5: Modelagem Supabase e Receptor de Webhook Perfect Pay - Research

**Phase:** 05-modelagem-supabase-e-receptor-de-webhook-perfect-pay  
**Date:** 2026-09-24

## 1. Arquitetura da Tabela `sales` no Supabase

A tabela deve armazenar transações da Perfect Pay garantindo idempotência e preservando os dados brutos para auditoria.

### DDL Recomendado (`supabase_vendas.sql`)
```sql
CREATE TABLE IF NOT EXISTS sales (
  code TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  date_created TIMESTAMP WITH TIME ZONE,
  date_approved TIMESTAMP WITH TIME ZONE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  country TEXT DEFAULT 'Brasil',
  state TEXT,
  city TEXT,
  product_code TEXT,
  product_name TEXT,
  plan_code TEXT,
  plan_name TEXT,
  funnel_step TEXT,
  gross_revenue_brl NUMERIC(12, 2) DEFAULT 0,
  net_revenue_brl NUMERIC(12, 2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  payment_method TEXT,
  status TEXT NOT NULL,
  sale_status_enum INTEGER,
  sale_status_detail TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  src TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices essenciais para consultas analíticas rápidas
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_product_name ON sales (product_name);
CREATE INDEX IF NOT EXISTS idx_sales_country ON sales (country);
CREATE INDEX IF NOT EXISTS idx_sales_utm_campaign ON sales (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_sales_utm_content ON sales (utm_content);
CREATE INDEX IF NOT EXISTS idx_sales_utm_term ON sales (utm_term);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales (updated_at DESC);

-- Habilita RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

---

## 2. Mapeamento de Enums da Perfect Pay

### Status (`sale_status_enum`)
| Enum | Descrição na Perfect Pay | Mapeamento no Dashify |
|:---:|:---|:---|
| 0 | none / checkout_saved | `outro` |
| 1 | pending (boleto pendente) | `aguardando` |
| 2 | approved (venda aprovada) | `aprovado` |
| 3 | in_process (em revisão manual) | `aguardando` |
| 4 | in_mediation (moderação) | `aguardando` |
| 5 | rejected (rejeitado) | `recusado` |
| 6 | cancelled (cancelado cartão) | `cancelado` |
| 7 | refunded (devolvido) | `reembolsado` |
| 8 | authorized (autorizada) | `aprovado` |
| 9 | charged_back (chargeback) | `estornado` |
| 10 | completed (30 dias após aprovada) | `aprovado` |
| 11 | checkout_error | `recusado` |
| 12 | precheckout (abandono) | `outro` |
| 13 | expired (boleto expirado) | `cancelado` |
| 16 | in_review (em análise) | `aguardando` |

### Tipo e Meio de Pagamento (`payment_type_enum` e `payment_method_enum`)
| Enum Tipo | Nome | Mapeamento no Dashify |
|:---:|:---|:---|
| 1 | credit_card | `cartão de crédito` |
| 2 | ticket | `boleto bancário` |
| 3 | paypal | `paypal` |
| 4 | credit_card_recurrent | `cartão de crédito` |
| 6 | credit_card_upsell | `cartão de crédito` |
| Outros com 'pix' ou payment_method | pix | `pix` |

---

## 3. Extração de Faturamento Líquido (`net_revenue_brl`)

No array `commission`:
- `affiliation_type_enum: 1` => **Produtor**: o campo `commission_amount` é a receita líquida do produtor.
- Se o produtor não vier explícito, calcula-se:
  $$\text{net\_revenue} = \text{sale\_amount} - \sum \text{comissão plataforma (tipo 0)} - \sum \text{comissão afiliados (tipo 5)}$$

---

## 4. Liberação Pública no `proxy.ts` (Next.js 16)

No Next.js 16, o matcher de `proxy.ts` é:
```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|sw\\.js|icons/|splash/).*)',
  ],
};
```
No corpo de `proxy(request: NextRequest)`:
```ts
if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
  return NextResponse.next();
}
```
Isso permite que o webhook da Perfect Pay atinja a API diretamente sem passar por verificação de login/sessão de usuário. A segurança é feita dentro da rota validando `body.token === process.env.PERFECTPAY_WEBHOOK_TOKEN`.

---

## 5. Estratégia de Planos da Fase 5

A fase 5 será dividida em 2 planos focados e testáveis:
- **Plan 05-01:** Estrutura de Banco e Lib de Parsing da Perfect Pay
  - Script SQL `supabase_vendas.sql`.
  - Tipagem em `lib/types.ts` e normalizador em `lib/parsers/perfectpay.ts`.
- **Plan 05-02:** Rota de Webhook e Liberação de Roteamento no Proxy
  - Rota `app/api/webhooks/perfectpay/route.ts` com validação de token e upsert no Supabase.
  - Ajuste de exceção em `proxy.ts`.
  - Testes com mock de payload da Perfect Pay e validação de idempotência.
