# ads-performance-hub

## Visão Geral

Dashboard interno de análise de tráfego pago e vendas, inspirado visualmente no UTMify, conectado diretamente a duas abas de Google Sheets (`db_meta` e `db_vendas`) via Google Sheets API v4 com service account.

O sistema cruza dados de campanhas do Meta Ads com transações de vendas para calcular KPIs reais de performance: Lucro, ROI, CPA, ROAS, Margem de Lucro, Faturamento Líquido e Vendas Pendentes. Todo o cálculo acontece no servidor (Next.js API Routes), e o frontend apenas consome e exibe os resultados.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Estilização | Tailwind CSS |
| Gráficos | Recharts |
| Dados externos | Google Sheets API v4 (service account) |
| Cache/Refetch | TanStack Query (React Query) |
| Linguagem | TypeScript |
| Runtime | Node.js (Vercel / local dev) |

---

## Fontes de Dados

### `db_meta` — Dados de campanhas Meta Ads
- Range: `db_meta!A:V`
- Headers na linha 1, dados a partir da linha 2
- **Atenção:** separador decimal é **vírgula** nos campos float (`spend`, `ctr`, `cpc`, `cpm`, `purchase_value`, `roas`) — substituir por ponto antes de converter
- Chave única: campo `key`
- Campos relevantes: `date`, `hour`, `campaign_name`, `spend`, `impressions`, `clicks`, `ctr`, `cpc`, `cpm`, `purchases`, `purchase_value`, `roas`, `updated_at`

### `db_vendas` — Transações de vendas
- Range: `db_vendas!A:S`
- Headers na linha 1, dados a partir da linha 2
- Separador decimal: ponto (direto)
- Normalização obrigatória: `.toLowerCase()` em `Meio de Pagamento` e `País`
- Campo `Telefone`: tratar como String pura (ignorar notação científica)
- Campo `Data / Hora`: DateTime
- Campos relevantes: `Data / Hora`, `Cliente`, `Produto`, `Etapa do Funil`, `Valor Bruto USD`, `Valor Líquido USD`, `Faturamento Bruto R$`, `Faturamento Líquido R$`, `País`, `Meio de Pagamento`, `Status`, `Origem / UTM`

---

## Mapa de Normalização de Países

```typescript
const countryMap: Record<string, string> = {
  "spain": "Espanha",
  "espana": "Espanha",
  "mexico": "México",
  "brasil": "Brasil",
  "brazil": "Brasil",
  "portugal": "Portugal",
  "united states": "Estados Unidos",
  "usa": "Estados Unidos",
  "argentina": "Argentina",
  "colombia": "Colômbia",
  "chile": "Chile",
};
```

---

## Usuários

- **Usuário primário:** Gestor de tráfego / analista de marketing digital
- **Contexto:** Uso interno, sem autenticação de usuário final (acesso por URL direta ou VPN)
- **Dispositivos:** Desktop (principal) + Mobile (consulta rápida)

---

## Ambiente e Configuração

### Variáveis de Ambiente Necessárias
```env
GOOGLE_SERVICE_ACCOUNT_JSON='{...}' # JSON completo da service account
SPREADSHEET_ID='...'                 # ID da planilha do Google Sheets
```

### Compartilhamento da Planilha
A planilha deve ser compartilhada com o e-mail da service account no modo **Leitor**.

---

## Restrições e Decisões Técnicas

1. **Parsing no servidor:** Todo parsing, normalização e cálculo de KPIs acontece em API Routes — o cliente nunca recebe dados brutos da planilha
2. **Cache com React Query:** `staleTime: 5 minutos` para não sobrecarregar a Sheets API
3. **Sem autenticação de usuário:** Dashboard interno sem login
4. **Sem banco de dados:** A planilha é a única fonte de dados — não há persistência adicional
5. **ROAS duplo:** `roas` de db_meta = reportado pelo Meta; `ROAS Efetivo` = calculado com vendas aprovadas reais
6. **Status "Aprovado":** Apenas vendas com status "Aprovado" entram no Faturamento Líquido e Lucro
7. **Separador decimal (CRÍTICO):** db_meta usa vírgula; db_vendas usa ponto — parsers separados obrigatórios

---

## Métricas de Sucesso

- Dashboard carrega em < 3s com dados reais da Sheets API
- KPIs baterem com os valores calculados manualmente na planilha
- ROAS Efetivo difere do ROAS reportado pelo Meta (validação de cruzamento)
- Layout responsivo funcional no mobile
- Atualização de dados em 1 clique sem reload da página
