-- Tabela para guardar os dispositivos inscritos em notificações Web Push
-- Execute este script no SQL Editor do Supabase (opcional, o sistema também possui fallback automático na tabela app_settings)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política de leitura/escrita para service_role
CREATE POLICY "Enable all for service role on push_subscriptions" ON push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
