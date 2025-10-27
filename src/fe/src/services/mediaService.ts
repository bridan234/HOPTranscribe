/**
 * Audio configuration constants for OpenAI Realtime API
 * Requirements: mono channel, 24kHz sample rate
 */
const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,        // Mono
    sampleRate: 24000,      // 24kHz
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

/**
 * Media service handles browser media APIs
 * Separated from React hooks for testability and reusability
 */
export const mediaService = {
  /**
   * Request microphone access with OpenAI-compatible audio constraints
   * @param deviceId Optional specific device ID to use
   * @throws {Error} If permission denied or no audio devices available
   */
  async requestMicrophone(deviceId?: string): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId 
          ? {
              deviceId: { exact: deviceId },
              channelCount: 1,
              sampleRate: 24000,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : AUDIO_CONSTRAINTS.audio,
        video: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific permission errors
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow access in your browser settings.');
        }
        if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        }
        throw new Error(`Failed to access microphone: ${error.message}`);
      }
      throw new Error('Failed to access microphone');
    }
  },

  /**
   * Stop all tracks in a media stream
   */
  stopStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
  },

  /**
   * Check if browser supports required media APIs
   */
  isMediaSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  },
};
