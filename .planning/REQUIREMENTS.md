# Requisitos — ads-performance-hub

## Escopo do Projeto

Dashboard interno de análise de performance de tráfego pago e vendas. Conecta diretamente ao Google Sheets via service account, cruza dados de campanhas Meta Ads (`db_meta`) com transações de vendas (`db_vendas`), e exibe KPIs calculados em tempo real com filtros de período e campanha.

---

## Requisitos Funcionais

### RF-01 — Integração com Google Sheets
- **RF-01.1:** O sistema deve autenticar na Google Sheets API v4 usando uma service account (JSON via variável de ambiente `GOOGLE_SERVICE_ACCOUNT_JSON`)
- **RF-01.2:** O sistema deve ler a aba `db_meta` no range `db_meta!A:V` (headers na linha 1, dados da linha 2+)
- **RF-01.3:** O sistema deve ler a aba `db_vendas` no range `db_vendas!A:S` (headers na linha 1, dados da linha 2+)
- **RF-01.4:** A leitura das abas deve ser feita de forma independente, com parsers separados

### RF-02 — Parsing e Normalização de Dados
- **RF-02.1:** `parseMeta()` deve substituir vírgula por ponto em campos float antes de converter (`spend`, `ctr`, `cpc`, `cpm`, `purchase_value`, `roas`)
- **RF-02.2:** `parseMeta()` deve tipar `date` como Date, `hour` como Integer, demais numéricos conforme schema
- **RF-02.3:** `parseVendas()` deve aplicar `.toLowerCase()` nos campos `Meio de Pagamento` e `País`
- **RF-02.4:** `parseVendas()` deve aplicar o mapa de normalização de países após lowercase (ex: "spain" → "Espanha")
- **RF-02.5:** `parseVendas()` deve tratar o campo `Telefone` como String pura (sem conversão numérica)
- **RF-02.6:** `parseVendas()` deve tipar `Data / Hora` como DateTime
- **RF-02.7:** Ambos os parsers devem usar o campo `key` / `Data / Hora` para identificação única de registros

### RF-03 — Endpoints de API Internos
- **RF-03.1:** `GET /api/data/meta` — retorna db_meta parseado e tipado
- **RF-03.2:** `GET /api/data/vendas` — retorna db_vendas parseado e tipado
- **RF-03.3:** `GET /api/summary` — agrega os dois datasets e retorna os 8 KPIs calculados
- **RF-03.4:** `/api/summary` deve aceitar parâmetros de query: `period` (`today | this_week | this_month | custom`), `dateStart`, `dateEnd`, `campaign` (ID ou "all"), `status` (`approved | all | pending | canceled`)

### RF-04 — Cálculo de KPIs
- **RF-04.1:** Antes de qualquer cálculo, filtrar `db_vendas` pelo período selecionado usando `Data / Hora`
- **RF-04.2:** Antes de qualquer cálculo, filtrar `db_meta` pelo período selecionado usando `date` + `hour`
- **RF-04.3:** Separar `db_vendas` em `aprovadas` (status="Aprovado") e `nao_aprovadas` para cálculos distintos
- **RF-04.4:** Calcular os 8 KPIs conforme fórmulas:

| KPI | Fórmula |
|---|---|
| Gastos com Anúncios | `SUM(spend)` de db_meta no período |
| Faturamento Líquido | `SUM(Faturamento Líquido R$)` de db_vendas onde status=Aprovado |
| Lucro | `Faturamento Líquido` - `Gastos com Anúncios` |
| ROI | `Lucro / Gastos com Anúncios` (N/A se spend=0) |
| ROAS | `SUM(Faturamento Bruto R$ aprovadas) / SUM(spend)` (N/A se spend=0) |
| CPA | `SUM(spend) / COUNT(aprovadas)` (N/A se aprovadas=0) |
| Margem de Lucro | `Lucro / Faturamento Líquido * 100` (N/A se faturamento=0) |
| Vendas Pendentes | `SUM(Faturamento Bruto R$)` onde status=Aguardando |

### RF-05 — Agregações para Gráficos
- **RF-05.1:** Faturamento por dia: group by `date` em db_vendas (apenas aprovadas)
- **RF-05.2:** Gasto por dia: group by `date` em db_meta
- **RF-05.3:** Vendas por meio de pagamento: group by `Meio de Pagamento` normalizado
- **RF-05.4:** Vendas por país: group by `País` normalizado
- **RF-05.5:** Performance por campanha: group by `campaign_name` com spend, ROAS, compras
- **RF-05.6:** Timeline horária: cruzamento de `hour` (db_meta) com `Hora` (db_vendas) no mesmo dia

