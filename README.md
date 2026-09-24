# Dashify (v2.0)

Dashboard de performance de tráfego pago e vendas — integra diretamente com a plataforma **Perfect Pay via Webhook Nativo** e persiste todas as transações no **Supabase (PostgreSQL)**, cruzando com os gastos de campanhas do **Meta Ads** para calcular os KPIs do negócio em tempo real (faturamento líquido, lucro real com 13% de impostos, ROI, ROAS, CPA, margem, pendências e reembolsos).

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Recharts · react-grid-layout · Supabase (PostgreSQL).

## Funcionalidades

- **Ingestão Nativa via Webhook da Perfect Pay** — endpoint público `/api/webhooks/perfectpay` recebe e processa vendas em tempo real de forma idempotente com validação de token de segurança.
- **Persistência Completa no Supabase** — tabela `sales` com índices analíticos B-Tree para consultas ultrarrápidas (<100ms) sem limites ou bloqueios de cota de planilhas.
- **Dashboard com grid editável** — cards e gráficos podem ser arrastados e redimensionados; o layout é salvo no Supabase e restaurado no próximo acesso.
- **KPIs consolidados** — faturamento líquido, gastos, lucro, ROI, ROAS, CPA (com filtro de produtos front-end), margem, vendas pendentes e reembolsos.
- **Gráficos e Relatórios** — faturamento vs. gasto diário, meios de pagamento, aprovação de cartão, funil de conversão (Meta Ads), vendas por país (mapa interativo ou ranking), vendas por dia da semana e heatmap por hora.
- **Páginas** — Vendas (tabela completa com busca e status), Campanhas (cruzamento com Meta Ads via UTMs em 3 níveis), Relatórios e Configurações.
- **Sincronização automática** com o Meta Ads ao abrir o dashboard.
- **Recarga em tempo real (Sales Pulse)** — o dashboard consulta uma assinatura leve (`/api/sales-pulse`, <30ms) a cada 30s baseada em `COUNT(*)` e `MAX(updated_at)` e recarrega os dados com animação suave quando há novidade no banco.
- **PWA (Progressive Web App)** — instalável no Android, iOS, Windows e Mac, com service worker para assets e splash screens nativas.

---

## Requisitos

- Node.js 20.9+
- Um projeto Supabase (PostgreSQL)
- Um token do Meta Ads com permissão `ads_read`
- Uma conta/produto na Perfect Pay com Webhook configurado

---

## Rodando Localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

A aplicação sobe em `http://localhost:3000` e redireciona para `/dashboard`.

Outros comandos:

```bash
npm run build   # build de produção
npm run start   # sobe o build de produção
npm run lint    # ESLint
```

---

## Variáveis de Ambiente

Todas estão documentadas em [`.env.example`](./.env.example):

| Variável | Onde é usada | Descrição |
| --- | --- | --- |
| `PERFECTPAY_WEBHOOK_TOKEN` | servidor | Token secreto configurado na Perfect Pay para autenticar o postback |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente/servidor | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | Chave `service_role` do Supabase para gravação de webhooks e consultas |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente/servidor | Chave anon do Supabase, usada pelo login |
| `META_TOKEN` | servidor | Access token do Meta Ads (`ads_read`) |
| `AD_ACCOUNT_ID` | servidor | ID da conta de anúncios (com ou sem `act_`) |
| `ALLOWED_EMAILS` | servidor | Opcional. E-mails autorizados, separados por vírgula |
| `APP_TIMEZONE` | servidor | Opcional. Fuso usado para resolver os períodos. Padrão `America/Sao_Paulo` |

> Os períodos ("hoje", "ontem", "este mês") são resolvidos em `APP_TIMEZONE`, nunca no fuso do servidor — a Vercel roda em UTC, e às 21h de Brasília o UTC já virou o dia seguinte. Ver [`lib/dates.ts`](./lib/dates.ts).

> A `SUPABASE_SERVICE_ROLE_KEY` ignora Row Level Security. Ela só é lida em código de servidor (`lib/supabase.ts`) e **nunca** deve receber o prefixo `NEXT_PUBLIC_`.

---

## Integração do Webhook na Perfect Pay

Para enviar os eventos de vendas automaticamente para o Dashify:

1. Acesse o painel da **Perfect Pay** em **Ferramentas → Webhooks** (ou Integrações).
2. Cadastre uma nova URL de Webhook:
   ```
   https://seu-dominio.vercel.app/api/webhooks/perfectpay
   ```
3. Defina um token secreto e cadastre o mesmo valor na variável de ambiente `PERFECTPAY_WEBHOOK_TOKEN`.
4. Selecione os eventos desejados (Venda Aprovada, Boleto Impresso, Cancelamento, Reembolso, Chargeback).
5. O endpoint valida o token e realiza o upsert idempotente no Supabase de forma imediata.

---

## Banco de Dados (Supabase)

Execute os scripts SQL na ordem pelo **SQL Editor** do projeto Supabase:

1. [`supabase_init.sql`](./supabase_init.sql) — tabelas base de auditoria
2. [`supabase_settings.sql`](./supabase_settings.sql) — tabela de settings (layout do dashboard e produtos front)
3. [`supabase_vendas.sql`](./supabase_vendas.sql) — tabela `sales`, colunas tipadas, `raw_payload JSONB` e índices de performance

---

## Deploy na Vercel

1. Importe o repositório em <https://vercel.com/new>. O framework Next.js é detectado automaticamente.
2. Em **Settings → Environment Variables**, cadastre as variáveis do `.env.example` para os ambientes **Production** e **Preview**.
3. Faça o deploy.

---

## Estrutura do Projeto

```
app/
  api/
    webhooks/perfectpay/  receptor do webhook da Perfect Pay (autenticado por token)
    sales-pulse/          assinatura leve de vendas para long-polling (<30ms)
    summary/              resumo principal, KPIs e dados de gráficos
    transactions/         listagem de vendas com ordenação decrescente
    campaigns/            cruzamento com Meta Ads via UTMs
    reports/              heatmaps, etapas de funil e mapa de países
    products/             desempenho consolidado por produto
    settings/             persistência do grid de layout
  dashboard/              páginas do dashboard (home, vendas, campanhas, relatórios, configurações)
components/               KPICard, gráficos (Recharts), layout (TopNav, Sidebar, Grid) e UI
hooks/                    hooks de data fetching com TanStack Query (useSalesWatcher, useSummary, etc.)
lib/
  sales-service.ts        camada de serviço centralizada de vendas sobre o Supabase
  parsers/perfectpay.ts   parser de webhooks e normalizador canônico da Perfect Pay
  kpis.ts                 fórmulas financeiras (impostos Meta 13%, CPA, ROI, ROAS)
  meta-insights.ts        integração e sincronização com Meta Ads
  supabase.ts             clientes Supabase (Admin Service Role e Client-side)
  dates.ts                resolução temporal no fuso do negócio (America/Sao_Paulo)
```
