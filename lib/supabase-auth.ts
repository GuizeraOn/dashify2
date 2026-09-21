import { createBrowserClient } from '@supabase/ssr';

/**
 * Chaves usadas pela autenticacao.
 *
 * A chave anonima e diferente da service_role usada em lib/supabase.ts. Ela e
 * publica de proposito — vai para o navegador — e sozinha nao da acesso a
 * nada: quem decide o que cada usuario pode ver e o Row Level Security do
 * Supabase. A service_role, que ignora RLS, nunca pode sair do servidor.
 */
export function getSupabaseAuthEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
    );
  }

  return { url, anonKey };
}

/** Cliente para componentes de navegador (login e logout). */
export function createBrowserSupabase() {
  const { url, anonKey } = getSupabaseAuthEnv();
  return createBrowserClient(url, anonKey);
}

/**
 * Lista opcional de e-mails autorizados, separada por virgula.
 *
 * Rede de seguranca: mesmo que o cadastro publico fique ligado no Supabase por
 * descuido, so quem esta na lista entra. Sem a variavel definida, qualquer
 * usuario valido do projeto entra.
 */
export function isEmailAllowed(email: string | undefined | null): boolean {
  const allowList = process.env.ALLOWED_EMAILS;
  if (!allowList) return true;
  if (!email) return false;

  return allowList
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
