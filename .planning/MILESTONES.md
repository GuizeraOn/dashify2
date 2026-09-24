# Milestones

## v1.0 — MVP do Dashboard de Tráfego e Vendas (Sheets + Meta Ads + Supabase)
*Entregue em: 2026-09-24*

### O que foi entregue
- Dashboard interativo com grid drag-and-drop (`react-grid-layout`) e persistência no Supabase (`app_settings`).
- Cruzamento de dados de Meta Ads Graph API (armazenados em `meta_ads_insights` e `meta_ads_daily_reach`) com vendas lidas via Google Sheets (`db_vendas!A:W`).
- KPIs em tempo real: Faturamento Líquido, Gasto Meta (+13% de impostos), Lucro, ROI, CPA com filtro de produtos front-end, ROAS, Margem de Lucro, Pendências e Reembolsos.
- Gráficos completos: Faturamento vs Gasto Diário, Meios de Pagamento, Aprovação do Cartão, Funil de Conversão Meta, Vendas por País (Ranking e Mapa vetorial SVG com filtros bidirecionais), Aprovação por País e Vendas por Dia da Semana.
- Páginas especializadas: Vendas (`/dashboard/vendas`), Campanhas com hierarquia campanha/conjunto/anúncio e atribuição UTM inteligente (`/dashboard/campanhas`), Produtos com leitura de checkouts da Perfect Pay (`/dashboard/produtos`), Relatórios (`/dashboard/relatorios`) e Configurações (`/dashboard/configuracoes`).
- PWA instalável com Service Worker, Manifest, splash screens nativas para iOS e Android.
- Autenticação e proteção de rotas com Supabase Auth via SSR cookies e `proxy.ts`.

---

## v2.0 — Webhook Nativo Perfect Pay & Supabase Vendas (Adeus Google Sheets)
*Iniciado em: 2026-09-24*

### Objetivo
Substituir integralmente a dependência da leitura da planilha Google Sheets por um receptor nativo de webhook da Perfect Pay, gravando transações diretamente no PostgreSQL (Supabase) e migrando todas as APIs internas para alimentar o dashboard a partir do banco de dados com altíssima performance e tempo real.
