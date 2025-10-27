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
  SESSION_CONFIG
} from '../constants/openaiConstants';
import { API_CONSTANTS } from '../constants/apiConstants';

interface UseRealtimeWebSocketProps {
  stream: MediaStream | null;
  autoConnect?: boolean;
  preferredBibleVersion: string;
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

  const handleMessage = useCallback((event: any) => {
    console.log('🔔 [Event received]:', event.type);
    
    // Log full event for debugging responses and conversation items
    if (event.type === OPENAI_EVENT_TYPES.RESPONSE_DONE || 
        event.type === OPENAI_EVENT_TYPES.RESPONSE_OUTPUT_ITEM_ADDED || 
        event.type === OPENAI_EVENT_TYPES.RESPONSE_OUTPUT_ITEM_DONE ||
        event.type === OPENAI_EVENT_TYPES.CONVERSATION_ITEM_CREATED ||
        event.type === OPENAI_EVENT_TYPES.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED) {
      console.log('📦 [Full event]:', JSON.stringify(event, null, 2));
    }
    
    switch (event.type) {
      case OPENAI_EVENT_TYPES.SESSION_CREATED:
        console.log('✅ [OpenAI] Session created successfully');
        // Send session.update with tools after session is created
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          const sessionUpdate = {
            type: OPENAI_CLIENT_EVENTS.SESSION_UPDATE,
            session: {
              type: SESSION_CONFIG.TYPE,
              instructions: getSessionInstructions(preferredBibleVersion),
              tools: getOpenAITools(maxReferences),
              tool_choice: SESSION_CONFIG.TOOL_CHOICE_AUTO,
            },
          };
          websocketService.sendEvent(websocketRef.current, sessionUpdate);
          console.log('📤 [Session update sent with tools]');
        }
        break;

      case OPENAI_EVENT_TYPES.SESSION_UPDATED:
        console.log('✅ [Session] Configuration updated');
        break;

      case OPENAI_EVENT_TYPES.CONVERSATION_ITEM_CREATED:
        // Only process user input, ignore assistant responses
        console.log('📥 [Conversation item]:', event.item?.type, 'role:', event.item?.role);
        if (event.item?.type === 'message' && event.item.role === 'user') {
          // Extract user's spoken content
          const content = event.item.content;
          if (Array.isArray(content)) {
            const inputAudio = content.find((c: any) => c.type === 'input_audio');
            if (inputAudio?.transcript) {
              const userTranscript = inputAudio.transcript;
              lastTranscriptRef.current = userTranscript;
              setLastResult({ transcript: userTranscript, matches: [] } as any);
              console.log('📝 [User said]:', userTranscript);
            }
          }
        } else if (event.item?.role === 'assistant') {
          console.log('🚫 [Ignoring assistant conversation item]');
        }
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
        // IGNORE: These are assistant responses we don't want
        console.log('🚫 [Ignoring assistant response delta]');
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_TRANSCRIPT_DONE:
        // IGNORE: These are assistant responses we don't want
        console.log('🔇 [Ignoring assistant response]:', event.transcript);
        break;

      case OPENAI_EVENT_TYPES.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
        // IGNORE: We'll get the transcript from the function call instead
        console.log('� [Ignoring input transcription - will come from function call]');
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_OUTPUT_ITEM_DONE:
        // Check if this is a message with function-like text content
        if (event.item?.type === 'message' && event.item?.content) {
          const itemStatus = event.item?.status;
          const textContent = Array.isArray(event.item.content) 
            ? event.item.content.find((c: any) => c.type === 'output_text')
            : event.item.content.type === 'output_text' ? event.item.content : null;
          
          if (textContent?.text) {
            let jsonText = textContent.text;
            
            // If incomplete, try to salvage by closing the JSON
            if (itemStatus === 'incomplete') {
              console.warn('⚠️ [Incomplete response - attempting to salvage JSON]');
              console.log('📝 [Original text]:', jsonText);
              
              // Try to close incomplete JSON by adding missing braces
              // Count open/close braces to determine what's missing
              const openBraces = (jsonText.match(/{/g) || []).length;
              const closeBraces = (jsonText.match(/}/g) || []).length;
              const openBrackets = (jsonText.match(/\[/g) || []).length;
              const closeBrackets = (jsonText.match(/\]/g) || []).length;
              
              // Add missing closing characters
              const missingBraces = openBraces - closeBraces;
              const missingBrackets = openBrackets - closeBrackets;
              
              for (let i = 0; i < missingBrackets; i++) jsonText += ']';
              for (let i = 0; i < missingBraces; i++) jsonText += '}';
              
              console.log('🔧 [Salvaged text]:', jsonText);
            }
            
            try {
              // Try to parse as function call JSON
              const data = JSON.parse(jsonText);
              if (data.transcript && data.matches) {
                console.log('📖 [Scripture from text response]:', data);
                
                const transcript = data.transcript;
                const matches = Array.isArray(data.matches) ? data.matches : [];
                
                // Filter out invalid matches (must have reference, confidence >= minConfidence)
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
                  console.log('📖 [Scripture detected]:', rankedMatches.length, 'matches', itemStatus === 'incomplete' ? '(salvaged from incomplete)' : '');
                  break;
                }
              }
            } catch (e) {
              // Not JSON or not our function format, log and ignore
              if (itemStatus === 'incomplete') {
                console.error('❌ [Failed to salvage incomplete JSON]:', e);
                console.log('📝 [Failed text]:', jsonText);
              }
            }
          }
          console.log('🚫 [Ignoring assistant message]');
        }
        // Function calls are handled in response.function_call_arguments.done
        break;

      case OPENAI_EVENT_TYPES.RESPONSE_AUDIO_DELTA:
        // Decode base64 audio and queue for playback
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
        console.log('🔊 [Audio] Response audio complete');
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
        try {
          const callId = event.call_id;
          const fullArgs = callId ? (funcArgBuffers.current[callId] || event.arguments || '{}') : (event.arguments || '{}');
          if (callId) delete funcArgBuffers.current[callId];

          const args = JSON.parse(fullArgs);
          const transcript = typeof args.transcript === 'string' ? args.transcript : '';
          const matches = Array.isArray(args.matches) ? args.matches : [];
          
          // Filter out invalid matches (must have reference, confidence >= minConfidence)
          const validMatches = matches.filter((match: any) => {
            const hasReference = match.reference && match.reference.trim().length > 0;
            const hasConfidence = typeof match.confidence === 'number' && match.confidence >= minConfidence;
            return hasReference && hasConfidence;
          });
          
          // If no valid matches, ignore this function call
          if (validMatches.length === 0) {
            console.log('⚠️ [Scripture ignored]: No valid matches (empty references or 0 confidence)');
            break;
          }
          
          // Store the transcript separately so it appears in the UI
          if (transcript) {
            lastTranscriptRef.current = transcript;
          }
          
          // Process matches - take up to maxReferences, already ranked by LLM
          const rankedMatches = validMatches.slice(0, maxReferences).map((match: any) => ({
            reference: match.reference,
            quote: typeof match.quote === 'string' ? match.quote : '',
            version: typeof match.version === 'string' ? match.version : preferredBibleVersion,
            confidence: match.confidence,
          }));
          
          // Return result with all matches
          setLastResult({
            transcript: transcript || lastTranscriptRef.current,
            matches: rankedMatches,
          } as any);
          console.log('📖 [Scripture detected]:', rankedMatches.length, 'matches');
        } catch (err) {
          console.error('Failed to parse function arguments:', err);
        }
        break;

      case OPENAI_EVENT_TYPES.ERROR:
        setError(`OpenAI error: ${JSON.stringify(event)}`);
        console.error('❌ [Error]:', event);
        break;
    }
  }, []);

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
      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: API_CONSTANTS.AUDIO.SAMPLE_RATE });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for audio capture (deprecated but works)
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

          // Convert to base64
          const bytes = new Uint8Array(int16Array.buffer);
          const binaryString = String.fromCharCode(...bytes);
          const base64 = btoa(binaryString);

          websocketService.sendAudio(websocketRef.current, base64);
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      console.log('🎤 [Audio] Started streaming microphone input');
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
    console.log('🛑 [Disconnect] Starting disconnect process...');
    console.log('🛑 [Disconnect] WebSocket ref:', websocketRef.current ? 'exists' : 'null');
    console.log('🛑 [Disconnect] Audio context ref:', audioContextRef.current ? 'exists' : 'null');
    console.log('🛑 [Disconnect] Audio player ref:', audioPlayerRef.current ? 'exists' : 'null');
    
    if (websocketRef.current) {
      console.log('🛑 [Disconnect] Closing WebSocket connection...');
      websocketService.closeConnection(websocketRef.current);
      websocketRef.current = null;
      setWebsocket(null);
      console.log('🛑 [Disconnect] WebSocket closed');
    }

    if (audioContextRef.current) {
      console.log('🛑 [Disconnect] Closing audio context...');
      audioContextRef.current.close();
      audioContextRef.current = null;
      console.log('🛑 [Disconnect] Audio context closed');
    }

    if (audioPlayerRef.current) {
      console.log('🛑 [Disconnect] Closing audio player...');
      audioPlayerRef.current.close();
      audioPlayerRef.current = null;
      console.log('🛑 [Disconnect] Audio player closed');
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
    setError(null);
    setIsConnecting(false);
    console.log('🛑 [Disconnect] Disconnect complete. State:', CONNECTION_STATES.DISCONNECTED);
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
      console.log('🔄 [Auto-connect] Triggering connection...');
      connect();
    }
  }, [autoConnect, stream, connectionState, isConnecting]);

  // Update session when preferred Bible version changes
  useEffect(() => {
    if (connectionState === CONNECTION_STATES.CONNECTED && websocketRef.current) {
      console.log('📝 [Bible Version] Updating session with new preferred version:', preferredBibleVersion);
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
    console.log('🔄 [Stream change] Stream:', stream ? 'available' : 'null', 'Connection:', connectionState);
    if (!stream && connectionState === CONNECTION_STATES.CONNECTED) {
      console.log('🔄 [Stream change] Stream removed while connected - triggering disconnect');
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
