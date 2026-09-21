import { useEffect, useRef, useState } from 'react';

/** Quanto tempo os numeros ficam sumidos antes de voltar. */
const PULSE_DURATION_MS = 220;

/**
 * Fica true por um instante toda vez que a consulta traz dados novos.
 *
 * Serve para apagar e trazer de volta todos os numeros juntos, sinalizando
 * "recarregou" sem apontar quem mudou. Destacar so os valores alterados chama
 * atencao demais para um card e de menos para o resto.
 *
 * Passe o `dataUpdatedAt` do TanStack Query: ele muda a cada busca concluida,
 * inclusive quando o valor volta igual — que e justamente quando o usuario
 * mais precisa do sinal de que algo aconteceu.
 */
export function useRefreshPulse(dataUpdatedAt?: number): boolean {
  const previous = useRef(dataUpdatedAt);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // A primeira carga nao pulsa: os numeros ja estao entrando na tela.
    if (previous.current === dataUpdatedAt) return;

    previous.current = dataUpdatedAt;
    setIsPulsing(true);

    const timer = setTimeout(() => setIsPulsing(false), PULSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [dataUpdatedAt]);

  return isPulsing;
}
