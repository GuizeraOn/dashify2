'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, BellOff, Check, Send, AlertCircle, X, Sparkles } from 'lucide-react';
import {
  isPushSupported,
  getPushSubscriptionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerPushTest,
} from '@/lib/push-client';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Carrega o estado de inscrição do navegador ao montar
  useEffect(() => {
    async function checkState() {
      const state = await getPushSubscriptionState();
      setIsSupported(state.supported);
      setPermission(state.permission);
      setIsSubscribed(state.isSubscribed);
    }
    checkState();
  }, []);

  // Fecha o popover ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setIsSubscribed(true);
        setPermission('granted');
        setStatusMessage('Notificações ativadas! Clique abaixo para testar.');
      } else {
        setIsError(true);
        setStatusMessage(res.message || 'Falha ao ativar notificações.');
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const ok = await unsubscribeFromPushNotifications();
      if (ok) {
        setIsSubscribed(false);
        setStatusMessage('Notificações desativadas para este dispositivo.');
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage('Erro ao desativar notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await triggerPushTest();
      if (res.success) {
        setStatusMessage('Notificação de teste disparada! Verifique a tela.');
      } else {
        setIsError(true);
        setStatusMessage(res.message);
      }
    } catch (err: any) {
      setIsError(true);
      setStatusMessage('Erro ao disparar notificação de teste.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão Ícone no Navbar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isSubscribed ? 'Notificações de venda ativas' : 'Ativar notificações de venda'}
        className="relative flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#252525] transition-colors"
      >
        {isSubscribed ? (
          <BellRing size={19} className="text-[#0f62fe]" />
        ) : (
          <Bell size={19} className="text-gray-400 hover:text-white" />
        )}

        {/* Indicador de Status */}
        {isSubscribed ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        ) : (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500/80" />
        )}
      </button>

      {/* Popover de Configuração e Teste */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-[#333] bg-[#1E1E1E] p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#333] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-[#0f62fe]" />
              <h3 className="font-semibold text-white text-sm">Notificações de Venda</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Preview da Notificação */}
          <div className="mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
              Exemplo de notificação:
            </span>
            <div className="rounded-lg border border-[#383838] bg-[#141414] p-3 text-left shadow-inner">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#0f62fe]/20 border border-[#0f62fe]/40 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                  🔔
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">Venda Realizada (Cartão de crédito)</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">Sua comissão: US$ 37.50</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status do Dispositivo */}
          <div className="flex items-center justify-between bg-[#252525] rounded-lg px-3 py-2 text-xs mb-4">
            <span className="text-gray-300">Status neste dispositivo:</span>
            {isSubscribed ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check size={14} /> Ativo
              </span>
            ) : permission === 'denied' ? (
              <span className="flex items-center gap-1.5 text-red-400 font-medium">
                <BellOff size={14} /> Bloqueado no navegador
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Não ativado</span>
            )}
          </div>

          {/* Feedback de Ação */}
          {statusMessage && (
            <div
              className={`mb-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                isError
                  ? 'bg-red-900/30 text-red-300 border border-red-800/40'
                  : 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40'
              }`}
            >
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-2">
            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading || permission === 'denied'}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-50 text-white font-medium py-2 px-3 text-xs transition-colors shadow-sm"
              >
                <Bell size={15} />
                {isLoading ? 'Ativando...' : 'Ativar Notificações no PC e Celular'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 px-3 text-xs transition-colors shadow-sm"
                >
                  <Send size={14} />
                  {isLoading ? 'Enviando teste...' : 'Enviar Notificação de Teste Agora'}
                </button>

                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={isLoading}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-200 transition-colors py-1"
                >
                  Desativar neste dispositivo
                </button>
              </>
            )}
          </div>

          {/* Dica para iPhone / PWA */}
          <div className="mt-3.5 border-t border-[#333] pt-2.5 text-[11px] text-gray-400 text-left">
            <p>
              💡 <b>No iPhone:</b> instale o app usando o Safari (ícone Compartilhar &gt; <i>Adicionar à Tela de Início</i>) para receber com a tela bloqueada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
