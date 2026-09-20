/**
 * Telas de abertura do iOS.
 *
 * O Safari nao gera splash a partir do manifest como o Android faz: ele exige
 * uma imagem por resolucao de aparelho, casada por media query. Esta tabela e
 * a fonte unica dessa informacao — o `scripts/generate-pwa-assets.mjs` gera os
 * PNGs a partir dela e o app/layout.tsx monta as tags a partir dela tambem,
 * entao as imagens e as media queries nao saem de sincronia.
 *
 * `width`/`height` sao em CSS pixels (o que a media query enxerga) e `ratio` e
 * o device pixel ratio — a imagem e gerada em width*ratio por height*ratio.
 * So retrato: o app e usado em pe no celular, e cobrir paisagem dobraria o
 * numero de arquivos.
 */
export interface AppleSplashScreen {
  /** Aparelhos que casam com esta combinacao, so para referencia. */
  devices: string;
  width: number;
  height: number;
  ratio: number;
}

export const APPLE_SPLASH_SCREENS: AppleSplashScreen[] = [
  { devices: 'iPhone SE (2a/3a), 8, 7, 6s', width: 375, height: 667, ratio: 2 },
  { devices: 'iPhone 8 Plus, 7 Plus, 6s Plus', width: 414, height: 736, ratio: 3 },
  { devices: 'iPhone X, XS, 11 Pro', width: 375, height: 812, ratio: 3 },
  { devices: 'iPhone XR, 11', width: 414, height: 896, ratio: 2 },
  { devices: 'iPhone XS Max, 11 Pro Max', width: 414, height: 896, ratio: 3 },
  { devices: 'iPhone 12 mini, 13 mini', width: 360, height: 780, ratio: 3 },
  { devices: 'iPhone 12, 12 Pro, 13, 13 Pro, 14', width: 390, height: 844, ratio: 3 },
  { devices: 'iPhone 14 Pro, 15, 15 Pro, 16', width: 393, height: 852, ratio: 3 },
  { devices: 'iPhone 16 Pro', width: 402, height: 874, ratio: 3 },
  { devices: 'iPhone 12 Pro Max, 13 Pro Max, 14 Plus', width: 428, height: 926, ratio: 3 },
  { devices: 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus', width: 430, height: 932, ratio: 3 },
  { devices: 'iPhone 16 Pro Max', width: 440, height: 956, ratio: 3 },
  { devices: 'iPad, iPad mini', width: 768, height: 1024, ratio: 2 },
  { devices: 'iPad Air 10.9"', width: 820, height: 1180, ratio: 2 },
  { devices: 'iPad Pro 11"', width: 834, height: 1194, ratio: 2 },
  { devices: 'iPad Pro 12.9"', width: 1024, height: 1366, ratio: 2 },
];

/** Caminho publico do PNG de uma tela — o mesmo usado na geracao e na tag. */
export function splashFileName({ width, height, ratio }: AppleSplashScreen): string {
  return `/splash/apple-splash-${width * ratio}x${height * ratio}.png`;
}

/** Media query que faz o iOS escolher esta imagem. */
export function splashMedia({ width, height, ratio }: AppleSplashScreen): string {
  return (
    `(device-width: ${width}px) and (device-height: ${height}px) ` +
    `and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`
  );
}
