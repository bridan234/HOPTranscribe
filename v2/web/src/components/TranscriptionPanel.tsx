import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TranscriptSegmentDto } from '@/types/api';

interface TranscriptionPanelProps {
  segments: TranscriptSegmentDto[];
  partialText?: string;
  autoScroll?: boolean;
}

export function TranscriptionPanel({ segments, partialText, autoScroll = true }: TranscriptionPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [segments, partialText, autoScroll]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>Transcript</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div ref={ref} className="h-full overflow-y-auto space-y-3 pr-2">
          {segments.length === 0 && !partialText && (
            <p className="text-sm text-muted-foreground">
              Start recording to see live transcription here.
            </p>
          )}
          {segments.map((seg) => (
            <div key={seg.id} className="text-sm leading-relaxed">
              {seg.text}
            </div>
          ))}
          {partialText && (
            <div className="text-sm leading-relaxed text-muted-foreground italic">{partialText}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
