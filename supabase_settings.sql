-- Criação da tabela de configurações
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (opcional, mas recomendado)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Permitir leitura e escrita para chaves autenticadas (ou service role)
CREATE POLICY "Enable all for service role" ON app_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
