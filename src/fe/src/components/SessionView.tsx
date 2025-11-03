import React, { useState, useEffect } from 'react';
import { Session, TranscriptSegment, ScriptureReference } from '../models/Session';
import { RecordingControls } from './RecordingControls';
import { ScriptureReferences } from './ScriptureReferences';
import { TranscriptionPanel } from './TranscriptionPanel';
import { Button } from './ui/button';
import { ArrowLeft, Copy } from 'lucide-react';
import { Card } from './ui/card';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';

interface SessionViewProps {
  session: Session;
  isReadOnly: boolean;
  onBack: () => void;
  onUpdateSession: (session: Session) => void;
  selectedDevice: string;
  bibleVersion: string;
  primaryLanguage: string;
  minConfidence: number;
  maxReferences: number;
}

export function SessionView({ 
  session, 
  isReadOnly, 
  onBack, 
  onUpdateSession,
  selectedDevice,
  bibleVersion,
  primaryLanguage,
  minConfidence,
  maxReferences
}: SessionViewProps) {
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  
  // Media recording hook
  const { stream, isRecording: mediaIsRecording, error: mediaError, startRecording: startMedia, stopRecording: stopMedia } = useMediaRecorder({ deviceId: selectedDevice !== 'default' ? selectedDevice : undefined });
  
  // WebSocket hook for real-time transcription
  const { connectionState, error: wsError, lastResult, connect, disconnect } = useRealtimeWebSocket({
    stream,
    autoConnect: false,
    preferredBibleVersion: bibleVersion,
    primaryLanguage,
    minConfidence: minConfidence / 100,
    maxReferences,
  });

  useEffect(() => {
    if (shouldConnect && stream && connectionState === 'disconnected') {
      connect().then(() => {
        setShouldConnect(false);
        setHasConnected(true);
      }).catch((err) => {
        toast.error(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setShouldConnect(false);
      });
    }
  }, [shouldConnect, stream, connectionState, connect]);

  // Update session when we get new transcription results
  useEffect(() => {
    if (lastResult && lastResult.transcript) {
      const newSegment: TranscriptSegment = {
        id: `seg-${Date.now()}`,
        text: lastResult.transcript,
        timestamp: new Date(),
        confidence: 0.9
      };

      const newReferences: ScriptureReference[] = (lastResult.matches || []).map((match: any) => ({
        id: `ref-${Date.now()}-${Math.random()}`,
        book: match.reference.split(' ')[0],
        chapter: parseInt(match.reference.match(/\d+/)?.[0] || '1'),
        verse: parseInt(match.reference.match(/:(\d+)/)?.[1] || '1'),
        version: match.version || bibleVersion,
        text: match.quote || '',
        confidence: match.confidence || 0.5,
        transcriptSegmentId: newSegment.id
      }));

      const updatedSession = {
        ...session,
        transcripts: [...session.transcripts, newSegment],
        scriptureReferences: [...session.scriptureReferences, ...newReferences]
      };
      
      onUpdateSession(updatedSession);
    }
  }, [lastResult]);

  // Handle errors
  useEffect(() => {
    if (mediaError) {
      toast.error(`Media error: ${mediaError}`);
    }
    if (wsError) {
      toast.error(`Connection error: ${wsError}`);
    }
  }, [mediaError, wsError]);

  const handleStartRecording = async () => {
    try {
      await startMedia();
      setShouldConnect(true);
      
      const updatedSession = {
        ...session,
        isRecording: true,
        isPaused: false
      };
      onUpdateSession(updatedSession);
      toast.success('Recording started');
    } catch (err) {
      toast.error(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePauseRecording = () => {
    disconnect();
    
    onUpdateSession({
      ...session,
      isRecording: false,
      isPaused: true
    });
    toast.info('Recording paused');
  };

  const handleResumeRecording = async () => {
    try {
      if (!stream) {
        await startMedia();
        setShouldConnect(true);
      } else {
        await connect();
      }
      
      const updatedSession = {
        ...session,
        isRecording: true,
        isPaused: false
      };
      onUpdateSession(updatedSession);
      toast.success('Recording resumed');
    } catch (err) {
      toast.error(`Failed to resume recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEndSessionClick = () => {
    setShowEndConfirmation(true);
  };

  const handleConfirmEndSession = () => {
    disconnect();
    stopMedia();
    
    onUpdateSession({
      ...session,
      status: 'ended',
      isRecording: false,
      isPaused: false
    });
    setShowEndConfirmation(false);
    toast.success('Session ended successfully');
  };

  const handleCopySessionId = async () => {
    const success = await copyToClipboard(session.sessionCode);
    if (success) {
      toast.success('Session ID copied to clipboard');
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Convert to format expected by existing components (reversed for newest first)
  const transcriptionSegments = [...session.transcripts].reverse().map(t => ({
    id: t.id,
    text: t.text,
    timestamp: new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(t.timestamp))
  }));

  // Group scripture references by transcript segment
  const segmentRefs = session.transcripts.map(transcript => {
    const refsForSegment = session.scriptureReferences
      .filter(ref => ref.transcriptSegmentId === transcript.id)
      .map(ref => ({
        id: ref.id,
        reference: `${ref.book} ${ref.chapter}:${ref.verse}`,
        text: ref.text,
        confidence: ref.confidence,
        version: ref.version
      }));

    return {
      segmentId: transcript.id,
      timestamp: new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date(transcript.timestamp)),
      references: refsForSegment
    };
  }).filter(seg => seg.references.length > 0); // Only include segments with references

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-3 sm:px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Sessions</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row items-start justify-between gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl mb-1 text-foreground truncate">{session.title}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="truncate">Created by {session.userName}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{formatDate(session.startedAt)}</span>
              <span className="hidden sm:inline">•</span>
              <button 
                onClick={handleCopySessionId}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <span className="truncate">ID: {session.sessionCode}</span>
                <Copy className="w-3 h-3" />
              </button>
              <span className="hidden sm:inline">•</span>
              <span className={`flex items-center gap-1 ${
                connectionState === 'connected' ? 'text-green-600' :
                connectionState === 'connecting' ? 'text-yellow-600' :
                connectionState === 'failed' ? 'text-red-600' :
                connectionState === 'disconnected' && hasConnected ? 'text-orange-600' :
                'text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' || connectionState === 'connecting' ? 'animate-pulse' : ''
                } bg-current`} />
                {connectionState === 'connected' ? 'Connected' :
                 connectionState === 'connecting' ? 'Connecting' :
                 connectionState === 'failed' ? 'Failed' :
                 connectionState === 'disconnected' && hasConnected ? 'Disconnected' :
                 'Not Connected'}
              </span>
            </div>
          </div>

          <RecordingControls
            isRecording={session.isRecording}
            isPaused={session.isPaused}
            onStartRecording={handleStartRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            onEndSession={handleEndSessionClick}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: Resizable horizontal panels */}
        <div className="hidden md:block h-full">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={50}>
              <ScriptureReferences
                segmentRefs={segmentRefs}
                isRecording={session.isRecording}
                preferredVersion={bibleVersion}
                highlightedSegment={highlightedSegment}
                onReferenceHover={(segmentId) => setHighlightedSegment(segmentId)}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={30} minSize={20}>
              <TranscriptionPanel
                segments={transcriptionSegments}
                isRecording={session.isRecording}
                highlightedSegment={highlightedSegment}
                onSegmentHover={setHighlightedSegment}
                onSegmentClick={setHighlightedSegment}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile: Stacked panels */}
        <div className="flex flex-col h-full md:hidden">
          <div className="h-1/2 overflow-hidden border-b border-border">
            <TranscriptionPanel
              segments={transcriptionSegments}
              isRecording={session.isRecording}
              highlightedSegment={highlightedSegment}
              onSegmentHover={setHighlightedSegment}
              onSegmentClick={setHighlightedSegment}
            />
          </div>
          <div className="h-1/2 overflow-hidden">
            <ScriptureReferences
              segmentRefs={segmentRefs}
              isRecording={session.isRecording}
              preferredVersion={bibleVersion}
              highlightedSegment={highlightedSegment}
              onReferenceHover={(segmentId) => setHighlightedSegment(segmentId)}
            />
          </div>
        </div>
      </div>

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={showEndConfirmation} onOpenChange={setShowEndConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the recording and end the session. All transcripts and scripture references will be saved, but you won't be able to continue recording.
              <br /><br />
              <strong>Are you sure you want to end this session?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEndSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
