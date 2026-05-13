/**
 * WebSocket service for OpenAI Realtime API
 */

import { API_CONSTANTS } from '../constants/apiConstants';
import { OPENAI_CLIENT_EVENTS } from '../constants/openaiConstants';
import { loggingService } from './loggingService';

export interface WebSocketConnectionOptions {
  ephemeralKey: string;
  onMessage: (event: any) => void;
  onOpen: () => void;
  onClose: () => void;
  onError: (error: Event) => void;
}

export const websocketService = {
  createConnection(options: WebSocketConnectionOptions): WebSocket {
    const { ephemeralKey, onMessage, onOpen, onClose, onError } = options;

    const url = `${API_CONSTANTS.OPENAI.WEBSOCKET_URL}?model=${API_CONSTANTS.OPENAI.MODEL}`;
    
    const ws = new WebSocket(url, [
      API_CONSTANTS.OPENAI.WEBSOCKET_PROTOCOLS.REALTIME,
      `${API_CONSTANTS.OPENAI.WEBSOCKET_PROTOCOLS.API_KEY_PREFIX}${ephemeralKey}`
    ]);

    ws.addEventListener('open', onOpen);

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        loggingService.error('Failed to parse message', 'WebSocket', err as Error);
      }
    });

    ws.addEventListener('close', onClose);
    ws.addEventListener('error', (event) => {
      loggingService.error('WebSocket error', 'WebSocket', undefined, event);
      onError(event);
    });

    return ws;
  },

  sendEvent(ws: WebSocket, event: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      loggingService.warn('Cannot send event, connection not open', 'WebSocket');
    }
  },

  sendAudio(ws: WebSocket, audioData: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: OPENAI_CLIENT_EVENTS.INPUT_AUDIO_BUFFER_APPEND,
        audio: audioData
      }));
    }
  },

  closeConnection(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
};
