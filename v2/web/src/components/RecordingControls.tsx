import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RealtimeConnectionState } from '@/types/realtime';

interface RecordingControlsProps {
  state: RealtimeConnectionState;
  onStart: () => void;
  onStop: () => void;
  isOwner: boolean;
}

const labels: Record<RealtimeConnectionState, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  idle: { text: 'Idle', variant: 'secondary' },
  connecting: { text: 'Connecting...', variant: 'outline' },
  connected: { text: 'Connected', variant: 'outline' },
  recording: { text: 'Recording', variant: 'default' },
  closing: { text: 'Stopping...', variant: 'outline' },
  error: { text: 'Error', variant: 'destructive' },
};

export function RecordingControls({ state, onStart, onStop, isOwner }: RecordingControlsProps) {
  const isActive =
    state === 'connecting' || state === 'connected' || state === 'recording' || state === 'closing';
  const label = labels[state];

  if (!isOwner) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline">View-only</Badge>
        <span className="text-sm text-muted-foreground">Only the session owner can record.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={label.variant}>{label.text}</Badge>
      {!isActive ? (
        <Button onClick={onStart}>
          <Mic className="h-4 w-4" />
          Start recording
        </Button>
      ) : (
        <Button onClick={onStop} variant="destructive" disabled={state === 'closing'}>
          <Square className="h-4 w-4" />
          Stop
        </Button>
      )}
    </div>
  );
}
