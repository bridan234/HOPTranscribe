import { useCallback, useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '@/constants/apiConstants';
import { apiClient } from '@/services/apiClient';
import { connectRealtime, type RealtimeConnection } from '@/services/webrtcService';
import type { TranscriptionSessionResponse } from '@/types/api';
import type {
  RealtimeConnectionState,
  RealtimeDelta,
  RealtimeUtterance,
} from '@/types/realtime';

interface UseRealtimeWebRTCOptions {
  onUtterance?: (utterance: RealtimeUtterance) => void;
  onDelta?: (delta: RealtimeDelta) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeWebRTC(opts: UseRealtimeWebRTCOptions = {}) {
  const { onUtterance, onDelta, onError } = opts;

  const [state, setState] = useState<RealtimeConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const startedAtRef = useRef<string>('');

  const handleMessage = useCallback(
    (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const data = event as { type?: string; transcript?: string; delta?: string; item_id?: string; error?: { message?: string } };

      switch (data.type) {
        case 'session.created':
        case 'transcription_session.created':
        case 'transcription_session.updated':
          setState('recording');
          startedAtRef.current = new Date().toISOString();
          break;
        case 'conversation.item.input_audio_transcription.delta':
          if (data.delta) {
            onDelta?.({ id: data.item_id ?? 'partial', text: data.delta });
          }
          break;
        case 'conversation.item.input_audio_transcription.completed':
          if (data.transcript) {
            const endedAt = new Date().toISOString();
            onUtterance?.({
              id: data.item_id ?? crypto.randomUUID(),
              text: data.transcript,
              startedAt: startedAtRef.current || endedAt,
              endedAt,
            });
            startedAtRef.current = endedAt;
          }
          break;
        case 'error': {
          const msg = data.error?.message ?? 'Unknown realtime error';
          setError(msg);
          setState('error');
          onError?.(new Error(msg));
          break;
        }
        default:
          break;
      }
    },
    [onDelta, onUtterance, onError],
  );

  const start = useCallback(
    async (sessionCode: string, deviceId?: string) => {
      if (connectionRef.current) {
        return;
      }
      setState('connecting');
      setError(null);
      try {
        const session = await apiClient.post<TranscriptionSessionResponse>(
          API_ENDPOINTS.openai.transcriptionSession,
          { sessionCode },
        );

        const conn = await connectRealtime({
          session,
          deviceId,
          onOpen: () => setState('connected'),
          onClose: () => {
            connectionRef.current = null;
            setState('idle');
          },
          onError: (err) => {
            setError(err.message);
            setState('error');
            onError?.(err);
          },
          onMessage: handleMessage,
        });
        connectionRef.current = conn;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setState('error');
        onError?.(err instanceof Error ? err : new Error(message));
      }
    },
    [handleMessage, onError],
  );

  const stop = useCallback(async () => {
    if (!connectionRef.current) return;
    setState('closing');
    try {
      await connectionRef.current.close();
    } catch {
      /* ignore */
    }
    connectionRef.current = null;
    setState('idle');
  }, []);

  useEffect(() => () => void stop(), [stop]);

  return { state, error, start, stop };
}
