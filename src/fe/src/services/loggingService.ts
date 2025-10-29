import { API_CONSTANTS } from '../constants/apiConstants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  context?: string;
  stackTrace?: string;
  sessionId?: string;
  userId?: string;
  userAgent?: string;
  pageUrl?: string;
  environment?: string;
  appVersion?: string;
}

export interface BatchLogRequest {
  logs: ClientLogEntry[];
}

export interface LogResponse {
  success: boolean;
  data: any;
  error: string | null;
  message: string;
}

class LoggingService {
  private sessionId: string;
  private logQueue: ClientLogEntry[] = [];
  private flushInterval: number | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000;
  private readonly MAX_QUEUE_SIZE = 100;
  private isEnabled: boolean = true;
  private isLogging: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startAutoFlush();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private enrichLogEntry(
    level: LogLevel,
    message: string,
    source?: string,
    context?: any,
    error?: Error
  ): ClientLogEntry {
    const entry: ClientLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      environment: import.meta.env.MODE,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    };

    if (context) {
      try {
        const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
        entry.context = contextStr.length > 5000 ? contextStr.substring(0, 5000) + '... [truncated]' : contextStr;
      } catch (e) {
        entry.context = '[Unable to stringify context]';
      }
    }

    if (error && error.stack) {
      entry.stackTrace = error.stack.length > 2000 ? error.stack.substring(0, 2000) + '... [truncated]' : error.stack;
    }

    return entry;
  }

  private queueLog(entry: ClientLogEntry): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logQueue.shift();
    }

    this.logQueue.push(entry);

    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private startAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0 || this.isLogging) {
      return;
    }

    this.isLogging = true;
    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      const response = await fetch(
        `${API_CONSTANTS.BACKEND.BASE_URL}${API_CONSTANTS.BACKEND.ENDPOINTS.BATCH_LOG}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true,
        }
      );

      if (!response.ok) {
        console.warn(`Failed to send logs to backend: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Error sending logs to backend:', error);
    } finally {
      this.isLogging = false;
    }
  }

  private async sendImmediate(entry: ClientLogEntry): Promise<void> {
    if (this.isLogging) {
      return;
    }

    this.isLogging = true;
    try {
      const response = await fetch(
        `${API_CONSTANTS.BACKEND.BASE_URL}${API_CONSTANTS.BACKEND.ENDPOINTS.LOG}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
          keepalive: true,
        }
      );

      if (!response.ok) {
        console.warn(`Failed to send log to backend: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Error sending log to backend:', error);
    } finally {
      this.isLogging = false;
    }
  }

  public debug(message: string, source?: string, context?: any): void {
    const entry = this.enrichLogEntry('debug', message, source, context);
    this.queueLog(entry);
    
    if (import.meta.env.DEV) {
      console.debug(`[${source || 'Client'}] ${message}`, context || '');
    }
  }

  public info(message: string, source?: string, context?: any): void {
    const entry = this.enrichLogEntry('info', message, source, context);
    this.queueLog(entry);
    
    if (import.meta.env.DEV) {
      console.info(`[${source || 'Client'}] ${message}`, context || '');
    }
  }

  public warn(message: string, source?: string, context?: any): void {
    const entry = this.enrichLogEntry('warn', message, source, context);
    this.queueLog(entry);
    
    console.warn(`[${source || 'Client'}] ${message}`, context || '');
  }

  public error(message: string, source?: string, error?: Error, context?: any): void {
    const entry = this.enrichLogEntry('error', message, source, context, error);
    
    this.sendImmediate(entry);
    
    console.error(`[${source || 'Client'}] ${message}`, error || '', context || '');
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public async forceFlush(): Promise<void> {
    await this.flush();
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

export const loggingService = new LoggingService();
