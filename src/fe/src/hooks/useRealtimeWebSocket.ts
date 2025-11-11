import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';
import { loggingService as logger } from '../services/loggingService';
import { repairJson } from '../utils/jsonRepair';
import type { ConnectionState } from '../types/webrtc';
import { 
  CONNECTION_STATES, 
  OPENAI_EVENT_TYPES, 
  OPENAI_CLIENT_EVENTS,
  getSessionInstructions, 
  getOpenAITools,
  SCRIPTURE_DETECTION,
  SESSION_CONFIG,
  CONTENT_TYPES,
  ITEM_ROLES,
  TURN_DETECTION_DEFAULTS,
} from '../constants/openaiConstants';
import { API_CONSTANTS } from '../constants/apiConstants';

interface UseRealtimeWebSocketProps {
  stream: MediaStream | null;
  autoConnect?: boolean;
  preferredBibleVersion: string;
  primaryLanguage?: string;
  minConfidence?: number;
  maxReferences?: number;
}

interface UseRealtimeWebSocketReturn {
  websocket: WebSocket | null;
  connectionState: ConnectionState;
  error: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: object) => void;
  lastResult: import('../types/sermon').SermonResult | null;
}

export function useRealtimeWebSocket({ 
  stream, 
  autoConnect = false,
  preferredBibleVersion,
  primaryLanguage = 'en',
  minConfidence = SCRIPTURE_DETECTION.MIN_CONFIDENCE,
  maxReferences = SCRIPTURE_DETECTION.MAX_MATCHES
}: UseRealtimeWebSocketProps): UseRealtimeWebSocketReturn {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(CONNECTION_STATES.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastResult, setLastResult] = useState<import('../types/sermon').SermonResult | null>(null);
  
  const funcArgBuffers = useRef<Record<string, string>>({});
  const lastTranscriptRef = useRef<string>("");
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlayerRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const isResponseInProgress = useRef(false);
  const outgoingFrameBufferRef = useRef<Int16Array[]>([]);
  const lastAppendTimeRef = useRef<number>(0);
  const segmentStartTimeRef = useRef<number | null>(null);
  const latestTranscriptLatencyLoggedForRef = useRef<string>('');
  const TARGET_FRAME_DURATION_MS = 40;
  const TARGET_SAMPLES = (API_CONSTANTS.AUDIO.SAMPLE_RATE * TARGET_FRAME_DURATION_MS) / 1000;
  const lastThroughputLogRef = useRef<number>(0);
  const sentSamplesSinceLogRef = useRef<number>(0);

  const handleMessage = useCallback((event: any) => {
    switch (event.type) {
      case OPENAI_EVENT_TYPES.SESSION_CREATED:
        logger.info?.('Realtime: session.created received', 'WebSocket');
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const sessionUpdate = {
            type: OPENAI_CLIENT_EVENTS.SESSION_UPDATE,
            session: {
              type: SESSION_CONFIG.TYPE,
              instructions: getSessionInstructions(preferredBibleVersion, primaryLanguage),
              tools: getOpenAITools(maxReferences),
              tool_choice: SESSION_CONFIG.TOOL_CHOICE_AUTO,
              ...(TURN_DETECTION_DEFAULTS.ENABLED ? {
                audio: {
                  input: {
                    format: { type: 'audio/pcm', rate: API_CONSTANTS.AUDIO.SAMPLE_RATE },
                    turn_detection: {
                      type: 'server_vad',
                      threshold: TURN_DETECTION_DEFAULTS.THRESHOLD,
                      silence_duration_ms: TURN_DETECTION_DEFAULTS.SILENCE_DURATION_MS,
                      prefix_padding_ms: TURN_DETECTION_DEFAULTS.PREFIX_PADDING_MS,
                      create_response: true,
                      interrupt_response: false,
                    }
                  },
                  output: {
                    format: { type: 'audio/pcm', rate: API_CONSTANTS.AUDIO.SAMPLE_RATE }
                  }
                }
              } : {})
            },
          };
          websocketService.sendEvent(websocketRef.current, sessionUpdate);
          logger.info?.('Realtime: session.update sent (initial with VAD)', 'WebSocket');
        }
        break;

      case OPENAI_EVENT_TYPES.SESSION_UPDATED:
        break;

      case OPENAI_EVENT_TYPES.INPUT_AUDIO_BUFFER_SPEECH_STARTED:
        segmentStartTimeRef.current = Date.now();
        break;
      case OPENAI_EVENT_TYPES.INPUT_AUDIO_BUFFER_SPEECH_STOPPED:
        break;
      case OPENAI_EVENT_TYPES.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
        if (typeof event.transcript === 'string' && event.transcript.length > 0) {
          setLastResult({ transcript: event.transcript, matches: [] } as any);
          if (segmentStartTimeRef.current && latestTranscriptLatencyLoggedForRef.current !== event.transcript) {
            const latency = Date.now() - segmentStartTimeRef.current;
            latestTranscriptLatencyLoggedForRef.current = event.transcript;
            logger.info?.(`Latency(ms): initial transcript ${latency}`, 'StreamingLatency');
          }
        }
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_CREATED:
        isResponseInProgress.current = true;
        break;

      case OPENAI_EVENT_TYPES.CONVERSATION_ITEM_CREATED:
        if (event.item?.type === CONTENT_TYPES.MESSAGE && event.item.role === ITEM_ROLES.USER) {
          const content = event.item.content;
          if (Array.isArray(content)) {
            const inputAudio = content.find((c: any) => c.type === CONTENT_TYPES.INPUT_AUDIO);
            if (inputAudio?.transcript) {
              const userTranscript = inputAudio.transcript;
              lastTranscriptRef.current = userTranscript;
              setLastResult({ transcript: userTranscript, matches: [] } as any);
            }
          }
        }
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_TRANSCRIPT_DONE:
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_OUTPUT_ITEM_DONE:
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_DELTA:
        if (event.delta) {
          try {
            const binaryString = atob(event.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const int16Array = new Int16Array(bytes.buffer);
            audioQueueRef.current.push(int16Array);
            
            if (!isPlayingRef.current) {
              playAudioQueue();
            }
          } catch (err) {
            logger.error('Failed to decode audio delta', 'Audio', err as Error);
          }
        }
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_DONE:
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_FUNCTION_CALL_ARGUMENTS_DELTA: {
        const callId = event.call_id;
        const delta = event.delta ?? '';
        if (callId) {
          funcArgBuffers.current[callId] = (funcArgBuffers.current[callId] || '') + String(delta);
        }
        break;
      }

      case OPENAI_EVENT_TYPES.RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE:
        (async () => {
          try {
            const callId = event.call_id;
            const fullArgs = callId ? (funcArgBuffers.current[callId] || event.arguments || '{}') : (event.arguments || '{}');
            if (callId) delete funcArgBuffers.current[callId];

            if (!fullArgs || typeof fullArgs !== 'string') {
              return;
            }

            const trimmedArgs = fullArgs.trim();
            if (!trimmedArgs || trimmedArgs === '' || trimmedArgs === 'undefined') {
              return;
            }

            let args;
            
            try {
              args = JSON.parse(jsonToParse);
            } catch (parseError) {
              const repairedJson = repairJson(trimmedArgs);
              
              if (repairedJson) {
                try {
                  args = JSON.parse(repairedJson);
                } catch (repairParseError) {
                  logger.error('Failed to parse even after repair', 'Scripture', repairParseError as Error);
                  return;
                }
              } else {
                return;
              }
            }

            const transcript = typeof args.transcript === 'string' ? args.transcript : '';
            const matches = Array.isArray(args.matches) ? args.matches : [];
            
            const validMatches = matches.filter((match: any) => {
              const hasReference = match.reference && match.reference.trim().length > 0;
              const hasConfidence = typeof match.confidence === 'number' && match.confidence >= minConfidence;
              return hasReference && hasConfidence;
            });
            
            if (validMatches.length === 0) return;
            
            if (transcript) lastTranscriptRef.current = transcript;
            
            const rankedMatches = validMatches.slice(0, maxReferences).map((match: any) => ({
              reference: match.reference,
              quote: typeof match.quote === 'string' ? match.quote : '',
              version: typeof match.version === 'string' ? match.version : preferredBibleVersion,
              confidence: match.confidence,
            }));
            
            setLastResult({ transcript: transcript || lastTranscriptRef.current, matches: rankedMatches } as any);
            if (segmentStartTimeRef.current) {
              const funcLatency = Date.now() - segmentStartTimeRef.current;
              logger.info?.(`Latency(ms): function call matches ${funcLatency}`, 'StreamingLatency');
              segmentStartTimeRef.current = null;
            }
          } catch (err) {
            logger.error('Failed to process function arguments', 'Scripture', err as Error);
          }
        })();
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_DONE:
        isResponseInProgress.current = false;
        break;

      case OPENAI_EVENT_TYPES.ERROR: {
        isResponseInProgress.current = false;
        const errMsg = event?.error?.message || JSON.stringify(event?.error || {});
        const errCode = event?.error?.code;
        if (errCode === 'conversation_already_has_active_response') {
          isResponseInProgress.current = true;
        }
        logger.error(`Realtime: error event received${errCode ? ` [${errCode}]` : ''} - ${errMsg}`, 'WebSocket', undefined, event);
        break;
      }
    }
  }, [preferredBibleVersion, primaryLanguage, maxReferences, minConfidence]);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    try {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new AudioContext({ sampleRate: API_CONSTANTS.AUDIO.SAMPLE_RATE });
      }

      const ctx = audioPlayerRef.current;
      
      while (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift()!;
        const audioBuffer = ctx.createBuffer(API_CONSTANTS.AUDIO.CHANNELS, chunk.length, API_CONSTANTS.AUDIO.SAMPLE_RATE);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < chunk.length; i++) {
          channelData[i] = chunk[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();

        await new Promise(resolve => {
          source.onended = resolve;
        });
      }
    } catch (err) {
      logger.error('Playback error', 'Audio', err as Error);
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  const startAudioStreaming = useCallback(async () => {
    if (!stream || !websocketRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: API_CONSTANTS.AUDIO.SAMPLE_RATE });
      
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
      logger.info?.('AudioWorklet: module loaded at /audio-processor.js', 'Audio');
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-capture-processor');
      
      workletNode.port.onmessage = (event) => {
        const int16Array: Int16Array = event.data;
        outgoingFrameBufferRef.current.push(int16Array);
        const bufferedSamples = outgoingFrameBufferRef.current.reduce((acc, arr) => acc + arr.length, 0);
        const now = Date.now();
        
        if (segmentStartTimeRef.current === null) {
          segmentStartTimeRef.current = now;
        }
        
        sentSamplesSinceLogRef.current += int16Array.length;
        if (!lastThroughputLogRef.current || now - lastThroughputLogRef.current > 1000) {
          lastThroughputLogRef.current = now;
          sentSamplesSinceLogRef.current = 0;
        }
        
        const shouldFlush = bufferedSamples >= TARGET_SAMPLES || (lastAppendTimeRef.current && now - lastAppendTimeRef.current > 100);
        if (shouldFlush) {
          const merged = new Int16Array(bufferedSamples);
          let offset = 0;
          outgoingFrameBufferRef.current.forEach(chunk => {
            merged.set(chunk, offset);
            offset += chunk.length;
          });
          outgoingFrameBufferRef.current = [];
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            const bytes = new Uint8Array(merged.buffer);
            const binaryString = String.fromCharCode(...bytes);
            const base64 = btoa(binaryString);
            websocketService.sendAudio(websocketRef.current, base64);
            lastAppendTimeRef.current = now;
          }
        }
      };

      source.connect(workletNode);
      logger.info?.('AudioWorklet: capture pipeline started', 'Audio');
      
    } catch (err) {
      logger.error('Failed to start streaming', 'Audio', err as Error);
    }
  }, [stream]);

  const connect = useCallback(async () => {
    if (!stream) {
      setError('No audio stream available');
      return;
    }

    if (isConnecting || connectionState === CONNECTION_STATES.CONNECTED) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setConnectionState(CONNECTION_STATES.CONNECTING);

      const tokenResponse = await apiService.getEphemeralToken();
      
      if (!tokenResponse.success || !tokenResponse.data) {
        throw new Error(tokenResponse.error || 'Failed to get ephemeral token');
      }
      
      const ephemeralKey = tokenResponse.data.ephemeral_key.value;

      const ws = websocketService.createConnection({
        ephemeralKey,
        onMessage: handleMessage,
        onOpen: () => {
          setConnectionState(CONNECTION_STATES.CONNECTED);
          setIsConnecting(false);
          logger.info?.('WebSocket: open', 'WebSocket');
          if (TURN_DETECTION_DEFAULTS.ENABLED) {
            websocketService.sendEvent(ws, {
              type: OPENAI_CLIENT_EVENTS.SESSION_UPDATE,
              session: {
                type: SESSION_CONFIG.TYPE,
                instructions: getSessionInstructions(preferredBibleVersion, primaryLanguage),
                tools: getOpenAITools(maxReferences),
                tool_choice: SESSION_CONFIG.TOOL_CHOICE_AUTO,
                audio: {
                  input: {
                    format: { type: 'audio/pcm', rate: API_CONSTANTS.AUDIO.SAMPLE_RATE },
                    turn_detection: {
                      type: 'server_vad',
                      threshold: TURN_DETECTION_DEFAULTS.THRESHOLD,
                      silence_duration_ms: TURN_DETECTION_DEFAULTS.SILENCE_DURATION_MS,
                      prefix_padding_ms: TURN_DETECTION_DEFAULTS.PREFIX_PADDING_MS,
                      create_response: true,
                      interrupt_response: false,
                    }
                  },
                  output: {
                    format: { type: 'audio/pcm', rate: API_CONSTANTS.AUDIO.SAMPLE_RATE }
                  }
                }
              }
            });
            logger.info?.('Realtime: session.update sent on open (with VAD)', 'WebSocket');
          }
          startAudioStreaming();
        },
        onClose: () => {
          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          setIsConnecting(false);
          logger.warn?.('WebSocket: close', 'WebSocket');
        },
        onError: (e) => {
          setError('WebSocket connection error');
          setConnectionState(CONNECTION_STATES.FAILED);
          setIsConnecting(false);
          logger.error('WebSocket: error', 'WebSocket', undefined, e);
        }
      });

      websocketRef.current = ws;
      setWebsocket(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionState(CONNECTION_STATES.FAILED);
      setIsConnecting(false);
    }
  }, [stream, handleMessage, startAudioStreaming]);

  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketService.closeConnection(websocketRef.current);
      websocketRef.current = null;
      setWebsocket(null);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.close();
      audioPlayerRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    setError(null);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: object) => {
    if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      websocketService.sendEvent(websocketRef.current, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, []);

  useEffect(() => {
    if (autoConnect && stream && connectionState === CONNECTION_STATES.DISCONNECTED && !isConnecting) {
      connect();
    }
  }, [autoConnect, stream, connectionState, isConnecting]);

  useEffect(() => {
    if (connectionState === CONNECTION_STATES.CONNECTED && websocketRef.current) {
      const sessionUpdate = {
        type: OPENAI_CLIENT_EVENTS.SESSION_UPDATE,
        session: {
          type: SESSION_CONFIG.TYPE,
          instructions: getSessionInstructions(preferredBibleVersion),
        },
      };
      websocketService.sendEvent(websocketRef.current, sessionUpdate);
    }
  }, [preferredBibleVersion, connectionState]);

  useEffect(() => {
    if (!stream && connectionState === CONNECTION_STATES.CONNECTED) {
      disconnect();
    }
  }, [stream, connectionState]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    websocket,
    connectionState,
    error,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    lastResult,
  };
}
