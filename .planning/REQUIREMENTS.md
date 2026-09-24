# Requirements — Milestone v2.0 (Dashify)

## Escopo do Milestone v2.0
Substituição definitiva da fonte de dados de vendas (Google Sheets) por um receptor nativo de webhook da plataforma Perfect Pay com persistência no Supabase (PostgreSQL), importação do histórico existente e adaptação de todas as rotas do dashboard.

---

## Requisitos por Categoria

### 1. Webhook Perfect Pay (WH)
- [ ] **WH-01**: Criar o endpoint de API HTTP POST `/api/webhooks/perfectpay` para receber payloads JSON da Perfect Pay.
- [ ] **WH-02**: Validar o token de segurança recebido no payload (`body.token`) contra a variável de ambiente `PERFECTPAY_WEBHOOK_TOKEN` (rejeitando requisições não autorizadas com HTTP 401).
- [ ] **WH-03**: Configurar o `proxy.ts` (middleware do Next.js 16) para liberar o endpoint `/api/webhooks/perfectpay` de verificação de sessão de usuário Supabase.
- [ ] **WH-04**: Tratar status de requisição com resposta rápida (HTTP 200 `{ success: true }`) para evitar retentativas agressivas da Perfect Pay em caso de timeout.

### 2. Banco de Dados e Modelagem Supabase (DB)
- [ ] **DB-01**: Criar a migration SQL com a tabela `sales` no Supabase com chave primária em `code` (código da venda da Perfect Pay), colunas tipadas (datas, cliente, produto, plano, valores bruto e líquido, status normalizado, meio de pagamento, UTMs, endereço e país) e coluna `raw_payload JSONB`.
- [ ] **DB-02**: Mapear os enums da Perfect Pay para os formatos canônicos já consumidos pelo frontend:
  - `sale_status_enum` (1 -> 'aguardando', 2/8/10 -> 'aprovado', 6 -> 'cancelado', 7/9 -> 'reembolsado', 5 -> 'recusado', etc.).
  - `payment_method_enum` e `payment_type_enum` (cartão, boleto, pix, etc.).
  - `customer.country` com normalização de códigos ISO e nomes em português.
- [ ] **DB-03**: Calcular e persistir o faturamento líquido (`net_revenue_brl`) a partir do array de `commission` (extraindo a cota líquida do produtor ou abatendo as taxas da plataforma Perfect Pay `affiliation_type_enum: 0` e afiliados).
- [ ] **DB-04**: Garantir idempotência total no processamento do webhook através de upsert baseado em `code` (atualizando status, data de aprovação e comissões se uma venda mudar de 'aguardando' para 'aprovado' ou 'reembolsado').

### 3. Migração de Dados Históricos (MIG)
- [ ] **MIG-01**: Desenvolver script de migração one-off (`scripts/migrate-sheets-to-supabase.mjs` ou `.ts`) conectando ao Google Sheets uma última vez para ler todas as transações de `db_vendas!A:W` e códigos de `Log_Webhooks!C:C`.
- [ ] **MIG-02**: Inserir/upsert em lote no Supabase todas as vendas históricas da planilha, mantendo valores, UTMs, clientes, produtos e status intactos.
- [ ] **MIG-03**: Validar a paridade do histórico pós-migração: total de faturamento líquido e contagem de vendas aprovadas no Supabase devem bater exatamente com a planilha.

### 4. Transição das Rotas de API (API)
- [ ] **API-01**: Refatorar `GET /api/summary` para buscar dados de vendas diretamente da tabela `sales` no Supabase, mantendo cálculo de KPIs e filtros de período, produto, campanha e país.
- [ ] **API-02**: Refatorar `GET /api/transactions` para consultar o Supabase com paginação e ordenação decrescente por data da transação.
- [ ] **API-03**: Refatorar `GET /api/campaigns` para cruzar as vendas da tabela `sales` com as métricas do Meta Ads via `utm_campaign`, `utm_term` e `utm_content`.
- [ ] **API-04**: Refatorar `GET /api/reports` para gerar heatmap de horários, etapas de funil e ranking de países lendo do Supabase.
- [ ] **API-05**: Refatorar `GET /api/products` para extrair métricas de produtos diretamente das vendas no Supabase (utilizando `product_code` nativo já registrado).
- [ ] **API-06**: Atualizar `GET /api/sales-pulse` para gerar a assinatura leve baseada em `MAX(updated_at)` e `COUNT(*)` da tabela `sales` do Supabase, preservando o funcionamento do hook `useSalesWatcher` sem alterações no frontend.

### 5. Limpeza e Finalização (CLEAN)
- [ ] **CLEAN-01**: Remover `lib/sheets.ts`, `check-sheets.js` e desinstalar a biblioteca `googleapis` do `package.json`.
- [ ] **CLEAN-02**: Atualizar `.env.example`, `.env.local` e `README.md`, documentando a configuração da URL e Token de Webhook da Perfect Pay e removendo as credenciais legadas do Google Service Account.
- [ ] **CLEAN-03**: Executar testes de build (`npm run build`) e teste funcional de recebimento de webhook com verificação em tempo real no dashboard.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WH-01, WH-02, WH-03, WH-04 | Phase 5 | Complete |
| DB-01, DB-02, DB-03, DB-04 | Phase 5 | Complete |
| MIG-01, MIG-02, MIG-03 | Phase 6 | Complete |
| API-01, API-02, API-03, API-04, API-05, API-06 | Phase 7 | Pending |
| CLEAN-01, CLEAN-02, CLEAN-03 | Phase 8 | Pending |
