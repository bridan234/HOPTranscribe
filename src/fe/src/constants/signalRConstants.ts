/**
 * SignalR Constants
 * Configuration and constants for real-time collaboration via SignalR
 */

export const SIGNALR_CONFIG = {
  // Hub URL
  HUB_URL: 'http://localhost:5138/sessionHub',
  
  PRODUCTION_HUB_URL: '__VITE_SIGNALR_HUB_URL__'.startsWith('__VITE')
    ? ('__VITE_API_BASE_URL__'.startsWith('__VITE') 
        ? 'http://localhost:5138/sessionHub'
        : '__VITE_API_BASE_URL__/sessionHub')
    : '__VITE_SIGNALR_HUB_URL__',
  
  // Connection configuration
  CONNECTION: {
    WITH_CREDENTIALS: false,
    LOG_LEVEL: 'Information' as const,
  },
  
  // Reconnection strategy
  RECONNECT: {
    INITIAL_DELAY: 0,
    SECOND_RETRY_DELAY: 2000,
    THIRD_RETRY_DELAY: 10000,
    MAX_RETRY_DELAY: 30000,
  },
} as const;

/**
 * SignalR Hub Method Names
 * Server methods that can be invoked from the client
 */
export const SIGNALR_METHODS = {
  // Client -> Server methods
  JOIN_SESSION: 'JoinSession',
  LEAVE_SESSION: 'LeaveSession',
  BROADCAST_TRANSCRIPT: 'BroadcastTranscript',
  BROADCAST_SCRIPTURE: 'BroadcastScripture',
  BROADCAST_SESSION_UPDATE: 'BroadcastSessionUpdate',
  
  // Server -> Client events
  RECEIVE_TRANSCRIPT: 'ReceiveTranscript',
  RECEIVE_SCRIPTURE: 'ReceiveScripture',
  RECEIVE_SESSION_UPDATE: 'ReceiveSessionUpdate',
  USER_JOINED: 'UserJoined',
  USER_LEFT: 'UserLeft',
} as const;

/**
 * SignalR Connection States
 */
export const SIGNALR_STATES = {
  DISCONNECTED: 'Disconnected',
  CONNECTING: 'Connecting',
  CONNECTED: 'Connected',
  DISCONNECTING: 'Disconnecting',
  RECONNECTING: 'Reconnecting',
  ACTIVE: 'active',
} as const;

/**
 * SignalR Error Messages
 */
export const SIGNALR_ERRORS = {
  CONNECTION_FAILED: 'Failed to connect to SignalR hub',
  JOIN_FAILED: 'Failed to join session',
  BROADCAST_FAILED: 'Failed to broadcast update',
  NOT_CONNECTED: 'Cannot perform action - not connected to hub',
} as const;

/**
 * Get the appropriate hub URL based on environment
 */
export function getSignalRHubUrl(): string {
  return import.meta.env.PROD 
    ? SIGNALR_CONFIG.PRODUCTION_HUB_URL 
    : SIGNALR_CONFIG.HUB_URL;
}
