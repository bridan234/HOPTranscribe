import { useState, useCallback, useEffect } from 'react';
import { mediaService } from '../services/mediaService';

interface UseMediaRecorderState {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
  isLoading: boolean;
}

interface UseMediaRecorderReturn extends UseMediaRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

interface UseMediaRecorderOptions {
  deviceId?: string;
}

export function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startRecording = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check browser support
      if (!mediaService.isMediaSupported()) {
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone access with optional device ID
      const mediaStream = await mediaService.requestMicrophone(options?.deviceId);
      
      setStream(mediaStream);
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setIsRecording(false);
    } finally {
      setIsLoading(false);
    }
  }, [options?.deviceId]);

  const stopRecording = useCallback(() => {
    console.log('⏹️ [MediaRecorder] Stop recording called');
    console.log('⏹️ [MediaRecorder] Stream exists:', stream ? 'yes' : 'no');
    
    if (stream) {
      console.log('⏹️ [MediaRecorder] Stopping stream...');
      mediaService.stopStream(stream);
      setStream(null);
      console.log('⏹️ [MediaRecorder] Stream stopped and cleared');
    }
    setIsRecording(false);
    setError(null);
    console.log('⏹️ [MediaRecorder] Recording state set to false');
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        mediaService.stopStream(stream);
      }
    };
  }, [stream]);

  return {
    stream,
    isRecording,
    error,
    isLoading,
    startRecording,
    stopRecording,
  };
}
