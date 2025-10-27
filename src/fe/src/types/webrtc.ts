/**
 * WebRTC connection state and types
 */

import { OPENAI_EVENT_TYPES, CONNECTION_STATES } from '../constants/openaiConstants';

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

export interface WebRTCState {
  connection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  connectionState: ConnectionState;
  error: string | null;
  isConnecting: boolean;
}

/**
 * OpenAI Realtime API event types
 */
export interface OpenAIRealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

export interface TranscriptionEvent extends OpenAIRealtimeEvent {
  type: typeof OPENAI_EVENT_TYPES.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED;
  transcript: string;
  item_id: string;
}

export interface FunctionCallEvent extends OpenAIRealtimeEvent {
  type: typeof OPENAI_EVENT_TYPES.RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE;
  call_id: string;
  name: string;
  arguments: string; // JSON string
}

export interface SessionCreatedEvent extends OpenAIRealtimeEvent {
  type: typeof OPENAI_EVENT_TYPES.SESSION_CREATED;
  session: {
    id: string;
    model: string;
  };
}

export interface ErrorEvent extends OpenAIRealtimeEvent {
  type: typeof OPENAI_EVENT_TYPES.ERROR;
  error: {
    type: string;
    message: string;
  };
}
