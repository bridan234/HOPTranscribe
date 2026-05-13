/**
 * Audio configuration for OpenAI Realtime API
 */
export interface AudioConfig {
  channelCount: number;
  sampleRate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

/**
 * Media recorder state
 */
export interface MediaRecorderState {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
  isLoading: boolean;
}
