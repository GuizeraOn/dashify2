'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Target, Check, Loader2 } from 'lucide-react';
import { Poppins } from 'next/font/google';

import { createBrowserSupabase } from '@/lib/supabase-auth';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'] });

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('reason') === 'not-allowed'
      ? 'Esta conta não tem acesso ao painel.'
      : searchParams.get('reason') === 'config'
        ? 'Autenticação não configurada no servidor.'
        : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (isSuccess) {
      // Animação progressiva da barra de carregamento
      const timer1 = setTimeout(() => setProgress(65), 250);
      const timer2 = setTimeout(() => setProgress(95), 700);
      const timer3 = setTimeout(() => {
        setProgress(100);
        router.replace('/dashboard');
        router.refresh();
      }, 1200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isSuccess, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isSuccess) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError('E-mail ou senha inválidos.');
        setIsSubmitting(false);
        return;
      }

      // Sucesso na autenticação: dispara tela/animação de transição elegante
      setIsSuccess(true);
    } catch {
      setError('Não foi possível entrar. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 selection:bg-[#0f62fe] selection:text-white">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f62fe]/10 border border-[#0f62fe]/20">
            <Target className="text-[#0f62fe]" size={24} />
          </div>
          <span className={`${poppins.className} text-2xl font-semibold tracking-tight text-white`}>
            Dashify
          </span>
        </div>

        {/* Card Container com Efeito de Glow */}
        <div className="relative">
          {/* Efeito de brilho de fundo quando o login é bem-sucedido */}
          <div
            className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#0f62fe]/40 via-[#0043ce]/30 to-[#0f62fe]/40 blur-xl transition-all duration-700 pointer-events-none ${
              isSuccess ? 'opacity-100 scale-105' : 'opacity-0 scale-95'
            }`}
          />

          <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#1E1E1E] p-6 shadow-2xl transition-all duration-500">
            {isSuccess ? (
              /* ============================================================ */
              /* TELA DE SUCESSO E CARREGAMENTO                               */
              /* ============================================================ */
              <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in-95 duration-500">
                {/* Ícone de Sucesso com Halo Pulsante */}
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="absolute h-20 w-20 rounded-full bg-[#0f62fe]/20 animate-ping duration-1000" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0f62fe]/15 border border-[#0f62fe]/30 shadow-[0_0_25px_rgba(15,98,254,0.4)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f62fe] text-white shadow-lg">
                      <Check size={24} className="stroke-[3] animate-in zoom-in duration-300" />
                    </div>
                  </div>
                </div>

                {/* Textos Informativos */}
                <h3 className={`${poppins.className} text-lg font-semibold tracking-tight text-white`}>
                  Acesso Autorizado!
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Carregando seu painel de vendas...
                </p>

                {/* Barra de Progresso com Shimmer */}
                <div className="mt-6 w-full max-w-[240px]">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#282828]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0f62fe] via-[#4589ff] to-[#0f62fe] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(15,98,254,0.7)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500">
                  <Loader2 size={12} className="animate-spin text-[#0f62fe]" />
                  <span>Sincronizando métricas e dados...</span>
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* FORMULÁRIO DE LOGIN NORMAL                                   */
              /* ============================================================ */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-gray-300">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    className="rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#0f62fe] disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-gray-300">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#0f62fe] disabled:opacity-50"
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-red-900/20 border border-red-900/40 px-3 py-2 text-xs text-red-400 animate-in fade-in duration-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex items-center justify-center gap-2 rounded-md bg-[#0f62fe] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0353e9] active:scale-[0.99] disabled:opacity-50 shadow-[0_0_15px_rgba(15,98,254,0.3)] hover:shadow-[0_0_20px_rgba(15,98,254,0.5)] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Informação de Acesso */}
        <p className="mt-5 text-center text-xs text-gray-600">
          Acesso restrito. Contas são gerenciadas pelo administrador.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
