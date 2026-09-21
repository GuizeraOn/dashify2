import { COUNTRY_CENTROIDS, WORLD_HEIGHT, WORLD_WIDTH } from './world-map';

/**
 * Projecao equiretangular — a mesma usada para gerar o path dos continentes
 * (ver scripts/generate-world-map.mjs). Longitude vira x linearmente, latitude
 * vira y linearmente. E o unico motivo de o mapa nao precisar do d3 no cliente.
 */
export function projectLngLat(longitude: number, latitude: number): { x: number; y: number } {
  return {
    x: WORLD_WIDTH / 2 + (WORLD_WIDTH * longitude) / 360,
    y: WORLD_HEIGHT / 2 - (WORLD_HEIGHT * latitude) / 180,
  };
}

/** Sem acentos e sem caixa, para "México" casar com "Mexico" do atlas. */
export function normalizeCountryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Nomes em portugues e espanhol apontando para o nome do atlas, que e em
 * ingles. So precisa de entrada o que nao casa sozinho depois de normalizar —
 * "argentina", "chile", "uruguay" e "colombia" ja batem direto.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  equador: 'ecuador',
  'porto rico': 'puerto rico',
  'republica dominicana': 'dominican rep.',
  alemanha: 'germany',
  brasil: 'brazil',
  'coreia do sul': 'south korea',
  'estados unidos': 'united states of america',
  eua: 'united states of america',
  usa: 'united states of america',
  espanha: 'spain',
  franca: 'france',
  holanda: 'netherlands',
  inglaterra: 'united kingdom',
  'reino unido': 'united kingdom',
  irlanda: 'ireland',
  italia: 'italy',
  japao: 'japan',
  paraguai: 'paraguay',
  suica: 'switzerland',
  uruguai: 'uruguay',
};

/**
 * Centroides refeitos a mao onde o geometrico engana. Os Estados Unidos, por
 * exemplo, puxam para o norte por causa do Alasca e o ponto cairia no Canada.
 */
const CENTROID_OVERRIDES: Record<string, [number, number]> = {
  'united states of america': [-98.5, 39.5],
  france: [2.5, 46.5],
  norway: [9.0, 61.0],
  russia: [90.0, 62.0],
};

/** Coordenada do pais, ou null quando o nome nao e reconhecido. */
export function lookupCountryCoords(country: string): [number, number] | null {
  const normalized = normalizeCountryName(country);
  const atlasName = COUNTRY_ALIASES[normalized] ?? normalized;

  return CENTROID_OVERRIDES[atlasName] ?? COUNTRY_CENTROIDS[atlasName] ?? null;
}
