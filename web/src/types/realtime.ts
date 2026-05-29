export type RealtimeConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'recording'
  | 'closing'
  | 'error';

export interface RealtimeUtterance {
  id: string;
  text: string;
  startedAt: string;
  endedAt: string;
}

export interface RealtimeDelta {
  id: string;
  text: string;
}

export interface RealtimeError {
  message: string;
  raw?: unknown;
}
