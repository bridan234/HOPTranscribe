export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  username: string;
}

export interface SessionDto {
  id: string;
  code: string;
  title: string;
  ownerUsername: string;
  status: 'active' | 'ended';
  language: string;
  createdAt: string;
  endedAt: string | null;
  segmentCount: number;
}

export interface ScriptureMatchDto {
  id?: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
  version: string;
  quote: string;
  confidence: number;
  rank: number;
}

export interface TranscriptSegmentDto {
  id: string;
  text: string;
  startedAt: string;
  endedAt: string;
  matches: ScriptureMatchDto[];
}

export interface TranscriptionSessionResponse {
  clientSecret: string;
  expiresAt: string;
  model: string;
  sdpUrl: string;
  sessionId: string;
  language: string;
}

export interface MatchResponse {
  matches: ScriptureMatchDto[];
}
