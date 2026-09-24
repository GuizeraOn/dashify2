-- Script de criação da tabela sales para o Webhook da Perfect Pay
-- Execute este script no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS sales (
  code TEXT PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  date_created TIMESTAMP WITH TIME ZONE,
  date_approved TIMESTAMP WITH TIME ZONE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  country TEXT DEFAULT 'Brasil',
  state TEXT,
  city TEXT,
  product_code TEXT,
  product_name TEXT,
  plan_code TEXT,
  plan_name TEXT,
  funnel_step TEXT,
  gross_revenue_brl NUMERIC(12, 2) DEFAULT 0,
  net_revenue_brl NUMERIC(12, 2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  payment_method TEXT,
  status TEXT NOT NULL,
  sale_status_enum INTEGER,
  sale_status_detail TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  src TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices otimizados para as consultas do dashboard
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_product_name ON sales (product_name);
CREATE INDEX IF NOT EXISTS idx_sales_country ON sales (country);
CREATE INDEX IF NOT EXISTS idx_sales_utm_campaign ON sales (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_sales_utm_content ON sales (utm_content);
CREATE INDEX IF NOT EXISTS idx_sales_utm_term ON sales (utm_term);
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales (updated_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para operações via service role
CREATE POLICY "Enable all for service role on sales" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);
