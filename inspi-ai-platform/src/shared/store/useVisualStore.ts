'use client';

import { create } from 'zustand';

import type { VisualizationSpec } from '@/shared/types/teaching';

interface VisualEntry {
  visual: VisualizationSpec;
  updatedAt: string;
}

interface VisualStoreState {
  cache: Record<string, VisualEntry>;
  setVisual: (cardId: string, entry: { visual: VisualizationSpec; updatedAt?: string }) => void;
  removeVisual: (cardId: string) => void;
  clear: () => void;
}

export const useVisualStore = create<VisualStoreState>((set) => ({
  cache: {},
  setVisual: (cardId, { visual, updatedAt }) => set((state) => ({
    cache: {
      ...state.cache,
      [cardId]: {
        visual,
        updatedAt: updatedAt || new Date().toISOString(),
      },
    },
  })),
  removeVisual: (cardId) => set((state) => {
    if (!state.cache[cardId]) {
      return state;
    }
    const next = { ...state.cache };
    delete next[cardId];
    return { cache: next };
  }),
  clear: () => ({ cache: {} }),
}));
