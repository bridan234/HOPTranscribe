/**
 * WebRTC service for OpenAI Realtime API connection
 * Handles peer connection setup and data channel management
 */

import { API_CONSTANTS } from '../constants/apiConstants';

export interface WebRTCConnectionOptions {
  ephemeralKey: string;
  audioTrack: MediaStreamTrack;
  onMessage: (event: MessageEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  audioElement: HTMLAudioElement;
  sessionConfig?: Record<string, unknown>;
}

export const webrtcService = {
  /**
   * Create and configure RTCPeerConnection for OpenAI Realtime API
   */
  async createConnection(options: WebRTCConnectionOptions): Promise<{
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
  }> {
    const { ephemeralKey, audioTrack, onMessage, onConnectionStateChange, audioElement } = options;

    try {
      // 1. Create peer connection
      const pc = new RTCPeerConnection();

      // 2. Set up to receive remote audio from OpenAI (for voice responses)
      // This matches the OpenAI example pattern and also attempts to play()
      pc.ontrack = (e) => {
        console.log('[WebRTC] 🎵 Received audio track:', e.track.kind, e.streams.length);
        try {
          audioElement.srcObject = e.streams[0];
          const playPromise = (audioElement as any).play?.();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch((err: any) => {
              console.warn('[WebRTC] Autoplay prevented, waiting for user gesture to enable audio:', err?.name || err);
              const retry = () => {
                (audioElement as any).play?.().catch((e: any) => console.warn('[WebRTC] Audio play retry failed:', e?.name || e));
                window.removeEventListener('click', retry);
                window.removeEventListener('keydown', retry);
              };
              window.addEventListener('click', retry, { once: true });
              window.addEventListener('keydown', retry, { once: true });
            });
          }
        } catch (err) {
          console.error('[WebRTC] Error attaching/playing remote audio stream:', err);
        }
      };

      // 3. Add local audio track (microphone input)
      pc.addTrack(audioTrack);

      // 4. Create data channel for events
      const dc = pc.createDataChannel(API_CONSTANTS.OPENAI.DATA_CHANNEL_NAME);

      // 5. Set up data channel event listeners
      dc.addEventListener('message', onMessage);

      dc.addEventListener('open', () => {
        console.log('[WebRTC] Data channel opened');
      });

      dc.addEventListener('error', (error) => {
        console.error('[WebRTC] Data channel error:', error);
      });

      dc.addEventListener('close', () => {
        console.log('[WebRTC] Data channel closed');
      });

      // 6. Monitor connection state
      pc.addEventListener('connectionstatechange', () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        onConnectionStateChange(pc.connectionState);
      });

      // 7. Handle ICE candidates
      pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate:', event.candidate);
        }
      });

      // 8. Create and set local description (SDP offer)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 9. Send offer to OpenAI and get answer
      const response = await fetch(API_CONSTANTS.OPENAI.REALTIME_URL,
      // const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to connect to OpenAI: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`);
      }

      // 10. Set remote description (SDP answer)
      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      return { peerConnection: pc, dataChannel: dc };
    } catch(e){
      console.error("Error in createConnection:", e);
      throw e;
    }
  },

  /**
   * Send session configuration via data channel
   */
  sendSessionConfig(dataChannel: RTCDataChannel, config: Record<string, unknown>): void {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        type: 'session.update',
        session: config,
      }));
    } else {
      console.warn('[WebRTC] Data channel not open, cannot send config');
    }
  },

  /**
   * Close connection and cleanup resources
   */
  closeConnection(peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel): void {
    dataChannel.close();
    peerConnection.close();
  },
};
