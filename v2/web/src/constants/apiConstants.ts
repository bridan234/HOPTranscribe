export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== ''
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:5001'
  ).replace(/\/$/, '');

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
} as const;

export const DEFAULTS = {
  preferredVersion: 'NKJV',
  language: 'en',
  matchCount: 3,
  minConfidence: 0.4,
  bibleVersions: ['NKJV', 'NIV', 'ESV', 'KJV', 'NLT', 'NASB', 'AMP', 'MSG'],
} as const;
