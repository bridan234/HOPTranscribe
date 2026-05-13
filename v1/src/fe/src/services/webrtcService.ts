/**
 * WebRTC service for OpenAI Realtime API
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
  async createConnection(options: WebRTCConnectionOptions): Promise<{
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
  }> {
    const { ephemeralKey, audioTrack, onMessage, onConnectionStateChange, audioElement } = options;

    try {
      const pc = new RTCPeerConnection();

      pc.ontrack = (e) => {
        try {
          audioElement.srcObject = e.streams[0];
          const playPromise = (audioElement as any).play?.();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch((err: any) => {
              console.warn('[WebRTC] Autoplay prevented, waiting for user gesture:', err?.name || err);
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

      pc.addTrack(audioTrack);

      const dc = pc.createDataChannel(API_CONSTANTS.OPENAI.DATA_CHANNEL_NAME);
      dc.addEventListener('message', onMessage);
      dc.addEventListener('error', (error) => {
        console.error('[WebRTC] Data channel error:', error);
      });

      pc.addEventListener('connectionstatechange', () => {
        onConnectionStateChange(pc.connectionState);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(API_CONSTANTS.OPENAI.REALTIME_URL, {
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

      const answerSdp = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      return { peerConnection: pc, dataChannel: dc };
    } catch (e) {
      console.error("Error in createConnection:", e);
      throw e;
    }
  },

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

  closeConnection(peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel): void {
    dataChannel.close();
    peerConnection.close();
  },
};
