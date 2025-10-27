import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Copy, Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useState } from 'react';

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
  highlightedSegment: string | null;
}

export function ScriptureReferences({ 
  segmentRefs, 
  isRecording, 
  preferredVersion,
  onReferenceHover,
  highlightedSegment 
}: ScriptureReferencesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const handleCopyReference = (reference: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reference);
    setCopiedId(reference);
    toast.success('Reference copied!');
    
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-blue-700" />
          <h2 className="text-slate-900">Scripture References</h2>
          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
            {totalReferences}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">
          Click reference to copy • Latest first
        </p>
      </div>

      {/* References List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {segmentRefs.length > 0 ? (
            segmentRefs.map((segment) => {
              const displayRefs = getDisplayReferences(segment.references, segment.segmentId);
              const isExpanded = expandedSegments.has(segment.segmentId);
              const hasMore = segment.references.length > displayRefs.length && !isExpanded;
              
              return (
                <div 
                  key={segment.segmentId}
                  className={`p-4 rounded-lg border transition-all ${
                    highlightedSegment === segment.segmentId
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                  onMouseEnter={() => onReferenceHover(segment.segmentId)}
                  onMouseLeave={() => onReferenceHover(null)}
                >
                  {/* Segment timestamp header */}
                  <div className="text-xs text-slate-400 mb-3">{segment.timestamp}</div>
                  
                  {/* References for this segment */}
                  <div className="space-y-3">
                    {displayRefs.map((ref, index) => (
                      <div key={ref.id}>
                        {index > 0 && <div className="border-t border-slate-100 my-2" />}
                        
                        {/* Compact header: reference, version, confidence, copy all on one line */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={(e) => handleCopyReference(ref.reference, e)}
                              className="text-blue-700 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {ref.reference}
                            </button>
                            <span className="text-xs text-slate-500">{ref.version}</span>
                            <Badge 
                              variant="outline" 
                              className="text-xs border-green-300 text-green-700 bg-green-50 px-1.5 py-0"
                            >
                              {Math.round(ref.confidence * 100)}%
                            </Badge>
                          </div>
                          
                          {copiedId === ref.reference ? (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <Check className="w-3 h-3" />
                              Copied
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleCopyReference(ref.reference, e)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Scripture Text */}
                        <div className="relative pl-3 border-l-2 border-blue-200">
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{ref.text}"
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show expand/collapse button if needed */}
                    {(hasMore || isExpanded) && (
                      <button
                        onClick={(e) => toggleExpand(segment.segmentId, e)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2 transition-colors"
                      >
                        {isExpanded 
                          ? 'Show less' 
                          : `+${segment.references.length - displayRefs.length} more version${segment.references.length - displayRefs.length !== 1 ? 's' : ''}`
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">No scripture references detected yet</p>
              <p className="text-sm text-slate-400 mt-2">
                {isRecording 
                  ? 'References will appear here as the sermon continues' 
                  : 'Start listening to begin detecting references'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}