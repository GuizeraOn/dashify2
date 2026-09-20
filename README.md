# Dashify

Dashboard de performance de tráfego pago e vendas — consolida vendas do Google
Sheets com o gasto de campanhas do Meta Ads e calcula os KPIs do negócio
(faturamento líquido, lucro, ROI, ROAS, CPA, margem, pendências e reembolsos).

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
TanStack Query · Recharts · react-grid-layout · Supabase.

## Funcionalidades

- **Dashboard com grid editável** — cards e gráficos podem ser arrastados e
  redimensionados; o layout é salvo no Supabase e restaurado no próximo acesso.
- **KPIs consolidados** — faturamento líquido, gastos, lucro, ROI, ROAS, CPA,
  margem, vendas pendentes e reembolsos.
- **Gráficos** — faturamento vs. gasto diário, meios de pagamento, aprovação de
  cartão, funil de conversão, heatmap por hora e ranking por país.
- **Páginas** — Vendas, Campanhas, Relatórios e Configurações.
- **Sincronização automática** com o Meta Ads ao abrir o dashboard.

## Requisitos

- Node.js 20.9+
- Uma planilha Google com as vendas + service account com acesso a ela
- Um token do Meta Ads com permissão `ads_read`
- Um projeto Supabase (usado para persistir layout e configurações)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

A aplicação sobe em http://localhost:3000 e redireciona para `/dashboard`.

Outros comandos:

```bash
npm run build   # build de produção
npm run start   # sobe o build de produção
npm run lint    # ESLint
```

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](./.env.example):

| Variável | Onde é usada | Descrição |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | servidor | JSON da service account do Google, em uma única linha |
| `SPREADSHEET_ID` | servidor | ID da planilha de vendas |
| `META_TOKEN` | servidor | Access token do Meta Ads (`ads_read`) |
| `AD_ACCOUNT_ID` | servidor | ID da conta de anúncios (com ou sem `act_`) |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente/servidor | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | Chave `service_role` do Supabase |

> A `SUPABASE_SERVICE_ROLE_KEY` ignora Row Level Security. Ela só é lida em
> código de servidor (`lib/supabase.ts`) e nunca deve receber o prefixo
> `NEXT_PUBLIC_`.

## Banco (Supabase)

Rode os scripts SQL na ordem, pelo SQL Editor do projeto Supabase:

1. [`supabase_init.sql`](./supabase_init.sql) — tabelas base
2. [`supabase_settings.sql`](./supabase_settings.sql) — tabela de settings
   (guarda o layout do dashboard)

## Deploy na Vercel

1. Importe o repositório em <https://vercel.com/new>. O framework Next.js é
   detectado automaticamente — não é preciso alterar build command nem output.
2. Em **Settings → Environment Variables**, cadastre as seis variáveis acima
   para os ambientes **Production** e **Preview**.
   - No `GOOGLE_SERVICE_ACCOUNT_JSON`, cole o JSON inteiro em uma linha só,
     mantendo os `\n` escapados dentro da `private_key`.
3. Faça o deploy. Depois de qualquer mudança de variável, use
   **Deployments → Redeploy** para que ela seja aplicada.

As rotas em `app/api/*` rodam como funções server-side (Node.js), então os
segredos nunca chegam ao navegador.

## Estrutura

```
app/
  api/            rotas de servidor (summary, transactions, campaigns, reports,
                  settings, meta/sync)
  dashboard/      páginas do dashboard (home, vendas, campanhas, relatórios,
                  configurações)
  icon.svg        favicon (mesmo alvo azul do logo)
components/       KPICard, gráficos, layout (TopNav, Sidebar, grid) e UI
hooks/            hooks de data fetching com TanStack Query
lib/              integrações (Google Sheets, Supabase), cálculo de KPIs, parsers
store/            estado global (Zustand)
```
