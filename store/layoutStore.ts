import { create } from 'zustand';

interface LayoutState {
  isEditingLayout: boolean;
  toggleEditingLayout: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isEditingLayout: false,
  toggleEditingLayout: () => set((state) => ({ isEditingLayout: !state.isEditingLayout })),
}));
