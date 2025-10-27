/**
 * WebSocket service for OpenAI Realtime API connection
 * Handles WebSocket connection and audio streaming
 */

import { API_CONSTANTS } from '../constants/apiConstants';
import { OPENAI_CLIENT_EVENTS } from '../constants/openaiConstants';

export interface WebSocketConnectionOptions {
  ephemeralKey: string;
  onMessage: (event: any) => void;
  onOpen: () => void;
  onClose: () => void;
  onError: (error: Event) => void;
}

export const websocketService = {
  /**
   * Create and configure WebSocket connection for OpenAI Realtime API
   */
  createConnection(options: WebSocketConnectionOptions): WebSocket {
    const { ephemeralKey, onMessage, onOpen, onClose, onError } = options;

    // OpenAI Realtime API WebSocket endpoint (GA version)
    const url = `${API_CONSTANTS.OPENAI.WEBSOCKET_URL}?model=${API_CONSTANTS.OPENAI.MODEL}`;
    
    const ws = new WebSocket(url, [
      API_CONSTANTS.OPENAI.WEBSOCKET_PROTOCOLS.REALTIME,
      `${API_CONSTANTS.OPENAI.WEBSOCKET_PROTOCOLS.API_KEY_PREFIX}${ephemeralKey}`
    ]);

    ws.addEventListener('open', () => {
      console.log('[WebSocket] Connection opened');
      onOpen();
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    });

    ws.addEventListener('close', (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      onClose();
    });

    ws.addEventListener('error', (event) => {
      console.error('[WebSocket] Error:', event);
      onError(event);
    });

    return ws;
  },

  /**
   * Send a JSON event to the server
   */
  sendEvent(ws: WebSocket, event: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      console.warn('[WebSocket] Cannot send event, connection not open');
    }
  },

  /**
   * Send audio data as base64
   */
  sendAudio(ws: WebSocket, audioData: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: OPENAI_CLIENT_EVENTS.INPUT_AUDIO_BUFFER_APPEND,
        audio: audioData
      }));
    }
  },

  /**
   * Close WebSocket connection
   */
  closeConnection(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
};
