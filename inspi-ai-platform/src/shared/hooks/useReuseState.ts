'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'inspi_reused_themes_';
const EVENT_NAME = 'inspi:reuse-change';

type ListenerDetail = { key: string };
type ReuseEntry = { id: number; collectedAt: string };

function getStorageKey(userId?: string) {
  return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
}

function isReuseEntry(value: unknown): value is ReuseEntry {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as ReuseEntry).id === 'number'
    && typeof (value as ReuseEntry).collectedAt === 'string',
  );
}

function readFromStorage(key: string): ReuseEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.every(isReuseEntry)) {
        return parsed as ReuseEntry[];
      }
      if (parsed.every(item => typeof item === 'number')) {
        return (parsed as number[]).map((id, index) => ({
          id,
          collectedAt: new Date(index * 1000).toISOString(),
        }));
      }
    }
    return [];
  } catch (error) {
    console.warn('Failed to read reuse storage', error);
    return [];
  }
}

function writeToStorage(key: string, values: ReuseEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
  window.dispatchEvent(new CustomEvent<ListenerDetail>(EVENT_NAME, { detail: { key } }));
}

export function useReuseState(userId?: string) {
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);

  const [entries, setEntries] = useState<ReuseEntry[]>(() => readFromStorage(storageKey));

  const reusedThemes = useMemo(() => entries.map(entry => entry.id), [entries]);

  const reuseMetadata = useMemo(() => {
    const map: Record<number, ReuseEntry> = {};
    entries.forEach((entry) => {
      map[entry.id] = entry;
    });
    return map;
  }, [entries]);

  const refreshState = useCallback(() => {
    setEntries(readFromStorage(storageKey));
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

  const hasReusedTheme = useCallback(
    (themeId: number) => entries.some(entry => entry.id === themeId),
    [entries],
  );

  const markThemeReused = useCallback((themeId: number) => {
    const now = new Date().toISOString();
    setEntries((prev) => {
      const exists = prev.some(entry => entry.id === themeId);
      const nextEntries = exists
        ? prev.map(entry => (entry.id === themeId ? { ...entry, collectedAt: now } : entry))
        : [...prev, { id: themeId, collectedAt: now }];
      writeToStorage(storageKey, nextEntries);
      return nextEntries;
    });
  }, [storageKey]);

  const unmarkThemeReused = useCallback((themeId: number) => {
    setEntries((prev) => {
      if (!prev.some(entry => entry.id === themeId)) {
        return prev;
      }
      const next = prev.filter(entry => entry.id !== themeId);
      writeToStorage(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return {
    reusedThemes,
    reuseMetadata,
    hasReusedTheme,
    markThemeReused,
    unmarkThemeReused,
  };
}
