import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ScriptureMatchDto, TranscriptSegmentDto } from '@/types/api';

interface ScriptureReferencesProps {
  segments: TranscriptSegmentDto[];
  showConfidence?: boolean;
  minConfidence?: number;
}

export function ScriptureReferences({
  segments,
  showConfidence = true,
  minConfidence = 0,
}: ScriptureReferencesProps) {
  const segmentsWithMatches = segments.filter((s) => s.matches.length > 0);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>Scripture suggestions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-4 pr-2">
          {segmentsWithMatches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Suggestions will appear here as scripture-related speech is detected.
            </p>
          )}
          {segmentsWithMatches.map((seg) => {
            const matches = seg.matches.filter((m) => m.confidence >= minConfidence);
            if (matches.length === 0) return null;
            return (
              <div key={seg.id} className="space-y-2 border-b last:border-b-0 pb-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{seg.text}</p>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <MatchCard key={`${seg.id}-${m.reference}-${m.version}`} match={m} showConfidence={showConfidence} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, showConfidence }: { match: ScriptureMatchDto; showConfidence: boolean }) {
  return (
    <div className="rounded-md border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{match.reference}</span>
          <Badge variant="outline" className="text-[10px]">
            {match.version}
          </Badge>
        </div>
        {showConfidence && (
          <Badge variant="secondary" className="text-[10px]">
            {(match.confidence * 100).toFixed(0)}%
          </Badge>
        )}
      </div>
      {match.quote && (
        <p className="text-xs text-muted-foreground italic leading-snug">&ldquo;{match.quote}&rdquo;</p>
      )}
    </div>
  );
}
