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
  cartão, funil de conversão (Meta Ads), vendas por país (mapa ou ranking,
  clicáveis para filtrar o dashboard), vendas por dia da semana (barras ou
  ranking), heatmap por hora.
- **Páginas** — Vendas, Campanhas, Relatórios e Configurações.
- **Sincronização automática** com o Meta Ads ao abrir o dashboard.
- **Recarga automática** quando a planilha muda — o dashboard consulta uma
  assinatura leve da planilha a cada 30s (`/api/sales-pulse`) e só recarrega os
  dados, com animação, quando ela muda de fato.

## PWA

O app é instalável — no Chrome/Edge aparece o botão **Instalar** na barra
superior, e no iPhone funciona via *Compartilhar → Adicionar à Tela de Início*.

- **Manifest** gerado em [`app/manifest.ts`](./app/manifest.ts) (`start_url`
  vai direto para `/dashboard`, `display: standalone`, atalhos para Vendas,
  Campanhas e Relatórios).
- **Service worker** em [`public/sw.js`](./public/sw.js): rede primeiro na
  navegação, cache só para assets estáticos. As rotas `/api/*` **nunca** são
  guardadas em cache — número velho num painel financeiro é pior que painel
  vazio. Só é registrado em produção, para não atrapalhar o hot reload.
- **Tela de abertura**: no Android é gerada pelo manifest; no iOS vem das
  imagens em `public/splash/`, uma por resolução. Além disso há uma tela de
  abertura dentro do app (`#app-splash`), visível apenas com o app instalado,
  que cobre a janela enquanto o JavaScript carrega.

### Regerando o mapa-múndi

O card "Vendas por País" usa uma silhueta dos continentes pré-projetada, não
uma biblioteca de mapas: o runtime recebe só uma string de path SVG e uma
tabela de centroides, e `d3-geo`/`topojson-client`/`world-atlas` ficam em
devDependencies.

```bash
node scripts/generate-world-map.mjs
```

Regenere se quiser mudar a resolução ou a projeção. Trocando a projeção,
ajuste também `projectLngLat` em [`lib/geo.ts`](./lib/geo.ts) — é ela que
posiciona os pontos e precisa casar com a usada na geração.

### Regerando os ícones e as telas de abertura

Ícones e splashes são gerados a partir do mesmo desenho do favicon. A lista de
aparelhos do iOS fica em [`lib/pwa-splash.ts`](./lib/pwa-splash.ts) e serve de
fonte única tanto para os arquivos quanto para as media queries no `<head>`.

```bash
node scripts/generate-pwa-assets.mjs
```

Os PNGs gerados são versionados, então isso não roda no build. Rode de novo se
mudar as cores da marca ou acrescentar um aparelho à lista.

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
| `APP_TIMEZONE` | servidor | Opcional. Fuso usado para resolver os períodos. Padrão `America/Sao_Paulo` |

> Os períodos ("hoje", "ontem", "este mês") são resolvidos em `APP_TIMEZONE`,
> nunca no fuso do servidor — a Vercel roda em UTC, e às 21h de Brasília o UTC
> já virou o dia seguinte. Ver [`lib/dates.ts`](./lib/dates.ts).

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
