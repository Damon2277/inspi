'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'inspi_reused_themes_';
const EVENT_NAME = 'inspi:reuse-change';

type ListenerDetail = { key: string };

function getStorageKey(userId?: string) {
  return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
}

function readFromStorage(key: string): number[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(id => typeof id === 'number');
    }
    return [];
  } catch (error) {
    console.warn('Failed to read reuse storage', error);
    return [];
  }
}

function writeToStorage(key: string, values: number[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
  window.dispatchEvent(new CustomEvent<ListenerDetail>(EVENT_NAME, { detail: { key } }));
}

export function useReuseState(userId?: string) {
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);

  const [reusedThemes, setReusedThemes] = useState<number[]>(() => readFromStorage(storageKey));

  const refreshState = useCallback(() => {
    setReusedThemes(readFromStorage(storageKey));
  }, [storageKey]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ListenerDetail>;
      if (customEvent.detail?.key === storageKey) {
        refreshState();
      }
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, [refreshState, storageKey]);

  const hasReusedTheme = useCallback((themeId: number) => reusedThemes.includes(themeId), [reusedThemes]);

  const markThemeReused = useCallback((themeId: number) => {
    if (hasReusedTheme(themeId)) return;
    const next = [...reusedThemes, themeId];
    setReusedThemes(next);
    writeToStorage(storageKey, next);
  }, [hasReusedTheme, reusedThemes, storageKey]);

  const unmarkThemeReused = useCallback((themeId: number) => {
    if (!hasReusedTheme(themeId)) return;
    const next = reusedThemes.filter(id => id !== themeId);
    setReusedThemes(next);
    writeToStorage(storageKey, next);
  }, [hasReusedTheme, reusedThemes, storageKey]);

  return {
    reusedThemes,
    hasReusedTheme,
    markThemeReused,
    unmarkThemeReused,
  };
}
