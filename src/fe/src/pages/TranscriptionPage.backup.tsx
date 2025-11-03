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

type AppView = 'history' | 'session';

export default function TranscriptionPage() {
  const [currentView, setCurrentView] = useState<AppView>('history');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [joinSessionDialogOpen, setJoinSessionDialogOpen] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    
    // Check if there's a current active session
    const current = sessionService.getCurrentSession();
    if (current) {
      setActiveSession(current);
      setCurrentView('session');
    }
  }, []);

  const loadSessions = () => {
    const allSessions = sessionService.getAllSessions();
    setSessions(allSessions);
  };

  const handleCreateSession = (userName: string, title: string) => {
    const newSession = sessionService.createSession(userName, title);
    sessionService.setCurrentSession(newSession.sessionCode);
    setActiveSession(newSession);
    setIsReadOnly(false);
    setCurrentView('session');
    setNewSessionDialogOpen(false);
    loadSessions();
    toast.success(`Session created! ID: ${newSession.sessionCode}`);
  };

  const handleJoinSession = (sessionId: string) => {
    const session = sessionService.getSessionById(sessionId);
    
    if (!session) {
      toast.error('Session not found. Please check the session ID and try again.');
      return;
    }
    
    if (session.status !== 'active') {
      toast.error('This session has ended. You can only join active sessions.');
      return;
    }
    
    setActiveSession(session);
    setIsReadOnly(true);
    setCurrentView('session');
    setJoinSessionDialogOpen(false);
    toast.success(`Joined session: ${session.title}`);
  };

  const handleOpenSession = (session: Session) => {
    setActiveSession(session);
    
    // Past sessions are always read-only
    setIsReadOnly(session.status === 'ended');
    
    setCurrentView('session');
  };

  const handleUpdateSession = (updatedSession: Session) => {
    sessionService.updateSession(updatedSession);
    setActiveSession(updatedSession);
    loadSessions();
  };

  const handleBackToHistory = () => {
    setCurrentView('history');
    setActiveSession(null);
    setIsReadOnly(false);
    sessionService.setCurrentSession(null);
    loadSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {currentView === 'history' ? (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Church Transcription</h1>
            <p className="text-gray-600">
              Real-time audio transcription with AI-powered scripture reference detection
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <Button 
              onClick={() => setNewSessionDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              Start New Session
            </Button>
            <Button 
              onClick={() => setJoinSessionDialogOpen(true)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <LogIn className="w-5 h-5" />
              Join Ongoing Session
            </Button>
          </div>

          {/* Session History */}
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
        />
      ) : null}

      {/* Dialogs */}
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
