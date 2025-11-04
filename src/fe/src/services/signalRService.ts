import * as signalR from '@microsoft/signalr';
import { loggingService } from './loggingService';
import { Session, TranscriptSegment, ScriptureReference } from '../models/Session';
import { 
  getSignalRHubUrl, 
  SIGNALR_METHODS, 
  SIGNALR_CONFIG, 
  SIGNALR_ERRORS 
} from '../constants/signalRConstants';

type TranscriptCallback = (segment: TranscriptSegment) => void;
type ScriptureCallback = (reference: ScriptureReference) => void;
type SessionUpdateCallback = (session: Partial<Session>) => void;
type UserJoinedCallback = (data: { connectionId: string; timestamp: string }) => void;
type UserLeftCallback = (data: { connectionId: string; timestamp: string }) => void;

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentSessionCode: string | null = null;

  async connect(sessionCode: string): Promise<void> {
    if (this.connection && this.currentSessionCode === sessionCode) {
      loggingService.info('Already connected to session', 'SignalR', { sessionCode });
      return;
    }

    // Disconnect from previous session if any
    if (this.connection) {
      await this.disconnect();
    }

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(getSignalRHubUrl(), {
          withCredentials: SIGNALR_CONFIG.CONNECTION.WITH_CREDENTIALS,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 10s, 30s, then every 30s
            if (retryContext.previousRetryCount === 0) return SIGNALR_CONFIG.RECONNECT.INITIAL_DELAY;
            if (retryContext.previousRetryCount === 1) return SIGNALR_CONFIG.RECONNECT.SECOND_RETRY_DELAY;
            if (retryContext.previousRetryCount === 2) return SIGNALR_CONFIG.RECONNECT.THIRD_RETRY_DELAY;
            return SIGNALR_CONFIG.RECONNECT.MAX_RETRY_DELAY;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up reconnection handlers
      this.connection.onreconnecting((error) => {
        loggingService.warn('SignalR reconnecting', 'SignalR', error);
      });

      this.connection.onreconnected((connectionId) => {
        loggingService.info('SignalR reconnected', 'SignalR', { connectionId, sessionCode });
        // Rejoin the session after reconnection
        this.joinSession(sessionCode);
      });

      this.connection.onclose((error) => {
        loggingService.error('SignalR connection closed', 'SignalR', error as Error);
        this.currentSessionCode = null;
      });

      await this.connection.start();
      loggingService.info('SignalR connected', 'SignalR', { sessionCode });

      await this.joinSession(sessionCode);
      this.currentSessionCode = sessionCode;
    } catch (error) {
      loggingService.error(SIGNALR_ERRORS.CONNECTION_FAILED, 'SignalR', error as Error);
      throw error;
    }
  }

  private async joinSession(sessionCode: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.invoke(SIGNALR_METHODS.JOIN_SESSION, sessionCode);
      loggingService.info('Joined session', 'SignalR', { sessionCode });
    } catch (error) {
      loggingService.error(SIGNALR_ERRORS.JOIN_FAILED, 'SignalR', error as Error);
    }
  }

  onReceiveTranscript(callback: TranscriptCallback): void {
    if (!this.connection) return;
    this.connection.on(SIGNALR_METHODS.RECEIVE_TRANSCRIPT, callback);
  }

  onReceiveScripture(callback: ScriptureCallback): void {
    if (!this.connection) return;
    this.connection.on(SIGNALR_METHODS.RECEIVE_SCRIPTURE, callback);
  }

  onReceiveSessionUpdate(callback: SessionUpdateCallback): void {
    if (!this.connection) return;
    this.connection.on(SIGNALR_METHODS.RECEIVE_SESSION_UPDATE, callback);
  }

  onUserJoined(callback: UserJoinedCallback): void {
    if (!this.connection) return;
    this.connection.on(SIGNALR_METHODS.USER_JOINED, callback);
  }

  onUserLeft(callback: UserLeftCallback): void {
    if (!this.connection) return;
    this.connection.on(SIGNALR_METHODS.USER_LEFT, callback);
  }

  async broadcastTranscript(sessionCode: string, segment: TranscriptSegment): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      loggingService.warn(SIGNALR_ERRORS.NOT_CONNECTED, 'SignalR');
      return;
    }

    try {
      await this.connection.invoke(SIGNALR_METHODS.BROADCAST_TRANSCRIPT, sessionCode, segment);
    } catch (error) {
      loggingService.error(SIGNALR_ERRORS.BROADCAST_FAILED, 'SignalR', error as Error);
    }
  }

  async broadcastScripture(sessionCode: string, reference: ScriptureReference): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      loggingService.warn(SIGNALR_ERRORS.NOT_CONNECTED, 'SignalR');
      return;
    }

    try {
      await this.connection.invoke(SIGNALR_METHODS.BROADCAST_SCRIPTURE, sessionCode, reference);
    } catch (error) {
      loggingService.error(SIGNALR_ERRORS.BROADCAST_FAILED, 'SignalR', error as Error);
    }
  }

  async broadcastSessionUpdate(sessionCode: string, session: Partial<Session>): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      loggingService.warn(SIGNALR_ERRORS.NOT_CONNECTED, 'SignalR');
      return;
    }

    try {
      await this.connection.invoke(SIGNALR_METHODS.BROADCAST_SESSION_UPDATE, sessionCode, session);
    } catch (error) {
      loggingService.error(SIGNALR_ERRORS.BROADCAST_FAILED, 'SignalR', error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      if (this.currentSessionCode) {
        await this.connection.invoke(SIGNALR_METHODS.LEAVE_SESSION, this.currentSessionCode);
      }
      await this.connection.stop();
      loggingService.info('SignalR disconnected', 'SignalR', { sessionCode: this.currentSessionCode });
    } catch (error) {
      loggingService.error('Error disconnecting SignalR', 'SignalR', error as Error);
    } finally {
      this.connection = null;
      this.currentSessionCode = null;
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  getCurrentSession(): string | null {
    return this.currentSessionCode;
  }
}

export const signalRService = new SignalRService();
