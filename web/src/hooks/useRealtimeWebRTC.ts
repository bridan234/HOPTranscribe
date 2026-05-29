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
  onReconnect?: (attempt: number) => void;
  maxRetries?: number;
  /** Trailing silence (ms) before an utterance is committed. */
  silenceMs?: number;
}

const RETRY_DELAYS_MS = [1000, 3000, 9000];

export function useRealtimeWebRTC(opts: UseRealtimeWebRTCOptions = {}) {
  const { onUtterance, onDelta, onError, onReconnect, maxRetries = RETRY_DELAYS_MS.length, silenceMs } = opts;

  const silenceMsRef = useRef(silenceMs);
  silenceMsRef.current = silenceMs;

  const [state, setState] = useState<RealtimeConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const startedAtRef = useRef<string>('');
  const partialItemRef = useRef<string | null>(null);
  const partialTextRef = useRef<string>('');
  const sessionCodeRef = useRef<string>('');
  const deviceIdRef = useRef<string | undefined>(undefined);
  const userStoppedRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<number | null>(null);

  const handleMessage = useCallback(
    (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const data = event as {
        type?: string;
        transcript?: string;
        delta?: string;
        item_id?: string;
        error?: { message?: string; code?: string };
      };

      switch (data.type) {
        case 'session.created':
        case 'transcription_session.created':
        case 'transcription_session.updated':
          setState('recording');
          startedAtRef.current = new Date().toISOString();
          retryCountRef.current = 0;
          break;
        case 'conversation.item.input_audio_transcription.delta':
          if (data.delta) {
            // Deltas are incremental tokens, not the full transcript. Accumulate
            // them per item so the live partial shows the whole sentence so far.
            const itemId = data.item_id ?? 'partial';
            if (partialItemRef.current !== itemId) {
              partialItemRef.current = itemId;
              partialTextRef.current = '';
            }
            partialTextRef.current += data.delta;
            onDelta?.({ id: itemId, text: partialTextRef.current });
          }
          break;
        case 'conversation.item.input_audio_transcription.completed':
          partialItemRef.current = null;
          partialTextRef.current = '';
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
          // Committing a near-silent buffer is expected with client-side VAD;
          // ignore it instead of surfacing a spurious error to the user.
          if (data.error?.code === 'input_audio_buffer_commit_empty') break;
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

  const attemptConnect = useCallback(async () => {
    const sessionCode = sessionCodeRef.current;
    if (!sessionCode || connectionRef.current) return;

    setState('connecting');
    setError(null);
    try {
      const session = await apiClient.post<TranscriptionSessionResponse>(
        API_ENDPOINTS.openai.transcriptionSession,
        { sessionCode },
      );

      const conn = await connectRealtime({
        session,
        deviceId: deviceIdRef.current,
        silenceMs: silenceMsRef.current,
        onOpen: () => setState('connected'),
        onClose: () => {
          connectionRef.current = null;
          if (userStoppedRef.current) {
            setState('idle');
          } else {
            // Connection died unexpectedly — try to come back
            scheduleRetry('connection closed');
          }
        },
        onError: (err) => {
          setError(err.message);
          setState('error');
          onError?.(err);
          if (!userStoppedRef.current) {
            scheduleRetry(err.message);
          }
        },
        onMessage: handleMessage,
      });
      connectionRef.current = conn;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(message));
      if (!userStoppedRef.current) {
        scheduleRetry(message);
      }
    }
    // scheduleRetry is hoisted below in the closure
    function scheduleRetry(reason: string) {
      if (retryCountRef.current >= maxRetries) {
        console.warn(`Realtime retries exhausted (${reason})`);
        return;
      }
      const attempt = retryCountRef.current + 1;
      const delay = RETRY_DELAYS_MS[Math.min(retryCountRef.current, RETRY_DELAYS_MS.length - 1)];
      retryCountRef.current = attempt;
      onReconnect?.(attempt);
      console.info(`Realtime reconnect attempt ${attempt}/${maxRetries} in ${delay}ms (${reason})`);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void attemptConnect();
      }, delay);
    }
  }, [handleMessage, maxRetries, onError, onReconnect]);

  const start = useCallback(
    async (sessionCode: string, deviceId?: string) => {
      if (connectionRef.current) return;
      sessionCodeRef.current = sessionCode;
      deviceIdRef.current = deviceId;
      userStoppedRef.current = false;
      retryCountRef.current = 0;
      await attemptConnect();
    },
    [attemptConnect],
  );

  const stop = useCallback(async () => {
    userStoppedRef.current = true;
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!connectionRef.current) {
      setState('idle');
      return;
    }
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
