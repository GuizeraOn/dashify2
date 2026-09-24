# Phase 6: Migração de Dados Históricos (Google Sheets para Supabase) - Context

**Gathered:** 2026-09-24  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Esta fase transfere todo o histórico de vendas acumulado no Google Sheets (`DB_Vendas!A:W` e `Log_Webhooks!C:C`) para a tabela `sales` no Supabase (PostgreSQL), garantindo 100% de paridade financeira e de contagem antes da migração das rotas analíticas do dashboard.
</domain>

<decisions>
## Implementation Decisions

### Leitura e Sanitização do Google Sheets
- **D-01 (Filtragem de Linhas Vazias):** A planilha `DB_Vendas` possui 2.053 linhas totais retornadas pela API, sendo 1 linha de cabeçalho, 1.058 linhas de dados reais com código de transação único e 994 linhas em branco no final (`[]`). O script deve ignorar linhas em branco e processar estritamente as 1.058 vendas válidas.
- **D-02 (Parsing Flexível de Datas):** As linhas antigas utilizam o padrão ISO `'YYYY-MM-DD HH:mm:ss'` enquanto as mais recentes utilizam `'DD/MM/YYYY HH:mm:ss'`. O parser de data deve suportar ambos os formatos e converter para ISO com offset de fuso horário de São Paulo (`America/Sao_Paulo` / UTC-3).
- **D-03 (Enriquecimento com Log_Webhooks):** A aba `Log_Webhooks!C:C` contém os payloads JSON brutos das vendas recentes. O script construirá um mapa em memória por `payload.code` para anexar o `raw_payload` original da Perfect Pay onde disponível. Para as vendas legadas anteriores à criação do log, será gerado um objeto `raw_payload` sintético `{ source: 'sheets_migration', row_data: ... }` preservando todas as colunas originais (incluindo `Cotação USD/BRL`, `Faturamento Bruto (USD)`, `Order Bump?`).
- **D-04 (Mapeamento de Códigos de Produto):** Usar o catálogo já armazenado em `app_settings` (chave `product_codes`) para associar `product_code` aos produtos históricos onde ausente.

### Ingestão no Supabase
- **D-05 (Upsert em Lote):** A inserção será realizada em lotes (chunks) de 200 registros utilizando `supabase.from('sales').upsert(chunk, { onConflict: 'code' })`, permitindo reexecuções seguras e idempotentes sem duplicatas.
- **D-06 (Transações e Tipos):** Mapear status ('Aprovado' -> 'aprovado', 'Reembolsado' -> 'reembolsado', 'Cancelado' -> 'cancelado', 'Pendente' / 'Aguardando Pagamento' -> 'aguardando', 'Abandono' -> 'outro').

### Paridade e Verificação (Critérios Rígidos)
- **D-07 (Baseline de Paridade):** O script de migração deve auditar e confirmar que os números no Supabase batem exatamente com o Google Sheets:
  - Vendas Aprovadas: **723**
  - Faturamento Líquido (BRL): **R$ 62.010,30**
  - Total de Transações: **1.058**
  Divergência tolerada no faturamento: R$ 0,00 (ou < R$ 0,05 em caso de arredondamento de float).
</decisions>

<canonical_refs>
## Canonical References
- `.planning/REQUIREMENTS.md` — Requisitos MIG-01, MIG-02 e MIG-03
- `.planning/ROADMAP.md` — Especificação da Phase 6
- `lib/parsers/vendas.ts` — Normalizações de países e conversão de moeda
- `supabase_vendas.sql` — Schema da tabela `sales`
</canonical_refs>
