import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Session, TranscriptSegment, ScriptureReference } from '../models/Session';
import { RecordingControls } from './RecordingControls';
import { ScriptureReferences } from './ScriptureReferences';
import { TranscriptionPanel } from './TranscriptionPanel';
import { Button } from './ui/button';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { Card } from './ui/card';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useRealtimeWebSocket } from '../hooks/useRealtimeWebSocket';
import { signalRService } from '../services/signalRService';
import { sessionService } from '../services/sessionService';
import { loggingService } from '../services/loggingService';
import { SIGNALR_STATES } from '../constants/signalRConstants';
import { SESSION_STATUS, SESSION_MESSAGES, CONNECTION_STATUS_DISPLAY } from '../constants/sessionConstants';
import { CONNECTION_STATES } from '../constants/openaiConstants';

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
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const lastBroadcastSegmentId = useRef<string | null>(null);
  const sessionRef = useRef(session);
  const onUpdateSessionRef = useRef(onUpdateSession);
  
  useEffect(() => {
    sessionRef.current = session;
    onUpdateSessionRef.current = onUpdateSession;
  }, [session, onUpdateSession]);
  
  const { stream, isRecording: mediaIsRecording, error: mediaError, startRecording: startMedia, stopRecording: stopMedia } = useMediaRecorder({ deviceId: selectedDevice !== 'default' ? selectedDevice : undefined });
  
  const { connectionState, error: wsError, lastResult, connect, disconnect } = useRealtimeWebSocket({
    stream,
    autoConnect: false,
    preferredBibleVersion: bibleVersion,
    primaryLanguage,
    minConfidence: minConfidence / 100,
    maxReferences,
  });

  useEffect(() => {
    if (isReadOnly && (session.status === SESSION_STATUS.ACTIVE || session.status === SESSION_STATUS.NEW)) {
      signalRService.connect(session.sessionCode)
        .then(() => {
          setIsSignalRConnected(true);
        })
        .catch((err) => {
          console.error('SignalR connection failed:', err);
        });
    }

    return () => {
      signalRService.disconnect();
      setIsSignalRConnected(false);
    };
  }, [session.sessionCode, isReadOnly]);

  useEffect(() => {
    if (!isSignalRConnected) return;

    const handleReceiveTranscript = (segment: TranscriptSegment) => {
      if (segment.id === lastBroadcastSegmentId.current) return;

      const currentSession = sessionRef.current;
      const updatedSession = {
        ...currentSession,
        transcripts: [...(currentSession.transcripts || []), segment]
      };
      onUpdateSessionRef.current(updatedSession);
    };

    const handleReceiveScripture = (reference: ScriptureReference) => {
      const currentSession = sessionRef.current;
      const updatedSession = {
        ...currentSession,
        scriptureReferences: [...(currentSession.scriptureReferences || []), reference]
      };
      onUpdateSessionRef.current(updatedSession);
    };

    const handleUserJoined = (data: { connectionId: string; timestamp: string }) => {
      setCollaboratorCount(prev => prev + 1);
      toast.info(SESSION_MESSAGES.PARTICIPANT_JOINED);
    };

    const handleUserLeft = (data: { connectionId: string; timestamp: string }) => {
      setCollaboratorCount(prev => Math.max(0, prev - 1));
      toast.info(SESSION_MESSAGES.PARTICIPANT_LEFT);
    };

    const handleReceiveSessionUpdate = (sessionUpdate: Partial<Session>) => {
      const currentSession = sessionRef.current;
      const updatedSession = { ...currentSession, ...sessionUpdate };
      onUpdateSessionRef.current(updatedSession);
    };

    signalRService.onReceiveTranscript(handleReceiveTranscript);
    signalRService.onReceiveScripture(handleReceiveScripture);
    signalRService.onUserJoined(handleUserJoined);
    signalRService.onUserLeft(handleUserLeft);
    signalRService.onReceiveSessionUpdate(handleReceiveSessionUpdate);
  }, [isSignalRConnected]); 

  useEffect(() => {
    if (!isReadOnly && shouldConnect && stream && connectionState === CONNECTION_STATES.DISCONNECTED) {
      connect().then(() => {
        setShouldConnect(false);
        setHasConnected(true);
      }).catch((err) => {
        toast.error(`${SESSION_MESSAGES.CONNECT_FAILED}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setShouldConnect(false);
      });
    }
  }, [isReadOnly, shouldConnect, stream, connectionState, connect]);

  useEffect(() => {
    if (isReadOnly || !lastResult || !lastResult.transcript) return;
    
    const processTranscription = async () => {
      try {
        const savedSegment = await sessionService.addTranscript(
          session.sessionCode, 
          lastResult.transcript, 
          0.9
        );

        const newReferences: ScriptureReference[] = (lastResult.matches || []).map((match: any) => ({
          id: `ref-${Date.now()}-${Math.random()}`,
          book: match.reference.split(' ')[0],
          chapter: parseInt(match.reference.match(/\d+/)?.[0] || '1'),
          verse: parseInt(match.reference.match(/:(\d+)/)?.[1] || '1'),
          version: match.version || bibleVersion,
          text: match.quote || '',
          confidence: match.confidence || 0.5,
          transcriptSegmentId: savedSegment.id
        }));

        const updatedSession = {
          ...session,
          transcripts: [...(session.transcripts || []), savedSegment],
          scriptureReferences: [...session.scriptureReferences, ...newReferences]
        };
        
        onUpdateSession(updatedSession);

        for (const ref of newReferences) {
          try {
            await sessionService.addScripture(session.sessionCode, {
              book: ref.book,
              chapter: ref.chapter,
              verse: ref.verse,
              version: ref.version,
              text: ref.text,
              confidence: ref.confidence,
              transcriptSegmentId: ref.transcriptSegmentId
            });
          } catch (err) {
            loggingService.error('Failed to persist scripture reference to backend', 'SessionView', err as Error);
          }
        }

        if (signalRService.isConnected()) {
          lastBroadcastSegmentId.current = savedSegment.id;
          await signalRService.broadcastTranscript(session.sessionCode, savedSegment);
          
          for (const ref of newReferences) {
            await signalRService.broadcastScripture(session.sessionCode, ref);
          }
        }
      } catch (err) {
        loggingService.error('Failed to persist transcript to backend', 'SessionView', err as Error);
      }
    };

    processTranscription();
  }, [isReadOnly, lastResult, isSignalRConnected, session.sessionCode, bibleVersion]);

  useEffect(() => {
    if (mediaError) {
      toast.error(`${SESSION_MESSAGES.MEDIA_ERROR}: ${mediaError}`);
    }
    if (wsError) {
      toast.error(`${SESSION_MESSAGES.CONNECTION_ERROR}: ${wsError}`);
    }
  }, [mediaError, wsError]);

  useEffect(() => {
    if (isReadOnly || session.status === SESSION_STATUS.ENDED) {
      if (connectionState !== CONNECTION_STATES.DISCONNECTED) {
        disconnect();
      }
      if (mediaIsRecording) {
        stopMedia();
      }
    }
  }, [isReadOnly, session.status, connectionState, mediaIsRecording, disconnect, stopMedia]);

  const handleStartRecording = async () => {
    try {
      // Connect SignalR before starting recording and wait for it
      if (!isSignalRConnected) {
        await signalRService.connect(session.sessionCode);
        setIsSignalRConnected(true);
        // Small delay to ensure SignalR handlers are registered
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await startMedia();
      setShouldConnect(true);
      
      const updatedSession = {
        ...session,
        status: session.status === SESSION_STATUS.NEW ? SESSION_STATUS.ACTIVE : session.status,
        isRecording: true,
        isPaused: false
      };
      onUpdateSession(updatedSession);
      toast.success(SESSION_MESSAGES.RECORDING_STARTED);
    } catch (err) {
      toast.error(`${SESSION_MESSAGES.START_FAILED}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePauseRecording = async () => {
    disconnect();
    
    const updatedSession = {
      ...session,
      isRecording: false,
      isPaused: true
    };
    
    onUpdateSession(updatedSession);
    
    if (signalRService.isConnected()) {
      await signalRService.broadcastSessionUpdate(session.sessionCode, {
        isRecording: false,
        isPaused: true
      });
    }
    
    toast.success(SESSION_MESSAGES.RECORDING_PAUSED);
  };

  const handleResumeRecording = async () => {
    try {
      // Reconnect SignalR when resuming
      if (!isSignalRConnected) {
        await signalRService.connect(session.sessionCode);
        setIsSignalRConnected(true);
      }
      
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
      
      if (signalRService.isConnected()) {
        await signalRService.broadcastSessionUpdate(session.sessionCode, {
          isRecording: true,
          isPaused: false
        });
      }
      
      toast.success(SESSION_MESSAGES.RECORDING_RESUMED);
    } catch (err) {
      toast.error(`${SESSION_MESSAGES.RESUME_FAILED}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEndSessionClick = () => {
    setShowEndConfirmation(true);
  };

  const handleConfirmEndSession = async () => {
    disconnect();
    stopMedia();
    
    const updatedSession = {
      ...session,
      status: SESSION_STATUS.ENDED,
      isRecording: false,
      isPaused: false
    };
    
    if (signalRService.isConnected()) {
      await signalRService.broadcastSessionUpdate(session.sessionCode, {
        status: SESSION_STATUS.ENDED,
        isRecording: false,
        isPaused: false
      });
    }
    
    onUpdateSession(updatedSession);
    setShowEndConfirmation(false);
    toast.success(SESSION_MESSAGES.SESSION_ENDED);
  };

  const handleCopySessionId = async () => {
    const success = await copyToClipboard(session.sessionCode);
    if (success) {
      toast.success(SESSION_MESSAGES.SESSION_ID_COPIED);
    } else {
      toast.error(SESSION_MESSAGES.COPY_FAILED);
    }
  };

  const formatDate = (date: Date) => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const transcriptionSegments = [...(session.transcripts || [])].reverse().map(t => {
    const timestamp = new Date(t.timestamp);
    return {
      id: t.id,
      text: t.text,
      timestamp: isNaN(timestamp.getTime())
        ? 'Invalid time'
        : new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(timestamp)
    };
  });

  const segmentRefs = (session.transcripts || []).map(transcript => {
    const refsForSegment = (session.scriptureReferences || [])
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
      timestamp: (() => {
        const ts = new Date(transcript.timestamp);
        return isNaN(ts.getTime())
          ? 'Invalid time'
          : new Intl.DateTimeFormat('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).format(ts);
      })(),
      references: refsForSegment
    };
  }).filter(seg => seg.references.length > 0);

  return (
    <div className="h-screen flex flex-col">
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
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl text-foreground truncate">{session.title}</h1>
              <span 
                className={`px-2 py-0.5 rounded text-xs ${
                  session.status === SESSION_STATUS.ENDED
                    ? 'bg-gray-100 text-gray-800' 
                    : session.status === SESSION_STATUS.NEW
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {session.status === SESSION_STATUS.ENDED ? 'Ended' : session.status === SESSION_STATUS.NEW ? 'New' : 'Active'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span className="truncate">Created by {session.userName}</span>
              {isReadOnly && session.status !== SESSION_STATUS.ENDED && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
                    View Only
                  </span>
                </>
              )}
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
                connectionState === CONNECTION_STATES.CONNECTED ? CONNECTION_STATUS_DISPLAY.CONNECTED.COLOR :
                connectionState === CONNECTION_STATES.CONNECTING ? CONNECTION_STATUS_DISPLAY.CONNECTING.COLOR :
                connectionState === CONNECTION_STATES.FAILED ? CONNECTION_STATUS_DISPLAY.FAILED.COLOR :
                connectionState === CONNECTION_STATES.DISCONNECTED && hasConnected ? CONNECTION_STATUS_DISPLAY.DISCONNECTED.COLOR :
                CONNECTION_STATUS_DISPLAY.NOT_CONNECTED.COLOR
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionState === CONNECTION_STATES.CONNECTED || connectionState === CONNECTION_STATES.CONNECTING ? 'animate-pulse' : ''
                } bg-current`} />
                {connectionState === CONNECTION_STATES.CONNECTED ? CONNECTION_STATUS_DISPLAY.CONNECTED.LABEL :
                 connectionState === CONNECTION_STATES.CONNECTING ? CONNECTION_STATUS_DISPLAY.CONNECTING.LABEL :
                 connectionState === CONNECTION_STATES.FAILED ? CONNECTION_STATUS_DISPLAY.FAILED.LABEL :
                 connectionState === CONNECTION_STATES.DISCONNECTED && hasConnected ? CONNECTION_STATUS_DISPLAY.DISCONNECTED.LABEL :
                 CONNECTION_STATUS_DISPLAY.NOT_CONNECTED.LABEL}
              </span>
              {isSignalRConnected && session.status === SIGNALR_STATES.ACTIVE && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {collaboratorCount + 1}
                </Badge>
              )}
            </div>
          </div>

          <RecordingControls
            isRecording={session.isRecording}
            isPaused={session.isPaused}
            onStartRecording={handleStartRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            onEndSession={handleEndSessionClick}
            isReadOnly={isReadOnly || session.status === SESSION_STATUS.ENDED}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
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
