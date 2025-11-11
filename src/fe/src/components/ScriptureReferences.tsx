import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Copy, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { copyToClipboard } from '../utils/clipboard';

interface ScriptureRef {
  id: string;
  reference: string;
  text: string;
  confidence: number;
  version: string;
}

interface SegmentReferences {
  segmentId: string;
  timestamp: string;
  references: ScriptureRef[];
}

interface ScriptureReferencesProps {
  segmentRefs: SegmentReferences[];
  isRecording: boolean;
  preferredVersion: string;
  onReferenceHover: (segmentId: string | null) => void;
  onReferenceClick?: (segmentId: string) => void;
  highlightedSegment: string | null;
}

export function ScriptureReferences({ 
  segmentRefs, 
  isRecording, 
  preferredVersion,
  onReferenceHover,
  onReferenceClick,
  highlightedSegment 
}: ScriptureReferencesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const handleReferenceClick = (segmentId: string) => {
    onReferenceClick?.(segmentId);
  };

  const handleCopyReference = async (reference: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(reference);
    
    if (success) {
      setCopiedId(reference);
      toast.success('Reference copied!');
      
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const toggleExpand = (segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId);
    } else {
      newExpanded.add(segmentId);
    }
    setExpandedSegments(newExpanded);
  };

  // Process references: show top 3 unless one has 95%+ confidence
  const getDisplayReferences = (refs: ScriptureRef[], segmentId: string) => {
    // If expanded, show all
    if (expandedSegments.has(segmentId)) {
      const sorted = [...refs].sort((a, b) => {
        if (a.version === preferredVersion && b.version !== preferredVersion) return -1;
        if (b.version === preferredVersion && a.version !== preferredVersion) return 1;
        return b.confidence - a.confidence;
      });
      return sorted;
    }

    const highConfidence = refs.find(ref => ref.confidence >= 0.95);
    if (highConfidence) {
      return [highConfidence];
    }
    
    // Sort by: preferred version first, then by confidence
    const sorted = [...refs].sort((a, b) => {
      if (a.version === preferredVersion && b.version !== preferredVersion) return -1;
      if (b.version === preferredVersion && a.version !== preferredVersion) return 1;
      return b.confidence - a.confidence;
    });
    
    return sorted.slice(0, 3);
  };

  const totalReferences = segmentRefs.reduce((acc, seg) => acc + seg.references.length, 0);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-[#D4C9BE]/20">
      {/* Modern Header */}
      <div className="px-8 py-6 border-b border-border backdrop-blur-sm bg-background/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#123458] to-[#2a5080] flex items-center justify-center shadow-lg shadow-[#123458]/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-foreground">Scripture References</h2>
              <p className="text-sm text-muted-foreground">
                Click to copy • Hover to highlight transcript
              </p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="ml-2 bg-gradient-to-r from-[#123458] to-[#2a5080] text-white border-0 shadow-md px-4 py-2"
          >
            {totalReferences} {totalReferences === 1 ? 'reference' : 'references'}
          </Badge>
        </div>
      </div>

      {/* References List */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-6 space-y-4">
          {segmentRefs.length > 0 ? (
            [...segmentRefs].reverse().map((segment) => {
              const displayRefs = getDisplayReferences(segment.references, segment.segmentId);
              const isExpanded = expandedSegments.has(segment.segmentId);
              const hasMore = segment.references.length > displayRefs.length && !isExpanded;
              const isHighlighted = highlightedSegment === segment.segmentId;
              
              return (
                <div 
                  key={segment.segmentId}
                  id={`scripture-${segment.segmentId}`}
                  className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isHighlighted
                      ? 'border-[#123458] bg-gradient-to-br from-[#D4C9BE]/40 to-[#F1EFEC] dark:from-[#123458]/60 dark:to-[#2a3f5c] shadow-xl shadow-[#123458]/20 scale-[1.02]'
                      : 'border-border bg-card/80 backdrop-blur-sm hover:border-[#D4C9BE] hover:shadow-lg hover:shadow-[#123458]/10'
                  }`}
                  onMouseEnter={() => onReferenceHover(segment.segmentId)}
                  onMouseLeave={() => onReferenceHover(null)}
                  onClick={() => handleReferenceClick(segment.segmentId)}
                >
                  <div className="p-6">
                    {/* References for this segment */}
                    <div className="space-y-5">
                      {displayRefs.map((ref, index) => (
                        <div key={ref.id}>
                          {index > 0 && <div className="border-t border-border my-4" />}
                          
                          {/* Reference Header */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={(e) => handleCopyReference(ref.reference, e)}
                                className="text-foreground hover:text-[#123458] dark:hover:text-[#D4C9BE] transition-colors group/ref flex items-center gap-2"
                              >
                                <span className="text-lg">{ref.reference}</span>
                                <Copy className="w-4 h-4 opacity-0 group-hover/ref:opacity-100 transition-opacity" />
                              </button>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-border text-muted-foreground bg-muted/50"
                                >
                                  {ref.version}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                >
                                  {Math.round(ref.confidence * 100)}% match
                                </Badge>
                              </div>
                            </div>
                            
                            {copiedId === ref.reference && (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-right-2">
                                <Check className="w-4 h-4" />
                                <span>Copied</span>
                              </div>
                            )}
                          </div>

                          {/* Scripture Text */}
                          <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#123458] to-[#2a5080] rounded-full" />
                            <p className="pl-5 text-muted-foreground leading-relaxed italic">
                              "{ref.text}"
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Show expand/collapse button if needed */}
                      {(hasMore || isExpanded) && (
                        <button
                          onClick={(e) => toggleExpand(segment.segmentId, e)}
                          className="flex items-center gap-2 text-sm text-[#123458] dark:text-[#D4C9BE] hover:text-[#2a5080] dark:hover:text-[#F1EFEC] transition-colors mt-4 px-3 py-2 rounded-lg hover:bg-[#D4C9BE]/20"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show {segment.references.length - displayRefs.length} more version{segment.references.length - displayRefs.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center py-32">
              <div className="text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <BookOpen className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-foreground mb-2">No references yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {isRecording 
                    ? 'Scripture references will appear here as they are detected in the sermon' 
                    : 'Start recording to begin detecting scripture references'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
