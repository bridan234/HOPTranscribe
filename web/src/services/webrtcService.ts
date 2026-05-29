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
  /** Trailing silence (ms) before an utterance is committed. Defaults to 2000. */
  silenceMs?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onMessage: (event: unknown) => void;
}

// gpt-realtime-whisper does not support server VAD, so we detect utterance
// boundaries on the client by measuring mic energy and commit the audio buffer
// after a short pause. Committing is what makes OpenAI emit a
// `conversation.item.input_audio_transcription.completed` event.
const VAD = {
  /** RMS amplitude (0..1) above which we treat the frame as speech. */
  threshold: 0.012,
  /** Default trailing silence required to end an utterance. */
  defaultSilenceMs: 2000,
  /** Ignore blips shorter than this so we don't commit near-empty buffers. */
  minSpeechMs: 400,
  /** Force a commit on very long utterances so segments stay reasonable. */
  maxUtteranceMs: 20000,
  /** How often to sample mic energy. */
  intervalMs: 100,
} as const;

type StopVad = (flush?: boolean) => Promise<void>;

function startSilenceDetection(
  stream: MediaStream,
  dataChannel: RTCDataChannel,
  silenceMs: number = VAD.defaultSilenceMs,
): StopVad {
  const AudioCtx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);

  let speaking = false;
  let speechStart = 0;
  let lastVoice = 0;

  const commit = () => {
    if (dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    }
  };

  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    const now = performance.now();

    if (rms >= VAD.threshold) {
      if (!speaking) {
        speaking = true;
        speechStart = now;
      }
      lastVoice = now;
      if (now - speechStart >= VAD.maxUtteranceMs) {
        commit();
        speaking = false;
      }
    } else if (speaking && now - lastVoice >= silenceMs) {
      if (now - speechStart >= VAD.minSpeechMs) commit();
      speaking = false;
    }
  }, VAD.intervalMs);

  return async (flush = false) => {
    window.clearInterval(timer);
    if (flush && speaking) commit();
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  };
}

export async function connectRealtime(opts: ConnectOptions): Promise<RealtimeConnection> {
  const { session, deviceId, silenceMs, onOpen, onClose, onError, onMessage } = opts;

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

  let stopVad: StopVad | null = null;

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
              // gpt-realtime-whisper has no server VAD; we segment client-side.
              turn_detection: null,
            },
          },
        },
      }),
    );
    stopVad = startSilenceDetection(micStream, dataChannel, silenceMs);
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
      // Flush any in-progress utterance so its transcript isn't lost on stop.
      await stopVad?.(true);
      stopVad = null;
    } catch {
      /* ignore */
    }
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
