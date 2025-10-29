import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';
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

  const sanitizeJsonWithLLM = async (malformedJson: string): Promise<string | null> => {
    try {
      const result = await apiService.sanitizeJson({
        malformedJson,
        context: API_CONSTANTS.JSON_SANITIZER.CONTEXT,
      });

      if (result.success && result.data?.sanitizedJson) {
        return result.data.sanitizedJson;
      }
      
      console.error('[JSON Sanitizer] API call failed:', result.error);
      return null;
    } catch (error) {
      console.error('[JSON Sanitizer] Error calling sanitization API:', error);
      return null;
    }
  };

  const handleMessage = useCallback((event: any) => {
    switch (event.type) {
      case OPENAI_EVENT_TYPES.SESSION_CREATED:
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const sessionUpdate = {
            type: OPENAI_CLIENT_EVENTS.SESSION_UPDATE,
            session: {
              type: SESSION_CONFIG.TYPE,
              instructions: getSessionInstructions(preferredBibleVersion, primaryLanguage),
              tools: getOpenAITools(maxReferences),
              tool_choice: SESSION_CONFIG.TOOL_CHOICE_AUTO,
            },
          };
          websocketService.sendEvent(websocketRef.current, sessionUpdate);
        }
        break;

      case OPENAI_EVENT_TYPES.SESSION_UPDATED:
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
      case OPENAI_EVENT_TYPES.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_OUTPUT_ITEM_DONE:
        if (event.item?.type === CONTENT_TYPES.MESSAGE && event.item?.content) {
          const textContent = Array.isArray(event.item.content) 
            ? event.item.content.find((c: any) => c.type === CONTENT_TYPES.OUTPUT_TEXT)
            : event.item.content.type === CONTENT_TYPES.OUTPUT_TEXT ? event.item.content : null;
          
          if (textContent?.text) {
            // Process asynchronously to not block recording
            (async () => {
              try {
                let jsonText = textContent.text;
                let args;
                
                // First attempt: Parse as-is
                try {
                  args = JSON.parse(jsonText);
                } catch (parseError) {
                  const sanitizedJson = await sanitizeJsonWithLLM(jsonText);
                  
                  if (sanitizedJson) {
                    try {
                      args = JSON.parse(sanitizedJson);
                    } catch (sanitizeParseError) {
                      console.error('[Scripture] Failed to parse even after sanitization:', sanitizeParseError);
                      return;
                    }
                  } else {
                    return;
                  }
                }
                
                if (args.transcript && args.matches) {
                  const transcript = args.transcript;
                  const matches = Array.isArray(args.matches) ? args.matches : [];
                  
                  const validMatches = matches.filter((match: any) => {
                    const hasReference = typeof match.reference === 'string' && match.reference.trim().length > 0;
                    const hasConfidence = typeof match.confidence === 'number' && match.confidence >= minConfidence;
                    return hasReference && hasConfidence;
                  });
                  
                  if (validMatches.length > 0) {
                    const rankedMatches = validMatches.slice(0, maxReferences).map((match: any) => ({
                      reference: match.reference,
                      quote: typeof match.quote === 'string' ? match.quote : '',
                      version: typeof match.version === 'string' ? match.version : preferredBibleVersion,
                      confidence: match.confidence,
                    }));
                    
                    setLastResult({
                      transcript: transcript,
                      matches: rankedMatches,
                    } as any);
                  }
                }
              } catch (err) {
                console.error('[Scripture] Failed to process function arguments:', err);
              }
            })();
          }
        }
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
            console.error('[Audio] Failed to decode audio delta:', err);
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
            let jsonToParse = trimmedArgs;
            
            try {
              args = JSON.parse(jsonToParse);
            } catch (parseError) {
              const sanitizedJson = await sanitizeJsonWithLLM(trimmedArgs);
              
              if (sanitizedJson) {
                try {
                  args = JSON.parse(sanitizedJson);
                } catch (sanitizeParseError) {
                  console.error('[Scripture] Failed to parse even after sanitization:', sanitizeParseError);
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
            
            setLastResult({
              transcript: transcript || lastTranscriptRef.current,
              matches: rankedMatches,
            } as any);
          } catch (err) {
            console.error('[Scripture] Failed to process function arguments:', err);
          }
        })();
        break;

      case OPENAI_EVENT_TYPES.ERROR:
        setError(`OpenAI error: ${JSON.stringify(event)}`);
        console.error('❌ [Error]:', event);
        break;
    }
  }, [preferredBibleVersion, primaryLanguage, maxReferences, minConfidence, sanitizeJsonWithLLM]);

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
        
        // Convert Int16 to Float32
        for (let i = 0; i < chunk.length; i++) {
          channelData[i] = chunk[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();

        // Wait for this chunk to finish
        await new Promise(resolve => {
          source.onended = resolve;
        });
      }
    } catch (err) {
      console.error('[Audio] Playback error:', err);
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  const startAudioStreaming = useCallback(() => {
    if (!stream || !websocketRef.current) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: API_CONSTANTS.AUDIO.SAMPLE_RATE });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // ScriptProcessorNode deprecated but stable for audio capture
      const processor = audioContextRef.current.createScriptProcessor(API_CONSTANTS.AUDIO.BUFFER_SIZE, API_CONSTANTS.AUDIO.CHANNELS, API_CONSTANTS.AUDIO.CHANNELS);
      
      processor.onaudioprocess = (e) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32 to Int16
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const bytes = new Uint8Array(int16Array.buffer);
          const binaryString = String.fromCharCode(...bytes);
          const base64 = btoa(binaryString);

          websocketService.sendAudio(websocketRef.current, base64);
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
    } catch (err) {
      console.error('[Audio] Failed to start streaming:', err);
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
          startAudioStreaming();
        },
        onClose: () => {
          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          setIsConnecting(false);
        },
        onError: () => {
          setError('WebSocket connection error');
          setConnectionState(CONNECTION_STATES.FAILED);
          setIsConnecting(false);
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

  // Auto-connect when stream is available
  useEffect(() => {
    if (autoConnect && stream && connectionState === CONNECTION_STATES.DISCONNECTED && !isConnecting) {
      connect();
    }
  }, [autoConnect, stream, connectionState, isConnecting]);

  // Update session when preferred Bible version changes
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

  // Disconnect when stream is removed
  useEffect(() => {
    if (!stream && connectionState === CONNECTION_STATES.CONNECTED) {
      disconnect();
    }
  }, [stream, connectionState]);

  // Cleanup on unmount
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
