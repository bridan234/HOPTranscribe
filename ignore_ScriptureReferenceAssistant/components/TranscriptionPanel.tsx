import { ScrollArea } from './ui/scroll-area';
import { FileText } from 'lucide-react';

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
}

export function TranscriptionPanel({ 
  segments, 
  isRecording,
  highlightedSegment,
  onSegmentHover 
}: TranscriptionPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-slate-600" />
          <h2 className="text-slate-900">Live Transcription</h2>
        </div>
        <p className="text-sm text-slate-600">
          Real-time speech-to-text • Hover to see matched references
        </p>
      </div>

      {/* Transcription Content */}
      <ScrollArea className="flex-1 bg-slate-50">
        <div className="p-6 space-y-4">
          {segments.length > 0 ? (
            <>
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className={`p-4 rounded-lg transition-all ${
                    highlightedSegment === segment.id
                      ? 'bg-blue-100 border-2 border-blue-400 shadow-md'
                      : 'bg-white border border-slate-200'
                  }`}
                  onMouseEnter={() => onSegmentHover(segment.id)}
                  onMouseLeave={() => onSegmentHover(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{segment.timestamp}</span>
                    {highlightedSegment === segment.id && (
                      <span className="text-xs text-blue-600 px-2 py-1 bg-blue-50 rounded">
                        Has scripture reference
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              ))}
              
              {isRecording && (
                <div className="p-4 rounded-lg bg-white border border-slate-200 border-dashed">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-slate-500">Listening...</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500">No transcription yet</p>
                <p className="text-sm text-slate-400 mt-2">
                  {isRecording 
                    ? 'Transcription will appear here shortly...' 
                    : 'Click "Start" to begin recording and transcription'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
