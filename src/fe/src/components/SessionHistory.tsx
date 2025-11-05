import React, { useState } from 'react';
import { Session } from '../models/Session';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Clock, Calendar, User, Search } from 'lucide-react';
import { SESSION_STATUS } from '../constants/sessionConstants';

interface SessionHistoryProps {
  sessions: Session[];
  onOpenSession: (session: Session) => void;
}

export function SessionHistory({ sessions, onOpenSession }: SessionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const filteredSessions = sortedSessions.filter(session => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (session.title || '').toLowerCase().includes(query) ||
      (session.userName || '').toLowerCase().includes(query) ||
      (session.sessionCode || '').toLowerCase().includes(query) ||
      (session.transcripts || []).some(t => (t.text || '').toLowerCase().includes(query)) ||
      (session.scriptureReferences || []).some(ref => 
        (ref.book || '').toLowerCase().includes(query) ||
        (ref.text || '').toLowerCase().includes(query)
      )
    );
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getSessionDuration = (session: Session) => {
    if (session.transcripts.length === 0) return 'No recordings';
    
    const firstTimestamp = new Date(session.transcripts[0].timestamp);
    const lastTimestamp = new Date(session.transcripts[session.transcripts.length - 1].timestamp);
    const durationMs = lastTimestamp.getTime() - firstTimestamp.getTime();
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <h2 className="text-xl sm:text-2xl">Session History</h2>
        <div className="text-xs sm:text-sm text-gray-500">
          {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm sm:text-base"
        />
      </div>
      
      {filteredSessions.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          {sessions.length === 0 ? (
            <p>No sessions yet. Create a new session to get started.</p>
          ) : (
            <p>No sessions match your search. Try different keywords.</p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map(session => (
            <Card 
              key={session.id} 
              className="p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onOpenSession(session)}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="truncate text-sm sm:text-base">{session.title}</h3>
                    <span 
                      className={`px-2 py-0.5 rounded text-xs ${
                        session.status === SESSION_STATUS.ACTIVE
                          ? 'bg-green-100 text-green-800'
                          : session.status === SESSION_STATUS.NEW
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {session.status === SESSION_STATUS.ACTIVE ? 'Active' : session.status === SESSION_STATUS.NEW ? 'New' : 'Ended'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{session.userName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{formatDate(session.startedAt)}</span>
                      <span className="sm:hidden">
                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(session.startedAt))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{getSessionDuration(session)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs sm:text-sm text-gray-500 flex flex-wrap gap-1">
                    <span className="hidden sm:inline">Session ID: {session.sessionCode}</span>
                    <span className="sm:hidden">{session.sessionCode}</span>
                    <span className="mx-1 sm:mx-2">•</span>
                    <span>{session.transcripts.length} transcript{session.transcripts.length !== 1 ? 's' : ''}</span>
                    <span className="mx-1 sm:mx-2">•</span>
                    <span>{session.scriptureReferences.length} reference{session.scriptureReferences.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="text-xs sm:text-sm shrink-0">
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
