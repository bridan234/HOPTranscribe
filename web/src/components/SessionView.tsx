import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecordingControls } from './RecordingControls';
import { TranscriptionPanel } from './TranscriptionPanel';
import { ScriptureReferences } from './ScriptureReferences';
import { SettingsPanel } from './SettingsPanel';
import { useRealtimeWebRTC } from '@/hooks/useRealtimeWebRTC';
import { useScriptureMatcher } from '@/hooks/useScriptureMatcher';
import { useSessionHub } from '@/hooks/useSessionHub';
import { useSettings } from '@/hooks/useSettings';
import { sessionService } from '@/services/sessionService';
import type { SessionDto, TranscriptSegmentDto } from '@/types/api';

interface SessionViewProps {
  session: SessionDto;
  username: string;
  onBack: () => void;
}

export function SessionView({ session: initialSession, username, onBack }: SessionViewProps) {
  const { settings } = useSettings();
  const [session, setSession] = useState<SessionDto>(initialSession);
  const isOwner = session.ownerUsername.toLowerCase() === username.toLowerCase();
  const [segments, setSegments] = useState<TranscriptSegmentDto[]>([]);
  const [partial, setPartial] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await sessionService.listTranscripts(session.code);
        if (!cancelled && existing) setSegments(existing);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load transcripts.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.code]);

  const handleHubTranscript = useCallback(
    (segment: TranscriptSegmentDto) => {
      setSegments((prev) => {
        if (prev.some((s) => s.id === segment.id)) return prev;
        return [...prev, segment];
      });
    },
    [],
  );

  const handleHubSession = useCallback((updated: SessionDto) => {
    setSession(updated);
  }, []);

  // Viewers (non-owners) subscribe to live transcript broadcasts via SignalR.
  // Owners don't need it because they already produce the events locally.
  useSessionHub({
    sessionCode: session.code,
    enabled: !isOwner,
    onTranscriptAppended: handleHubTranscript,
    onSessionUpdated: handleHubSession,
  });

  const { requestMatches, cancel: cancelMatches } = useScriptureMatcher({
    sessionCode: session.code,
    preferredVersion: settings.preferredVersion,
    n: settings.matchCount,
  });

  const handleUtterance = useCallback(
    async (utterance: { id: string; text: string; startedAt: string; endedAt: string }) => {
      setPartial('');
      const text = utterance.text.trim();
      if (!text) return;

      const tempId = `pending-${utterance.id}`;
      setSegments((prev) => [
        ...prev,
        {
          id: tempId,
          text,
          startedAt: utterance.startedAt,
          endedAt: utterance.endedAt,
          matches: [],
        },
      ]);

      let matches: TranscriptSegmentDto['matches'] = [];
      try {
        const result = await requestMatches(text);
        matches = result.matches;
        if (result.error) {
          toast.error(`Match error: ${result.error.message}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Match request failed.');
      }

      try {
        const persisted = await sessionService.appendTranscript(session.code, {
          text,
          startedAt: utterance.startedAt,
          endedAt: utterance.endedAt,
          matches: matches.length > 0 ? matches : undefined,
        });
        setSegments((prev) =>
          prev.map((s) => (s.id === tempId ? persisted : s)),
        );
      } catch (err) {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === tempId
              ? { ...s, matches }
              : s,
          ),
        );
        toast.error(err instanceof Error ? err.message : 'Failed to save transcript.');
      }
    },
    [requestMatches, session.code],
  );

  const realtime = useRealtimeWebRTC({
    onDelta: (delta) => setPartial(delta.text),
    onUtterance: handleUtterance,
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => () => cancelMatches(), [cancelMatches]);

  const start = () => realtime.start(session.code);
  const stop = () => void realtime.stop();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      toast.success('Session code copied');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">{session.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Session</span>
              <button onClick={copyCode} className="font-mono font-semibold text-foreground hover:underline">
                {session.code}
              </button>
              <Badge variant="outline">{session.status}</Badge>
              <Badge variant={isOwner ? 'default' : 'secondary'}>{isOwner ? 'Owner' : 'Viewer'}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RecordingControls
              state={realtime.state}
              onStart={start}
              onStop={stop}
              isOwner={isOwner && session.status === 'active'}
            />
            <SettingsPanel />
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 h-[70vh]">
          <TranscriptionPanel
            segments={segments}
            partialText={partial}
            autoScroll={settings.autoScroll}
          />
        </div>
        <div className="h-[70vh]">
          <ScriptureReferences
            segments={segments}
            showConfidence={settings.showConfidence}
            minConfidence={settings.minConfidence}
          />
        </div>
      </main>
    </div>
  );
}
