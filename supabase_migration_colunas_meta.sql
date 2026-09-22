-- Execute este script no SQL Editor do Supabase ANTES de publicar a versao
-- nova. A sincronizacao passa a gravar estas colunas; sem elas o upsert
-- falharia. (O codigo tem uma rede de seguranca que grava sem as colunas
-- novas se elas ainda nao existirem, mas ai as metricas ficam vazias.)

-- 1. Metricas que somam normalmente hora a hora.
ALTER TABLE meta_ads_insights ADD COLUMN IF NOT EXISTS post_comments NUMERIC;
ALTER TABLE meta_ads_insights ADD COLUMN IF NOT EXISTS video_3s_views NUMERIC;
ALTER TABLE meta_ads_insights ADD COLUMN IF NOT EXISTS thruplays NUMERIC;

-- 2. Alcance e frequencia moram numa tabela a parte, de proposito.
--
-- Alcance conta PESSOAS, nao eventos: a mesma pessoa alcancada as 10h e as 15h
-- e uma so. Como a tabela de insights e quebrada por hora, somar o alcance
-- daquelas linhas contaria essa pessoa duas vezes — o alcance sairia quase
-- igual as impressoes e a frequencia daria sempre 1,0.
--
-- Por isso a sincronizacao faz uma segunda consulta ao Meta, sem a quebra por
-- hora, e guarda o alcance ja deduplicado por dia aqui.
CREATE TABLE IF NOT EXISTS meta_ads_daily_reach (
  key TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  reach NUMERIC,
  frequency NUMERIC,
  impressions NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE meta_ads_daily_reach ENABLE ROW LEVEL SECURITY;
