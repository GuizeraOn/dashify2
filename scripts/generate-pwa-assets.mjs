/**
 * Gera os icones e as telas de abertura do PWA a partir do mesmo desenho do
 * favicon (o alvo do lucide usado ao lado de "Dashify" no TopNav).
 *
 * Rode depois de mexer nas cores da marca ou na tabela de aparelhos:
 *   node scripts/generate-pwa-assets.mjs
 *
 * Os PNGs gerados sao versionados; isso aqui nao roda no build.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { APPLE_SPLASH_SCREENS, splashFileName } from '../lib/pwa-splash.ts';

const BACKGROUND = '#121212';
const BRAND = '#0f62fe';
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const APP_DIR = path.join(process.cwd(), 'app');

/**
 * O alvo, centrado num quadrado de `size`, ocupando `coverage` dele.
 * `radius` arredonda o fundo; 0 deixa quadrado (o que maskable e iOS pedem,
 * porque a propria plataforma aplica a mascara dela por cima).
 */
function iconSvg({ size, coverage, radius = 0, background = BACKGROUND }) {
  const drawing = size * coverage;
  const offset = (size - drawing) / 2;
  const scale = drawing / 24; // o icone do lucide e desenhado num viewBox 24

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})"
     fill="none" stroke="${BRAND}" stroke-width="2.25"
     stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </g>
</svg>`;
}

/** Tela de abertura: fundo cheio com o alvo no centro. */
function splashSvg({ width, height }) {
  const drawing = Math.round(Math.min(width, height) * 0.28);
  const scale = drawing / 24;
  const x = (width - drawing) / 2;
  const y = (height - drawing) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BACKGROUND}"/>
  <g transform="translate(${x} ${y}) scale(${scale})"
     fill="none" stroke="${BRAND}" stroke-width="2.25"
     stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </g>
</svg>`;
}

async function writePng(svg, outputPath) {
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, png);
  return png.length;
}

async function main() {
  const icons = [
    // Icone comum: cantos arredondados, sobra de respiro nas bordas.
    { file: 'icons/icon-192.png', svg: iconSvg({ size: 192, coverage: 0.62, radius: 42 }) },
    { file: 'icons/icon-512.png', svg: iconSvg({ size: 512, coverage: 0.62, radius: 112 }) },
    // Maskable: fundo sangrando ate a borda e desenho dentro da zona segura
    // (80% centrais), porque o Android recorta o que sobra.
    { file: 'icons/icon-maskable-192.png', svg: iconSvg({ size: 192, coverage: 0.45 }) },
    { file: 'icons/icon-maskable-512.png', svg: iconSvg({ size: 512, coverage: 0.45 }) },
    // iOS aplica a propria mascara arredondada, entao vai quadrado e opaco.
    // Vai em app/ e nao em public/: pela convencao de arquivo do Next, o
    // <link rel="apple-touch-icon"> e injetado automaticamente.
    { file: 'apple-icon.png', dir: APP_DIR, svg: iconSvg({ size: 180, coverage: 0.6 }) },
  ];

  for (const { file, dir = PUBLIC_DIR, svg } of icons) {
    const bytes = await writePng(svg, path.join(dir, file));
    console.log(`  ${file.padEnd(34)} ${(bytes / 1024).toFixed(1)} KB`);
  }

  for (const screen of APPLE_SPLASH_SCREENS) {
    const width = screen.width * screen.ratio;
    const height = screen.height * screen.ratio;
    const file = splashFileName(screen).replace(/^\//, '');
    const bytes = await writePng(splashSvg({ width, height }), path.join(PUBLIC_DIR, file));
    console.log(`  ${file.padEnd(34)} ${(bytes / 1024).toFixed(1)} KB  ${screen.devices}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
