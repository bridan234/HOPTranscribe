// API base URL resolution order:
//   1. window.__APP_CONFIG__.apiBaseUrl   — written at container start by
//      web/docker-entrypoint.sh from the API_BASE_URL env var. This is the
//      production path; the image is environment-agnostic.
//   2. import.meta.env.VITE_API_BASE_URL  — build-time fallback for `vite dev`
//      or anyone still injecting at build time.
//   3. http://localhost:5001              — last-resort dev default.
// In a production bundle, a missing #1 and #2 throws loudly so we never
// silently call localhost from a deployed app (the bug behind the "API call
// going to localhost in Container App" incident).
const runtimeApiBaseUrl =
  typeof window !== 'undefined' && typeof window.__APP_CONFIG__?.apiBaseUrl === 'string'
    ? window.__APP_CONFIG__.apiBaseUrl.trim()
    : '';
const buildTimeApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

const resolveApiBaseUrl = (): string => {
  if (runtimeApiBaseUrl) return runtimeApiBaseUrl;
  if (buildTimeApiBaseUrl) return buildTimeApiBaseUrl;
  if (import.meta.env.PROD) {
    const msg =
      'API base URL not configured: set window.__APP_CONFIG__.apiBaseUrl ' +
      '(via the container env API_BASE_URL) or pass VITE_API_BASE_URL at build time.';
    // eslint-disable-next-line no-console
    console.error(`[HOPTranscribe] ${msg}`);
    throw new Error(msg);
  }
  return 'http://localhost:5001';
};

export const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, '');

export const API_ENDPOINTS = {
  auth: {
    claim: '/api/auth/claim',
  },
  sessions: {
    list: '/api/sessions',
    one: (code: string) => `/api/sessions/${encodeURIComponent(code)}`,
    end: (code: string) => `/api/sessions/${encodeURIComponent(code)}/end`,
    transcripts: (code: string) => `/api/sessions/${encodeURIComponent(code)}/transcripts`,
  },
  openai: {
    transcriptionSession: '/api/openai/transcription-session',
  },
  match: '/api/match',
} as const;

export const STORAGE_KEYS = {
  authToken: 'hoptranscribe.v2.token',
  username: 'hoptranscribe.v2.username',
  preferredVersion: 'hoptranscribe.v2.preferredVersion',
  showConfidence: 'hoptranscribe.v2.showConfidence',
  autoScroll: 'hoptranscribe.v2.autoScroll',
  minConfidence: 'hoptranscribe.v2.minConfidence',
  matchCount: 'hoptranscribe.v2.matchCount',
  silenceSeconds: 'hoptranscribe.v2.silenceSeconds',
  splitPct: 'hoptranscribe.v2.splitPct',
} as const;

export const DEFAULTS = {
  preferredVersion: 'NKJV',
  language: 'en',
  matchCount: 3,
  minConfidence: 0.4,
  silenceSeconds: 1,
  bibleVersions: ['Best Match', 'NKJV', 'NIV', 'ESV', 'NLT', 'NASB', 'AMP', 'MSG', 'TPT'],
} as const;

// Bounds for the silence gap that splits one utterance from the next.
export const SILENCE_SECONDS_MIN = 0.5;
export const SILENCE_SECONDS_MAX = 5;
// Bounds for how many scripture references each utterance may surface.
export const MATCH_COUNT_MIN = 1;
export const MATCH_COUNT_MAX = 5;
