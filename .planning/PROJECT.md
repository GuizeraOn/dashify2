# Dashify

## What This Is

Dashboard operacional e financeiro de performance para tráfego pago e vendas de infoprodutos (inspirado no UTMify). Na versão 2.0, o sistema conecta-se ao **Meta Ads Graph API** e recebe diretamente os **webhooks da Perfect Pay** em tempo real, persistindo 100% dos dados no **Supabase** (PostgreSQL) e eliminando qualquer dependência do Google Sheets.

## Core Value

Cruzamento em tempo real entre o investimento de anúncios e as conversões reais de vendas, calculando métricas de rentabilidade precisas (Lucro Líquido, ROI Real com imposto, ROAS, CPA por produto de front-end) com máxima confiabilidade, velocidade e sem limites de cota da Sheets API.

## Current Milestone: v2.0 Webhook Nativo Perfect Pay & Supabase Vendas

**Goal:** Receber eventos de venda da Perfect Pay via webhook diretamente no backend do Dashify, persistir todas as transações no Supabase, importar o histórico existente do Google Sheets e migrar todas as rotas analíticas do dashboard para consumir exclusivamente o banco de dados.

**Target features:**
- Endpoint de Webhook público e seguro (`/api/webhooks/perfectpay`) com validação de token e liberação no `proxy.ts`.
- Tabela dedicada de vendas (`sales` / `perfectpay_sales`) com histórico de status, dados do cliente, produtos, comissões e UTMs.
- Script one-off de migração do histórico de vendas do Google Sheets para o Supabase.
- Adaptação das rotas `/api/summary`, `/api/transactions`, `/api/campaigns`, `/api/reports`, `/api/products` e `/api/sales-pulse` para ler do Supabase.
- Remoção definitiva da integração Google Sheets (`lib/sheets.ts` e `googleapis`).

## Requirements

### Validated (v1.0)

- [x] Dashboard com grid interativo editável e persistência de layout (`react-grid-layout` + Supabase).
- [x] Sincronização automática com Meta Ads Graph API no nível de anúncio com histórico de 7 dias.
- [x] Tabela de alcance diário deduplicada por dia (`meta_ads_daily_reach`).
- [x] Cálculo consolidado de KPIs com taxa de 13% de impostos sobre anúncios do Meta.
- [x] Visualização geográfica vetorial interativa (ranking e mapa mundi SVG) com filtragem bidirecional.
- [x] Análise de aprovação de cartão, vendas por dia da semana e funil de conversão.
- [x] Atribuição de campanhas/conjuntos/anúncios via UTMs com algoritmo tolerante a caracteres especiais.
- [x] PWA instalável com Service Worker e assets nativos para iOS/Android.
- [x] Autenticação e bloqueio de rotas não autorizadas com Supabase Auth e `proxy.ts`.

### Active (v2.0)

- [ ] **WH-01**: Endpoint de webhook `/api/webhooks/perfectpay` recebendo eventos JSON da Perfect Pay.
- [ ] **WH-02**: Validação segura de token do webhook via variável `PERFECTPAY_WEBHOOK_TOKEN`.
- [ ] **WH-03**: Liberação da rota pública de webhook no `proxy.ts` sem exigir sessão de usuário.
- [ ] **DB-01**: Tabela `sales` estruturada no Supabase com chave primária no código da transação, campos normalizados e payload bruto em JSONB.
- [ ] **DB-02**: Tratamento e mapeamento idempotente de status (`approved`, `pending`, `refunded`, `cancelled`, `chargeback`) e cálculo de receita líquida a partir do array de comissões.
- [ ] **MIG-01**: Script executável para importar vendas históricas do Google Sheets para a tabela do Supabase.
- [ ] **API-01**: Migração de `/api/summary` para ler transações do Supabase em vez do Sheets.
- [ ] **API-02**: Migração de `/api/transactions` para ler do Supabase com paginação e ordenação por data.
- [ ] **API-03**: Migração de `/api/campaigns` para cruzar UTMs diretamente com as vendas salvas no Supabase.
- [ ] **API-04**: Migração de `/api/products` e `/api/reports` para o Supabase, eliminando varredura lenta de webhooks antigos.
- [ ] **API-05**: Migração de `/api/sales-pulse` para verificar novidades com base no `max(updated_at)` e contagem do banco.
- [ ] **CLEAN-01**: Remoção de `lib/sheets.ts`, `check-sheets.js`, `googleapis` e variáveis de ambiente obsoletas.

### Out of Scope

- Integração nativa com outras plataformas de checkout além da Perfect Pay (ex: Kiwify, Hotmart webhook direto) — manter foco total na Perfect Pay nesta v2.
- Edição manual de vendas na interface do dashboard — vendas são somente-leitura, refletindo exatamente o processador de pagamento.
- Multi-tenancy com isolamento de múltiplas contas de checkout — dashboard focado na operação principal do anunciante.

## Context

- A Perfect Pay envia postbacks via HTTP POST JSON detalhando o pedido, cliente, produto, plano, status e comissões.
- O fuso horário de referência continua sendo `America/Sao_Paulo` para alinhamento com a conta de anúncios e o calendário local.
- O projeto roda no Next.js 16 com Turbopack; `proxy.ts` atua como middleware e deve permitir requisições externas para o webhook.

## Constraints

- **Segurança**: Endpoint de webhook deve validar o token de postback da Perfect Pay antes de processar qualquer dado.
- **Continuidade**: Nenhuma funcionalidade visual, card ou gráfico existente pode quebrar ou perder dados históricos.
- **Idempotência**: Webhooks repetidos para o mesmo `code` de venda devem atualizar os registros sem duplicar receita.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Substituição total do Google Sheets por Supabase | Planilhas têm limites de cota de leitura, latência alta (~1.5s) e formato frágil | ✓ Aprovado (v2.0) |
| Webhook direto no Dashify | Atualização em tempo real das vendas sem passar por Google Apps Script intermediário | ✓ Aprovado (v2.0) |
| Script one-off de migração | Garantir que o histórico de faturamento passado continue visível no dashboard após a transição | ✓ Aprovado (v2.0) |
| Gravação de JSONB bruto do webhook | Garantir que dados adicionais ou novos campos da Perfect Pay fiquem preservados para sempre | ✓ Aprovado (v2.0) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-24 after starting Milestone v2.0*
