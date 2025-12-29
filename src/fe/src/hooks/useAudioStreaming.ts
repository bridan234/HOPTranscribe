import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { loggingService as logger } from '../services/loggingService';
import type { ConnectionState } from '../types/webrtc';
import { CONNECTION_STATES } from '../constants/openaiConstants';
import { API_CONSTANTS } from '../constants/apiConstants';

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: string;
  confidence: number;
}

interface ScriptureReference {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: string;
  text: string;
  confidence: number;
  transcriptSegmentId: string;
}

interface TranscriptEvent {
  segment: TranscriptSegment;
  isFinal: boolean;
  start: number;
  duration: number;
  words: string[];
}

interface UseAudioStreamingProps {
  stream: MediaStream | null;
  sessionCode: string;
  autoConnect?: boolean;
  preferredBibleVersion: string;
}

interface UseAudioStreamingReturn {
  connectionState: ConnectionState;
  error: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  lastTranscript: TranscriptEvent | null;
  lastScripture: ScriptureReference | null;
}

export function useAudioStreaming({
  stream,
  sessionCode,
  autoConnect = false,
  preferredBibleVersion,
}: UseAudioStreamingProps): UseAudioStreamingReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>(CONNECTION_STATES.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<TranscriptEvent | null>(null);
  const [lastScripture, setLastScripture] = useState<ScriptureReference | null>(null);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outgoingFrameBufferRef = useRef<Int16Array[]>([]);
  const lastAppendTimeRef = useRef<number>(0);
  const isDisconnectingRef = useRef<boolean>(false);

  const TARGET_FRAME_DURATION_MS = 40;
  const TARGET_SAMPLES = (API_CONSTANTS.AUDIO.SAMPLE_RATE * TARGET_FRAME_DURATION_MS) / 1000;

  const startAudioCapture = useCallback(async () => {
    if (!stream || !hubConnectionRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: API_CONSTANTS.AUDIO.SAMPLE_RATE });

      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
      logger.info?.('AudioWorklet: module loaded for streaming', 'Audio');

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-capture-processor');

      workletNode.port.onmessage = async (event) => {
        const int16Array: Int16Array = event.data;
        outgoingFrameBufferRef.current.push(int16Array);

        const bufferedSamples = outgoingFrameBufferRef.current.reduce((acc, arr) => acc + arr.length, 0);
        const now = Date.now();

        const shouldFlush = bufferedSamples >= TARGET_SAMPLES ||
          (lastAppendTimeRef.current && now - lastAppendTimeRef.current > 100);

        if (isDisconnectingRef.current) return;

        if (shouldFlush && hubConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
          const merged = new Int16Array(bufferedSamples);
          let offset = 0;
          outgoingFrameBufferRef.current.forEach(chunk => {
            merged.set(chunk, offset);
            offset += chunk.length;
          });
          outgoingFrameBufferRef.current = [];

          try {
            // Convert Int16Array to byte array for transport
            const bytes = new Uint8Array(merged.buffer);
            
            // Convert to Base64 manually to avoid stack overflow with spread operator
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = window.btoa(binary);

            if (!isDisconnectingRef.current && hubConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
              await hubConnectionRef.current.invoke('SendAudio', base64);
              lastAppendTimeRef.current = now;
            }
          } catch (err) {
            // Only log error if we're not in the process of disconnecting
            if (!isDisconnectingRef.current) {
              logger.error('Failed to send audio chunk', 'Audio', err as Error);
            }
          }
        }
      };

      source.connect(workletNode);
      logger.info?.('AudioWorklet: capture pipeline started for SignalR streaming', 'Audio');

    } catch (err) {
      logger.error('Failed to start audio capture', 'Audio', err as Error);
      throw err;
    }
  }, [stream]);

  const connect = useCallback(async () => {
    if (!stream || !sessionCode) {
      setError('No audio stream or session code available');
      return;
    }

    if (isConnecting || connectionState === CONNECTION_STATES.CONNECTED) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setConnectionState(CONNECTION_STATES.CONNECTING);

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiUrl}/audioHub`)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Handle transcript events
      connection.on('ReceiveTranscript', (data: TranscriptEvent) => {
        logger.debug?.(`Received transcript: ${data.segment.text.substring(0, 50)}...`, 'SignalR');
        setLastTranscript(data);
      });

      // Handle scripture reference events
      connection.on('ReceiveScripture', (data: ScriptureReference) => {
        logger.info?.(`Received scripture: ${data.book} ${data.chapter}:${data.verse}`, 'SignalR');
        setLastScripture(data);
      });

      // Handle stream events
      connection.on('StreamStarted', (data: { sessionCode: string; timestamp: string }) => {
        logger.info?.(`Stream started for session ${data.sessionCode}`, 'SignalR');
      });

      connection.on('StreamStopped', (data: { sessionCode: string; timestamp: string }) => {
        logger.info?.(`Stream stopped for session ${data.sessionCode}`, 'SignalR');
      });

      connection.on('StreamError', (error: string) => {
        logger.error(`Stream error: ${error}`, 'SignalR');
        setError(error);
      });

      // Handle connection state changes
      connection.onreconnecting((error) => {
        logger.warn?.('SignalR reconnecting...', 'SignalR');
        setConnectionState(CONNECTION_STATES.CONNECTING);
        if (error) {
          setError(error.message);
        }
      });

      connection.onreconnected((connectionId) => {
        logger.info?.(`SignalR reconnected with ID: ${connectionId}`, 'SignalR');
        setConnectionState(CONNECTION_STATES.CONNECTED);
        setError(null);
      });

      connection.onclose((error) => {
        logger.info?.('SignalR connection closed', 'SignalR');
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        if (error) {
          setError(error.message);
        }
      });

      // Start the connection
      await connection.start();
      hubConnectionRef.current = connection;

      logger.info?.('SignalR connected to AudioHub', 'SignalR');

      // Start streaming with the session code
      await connection.invoke('StartStreaming', sessionCode, preferredBibleVersion);

      // Start audio capture
      await startAudioCapture();

      setConnectionState(CONNECTION_STATES.CONNECTED);
      setIsConnecting(false);

    } catch (err) {
      logger.error('Failed to connect to AudioHub', 'SignalR', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionState(CONNECTION_STATES.FAILED);
      setIsConnecting(false);
    }
  }, [stream, sessionCode, preferredBibleVersion, isConnecting, connectionState, startAudioCapture]);

  const disconnect = useCallback(async () => {
    isDisconnectingRef.current = true;

    // Close audio context first to stop capturing new audio
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (err) {
        // Ignore errors closing audio context
      }
      audioContextRef.current = null;
    }

    if (hubConnectionRef.current) {
      try {
        if (hubConnectionRef.current.state === signalR.HubConnectionState.Connected) {
          await hubConnectionRef.current.invoke('StopStreaming');
        }
        await hubConnectionRef.current.stop();
      } catch (err) {
        // Ignore errors during disconnect as we expect connection might be closed
        if (!isDisconnectingRef.current) {
          logger.error('Error stopping SignalR connection', 'SignalR', err as Error);
        }
      }
      hubConnectionRef.current = null;
    }

    outgoingFrameBufferRef.current = [];
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    setError(null);
    setIsConnecting(false);
    
    // Reset flag after a short delay to ensure all pending operations have cleared
    setTimeout(() => {
      isDisconnectingRef.current = false;
    }, 1000);
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && stream && sessionCode && connectionState === CONNECTION_STATES.DISCONNECTED && !isConnecting) {
      connect();
    }
  }, [autoConnect, stream, sessionCode, connectionState, isConnecting, connect]);

  // Disconnect when stream is lost
  useEffect(() => {
    if (!stream && connectionState === CONNECTION_STATES.CONNECTED) {
      disconnect();
    }
  }, [stream, connectionState, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    error,
    isConnecting,
    connect,
    disconnect,
    lastTranscript,
    lastScripture,
  };
}
