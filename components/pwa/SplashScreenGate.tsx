'use client';

import { useEffect } from 'react';

/**
 * Some com a tela de abertura assim que o React hidrata.
 *
 * A tela em si vem no HTML inicial (app/layout.tsx) e so e visivel com o app
 * instalado — ver `#app-splash` em globals.css. Ela cobre a janela entre o
 * fim da splash nativa e o momento em que a interface aparece, que e quando o
 * usuario veria um retangulo vazio.
 */
export default function SplashScreenGate() {
  useEffect(() => {
    const splash = document.getElementById('app-splash');
    if (!splash) return;

    // Um frame de folga: garante que o conteudo ja foi pintado por baixo antes
    // de tirar a cobertura.
    const frame = requestAnimationFrame(() => {
      splash.setAttribute('data-ready', 'true');
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
