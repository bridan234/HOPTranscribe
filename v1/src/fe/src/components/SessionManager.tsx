/**
 * Session Manager Component
 * UI for viewing, managing, and recovering transcription sessions
 */

import { useState, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import type { Session, SessionSummary } from '../models/Session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface SessionManagerProps {
  // No restore functionality - sessions are readonly
}

export function SessionManager({}: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const history = await sessionService.getSessionHistory();
      setSessions(history.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()));
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const viewSessionDetails = async (sessionId: string) => {
    try {
      setLoading(true);
      const session = await sessionService.getSession(sessionId);
      setSelectedSession(session);
      setError(null);
    } catch (err) {
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      setLoading(true);
      await sessionService.deleteSession(sessionId);
      await loadSessions();
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      setError(null);
    } catch (err) {
      setError('Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Session History</h1>
        <Button onClick={loadSessions} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Sessions ({sessions.length})</CardTitle>
              <CardDescription>Click to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <Card
                      key={session.id}
                      className={`cursor-pointer hover:bg-accent ${
                        selectedSession?.id === session.id ? 'border-primary' : ''
                      }`}
                      onClick={() => viewSessionDetails(session.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium truncate">
                              {session.title || 'Untitled Session'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(session.startedAt).toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-600 font-mono mt-1">
                              Code: {session.sessionCode}
                            </div>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>@{session.username}</span>
                          <span>{formatDuration(session.duration)}</span>
                          <span>{session.scriptureCount} scriptures</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {sessions.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground py-8">
                      No sessions found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div className="md:col-span-2">
          {selectedSession ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedSession.metadata.title || 'Session Details'}
                      <Badge variant="outline" className="text-xs">Readonly</Badge>
                    </CardTitle>
                    <CardDescription>
                      Started: {new Date(selectedSession.startedAt).toLocaleString()}
                    </CardDescription>
                    <div className="text-sm text-blue-600 font-mono mt-2">
                      Session Code: {selectedSession.sessionCode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSession(selectedSession.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status & Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <Badge className={getStatusColor(selectedSession.status)}>
                      {selectedSession.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Duration</div>
                    <div className="text-sm">{formatDuration(selectedSession.duration)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Scripture Count</div>
                    <div className="text-sm">{selectedSession.scriptureCount}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Checkpoints</div>
                    <div className="text-sm">{selectedSession.checkpoints.length}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium">User</div>
                  <div className="text-sm">@{selectedSession.metadata.username}</div>
                </div>

                {selectedSession.metadata.speaker && (
                  <div>
                    <div className="text-sm font-medium">Speaker</div>
                    <div className="text-sm">{selectedSession.metadata.speaker}</div>
                  </div>
                )}

                {selectedSession.metadata.location && (
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm">{selectedSession.metadata.location}</div>
                  </div>
                )}

                {selectedSession.hasError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error: {selectedSession.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Scriptures */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Detected Scriptures ({selectedSession.scriptures.length})
                  </h3>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-2">
                      {selectedSession.scriptures.map((scripture, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="font-medium">{scripture.reference}</span>
                          <span className="text-muted-foreground">
                            {formatDuration(scripture.timestamp)}
                          </span>
                        </div>
                      ))}
                      {selectedSession.scriptures.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          No scriptures detected
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Transcript */}
                {selectedSession.transcript && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                    <ScrollArea className="h-[200px] border rounded-md p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedSession.transcript}
                      </p>
                    </ScrollArea>
                  </div>
                )}

                {/* Checkpoints */}
                {selectedSession.checkpoints.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Checkpoints ({selectedSession.checkpoints.length})
                      </h3>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {selectedSession.checkpoints.map((checkpoint) => (
                            <Card key={checkpoint.id}>
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-sm font-medium">
                                      {new Date(checkpoint.timestamp).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {checkpoint.scriptureCount} scriptures at{' '}
                                      {formatDuration(checkpoint.audioPosition)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px]">
                <div className="text-center text-muted-foreground">
                  Select a session to view details
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
