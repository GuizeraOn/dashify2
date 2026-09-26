'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker. So em producao: em desenvolvimento ele
 * atrapalharia o hot reload servindo respostas guardadas.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Register periodic sync for the widget
        if ('periodicSync' in registration) {
          try {
            (registration as any).periodicSync.register('sync-vendas', {
              minInterval: 15 * 60 * 1000, // 15 minutos
            });
          } catch (e) {
            console.warn('Periodic sync failed:', e);
          }
        }
      }).catch((error) => {
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
