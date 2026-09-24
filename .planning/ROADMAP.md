# ROADMAP — Dashify

## Milestone v2.0 — Webhook Nativo Perfect Pay & Supabase Vendas

**Objetivo:** Substituir a leitura do Google Sheets por um receptor nativo de webhook da Perfect Pay, persistir todas as vendas no Supabase (PostgreSQL), importar o histórico existente e migrar todas as rotas do dashboard para operarem 100% sobre o banco de dados.

---

### Fase 5 — Modelagem no Supabase e Receptor de Webhook Perfect Pay
**Objetivo:** Criar a estrutura de banco de dados para vendas e o endpoint de ingestão de webhooks protegido e idempotente.

**Entregáveis:**
- Script SQL de migração (`supabase_vendas.sql`) criando a tabela `sales` com índices adequados (`date`, `status`, `product`, `utm_campaign`, etc.) e campo `raw_payload JSONB`.
- Parser e normalizador dos dados da Perfect Pay (`lib/parsers/perfectpay.ts`) convertendo enums de status, meios de pagamento, países e comissões para o padrão canônico do sistema.
- Endpoint de Webhook HTTP POST em `app/api/webhooks/perfectpay/route.ts` com validação de `PERFECTPAY_WEBHOOK_TOKEN` e upsert idempotente.
- Atualização do `proxy.ts` liberando o caminho do webhook para chamadas externas sem exigir sessão de usuário do Supabase.

**Critérios de Aceite:**
- Envio de payload de exemplo da Perfect Pay para `/api/webhooks/perfectpay` retorna `HTTP 200 { success: true }`.
- Envio com token incorreto ou ausente é rejeitado com `HTTP 401 Unauthorized`.
- Registro inserido no Supabase contém todos os campos mapeados corretamente (valores, cliente, UTMs, datas) e JSON bruto preservado.
- Reenvio do mesmo código com status alterado (ex: de 'pending' para 'approved') atualiza o registro existente sem duplicar.

---

### Fase 6 — Migração de Dados Históricos (Google Sheets ➔ Supabase)
**Objetivo:** Transferir todas as vendas registradas na planilha Google Sheets atual para a nova tabela do Supabase para manter a continuidade histórica do dashboard.

**Entregáveis:**
- Script de migração (`scripts/migrate-sheets-to-supabase.mjs`) que lê as abas `db_vendas!A:W` e `Log_Webhooks!C:C`.
- Transformação de linhas antigas no schema da tabela `sales` com data de inserção e identificador único.
- Execução do lote de importação com barra de progresso e relatório final de inserções/conflitos.
- Script de validação de paridade de totais (conferindo soma de faturamento líquido e contagem de vendas aprovadas).

**Critérios de Aceite:**
- Todas as transações da planilha são migradas para a tabela `sales`.
- Soma total do Faturamento Líquido no Supabase bate centavo a centavo com o total da planilha.
- Nenhuma venda tem data, país ou UTM corrompidos na migração.

---

### Fase 7 — Migração das Rotas Analíticas para o Supabase
**Objetivo:** Fazer com que todas as APIs do dashboard consultem diretamente o Supabase em vez do Google Sheets.

**Entregáveis:**
- Função utilitária de busca e filtros de vendas no Supabase (`lib/sales-db.ts`).
- `GET /api/summary`: cálculo de KPIs e agregações de gráficos (faturamento diário, meios de pagamento, aprovação de cartão, países, dias da semana) lendo do Supabase.
- `GET /api/transactions`: listagem de vendas com ordenação e filtros alimentada pelo Supabase.
- `GET /api/campaigns`: cruzamento de vendas por UTMs (`utm_campaign`, `utm_term`, `utm_content`) via banco.
- `GET /api/reports`: heatmap e relatórios alimentados pelas vendas do Supabase.
- `GET /api/products`: métricas por produto aproveitando os códigos nativos salvos no webhook.
- `GET /api/sales-pulse`: geração de assinatura leve instantânea baseada em `MAX(updated_at)` e `COUNT(*)` da tabela `sales`.

**Critérios de Aceite:**
- Todas as telas do Dashboard (`/dashboard`, `/dashboard/vendas`, `/dashboard/campanhas`, `/dashboard/produtos`, `/dashboard/relatorios`) carregam dados com velocidade inferior a 500ms.
- As métricas e gráficos exibem exatamente os mesmos números apurados anteriormente.
- O hook `useSalesWatcher` detecta uma nova inserção ou atualização no Supabase sem necessidade de ler planilhas.

---

### Fase 8 — Aposentadoria do Google Sheets, Limpeza e Validação End-to-End
**Objetivo:** Remover todas as dependências legadas do Google Sheets, atualizar a documentação e validar o funcionamento ponta a ponta.

**Entregáveis:**
- Remoção de `lib/sheets.ts` e do script auxiliar `check-sheets.js`.
- Desinstalação do pacote `googleapis` em `package.json`.
- Atualização de `.env.example`, `.env.local` e `README.md` (removendo `GOOGLE_SERVICE_ACCOUNT_JSON` e `SPREADSHEET_ID`, adicionando `PERFECTPAY_WEBHOOK_TOKEN` e instruções do webhook).
- Build de produção verificado com sucesso (`npm run build`).
- Simulação de testes end-to-end simulando ciclo de vida de uma venda via webhook da Perfect Pay e checagem do reflexo em tempo real no dashboard.

**Critérios de Aceite:**
- `npm run build` compila com zero erros de tipo ou módulos ausentes.
- O projeto não referencia mais o Google Sheets em nenhuma rota ativa.
- Dashboard 100% operacional, seguro e autônomo com Meta Ads + Webhook Perfect Pay.
