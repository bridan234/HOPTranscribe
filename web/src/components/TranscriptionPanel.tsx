import { useEffect, useRef } from 'react';
import { AlignLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TranscriptSegmentDto } from '@/types/api';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

type ScrollTarget = { id: string; nonce: number } | null;

interface TranscriptionPanelProps {
  segments: TranscriptSegmentDto[];
  partialText?: string;
  autoScroll?: boolean;
  isLive?: boolean;
  hoveredSegmentId?: string | null;
  selectedSegmentId?: string | null;
  scrollTarget?: ScrollTarget;
  onSegmentHover?: (segmentId: string | null) => void;
  onSegmentClick?: (segmentId: string) => void;
}

export function TranscriptionPanel({
  segments,
  partialText,
  autoScroll = true,
  isLive = false,
  hoveredSegmentId = null,
  selectedSegmentId = null,
  scrollTarget = null,
  onSegmentHover,
  onSegmentClick,
}: TranscriptionPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Newest segment renders at the top, so keep the scroll pinned to the top.
  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [segments, partialText, autoScroll]);

  // Bring a segment into view when the other panel asks for it.
  useEffect(() => {
    if (!scrollTarget) return;
    rowRefs.current.get(scrollTarget.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollTarget]);

  const ordered = [...segments].reverse();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlignLeft className="h-4 w-4 text-indigo-500" />
            Transcript
          </CardTitle>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div ref={ref} className="h-full space-y-1.5 overflow-y-auto pr-2">
          {segments.length === 0 && !partialText && (
            <p className="text-sm text-muted-foreground">
              Start recording to see live transcription here.
            </p>
          )}
          {partialText && (
            <div className="flex gap-3 rounded-md border border-dashed border-indigo-200 bg-indigo-50/30 px-3 py-2">
              <span className="mt-0.5 w-12 shrink-0 select-none text-right font-mono text-[10px] leading-relaxed text-indigo-400">
                live
              </span>
              <p className="flex-1 text-sm italic leading-relaxed text-muted-foreground">{partialText}</p>
            </div>
          )}
          {ordered.map((seg, index) => {
            const highlighted = seg.id === hoveredSegmentId || seg.id === selectedSegmentId;
            return (
              <div
                key={seg.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(seg.id, el);
                  else rowRefs.current.delete(seg.id);
                }}
                onMouseEnter={() => onSegmentHover?.(seg.id)}
                onMouseLeave={() => onSegmentHover?.(null)}
                onClick={() => onSegmentClick?.(seg.id)}
                className={cn(
                  'group flex cursor-pointer gap-3 rounded-md border border-transparent px-3 py-2 transition-colors',
                  highlighted
                    ? 'border-indigo-200 bg-indigo-50'
                    : cn(index % 2 === 0 ? 'bg-muted/40' : 'bg-transparent', 'hover:border-border hover:bg-muted/70'),
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 w-12 shrink-0 select-none text-right font-mono text-[10px] leading-relaxed tabular-nums',
                    highlighted ? 'text-indigo-500' : 'text-muted-foreground/70',
                  )}
                >
                  {formatTime(seg.startedAt)}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-foreground">{seg.text}</p>
                {seg.matches.length > 0 && (
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 select-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                      highlighted ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground',
                    )}
                    title={`${seg.matches.length} scripture match${seg.matches.length > 1 ? 'es' : ''}`}
                  >
                    {seg.matches.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