### RF-06 — Cruzamento UTM / Atribuição
- **RF-06.1:** Para cada venda aprovada com `Origem / UTM` != "direto", tentar encontrar a campanha correspondente em db_meta
- **RF-06.2:** Calcular `ROAS Efetivo` (cruzado com vendas reais) separado do `ROAS` reportado pelo Meta
- **RF-06.3:** Exibir ambos os valores nas páginas de Campanhas

### RF-07 — Página Dashboard
- **RF-07.1:** Exibir filtros de período no topo (Hoje | Esta semana | Este mês | Personalizado)
- **RF-07.2:** Exibir filtro de campanha (dropdown com todas as campanhas do período)
- **RF-07.3:** Grid de 8 cards de KPI (um por métrica)
- **RF-07.4:** Gráfico de linha dupla: Faturamento vs Gasto por dia
- **RF-07.5:** Gráfico de rosca: distribuição de vendas por Meio de Pagamento

### RF-08 — Página Campanhas
- **RF-08.1:** Tabela com uma linha por campanha contendo: nome, gasto, impressões, cliques, CTR médio, CPC médio, CPM médio, compras, ROAS (Meta), ROAS Efetivo
- **RF-08.2:** Badge de status por campanha: "Alta performance" / "Atenção" / "Baixa performance" baseado em threshold de ROAS configurável

### RF-09 — Página Vendas
- **RF-09.1:** Tabela de transações com: Data/Hora, Cliente, Produto, Etapa do Funil, Valor Bruto USD, Valor Líquido USD, Valor em R\$, País, Meio de Pagamento, Status (badge colorido), UTM de origem
- **RF-09.2:** Filtros específicos: Status, País, Produto, Meio de Pagamento, Etapa do Funil

### RF-10 — Página Relatórios
- **RF-10.1:** Heatmap de vendas e gasto por hora do dia (0–23h)
- **RF-10.2:** Ranking de países com faturamento e contagem
- **RF-10.3:** Funil de conversão: Front-End → Upsell 01 → Upsell 02 (contagem e valor)
- **RF-10.4:** Análise de Order Bumps: percentual e valor adicional gerado

### RF-11 — Atualização de Dados
- **RF-11.1:** Botão "Atualizar" dispara revalidação do cache React Query e rebusca da Sheets API
- **RF-11.2:** Exibir timestamp da última atualização ("Atualizado agora mesmo" / "Atualizado há X min")
- **RF-11.3:** React Query configurado com `staleTime: 5 minutos`

---

## Requisitos Não-Funcionais

### RNF-01 — Performance
- Dashboard deve carregar em < 3s com dados reais da Sheets API
- Parsing e cálculos no servidor — cliente recebe apenas KPIs prontos

### RNF-02 — Responsividade
- Layout responsivo: sidebar lateral no desktop, bottom nav no mobile
- Cards de KPI em grid adaptativo (4 colunas desktop → 2 colunas tablet → 1 coluna mobile)

### RNF-03 — Visual / Dark Mode
- Design dark mode como padrão e único tema
- Paleta: Background `#1a1a1a`, Cards `#242424`, Texto `#ffffff`, Secundário `#9ca3af`
- Verde `#22c55e` para valores positivos, Vermelho `#ef4444` para negativos/N/A

### RNF-04 — Segurança
- Credenciais da service account nunca expostas ao cliente
- SPREADSHEET_ID e GOOGLE_SERVICE_ACCOUNT_JSON apenas em variáveis de servidor

### RNF-05 — Manutenibilidade
- Todos os cálculos de KPI como funções puras testáveis em `lib/kpis.ts`
- Parsers separados por fonte de dados (`lib/parsers/meta.ts`, `lib/parsers/vendas.ts`)
- Tipagem TypeScript completa para todos os schemas de dados

---

## Fora do Escopo (v1)

- Autenticação de usuário / controle de acesso
- Banco de dados / persistência local
- Integração direta com API do Meta Ads (dados vêm da planilha)
- Agendamento automático de refresh
- Exportação de relatórios (PDF/CSV)
- Multi-tenant / múltiplos clientes
