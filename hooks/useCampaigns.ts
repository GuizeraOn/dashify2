import { useQuery } from '@tanstack/react-query';

/** Nivel da hierarquia do Meta que a tabela esta mostrando. */
export type CampaignLevel = 'campaign' | 'adset' | 'ad';

export interface CampaignRow {
  /** Id da entidade no nivel pedido: campanha, conjunto ou anuncio. */
  id: string;
  /** Nome da entidade no nivel pedido. */
  name: string;
  campaign_id: string;
  campaign_name: string;
  /** Preenchidos nos niveis de conjunto e anuncio, para dar contexto na linha. */
  adset_id: string | null;
  adset_name: string | null;
  /** Gasto declarado pelo Meta, sem o imposto. */
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  initiate_checkout: number;
  /** Compras atribuidas pelo pixel do Meta — o "Resultados" do gerenciador. */
  meta_purchases: number;
  /** Valor de conversao da compra, pelo pixel. */
  meta_purchase_value: number;
  /** null enquanto a coluna nao existir no banco (migracao pendente). */
  post_comments: number | null;
  video_3s_views: number;
  thruplays: number;
  /** Pessoas alcancadas, somadas por dia (ver a nota na rota). */
  reach: number;
  /** Vendas aprovadas da planilha, casadas pelo UTM do nivel. */
  sales: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  /** Connect Rate: visualizacoes da pagina sobre cliques no link. */
  lpv_rate: number;
  /** null enquanto nao ha denominador (sem impressao, sem IC, sem resultado). */
  cost_per_result: number | null;
  hook_rate: number | null;
  hold_rate: number | null;
  frequency: number | null;
  cost_per_ic: number | null;
  /** ROAS do pixel — o do gerenciador. Diferente do `roas`, que usa a planilha. */
  meta_roas: number | null;
  /** CHK CONV.: quanto dos checkouts iniciados virou compra. */
  checkout_conversion: number | null;
  /** null quando a linha ainda nao teve venda atribuida. */
  cpa: number | null;
  roas: number | null;
  profit: number;
}

export interface CampaignsResponse {
  level: CampaignLevel;
  rows: CampaignRow[];
  unattributed: { sales: number; revenue: number };
  /**
   * Gasto que nao pode ser quebrado neste nivel: linhas sincronizadas antes de
   * a coleta passar a ser por anuncio, que so conhecem a campanha.
   */
  unsplit: { spend: number; rows: number };
}

interface UseCampaignsOptions {
  period?: string;
  level?: CampaignLevel;
}

export function useCampaigns({ period = 'today', level = 'campaign' }: UseCampaignsOptions = {}) {
  return useQuery<CampaignsResponse>({
    queryKey: ['campaigns', period, level],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      params.append('level', level);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      return res.json();
    },
    // Trocar de nivel nao deve piscar a tabela inteira de volta para o spinner:
    // os dados do nivel anterior ficam na tela ate os novos chegarem.
    placeholderData: (previous) => previous,
  });
}
