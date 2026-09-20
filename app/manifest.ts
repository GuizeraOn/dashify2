import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'Dashify — Performance em tempo real',
    short_name: 'Dashify',
    description: 'Dashboard de análise de performance de tráfego pago e vendas.',
    lang: 'pt-BR',
    dir: 'ltr',
    // Abre direto no dashboard em vez de passar pelo redirect da raiz.
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    // Se o navegador suportar, usa a janela com barra de titulo minima; senao
    // cai para standalone e, no pior caso, para uma aba comum.
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    // Cor da splash gerada pelo Android e da barra de status.
    background_color: '#121212',
    theme_color: '#121212',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // O Android recorta o icone em formatos variados (circulo, squircle);
      // as versoes maskable tem o desenho dentro da zona segura.
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Vendas',
        short_name: 'Vendas',
        url: '/dashboard/vendas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Campanhas',
        short_name: 'Campanhas',
        url: '/dashboard/campanhas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Relatórios',
        short_name: 'Relatórios',
        url: '/dashboard/relatorios',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
