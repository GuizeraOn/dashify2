/**
 * Gera lib/world-map.ts: a silhueta dos continentes como um unico path SVG e
 * o centroide de cada pais.
 *
 *   node scripts/generate-world-map.mjs
 *
 * O arquivo gerado e versionado e o runtime nao carrega d3 nem topojson — so
 * uma string de path e uma tabela de coordenadas. A projecao e equiretangular
 * justamente por ser reversivel em duas linhas de aritmetica no cliente
 * (ver projectLngLat em lib/geo.ts); qualquer outra exigiria d3-geo no bundle.
 *
 * As fronteiras entre paises sao dissolvidas de proposito: o mapa e contexto,
 * nao o dado. Quem carrega a informacao sao os pontos por cima.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { geoEquirectangular, geoPath, geoCentroid } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import world from 'world-atlas/countries-110m.json' with { type: 'json' };

const WIDTH = 1000;
const HEIGHT = 500;

/** Remove acentos e caixa, para casar "México" com "Mexico". */
function normalize(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

async function main() {
  // Equiretangular cobrindo o mundo inteiro: 360 graus de longitude viram
  // WIDTH, e a altura sai exatamente pela metade.
  const projection = geoEquirectangular()
    .scale(WIDTH / (2 * Math.PI))
    .translate([WIDTH / 2, HEIGHT / 2]);

  const toPath = geoPath(projection);

  const countries = feature(world, world.objects.countries);

  // A Antartida vira uma faixa branca colada na base do mapa e nao recebe
  // venda nenhuma: e ruido puro num mapa que serve so de contexto.
  const withoutAntarctica = world.objects.countries.geometries.filter(
    (geometry) => normalize(geometry.properties?.name ?? '') !== 'antarctica'
  );
  const land = merge(world, withoutAntarctica);

  // Uma casa decimal em 1000px ja e mais precisao do que um mapa de contexto
  // precisa, e corta o arquivo quase pela metade.
  const landPath = toPath(land).replace(/-?\d+\.\d+/g, (value) => Number(value).toFixed(1));

  const centroids = {};
  for (const country of countries.features) {
    const name = country.properties?.name;
    if (!name) continue;

    const [longitude, latitude] = geoCentroid(country);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

    centroids[normalize(name)] = [Number(longitude.toFixed(2)), Number(latitude.toFixed(2))];
  }

  const entries = Object.entries(centroids)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, [lng, lat]]) => `  '${name.replace(/'/g, "\\'")}': [${lng}, ${lat}],`)
    .join('\n');

  const output = `/* eslint-disable */
// GERADO por scripts/generate-world-map.mjs — nao edite a mao.
// Fonte: world-atlas (Natural Earth, dominio publico), resolucao 1:110m.

/** Largura e altura do sistema de coordenadas do path abaixo. */
export const WORLD_WIDTH = ${WIDTH};
export const WORLD_HEIGHT = ${HEIGHT};

/** Continentes em projecao equiretangular, sem fronteiras internas. */
export const WORLD_LAND_PATH =
  '${landPath}';

/** Centroide de cada pais em [longitude, latitude], com o nome normalizado. */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
${entries}
};
`;

  const target = path.join(process.cwd(), 'lib', 'world-map.ts');
  await writeFile(target, output, 'utf8');

  const kb = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
  console.log(`lib/world-map.ts  ${kb} KB  (path ${(landPath.length / 1024).toFixed(1)} KB, ${Object.keys(centroids).length} paises)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
