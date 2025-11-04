/**
 * Session Model - Tracks individual transcription sessions (sermons)
 * Inspired by Glass's session management architecture
 */

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

export interface ScriptureReference {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: string;
  text: string;
  confidence: number;
  transcriptSegmentId: string;
}

export interface SessionMetadata {
  title: string;
  username: string;
  speaker?: string;
  location?: string;
  notes?: string;
}

export interface Checkpoint {
  id: string;
  timestamp: Date;
  audioPosition: number; // Seconds from start
  scriptureCount: number;
  scriptures: Array<{
    book: string;
    chapter: number;
    verse: number;
    reference: string;
    timestamp: number;
  }>;
  transcript: string;
  settings: {
    selectedModel: string;
    apiKey: string;
  };
}

export type SessionStatus = 'active' | 'completed' | 'ended' | 'error';

export interface Session {
  id: string;
  sessionCode: string; // Format: "a23h-username" (4-digit alphanumeric + username)
  userName: string;
  title: string;
  startedAt: Date;
  endedAt?: Date;
  updatedAt: Date;
  status: SessionStatus;
  isReadonly?: boolean;
  isRecording?: boolean;
  isPaused?: boolean;
  
  // Duration tracking
  duration?: number; // Total seconds
  activeDuration?: number;
  
  // Content tracking
  transcripts?: TranscriptSegment[];
  scriptureReferences?: ScriptureReference[];
  scriptureCount?: number;
  scriptures?: Array<{
    book: string;
    chapter: number;
    verse: number;
    reference: string;
    timestamp: number;
  }>;
  transcript?: string;
  
  // Metadata (optional)
  metadata?: SessionMetadata;
  
  // Error recovery (optional)
  checkpoints?: Checkpoint[];
  lastCheckpointAt?: Date;
  hasError?: boolean;
  errorMessage?: string;
  
  // Settings snapshot (for recovery) (optional)
  settingsSnapshot?: {
    selectedModel: string;
    apiKey: string;
  };
}

export interface SessionSummary {
  id: string;
  sessionCode: string;
  userName: string;
  title: string;
  startedAt: Date;
  duration: number;
  scriptureCount: number;
  status: SessionStatus;
}
