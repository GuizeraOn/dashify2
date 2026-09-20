import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// O client e criado sob demanda, na primeira chamada dentro de um handler.
// Instanciar no topo do modulo quebra o `next build`: a coleta de dados das
// rotas avalia o modulo, e em ambientes onde as variaveis ainda nao estao
// configuradas (ex.: primeiro deploy na Vercel) o createClient lanca
// "supabaseUrl is required".
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable'
    );
  }

  // We use the service role key because this client will only be used server-side
  // to bypass Row Level Security and allow inserts/updates.
  // DO NOT use this client in the frontend!
  client = createClient(supabaseUrl, supabaseServiceRoleKey);
  return client;
}
