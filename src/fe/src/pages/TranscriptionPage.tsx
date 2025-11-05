import { useState, useEffect } from 'react';
import { Session } from '../models/Session';
import { sessionService } from '../services/sessionService';
import { SessionHistory } from '../components/SessionHistory';
import { CreateSessionDialog } from '../components/CreateSessionDialog';
import { JoinSessionDialog } from '../components/JoinSessionDialog';
import { SessionView } from '../components/SessionView';
import { Button } from '../components/ui/button';
import { Plus, LogIn } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { loggingService } from '@/services/loggingService';
import { SESSION_STATUS } from '@/constants/sessionConstants';

type AppView = 'history' | 'session';

interface TranscriptionPageProps {
  selectedDevice: string;
  bibleVersion: string;
  primaryLanguage: string;
  minConfidence: number;
  maxReferences: number;
}

export default function TranscriptionPage({ 
  selectedDevice,
  bibleVersion,
  primaryLanguage,
  minConfidence,
  maxReferences
}: TranscriptionPageProps) {
  const [currentView, setCurrentView] = useState<AppView>('history');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [joinSessionDialogOpen, setJoinSessionDialogOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const result = await sessionService.getAllSessions({ pageSize: 100 });
      setSessions(result.items || []);
    } catch (error) {
      setSessions([]);
      toast.error('Failed to load sessions');
      loggingService.error('Error loading sessions', 'TranscriptionPage', error as Error);
    }
  };

  const handleCreateSession = async (userName: string, title: string) => {
    try {
      localStorage.setItem('hoptranscribe_username', userName);
      const newSession = await sessionService.createSession(userName, title);
      setActiveSession(newSession);
      setIsReadOnly(false);
      setCurrentView('session');
      setNewSessionDialogOpen(false);
      await loadSessions();
      toast.success(`Session created! ID: ${newSession.sessionCode}`);
    } catch (error) {
      loggingService.error('Error creating session', 'TranscriptionPage', error as Error);
      toast.error('Failed to create session');
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      const session = await sessionService.getSessionById(sessionId);
      
      if (!session) {
        toast.error('Session not found. Please check the session ID and try again.');
        return;
      }
      
      if (session.status !== SESSION_STATUS.ACTIVE) {
        toast.error('This session has ended. You can only join active sessions.');
        return;
      }
      
      setActiveSession(session);
      setIsReadOnly(true);
      setCurrentView('session');
      setJoinSessionDialogOpen(false);
      toast.success(`Joined session: ${session.title}`);
    } catch (error) {
      loggingService.error('Error joining session', 'TranscriptionPage', error as Error);
      toast.error('Failed to join session');
    }
  };

  const handleOpenSession = async (session: Session) => {
    try {
      const fullSession = await sessionService.getSessionById(session.sessionCode);
      
      if (!fullSession) {
        toast.error('Session not found');
        return;
      }
      
      setActiveSession(fullSession);
      const currentUser = localStorage.getItem('hoptranscribe_username') || '';
      const isOwner = fullSession.userName === currentUser;
      const isEndedSession = fullSession.status === SESSION_STATUS.ENDED;
      setIsReadOnly(isEndedSession || !isOwner);
      
      setCurrentView('session');
    } catch (error) {
      loggingService.error('Error opening session', 'TranscriptionPage', error as Error);
      toast.error('Failed to open session');
    }
  };

  const handleUpdateSession = async (updatedSession: Session) => {
    setActiveSession(updatedSession);
    
    if (isReadOnly) {
      return;
    }
    
    try {
      await sessionService.updateSession(updatedSession.sessionCode, {
        title: updatedSession.title,
        status: updatedSession.status,
        isRecording: updatedSession.isRecording,
        isPaused: updatedSession.isPaused
      });
      await loadSessions();
    } catch (error) {
      loggingService.error('Error updating session', 'TranscriptionPage', error as Error);
      toast.error('Failed to update session');
    }
  };

  const handleBackToHistory = () => {
    setCurrentView('history');
    setActiveSession(null);
    setIsReadOnly(false);
    loadSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {currentView === 'history' ? (
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 sm:mb-8">
            <Button 
              onClick={() => setNewSessionDialogOpen(true)}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Start New Session
            </Button>
            <Button 
              onClick={() => setJoinSessionDialogOpen(true)}
              variant="outline"
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <LogIn className="w-4 h-4" />
              Join Ongoing Session
            </Button>
          </div>

          <SessionHistory 
            sessions={sessions} 
            onOpenSession={handleOpenSession}
          />
        </div>
      ) : activeSession ? (
        <SessionView
          session={activeSession}
          isReadOnly={isReadOnly}
          onBack={handleBackToHistory}
          onUpdateSession={handleUpdateSession}
          selectedDevice={selectedDevice}
          bibleVersion={bibleVersion}
          primaryLanguage={primaryLanguage}
          minConfidence={minConfidence}
          maxReferences={maxReferences}
        />
      ) : null}

      <CreateSessionDialog
        open={newSessionDialogOpen}
        onOpenChange={setNewSessionDialogOpen}
        onCreateSession={handleCreateSession}
      />
      
      <JoinSessionDialog
        open={joinSessionDialogOpen}
        onOpenChange={setJoinSessionDialogOpen}
        onJoinSession={handleJoinSession}
      />
    </div>
  );
}
