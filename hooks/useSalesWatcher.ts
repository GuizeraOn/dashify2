'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * De quanto em quanto tempo a planilha e consultada.
 *
 * 30s da a sensacao de tempo real sem pesar: e uma leitura da planilha por
 * consulta, e a cota do Sheets e de 60 por minuto por usuario.
 */
const POLL_INTERVAL_MS = 30_000;

interface SalesPulse {
  rows: number;
  signature: string;
}

/**
 * Vigia a planilha e recarrega o painel quando chega informacao nova.
 *
 * O caminho obvio seria colocar um refetchInterval na consulta do resumo, mas
 * ai o painel inteiro piscaria a cada 30 segundos mesmo sem nada ter mudado.
 * Aqui a consulta periodica e so a da assinatura; os dados de verdade so sao
 * invalidados quando ela muda, e a animacao vira sinal de novidade em vez de
 * ruido de fundo.
 */
export function useSalesWatcher(onNewData?: () => void) {
  const queryClient = useQueryClient();
  const lastSignature = useRef<string | null>(null);

  // Guardado em ref para a identidade do callback nao reiniciar o efeito.
  const onNewDataRef = useRef(onNewData);
  onNewDataRef.current = onNewData;

  const { data } = useQuery<SalesPulse>({
    queryKey: ['sales-pulse'],
    queryFn: async () => {
      const response = await fetch('/api/sales-pulse');
      if (!response.ok) throw new Error('Falha ao consultar a planilha');
      return response.json();
    },
    refetchInterval: POLL_INTERVAL_MS,
    // Com a aba escondida nao ha o que animar; retoma ao voltar o foco.
    refetchIntervalInBackground: false,
    // A assinatura e sempre barata de buscar de novo; nao vale guardar.
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    const signature = data?.signature;
    if (!signature) return;

    // A primeira leitura so estabelece a referencia — nao e novidade.
    if (lastSignature.current === null) {
      lastSignature.current = signature;
      return;
    }

    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    // Tudo menos o proprio vigia: invalidar a assinatura junto so geraria uma
    // consulta a mais, ja que ela acabou de ser lida.
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'sales-pulse',
    });

    onNewDataRef.current?.();
  }, [data?.signature, queryClient]);

  return data;
}
