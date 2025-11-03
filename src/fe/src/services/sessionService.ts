import { Session, SessionSummary } from '../models/Session';

// Generate a random 4-character alphanumeric string
function generateSessionCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate full session ID: code-username
function generateSessionId(userName: string): string {
  const code = generateSessionCode();
  const sanitizedUsername = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${code}-${sanitizedUsername}`;
}

// LocalStorage keys
const SESSIONS_KEY = 'hoptranscribe_sessions';
const CURRENT_SESSION_KEY = 'hoptranscribe_current_session';

class SessionService {
  // Get all sessions from localStorage
  getAllSessions(): Session[] {
    const sessionsJson = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsJson) return [];
    
    const sessions = JSON.parse(sessionsJson);
    // Convert date strings back to Date objects
    return sessions.map((session: any) => ({
      ...session,
      startedAt: new Date(session.startedAt),
      transcripts: (session.transcripts || []).map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })),
      scriptureReferences: session.scriptureReferences || []
    }));
  }

  // Save all sessions to localStorage
  private saveAllSessions(sessions: Session[]): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  // Get a specific session by ID
  getSessionById(sessionId: string): Session | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.sessionCode === sessionId) || null;
  }

  // Create a new session
  createSession(userName: string, title: string): Session {
    const sessionCode = generateSessionId(userName);
    const newSession: Session = {
      id: `session-${Date.now()}`,
      sessionCode,
      userName,
      title,
      startedAt: new Date(),
      status: 'active',
      isRecording: false,
      isPaused: false,
      transcripts: [],
      scriptureReferences: []
    };
    
    const sessions = this.getAllSessions();
    sessions.push(newSession);
    this.saveAllSessions(sessions);
    
    return newSession;
  }

  // Update a session
  updateSession(updatedSession: Session): void {
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.id === updatedSession.id);
    if (index !== -1) {
      sessions[index] = updatedSession;
      this.saveAllSessions(sessions);
      
      // Update current session if it's the active one
      const currentSessionId = this.getCurrentSessionId();
      if (currentSessionId === updatedSession.sessionCode) {
        this.setCurrentSession(updatedSession.sessionCode);
      }
    }
  }

  // Get current active session
  getCurrentSession(): Session | null {
    const sessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!sessionId) return null;
    return this.getSessionById(sessionId);
  }

  // Get current session ID
  private getCurrentSessionId(): string | null {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  }

  // Set current active session
  setCurrentSession(sessionCode: string | null): void {
    if (sessionCode) {
      localStorage.setItem(CURRENT_SESSION_KEY, sessionCode);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }

  // Get session history
  getSessionHistory(): SessionSummary[] {
    const sessions = this.getAllSessions();
    return sessions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map(session => ({
        id: session.id,
        sessionCode: session.sessionCode,
        userName: session.userName,
        title: session.title,
        startedAt: session.startedAt,
        status: session.status,
        duration: this.calculateDuration(session),
        scriptureCount: session.scriptureReferences.length
      }));
  }

  // Calculate session duration
  private calculateDuration(session: Session): number {
    if (session.transcripts.length === 0) return 0;
    
    const firstTimestamp = session.transcripts[0].timestamp.getTime();
    const lastTimestamp = session.transcripts[session.transcripts.length - 1].timestamp.getTime();
    
    return Math.floor((lastTimestamp - firstTimestamp) / 1000);
  }

  // Delete a session
  deleteSession(sessionId: string): void {
    const sessions = this.getAllSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    this.saveAllSessions(filteredSessions);
    
    // Clear current session if it was deleted
    const current = this.getCurrentSessionId();
    const deletedSession = sessions.find(s => s.id === sessionId);
    if (current === deletedSession?.sessionCode) {
      this.setCurrentSession(null);
    }
  }

  // End a session
  endSession(session: Session): Session {
    const updatedSession = {
      ...session,
      status: 'ended' as const,
      isRecording: false,
      isPaused: false
    };
    this.updateSession(updatedSession);
    this.setCurrentSession(null);
    return updatedSession;
  }
}

export const sessionService = new SessionService();
