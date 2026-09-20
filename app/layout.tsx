import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import Providers from "./providers";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import SplashScreenGate from "@/components/pwa/SplashScreenGate";
import { APPLE_SPLASH_SCREENS, splashFileName, splashMedia } from "@/lib/pwa-splash";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Dashify — Performance em tempo real",
  description: "Dashboard de análise de performance de tráfego pago e vendas.",
  applicationName: "Dashify",
  appleWebApp: {
    // Abre em tela cheia quando adicionado a tela de inicio do iPhone.
    capable: true,
    title: "Dashify",
    statusBarStyle: "black",
    // O Safari nao monta a splash a partir do manifest: precisa de uma imagem
    // por resolucao, casada por media query.
    startupImage: APPLE_SPLASH_SCREENS.map((screen) => ({
      url: splashFileName(screen),
      media: splashMedia(screen),
    })),
  },
  formatDetection: { telephone: false },
  other: {
    // O Next emite o `mobile-web-app-capable` padronizado, que o Safari so
    // passou a considerar no iOS 16.4. Esta e a versao antiga, para iPhone com
    // sistema anterior abrir em tela cheia tambem.
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  // Pinta a barra do navegador e a moldura do app com o fundo da interface.
  themeColor: "#121212",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Deixa o conteudo ir ate as bordas em telas com entalhe.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} antialiased bg-[#121212] text-white`}>
        {/* Tela de abertura. Vem no HTML inicial para cobrir a janela enquanto
            o JavaScript carrega, e so fica visivel com o app instalado — em
            uma aba comum o CSS a mantem escondida. */}
        <div id="app-splash" aria-hidden="true">
          <svg
            width="88"
            height="88"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0f62fe"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span>Dashify</span>
        </div>

        <Providers>
          {children}
        </Providers>

        <ServiceWorkerRegistration />
        <SplashScreenGate />
      </body>
    </html>
  );
}
