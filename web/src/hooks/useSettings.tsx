import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULTS, STORAGE_KEYS } from '@/constants/apiConstants';

export interface AppSettings {
  preferredVersion: string;
  minConfidence: number;
  matchCount: number;
  silenceSeconds: number;
  autoScroll: boolean;
  showConfidence: boolean;
}

const defaultSettings: AppSettings = {
  preferredVersion: DEFAULTS.preferredVersion,
  minConfidence: DEFAULTS.minConfidence,
  matchCount: DEFAULTS.matchCount,
  silenceSeconds: DEFAULTS.silenceSeconds,
  autoScroll: true,
  showConfidence: true,
};

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function loadSettings(): AppSettings {
  return {
    preferredVersion: readString(STORAGE_KEYS.preferredVersion, defaultSettings.preferredVersion),
    minConfidence: readNumber(STORAGE_KEYS.minConfidence, defaultSettings.minConfidence),
    matchCount: readNumber(STORAGE_KEYS.matchCount, defaultSettings.matchCount),
    silenceSeconds: readNumber(STORAGE_KEYS.silenceSeconds, defaultSettings.silenceSeconds),
    autoScroll: readBool(STORAGE_KEYS.autoScroll, defaultSettings.autoScroll),
    showConfidence: readBool(STORAGE_KEYS.showConfidence, defaultSettings.showConfidence),
  };
}

function persistSettings(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.preferredVersion, s.preferredVersion);
    localStorage.setItem(STORAGE_KEYS.minConfidence, String(s.minConfidence));
    localStorage.setItem(STORAGE_KEYS.matchCount, String(s.matchCount));
    localStorage.setItem(STORAGE_KEYS.silenceSeconds, String(s.silenceSeconds));
    localStorage.setItem(STORAGE_KEYS.autoScroll, String(s.autoScroll));
    localStorage.setItem(STORAGE_KEYS.showConfidence, String(s.showConfidence));
  } catch {
    /* ignore */
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(defaultSettings), []);

  const value = useMemo<SettingsContextValue>(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider.');
  }
  return ctx;
}
