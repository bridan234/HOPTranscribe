import { useState, useCallback } from 'react';
import { ScriptureReferences } from './components/ScriptureReferences';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { BookOpen, Settings, Circle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { useRealtimeWebSocket } from '../src/fe/src/hooks/useRealtimeWebSocket';
import { BIBLE_VERSIONS } from '../src/fe/src/constants/openaiConstants';

export default function App() {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [bibleVersion, setBibleVersion] = useState<string>(BIBLE_VERSIONS.DEFAULT_VERSION);
  const [customVersions, setCustomVersions] = useState<string[]>([...BIBLE_VERSIONS.DEFAULT_VERSIONS]);
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  
  // Additional settings
  const [autoScroll, setAutoScroll] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [sensitivity, setSensitivity] = useState(75);
  const [minConfidence, setMinConfidence] = useState(40);

  // WebSocket connection hook - auto-connects when stream is available
  const { 
    connectionState, 
    error: websocketError, 
    isConnecting,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    lastResult
  } = useRealtimeWebSocket({ 
    stream: audioStream,
    autoConnect: true,
    preferredBibleVersion: bibleVersion
  });

  // Handle stream changes from StatusBar
  const handleStreamChange = useCallback((stream: MediaStream | null) => {
    console.log('[App] Audio stream changed:', stream ? 'available' : 'null');
    setAudioStream(stream);
  }, []);

  // Handle recording state changes from StatusBar
  const handleRecordingChange = useCallback((recording: boolean) => {
    console.log('[App] Recording state changed:', recording);
    setIsRecording(recording);
  }, []);
  
  // Mock data - will be replaced with real data from backend
  const [transcriptionSegments] = useState([
    { id: '3', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', timestamp: '10:45 AM' },
    { id: '2', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', timestamp: '10:43 AM' },
    { id: '1', text: 'And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.', timestamp: '10:40 AM' },
  ]);

  // Updated structure: each segment can have multiple references
  const [scriptureRefs] = useState([
    {
      segmentId: '3',
      timestamp: '10:45 AM',
      references: [
        {
          id: '3a',
          reference: 'Romans 8:28',
          text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
          confidence: 0.96,
          version: 'KJV'
        }
        // Only one ref because confidence > 95%
      ]
    },
    {
      segmentId: '2',
      timestamp: '10:43 AM',
      references: [
        {
          id: '2a',
          reference: 'John 3:16',
          text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
          confidence: 0.98,
          version: 'KJV'
        },
        {
          id: '2b',
          reference: 'John 3:16',
          text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
          confidence: 0.95,
          version: 'NIV'
        },
        {
          id: '2c',
          reference: '1 John 4:9',
          text: 'In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him.',
          confidence: 0.88,
          version: 'KJV'
        }
      ]
    },
    {
      segmentId: '1',
      timestamp: '10:40 AM',
      references: [
        {
          id: '1a',
          reference: 'John 6:35',
          text: 'And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.',
          confidence: 0.97,
          version: 'KJV'
        }
      ]
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Scripture Reference Assistant</h1>
                <p className="text-sm text-slate-500">Live sermon transcription</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Bible Version:</label>
                <Select value={bibleVersion} onValueChange={setBibleVersion}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <StatusBar 
            onStreamChange={handleStreamChange}
            onRecordingChange={handleRecordingChange}
            selectedDevice={selectedDevice}
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
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}