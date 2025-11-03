import { ScrollArea } from './ui/scroll-area';
import { FileText, MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: string;
}

interface TranscriptionPanelProps {
  segments: TranscriptionSegment[];
  isRecording: boolean;
  highlightedSegment: string | null;
  onSegmentHover: (segmentId: string | null) => void;
  onSegmentClick?: (segmentId: string) => void;
}

export function TranscriptionPanel({ 
  segments, 
  isRecording,
  highlightedSegment,
  onSegmentHover,
  onSegmentClick
}: TranscriptionPanelProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-[#D4C9BE]/10">
      {/* Modern Header */}
      <div className="px-6 py-6 border-b border-border backdrop-blur-sm bg-background/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a5550] to-[#030303] flex items-center justify-center shadow-lg shadow-[#030303]/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-foreground">Transcription</h2>
            <p className="text-sm text-muted-foreground">
              Click to view references
            </p>
          </div>
        </div>
      </div>

      {/* Transcription Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-4 space-y-3">
          {segments.length > 0 ? (
            <>
              {isRecording && (
                <div className="rounded-xl border-2 border-dashed border-border bg-card/60 backdrop-blur-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-[#123458] dark:bg-[#D4C9BE] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#123458] dark:bg-[#D4C9BE] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#123458] dark:bg-[#D4C9BE] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-muted-foreground">Listening and transcribing...</span>
                  </div>
                </div>
              )}
              
              {segments.map((segment) => {
                const isHighlighted = highlightedSegment === segment.id;
                
                return (
                  <div 
                    key={segment.id}
                    className={`group relative rounded-xl border transition-all duration-300 cursor-pointer ${
                      isHighlighted
                        ? 'border-[#123458] bg-gradient-to-br from-[#D4C9BE]/40 to-[#F1EFEC] dark:from-[#123458]/60 dark:to-[#2a3f5c] shadow-lg shadow-[#123458]/20 scale-[1.02]'
                        : 'border-border bg-card/80 backdrop-blur-sm hover:border-[#D4C9BE] hover:shadow-md'
                    }`}
                    onMouseEnter={() => onSegmentHover(segment.id)}
                    onMouseLeave={() => onSegmentHover(null)}
                    onClick={() => onSegmentClick?.(segment.id)}
                  >
                    <div className="p-4">
                      <p className={`text-sm leading-relaxed transition-colors ${
                        isHighlighted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {segment.text}
                      </p>
                      
                      {isHighlighted && (
                        <div className="mt-3 pt-3 border-t border-[#D4C9BE]/50">
                          <Badge 
                            variant="outline" 
                            className="text-xs border-[#123458] text-[#123458] dark:text-[#D4C9BE] bg-[#D4C9BE]/30 dark:bg-[#123458]/30"
                          >
                            Scripture references shown
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="h-full flex items-center justify-center py-32">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-foreground mb-2">No transcription yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {isRecording 
                    ? 'Transcription will appear here shortly...' 
                    : 'Start recording to begin live transcription'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
