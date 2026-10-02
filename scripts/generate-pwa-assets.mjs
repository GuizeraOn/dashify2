import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { APPLE_SPLASH_SCREENS, splashFileName } from '../lib/pwa-splash.ts';

const BACKGROUND = '#121212';
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const APP_DIR = path.join(process.cwd(), 'app');

const ICON_RAW_PATH = path.join(PUBLIC_DIR, 'icone-raw.png');
const LOGO_RAW_PATH = path.join(PUBLIC_DIR, 'logo.png'); // Full logo for splash screens

async function generateIcon({ file, dir = PUBLIC_DIR, size, coverage, radius = 0 }) {
  const outputPath = path.join(dir, file);
  const drawingSize = Math.round(size * coverage);

  // Redimensiona o ícone base
  const resizedIcon = await sharp(ICON_RAW_PATH)
    .resize(drawingSize, drawingSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Cria fundo se tiver borderRadius (se radius=0, o fundo será mantido transparente ou maskable background? 
  // Na versão anterior o maskable tinha o fundo preenchido e não arredondado).
  
  // Como é pra PWA/App Icon, geralmente queremos o ícone no fundo da cor certa.
  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND
    }
  });

  let composited = base.composite([{ input: resizedIcon, gravity: 'center' }]);
  let pngBuffer = await composited.png({ compressionLevel: 9 }).toBuffer();

  if (radius > 0) {
    const mask = Buffer.from(
      `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`
    );
    pngBuffer = await sharp(pngBuffer)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pngBuffer);
  return pngBuffer.length;
}

async function generateSplash(screen) {
  const width = screen.width * screen.ratio;
  const height = screen.height * screen.ratio;
  const outputPath = path.join(PUBLIC_DIR, splashFileName(screen).replace(/^\//, ''));

  // Use the full logo (logo.png) for the splash screen
  // Scale it nicely. Typically splash logos are about 40-50% of the screen width.
  const drawingWidth = Math.round(width * 0.4);

  const resizedLogo = await sharp(LOGO_RAW_PATH)
    .resize({ width: drawingWidth, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const base = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: BACKGROUND
    }
  });

  const composited = await base
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, composited);
  return composited.length;
}

async function main() {
  const icons = [
    { file: 'icons/icon-192.png', size: 192, coverage: 0.62, radius: 42 },
    { file: 'icons/icon-512.png', size: 512, coverage: 0.62, radius: 112 },
    { file: 'icons/icon-maskable-192.png', size: 192, coverage: 0.45 },
    { file: 'icons/icon-maskable-512.png', size: 512, coverage: 0.45 },
    { file: 'apple-icon.png', dir: APP_DIR, size: 180, coverage: 0.6 },
  ];

  for (const config of icons) {
    const bytes = await generateIcon(config);
    console.log(`  ${config.file.padEnd(34)} ${(bytes / 1024).toFixed(1)} KB`);
  }

  for (const screen of APPLE_SPLASH_SCREENS) {
    const bytes = await generateSplash(screen);
    const file = splashFileName(screen).replace(/^\//, '');
    console.log(`  ${file.padEnd(34)} ${(bytes / 1024).toFixed(1)} KB  ${screen.devices}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
