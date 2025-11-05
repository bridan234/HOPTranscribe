/**
 * Session Constants
 * Configuration and constants for session management
 */

/**
 * Session Status Values
 * Must match backend SessionStatus enum (case-sensitive)
 */
export const SESSION_STATUS = {
  NEW: 'New',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ENDED: 'Ended',
  ERROR: 'Error',
} as const;

/**
 * Session UI Messages
 */
export const SESSION_MESSAGES = {
  RECORDING_STARTED: 'Recording started',
  RECORDING_PAUSED: 'Recording paused',
  RECORDING_RESUMED: 'Recording resumed',
  SESSION_ENDED: 'Session ended successfully',
  SESSION_ID_COPIED: 'Session ID copied to clipboard',
  COPY_FAILED: 'Failed to copy to clipboard',
  PARTICIPANT_JOINED: 'A participant joined the session',
  PARTICIPANT_LEFT: 'A participant left the session',
  CONNECT_FAILED: 'Failed to connect',
  RESUME_FAILED: 'Failed to resume recording',
  START_FAILED: 'Failed to start recording',
  MEDIA_ERROR: 'Media error',
  CONNECTION_ERROR: 'Connection error',
} as const;

/**
 * Connection Status Display
 */
export const CONNECTION_STATUS_DISPLAY = {
  CONNECTED: {
    LABEL: 'Connected',
    COLOR: 'text-green-600',
  },
  CONNECTING: {
    LABEL: 'Connecting',
    COLOR: 'text-yellow-600',
  },
  FAILED: {
    LABEL: 'Failed',
    COLOR: 'text-red-600',
  },
  DISCONNECTED: {
    LABEL: 'Disconnected',
    COLOR: 'text-orange-600',
  },
  NOT_CONNECTED: {
    LABEL: 'Not Connected',
    COLOR: 'text-gray-500',
  },
} as const;
