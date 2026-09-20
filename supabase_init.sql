-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS meta_ads_insights (
  key TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  hour INTEGER,
  account_id TEXT,
  account_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  spend NUMERIC,
  impressions NUMERIC,
  clicks NUMERIC,
  link_clicks NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  cpm NUMERIC,
  landing_page_views NUMERIC,
  initiate_checkout NUMERIC,
  purchases NUMERIC,
  purchase_value NUMERIC,
  roas NUMERIC,
  leads NUMERIC,
  currency TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (opcional, mas recomendado)
ALTER TABLE meta_ads_insights ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (se for usar select pelo frontend direto, mas vamos usar nosso backend)
-- CREATE POLICY "Public read access" ON meta_ads_insights FOR SELECT USING (true);
