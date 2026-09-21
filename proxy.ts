import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isEmailAllowed } from '@/lib/supabase-auth';

/**
 * Porteiro do dashboard.
 *
 * Roda antes de qualquer rota e barra quem nao esta autenticado. No Next 16
 * este arquivo se chama `proxy.ts` e exporta `proxy` — o antigo `middleware.ts`
 * foi renomeado, e a documentacao do Supabase ainda ensina o nome antigo.
 *
 * Protege tambem as rotas /api: sem isso, bastaria abrir /api/summary no
 * navegador para ler o faturamento inteiro sem passar pelo login.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isLoginRoute = request.nextUrl.pathname === '/login';

  // Sem as chaves nao ha como validar sessao. Falha fechado: melhor o painel
  // ficar inacessivel do que aberto por engano de configuracao. A tela de
  // login passa mesmo assim, para explicar o que falta — barra-la aqui
  // redirecionaria /login para /login, num laco infinito.
  if (!url || !anonKey) {
    return isLoginRoute ? NextResponse.next() : denyAccess(request, 'config');
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        // O Supabase pode renovar o token no meio do caminho; os cookies novos
        // precisam ir tanto para a requisicao quanto para a resposta.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser valida o token no servidor do Supabase. getSession apenas le o
  // cookie, que o proprio navegador poderia ter forjado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthorized = Boolean(user) && isEmailAllowed(user?.email);

  if (!isAuthorized) {
    if (isLoginRoute) return response;
    return denyAccess(request, user ? 'not-allowed' : 'unauthenticated');
  }

  // Ja autenticado nao tem o que fazer na tela de login.
  if (isLoginRoute) {
    const target = request.nextUrl.clone();
    target.pathname = '/dashboard';
    target.search = '';
    return NextResponse.redirect(target);
  }

  return response;
}

/** API responde 401 em JSON; navegacao vai para o login. */
function denyAccess(request: NextRequest, reason: string) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const target = request.nextUrl.clone();
  target.pathname = '/login';
  target.search = reason === 'unauthenticated' ? '' : `?reason=${reason}`;
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos o que precisa ficar publico:
     * - arquivos internos do Next e imagens otimizadas
     * - icones, manifest e telas de abertura do PWA, que o navegador busca
     *   antes de haver sessao
     * - o service worker, que precisa ser servido para o app instalar
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|sw\\.js|icons/|splash/).*)',
  ],
};
