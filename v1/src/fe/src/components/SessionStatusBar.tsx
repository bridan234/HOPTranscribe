/**
 * Session Status Bar Component
 * Displays current session information and controls
 */

import { useState, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import type { Session } from '../models/Session';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface SessionStatusBarProps {
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
}

export function SessionStatusBar({ onPause, onResume, onEnd }: SessionStatusBarProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [duration, setDuration] = useState<string>('0:00');

  useEffect(() => {
    // Check for current session
    const currentSession = sessionService.getCurrentSession();
    setSession(currentSession);

    // Update duration every second for active sessions
    const interval = setInterval(() => {
      const updatedSession = sessionService.getCurrentSession();
      if (updatedSession && updatedSession.status === 'active') {
        const elapsed = Math.floor(
          (Date.now() - new Date(updatedSession.startedAt).getTime()) / 1000
        );
        setDuration(formatDuration(elapsed));
        setSession(updatedSession);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!session || session.status === 'completed' || session.status === 'error') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-3 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(session.status)}>
            {session.status === 'active' && <span className="animate-pulse mr-2">●</span>}
            {session.status.toUpperCase()}
          </Badge>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Session:</span>
            <span className="text-sm text-muted-foreground">
              {session.metadata.title || 'Recording'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Duration:</span>
            <span className="text-sm font-mono">{duration}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Scriptures:</span>
            <Badge variant="outline">{session.scriptureCount}</Badge>
          </div>

          {session.lastCheckpointAt && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Last checkpoint:{' '}
                {new Date(session.lastCheckpointAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'active' && onPause && (
            <Button size="sm" variant="outline" onClick={onPause}>
              Pause
            </Button>
          )}

          {session.status === 'paused' && onResume && (
            <Button size="sm" variant="default" onClick={onResume}>
              Resume
            </Button>
          )}

          {onEnd && (
            <Button size="sm" variant="destructive" onClick={onEnd}>
              End Session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
