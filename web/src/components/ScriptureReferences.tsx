import { useEffect, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScriptureMatchDto, TranscriptSegmentDto } from '@/types/api';

type ScrollTarget = { id: string; nonce: number } | null;

interface ScriptureReferencesProps {
  segments: TranscriptSegmentDto[];
  showConfidence?: boolean;
  minConfidence?: number;
  hoveredSegmentId?: string | null;
  selectedSegmentId?: string | null;
  scrollTarget?: ScrollTarget;
  onSegmentHover?: (segmentId: string | null) => void;
  onSegmentClick?: (segmentId: string) => void;
}

interface SegmentGroup {
  id: string;
  startedAt: string;
  matches: ScriptureMatchDto[];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function ScriptureReferences({
  segments,
  showConfidence = true,
  minConfidence = 0,
  hoveredSegmentId = null,
  selectedSegmentId = null,
  scrollTarget = null,
  onSegmentHover,
  onSegmentClick,
}: ScriptureReferencesProps) {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Bring a segment's card into view when the transcript panel asks for it.
  useEffect(() => {
    if (!scrollTarget) return;
    cardRefs.current.get(scrollTarget.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollTarget]);

  // One card per transcript segment that produced matches, newest segment first,
  // with each segment's matches ranked by confidence.
  const groups = useMemo<SegmentGroup[]>(() => {
    const result: SegmentGroup[] = [];
    for (const segment of segments) {
      const matches = segment.matches
        .filter((m) => m.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
      if (matches.length > 0) {
        result.push({ id: segment.id, startedAt: segment.startedAt, matches });
      }
    }
    return result.reverse();
  }, [segments, minConfidence]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Scripture suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full space-y-2.5 overflow-y-auto pr-2">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Suggestions will appear here as scripture-related speech is detected.
            </p>
          ) : (
            groups.map((group) => {
              const highlighted = group.id === hoveredSegmentId || group.id === selectedSegmentId;
              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(group.id, el);
                    else cardRefs.current.delete(group.id);
                  }}
                  onMouseEnter={() => onSegmentHover?.(group.id)}
                  onMouseLeave={() => onSegmentHover?.(null)}
                  onClick={() => onSegmentClick?.(group.id)}
                  className={cn(
                    'cursor-pointer rounded-lg border bg-card transition-colors',
                    highlighted ? 'border-indigo-400 ring-1 ring-indigo-200' : 'hover:border-indigo-300',
                  )}
                >
                  <div className="border-b px-3 py-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {formatTime(group.startedAt)}
                    </span>
                  </div>
                  <div className="divide-y">
                    {group.matches.map((match) => (
                      <MatchRow
                        key={`${match.reference}-${match.version}`}
                        match={match}
                        showConfidence={showConfidence}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchRow({ match, showConfidence }: { match: ScriptureMatchDto; showConfidence: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          {match.reference}
        </span>
        {showConfidence && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            {(match.confidence * 100).toFixed(0)}% match
          </span>
        )}
      </div>
      {match.quote && (
        <p className="mt-1.5 text-xs italic leading-snug text-muted-foreground">
          &ldquo;{match.quote}&rdquo;
        </p>
      )}
    </div>
  );
}
