# Phase 6: Migração de Dados Históricos - Research

**Phase:** 06-migracao-de-dados-historicos  
**Date:** 2026-09-24  

## 1. Mapeamento de Colunas de `DB_Vendas!A:W`

A análise em tempo real da aba `DB_Vendas` revelou a seguinte correspondência de colunas (índices base 0):

| Índice | Nome na Planilha | Destino em `sales` | Transformação |
|:---:|:---|:---|:---|
| 0 | Data / Hora | `date`, `date_created`, `date_approved` | Parser para ISO-8601 (suporta 'YYYY-MM-DD HH:mm:ss' e 'DD/MM/YYYY HH:mm:ss'). `date_approved` preenchido apenas se status='aprovado'. |
| 1 | Dia da Semana | `raw_payload.dia_da_semana` | Preservado no JSON de auditoria |
| 2 | Hora | `raw_payload.hora` | Preservado no JSON de auditoria |
| 3 | Transação | `code` (Primary Key) | Trim de espaços em branco (ex: 'HP0762101976') |
| 4 | Produto | `product_name` | String limpa (ex: 'El Protocolo del Vinagre') |
| 5 | Etapa do Funil | `funnel_step` | String limpa (ex: 'Front-End', 'Upsell 1') |
| 6 | Order Bump? | `raw_payload.order_bump` | Preservado no JSON |
| 7 | Cliente | `customer_name` | Nome completo do cliente |
| 8 | E-mail | `customer_email` | E-mail do cliente |
| 9 | Telefone | `customer_phone` | Telefone limpo |
| 10 | País | `country` | Normalizado via `countryMap` ('Chile', 'Brasil', etc.) |
| 11 | Meio de Pagamento | `payment_method` | Normalizado em minúsculas ('cartão de crédito', 'pix', etc.) |
| 12 | Status | `status`, `sale_status_enum` | 'Aprovado' -> 'aprovado' (2), 'Cancelado' -> 'cancelado' (6), 'Reembolsado' -> 'reembolsado' (7), 'Pendente' / 'Aguardando Pagamento' -> 'aguardando' (1), 'Abandono' -> 'outro' (12) |
| 13 | Faturamento Bruto (USD) | `raw_payload.gross_usd` | Moeda original |
| 14 | Faturamento Líquido (USD)| `raw_payload.net_usd` | Moeda original |
| 15 | utm_source | `utm_source` | String limpa |
| 16 | Cotação USD/BRL | `raw_payload.fx_rate` | Cotação cambial do momento |
| 17 | Faturamento Bruto R$ | `gross_revenue_brl` | Extração numérica com `parseFloatSafe` (ex: "R$ 91,70" -> 91.70) |
| 18 | Faturamento Líquido R$ | `net_revenue_brl` | Extração numérica com `parseFloatSafe` (ex: "R$ 75,80" -> 75.80) |
| 19 | UTM Campaign | `utm_campaign` | String limpa |
| 20 | UTM Medium | `utm_medium` | String limpa |
| 21 | UTM Content | `utm_content` | String limpa |
| 22 | UTM Term | `utm_term` | String limpa |

---

## 2. Totais Auditados na Fonte (Google Sheets)

- Linhas não vazias com código de transação: **1.058**
- Transações Aprovadas: **723**
- Total de Faturamento Líquido (Aprovadas): **R$ 62.010,30**
- Total de Faturamento Bruto (Aprovadas): **R$ 75.603,36**
- Transações Canceladas: **228**
- Transações Reembolsadas: **6**
- Transações Pendentes / Aguardando: **98**
- Abandonos: **3**

---

## 3. Integração com `Log_Webhooks` e Catálogo de Produtos

- `Log_Webhooks` possui 489 eventos recentes com JSON da Perfect Pay.
- Catálogo em `app_settings.product_codes`:
  - `El Protocolo del Vinagre`: `PPPBFFG8`
  - `Protocolo Absorción Máxima`: `PPPBFFI0`
  - `Reinicio Mitocondrial Express`: `PPPBFFI5`
- As vendas migradas terão `product_code` associado automaticamente a partir desse catálogo quando o nome do produto coincidir.

---

## 4. Estratégia de Execução

1. Criar `scripts/migrate-sheets-to-supabase.mjs`.
2. Validar existência da tabela `sales` no Supabase antes de iniciar.
3. Fazer batching em lotes de 200 registros (`onConflict: 'code'`).
4. Ao final, executar query agregada no Supabase calculando contagem de vendas aprovadas e soma de `net_revenue_brl`.
5. Exibir tabela de comparação e aprovação.
