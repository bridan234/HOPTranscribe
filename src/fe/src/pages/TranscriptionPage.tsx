import { useEffect, useRef, useState } from 'react';
import { ScriptureReferences } from '../components/ScriptureReferences';
import { TranscriptionPanel } from '../components/TranscriptionPanel';
import { StatusBar } from '../components/StatusBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { BookOpen, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';
import { BIBLE_VERSIONS, SCRIPTURE_DETECTION } from '../constants/openaiConstants';

// Type definitions
type TranscriptionSegment = { id: string; text: string; timestamp: string };
type ScriptureRef = { id: string; reference: string; text: string; confidence: number; version: string };
type SegmentReferences = { segmentId: string; timestamp: string; references: ScriptureRef[] };

export function TranscriptionPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [bibleVersion, setBibleVersion] = useState<string>(BIBLE_VERSIONS.DEFAULT_VERSION);
  const [customVersions, setCustomVersions] = useState<string[]>([...BIBLE_VERSIONS.DEFAULT_VERSIONS]);
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Settings state
  const [autoScroll, setAutoScroll] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [sensitivity, setSensitivity] = useState(75);
  const [minConfidence, setMinConfidence] = useState(SCRIPTURE_DETECTION.MIN_CONFIDENCE * 100);
  const [maxReferences, setMaxReferences] = useState<number>(SCRIPTURE_DETECTION.MAX_MATCHES);

  // Transcription data state
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([]);
  const [scriptureRefs, setScriptureRefs] = useState<SegmentReferences[]>([]);
  const currentSegmentIdRef = useRef<string | null>(null);

  const { connectionState, error: webrtcError, isConnecting, lastResult } = useRealtimeWebSocket({
    stream: audioStream,
    autoConnect: true,
    preferredBibleVersion: bibleVersion,
    minConfidence: minConfidence / 100, // Convert percentage to decimal
    maxReferences: maxReferences,
  });

  const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Append new segments and references when results arrive
  useEffect(() => {
    if (!lastResult) return;
    const { transcript, matches } = lastResult as any;

    // Append transcript if changed
    if (transcript && transcript.trim()) {
      const latest = transcriptionSegments[0];
      if (!latest || latest.text !== transcript) {
        const segId = `${Date.now()}`;
        const ts = clock();
        setTranscriptionSegments((prev) => [{ id: segId, text: transcript, timestamp: ts }, ...prev].slice(0, 200));
        currentSegmentIdRef.current = segId;
      }
    }

    // Add scripture references (up to 4) to current segment, ranked by confidence
    if (matches && Array.isArray(matches) && matches.length > 0) {
      const segId = currentSegmentIdRef.current || transcriptionSegments[0]?.id || `${Date.now()}`;
      const ts = transcriptionSegments.find(s => s.id === segId)?.timestamp || clock();

      // Convert matches to ScriptureRef objects
      const refs: ScriptureRef[] = matches.map((match: any, idx: number) => ({
        id: `${segId}-${String.fromCharCode(97 + idx)}`, // a, b, c, d
        reference: match.reference || 'Unknown',
        text: match.quote || '(verse text unavailable)',
        confidence: match.confidence || 0.5,
        version: match.version || bibleVersion,
      }));

      setScriptureRefs((prev) => {
        const idx = prev.findIndex(p => p.segmentId === segId);
        if (idx >= 0) {
          // Update existing segment with new references
          const updated: SegmentReferences = { ...prev[idx], references: refs };
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        // Add new segment with references
        return [{ segmentId: segId, timestamp: ts, references: refs }, ...prev].slice(0, 200);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, bibleVersion]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base text-slate-900 truncate">Sermon & Reference Assistant v1.0</h1>
                <p className="text-xs sm:text-sm text-slate-500">Live sermon transcription</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-slate-600 hidden sm:inline">Bible Version:</label>
                <Select value={bibleVersion} onValueChange={setBibleVersion}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {customVersions.map(version => (
                      <SelectItem key={version} value={version}>{version}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>

          <StatusBar 
            onStreamChange={setAudioStream}
            onRecordingChange={setIsRecording}
            selectedDevice={selectedDevice}
            referenceCount={scriptureRefs.reduce((acc, seg) => acc + seg.references.length, 0)}
            wordCount={transcriptionSegments.reduce((acc, seg) => acc + seg.text.split(/\s+/).length, 0)}
          />
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)}
          selectedDevice={selectedDevice}
          onDeviceChange={setSelectedDevice}
          bibleVersion={bibleVersion}
          onBibleVersionChange={setBibleVersion}
          customVersions={customVersions}
          onCustomVersionsChange={setCustomVersions}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
          showConfidence={showConfidence}
          onShowConfidenceChange={setShowConfidence}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
          minConfidence={minConfidence}
          onMinConfidenceChange={setMinConfidence}
          maxReferences={maxReferences}
          onMaxReferencesChange={setMaxReferences}
        />
      )}

      {/* Main Content - Resizable Two Column Layout */}
      <main className="h-[calc(100vh-180px)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Column - Scripture References */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full border-r border-slate-200 bg-white">
              <ScriptureReferences 
                segmentRefs={scriptureRefs}
                isRecording={isRecording}
                preferredVersion={bibleVersion}
                onReferenceHover={setHighlightedSegment}
                highlightedSegment={highlightedSegment}
                connectionState={connectionState}
                isConnecting={isConnecting}
                error={webrtcError}
                showConfidence={showConfidence}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column - Live Transcription */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full bg-slate-50">
              <TranscriptionPanel 
                segments={transcriptionSegments}
                isRecording={isRecording}
                highlightedSegment={highlightedSegment}
                onSegmentHover={setHighlightedSegment}
                autoScroll={autoScroll}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
