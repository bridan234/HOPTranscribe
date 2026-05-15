import type { TranscriptionSessionResponse } from '@/types/api';

export interface RealtimeConnection {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  micStream: MediaStream;
  close: () => Promise<void>;
}

export interface ConnectOptions {
  session: TranscriptionSessionResponse;
  deviceId?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onMessage: (event: unknown) => void;
}

export async function connectRealtime(opts: ConnectOptions): Promise<RealtimeConnection> {
  const { session, deviceId, onOpen, onClose, onError, onMessage } = opts;

  const constraints: MediaStreamConstraints = {
    audio: deviceId
      ? { deviceId: { exact: deviceId }, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      : { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  };

  const micStream = await navigator.mediaDevices.getUserMedia(constraints);
  const pc = new RTCPeerConnection();

  pc.addEventListener('iceconnectionstatechange', () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      onError?.(new Error(`ICE connection state: ${pc.iceConnectionState}`));
    }
  });

  const audioTrack = micStream.getAudioTracks()[0];
  if (!audioTrack) throw new Error('No audio track available from microphone.');
  pc.addTrack(audioTrack, micStream);

  const dataChannel = pc.createDataChannel('oai-events');
  dataChannel.addEventListener('open', () => {
    dataChannel.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'transcription',
          audio: {
            input: {
              format: {
                type: 'audio/pcm',
                rate: 24000,
              },
              transcription: {
                model: session.model,
                language: session.language,
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          },
        },
      }),
    );
    onOpen?.();
  });
  dataChannel.addEventListener('close', () => onClose?.());
  dataChannel.addEventListener('error', (event) => {
    const err = (event as RTCErrorEvent).error ?? new Error('Data channel error');
    onError?.(err instanceof Error ? err : new Error(String(err)));
  });
  dataChannel.addEventListener('message', (event) => {
    try {
      onMessage(JSON.parse(event.data as string));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to parse data channel message.'));
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch(session.sdpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.clientSecret}`,
      'Content-Type': 'application/sdp',
    },
    body: offer.sdp ?? '',
  });

  if (!sdpResponse.ok) {
    const text = await sdpResponse.text().catch(() => '');
    throw new Error(`SDP exchange failed (${sdpResponse.status}): ${text}`);
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  const close = async () => {
    try {
      dataChannel.close();
    } catch {
      /* ignore */
    }
    try {
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
    } catch {
      /* ignore */
    }
    micStream.getTracks().forEach((t) => t.stop());
  };

  return { pc, dataChannel, micStream, close };
}
