import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '@/constants/apiConstants';
import { authService } from './authService';
import type { SessionDto, TranscriptSegmentDto } from '@/types/api';

export interface SessionHubEvents {
  onTranscriptAppended?: (payload: { sessionCode: string; segment: TranscriptSegmentDto }) => void;
  onSessionUpdated?: (payload: { sessionCode: string; session: SessionDto }) => void;
  onViewerJoined?: (payload: { username: string }) => void;
  onViewerLeft?: (payload: { username: string }) => void;
  onStateChange?: (state: signalR.HubConnectionState) => void;
}

export interface SessionHubClient {
  connection: signalR.HubConnection;
  join: (sessionCode: string) => Promise<void>;
  leave: (sessionCode: string) => Promise<void>;
  stop: () => Promise<void>;
}

export async function connectSessionHub(events: SessionHubEvents): Promise<SessionHubClient> {
  const hubUrl = `${API_BASE_URL}/sessionHub`;

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => authService.getStoredToken() ?? '',
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  if (events.onTranscriptAppended) {
    connection.on('TranscriptAppended', events.onTranscriptAppended);
  }
  if (events.onSessionUpdated) {
    connection.on('SessionUpdated', events.onSessionUpdated);
  }
  if (events.onViewerJoined) {
    connection.on('ViewerJoined', events.onViewerJoined);
  }
  if (events.onViewerLeft) {
    connection.on('ViewerLeft', events.onViewerLeft);
  }

  connection.onreconnecting(() => events.onStateChange?.(connection.state));
  connection.onreconnected(() => events.onStateChange?.(connection.state));
  connection.onclose(() => events.onStateChange?.(connection.state));

  await connection.start();
  events.onStateChange?.(connection.state);

  const join = async (sessionCode: string) => {
    if (connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('JoinSession', sessionCode);
    }
  };
  const leave = async (sessionCode: string) => {
    if (connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.invoke('LeaveSession', sessionCode);
      } catch {
        /* ignore */
      }
    }
  };
  const stop = async () => {
    try {
      await connection.stop();
    } catch {
      /* ignore */
    }
  };

  return { connection, join, leave, stop };
}
