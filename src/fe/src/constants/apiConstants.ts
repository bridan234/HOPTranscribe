/**
 * API constants for OpenAI Realtime API and backend endpoints
 */

export const API_CONSTANTS = {
  // Backend API
  BACKEND: {
    BASE_URL: '__VITE_API_BASE_URL__'.startsWith('__VITE') 
      ? 'http://localhost:5138'
      : '__VITE_API_BASE_URL__',
    ENDPOINTS: {
      SESSION: '/api/openai/session',
    },
  },

  // OpenAI Realtime API
  OPENAI: {
    WEBSOCKET_URL: 'wss://api.openai.com/v1/realtime',
    REALTIME_URL: 'https://api.openai.com/v1/realtime/calls',
    MODEL: 'gpt-4o-realtime-preview',
    DATA_CHANNEL_NAME: 'oai-events',
    WEBSOCKET_PROTOCOLS: {
      REALTIME: 'realtime',
      API_KEY_PREFIX: 'openai-insecure-api-key.',
    },
  },

  // Audio Configuration
  AUDIO: {
    SAMPLE_RATE: 24000,
    BUFFER_SIZE: 4096,
    CHANNELS: 1,
  },
} as const;
