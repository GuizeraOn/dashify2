'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker. So em producao: em desenvolvimento ele
 * atrapalharia o hot reload servindo respostas guardadas.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Falha ao registrar o service worker:', error);
      });
    };

    // Espera a pagina terminar de carregar para nao competir por banda com os
    // assets da primeira renderizacao.
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
