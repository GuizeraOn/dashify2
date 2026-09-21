'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Target } from 'lucide-react';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // A mensagem do Supabase vem em ingles e nao distingue e-mail de senha
        // de proposito, para nao revelar quais e-mails existem.
        setError('E-mail ou senha inválidos.');
        return;
      }

      // refresh para o proxy enxergar o cookie de sessao recem-criado.
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Não foi possível entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Target className="text-[#0f62fe]" size={28} />
          <span className={`${poppins.className} text-2xl font-medium tracking-tight text-white`}>
            Dashify
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl bg-[#1E1E1E] p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-gray-300">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#0f62fe]"
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-[#333] bg-[#252525] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#0f62fe]"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-[#0f62fe] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0353e9] disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Nao existe cadastro aqui de proposito: as contas sao criadas a mao
            no painel do Supabase. Um formulario de cadastro aberto daria a
            qualquer visitante uma conta valida. */}
        <p className="mt-4 text-center text-xs text-gray-600">
          Acesso restrito. Contas são criadas pelo administrador.
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
