import { create } from 'zustand';

interface RefreshState {
  /**
   * Verdadeiro do clique em "Atualizar" ate os dados novos chegarem.
   *
   * Precisa ser global porque quem dispara a atualizacao e o Header e quem
   * reage a ela sao os cards. Nao da para usar so o isFetching da consulta: a
   * atualizacao comeca sincronizando o Meta, que leva alguns segundos antes de
   * qualquer consulta sair — e os numeros devem sumir no clique, nao depois.
   */
  isRefreshing: boolean;
  setRefreshing: (value: boolean) => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  isRefreshing: false,
  setRefreshing: (value) => set({ isRefreshing: value }),
}));
