import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { connectSessionHub, type SessionHubClient } from '@/services/signalRService';
import type { SessionDto, TranscriptSegmentDto } from '@/types/api';

interface UseSessionHubOptions {
  sessionCode: string;
  enabled: boolean;
  onTranscriptAppended?: (segment: TranscriptSegmentDto) => void;
  onSessionUpdated?: (session: SessionDto) => void;
}

export function useSessionHub({
  sessionCode,
  enabled,
  onTranscriptAppended,
  onSessionUpdated,
}: UseSessionHubOptions) {
  const [state, setState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected,
  );
  const clientRef = useRef<SessionHubClient | null>(null);
  const transcriptCb = useRef(onTranscriptAppended);
  const sessionCb = useRef(onSessionUpdated);

  useEffect(() => {
    transcriptCb.current = onTranscriptAppended;
  }, [onTranscriptAppended]);
  useEffect(() => {
    sessionCb.current = onSessionUpdated;
  }, [onSessionUpdated]);

  useEffect(() => {
    if (!enabled || !sessionCode) return;
    let cancelled = false;

    (async () => {
      try {
        const client = await connectSessionHub({
          onStateChange: (s) => setState(s),
          onTranscriptAppended: (payload) => {
            if (payload.sessionCode === sessionCode) {
              transcriptCb.current?.(payload.segment);
            }
          },
          onSessionUpdated: (payload) => {
            if (payload.sessionCode === sessionCode) {
              sessionCb.current?.(payload.session);
            }
          },
        });
        if (cancelled) {
          await client.stop();
          return;
        }
        clientRef.current = client;
        await client.join(sessionCode);
      } catch (err) {
        console.warn('SignalR connection failed', err);
      }
    })();

    return () => {
      cancelled = true;
      const client = clientRef.current;
      clientRef.current = null;
      if (client) {
        void (async () => {
          await client.leave(sessionCode);
          await client.stop();
        })();
      }
    };
  }, [enabled, sessionCode]);

  return { state };
}
