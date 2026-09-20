# PLAN: Fase 1 — Fundação e Infraestrutura de Dados

## Objetivo
Estabelecer a fundação do projeto com Next.js 14, configurar a integração segura com a Google Sheets API via service account, implementar os parsers de dados específicos para cada aba (com normalizações críticas) e disponibilizar os dados processados e KPIs calculados via rotas de API.

## Tracer Slice (Fatia Vertical Inicial)
Para mitigar o maior risco técnico da fase (a comunicação externa com a Google Sheets API) logo no início, começaremos com um slice mínimo:
- Inicializar o projeto Next.js.
- Configurar autenticação da Service Account.
- Implementar o cliente Google Sheets (`lib/sheets.ts`).
- Criar a rota `/api/data/meta` e validar a leitura dos headers para provar a integração.

## Tarefas de Implementação

### 1. Tracer Slice: Setup e Conexão Sheets API
- [x] 1.1 **Setup Next.js:** Inicializar Next.js 14 via `create-next-app` com TypeScript, Tailwind CSS, App Router e ESLint configurados na raiz.
- [x] 1.2 **Dependências:** Instalar `googleapis` para conexão com a API do Sheets.
- [x] 1.3 **Variáveis de Ambiente:** Criar `.env.example` referenciando `GOOGLE_SERVICE_ACCOUNT_JSON` e `SPREADSHEET_ID`. Garantir ignorar o `.env.local`.
- [x] 1.4 **Sheets Client (`lib/sheets.ts`):** Criar cliente autenticado do Google usando o `google.auth.GoogleAuth` a partir das variáveis de ambiente.
- [x] 1.5 **Validação do Tracer (`app/api/data/meta/route.ts`):** Criar a estrutura básica do endpoint para puxar dados brutos do sheet `db_meta` (sem parser) e validar que a permissão de leitura está correta.

### 2. Tipagem e Parsers de Dados
- [x] 2.1 **Schemas (`lib/types.ts`):** Definir interfaces `MetaRow`, `VendasRow`, `KPIs` e os validadores de request (filtros).
- [x] 2.2 **Parser Meta (`lib/parsers/meta.ts`):** Implementar `parseMeta()`.
  - **Atenção Crítica:** Substituir `,` por `.` em todos os campos numéricos (float) antes da conversão para evitar NaN/valores incorretos. Tratar campos nulos e converter data/hora.
- [x] 2.3 **Parser Vendas (`lib/parsers/vendas.ts`):** Implementar `parseVendas()`.
  - **Atenção Crítica:** Normalizar Meio de Pagamento e País usando `.toLowerCase()` em conjunto com o mapa oficial (`esPana` → `Espanha`). Preservar o campo `Telefone` como string pura para evitar notação científica.

### 3. Endpoints de Dados Prontos
- [x] 3.1 **Rota Meta Completa (`app/api/data/meta/route.ts`):** Atualizar o tracer slice para usar a função `parseMeta()` no retorno completo dos dados.
- [x] 3.2 **Rota Vendas Completa (`app/api/data/vendas/route.ts`):** Criar endpoint lendo o range `db_vendas!A:S` e retornando via `parseVendas()`.

### 4. Lógica de Negócio e KPIs
- [x] 4.1 **Motor de KPIs (`lib/kpis.ts`):** Criar funções puras de agregação:
  - Gastos com Anúncios (soma do `spend` de meta)
  - Faturamento Líquido (apenas status = "Aprovado")
  - Vendas Pendentes (apenas status = "Aguardando")
  - Lucro (Fat. Líquido - Gastos)
  - ROI e ROAS (lidar com divisões por zero retornando N/A ou null)
  - CPA (Gastos / qtde vendas aprovadas)
  - Margem de Lucro
- [x] 4.2 **Filtros Utilitários:** Criar as funções de filtro que processam os parâmetros de data (`period`, `dateStart`, `dateEnd`) para intersecção de arrays.

### 5. Rota de Summary Final
- [x] 5.1 **API de Resumo (`app/api/summary/route.ts`):** Rota orquestradora que consome de forma interna os parsers criados, aplica os recortes (filtros de data e de campanha) em ambos os datasets e devolve o JSON final com os 8 KPIs que vão alimentar o Dashboard.

## Verificação e Critérios de Aceite (UAT)
- [x] Setup da API e autenticação fluindo localmente.
- [x] O separador decimal em `/api/data/meta` foi testado manual ou automatizadamente (ex: `"1.234,56"` sendo retornado como o float numérico `1234.56`).
- [x] Em `/api/data/vendas`, todas as variantes mal digitadas de Espanha aparecem consistentemente como "Espanha" e sem perda do número de telefone.
- [x] Chamada à `/api/summary` exclui corretamente vendas canceladas/reembolsadas do Faturamento Líquido e Lucro.

---
**Status da Fase:** Concluída.
