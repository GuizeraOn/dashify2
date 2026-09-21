/** Raio do anel. O traco e desenhado sobre esta linha. */
const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface Props {
  /** Participacao em porcentagem, de 0 a 100. */
  share: number;
  /** Destaca o anel da linha sob o cursor ou selecionada. */
  isActive?: boolean;
  /** Cor do arco. Cada card usa a mesma cor do seu grafico. */
  color?: string;
}

/**
 * Anel de participacao: mesma leitura de uma barra, porem em largura fixa.
 *
 * Numa lista onde o rotulo varia muito de tamanho, a barra horizontal encolhe
 * e estica de linha para linha, atrapalhando justamente a comparacao que ela
 * deveria facilitar.
 */
export default function ShareRing({ share, isActive = false, color = '#22d3ee' }: Props) {
  const filled = Math.min(Math.max(share, 0), 100) / 100;

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-white/10"
      />
      <circle
        cx="12"
        cy="12"
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${filled * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        // Comeca no topo, em vez de as tres horas, que e o padrao do SVG.
        transform="rotate(-90 12 12)"
        opacity={isActive ? 1 : 0.85}
      />
    </svg>
  );
}
