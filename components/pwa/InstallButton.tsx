'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Evento que o Chrome dispara quando o app atende aos criterios de instalacao.
 * Ainda nao e padronizado, entao nao existe tipo pronto no lib.dom.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Ja esta rodando instalado: nao ha o que oferecer.
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      // Sem isso o Chrome mostra o banner dele na hora que quiser; segurando o
      // evento, a instalacao acontece quando o usuario clicar no botao.
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // O evento nunca chega em navegador que nao suporta instalacao (Safari, por
  // exemplo) nem quando o app ja esta instalado — nesses casos nao renderiza.
  if (!installPrompt) return null;

  const handleInstall = async () => {
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    // O evento so pode ser usado uma vez. Se o usuario recusar, o Chrome
    // dispara um novo mais tarde e o botao volta sozinho.
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 rounded-lg border border-[#333] px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:border-[#0f62fe] hover:text-white"
      title="Instalar o Dashify neste aparelho"
    >
      <Download size={14} />
      <span className="hidden sm:inline">Instalar</span>
    </button>
  );
}
