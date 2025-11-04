import { Session, SessionSummary, TranscriptSegment, ScriptureReference } from '../models/Session';
import { ApiResponse, PaginatedResult, SessionQueryParams } from '../models/ApiTypes';
import { apiService } from './apiService';
import { API_CONSTANTS } from '../constants/apiConstants';

class SessionService {
  private readonly baseUrl = API_CONSTANTS.BACKEND.ENDPOINTS.SESSIONS;

  // Get all sessions with pagination and filtering
  async getAllSessions(params?: SessionQueryParams): Promise<PaginatedResult<Session>> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await apiService.get<ApiResponse<PaginatedResult<Session>>>(
      `${this.baseUrl}${queryString}`
    );
    return response.data;
  }

  async getSessionById(sessionCode: string): Promise<Session | null> {
    try {
      const response = await apiService.get<ApiResponse<Session>>(
        `${this.baseUrl}/${sessionCode}`
      );
      return this.convertSessionDates(response.data);
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  // Create a new session
  async createSession(userName: string, title: string): Promise<Session> {
    const response = await apiService.post<ApiResponse<Session>>(
      this.baseUrl,
      { userName, title }
    );
    return this.convertSessionDates(response.data);
  }

  async updateSession(sessionCode: string, updates: {
    title?: string;
    status?: string;
    isRecording?: boolean;
    isPaused?: boolean;
  }): Promise<Session> {
    const response = await apiService.put<ApiResponse<Session>>(
      `${this.baseUrl}/${sessionCode}`,
      updates
    );
    return this.convertSessionDates(response.data);
  }

  // End a session
  async endSession(sessionCode: string): Promise<Session> {
    const response = await apiService.patch<ApiResponse<Session>>(
      `${this.baseUrl}/${sessionCode}/end`
    );
    return this.convertSessionDates(response.data);
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${sessionId}`);
  }

  // Get current active session for a user
  async getCurrentSession(userId: string): Promise<Session | null> {
    try {
      const response = await apiService.get<ApiResponse<Session>>(
        `${this.baseUrl}/current/${userId}`
      );
      return this.convertSessionDates(response.data);
    } catch (error) {
      console.error('Error fetching current session:', error);
      return null;
    }
  }

  async getSessionHistory(params?: SessionQueryParams): Promise<SessionSummary[]> {
    const result = await this.getAllSessions(params);
    return result.items.map(session => ({
      id: session.id,
      sessionCode: session.sessionCode,
      userName: session.userName,
      title: session.title,
      startedAt: session.startedAt,
      status: session.status,
      duration: session.duration || 0,
      scriptureCount: session.scriptureReferences?.length || 0
    }));
  }

  async addTranscript(sessionCode: string, text: string, confidence: number): Promise<TranscriptSegment> {
    const response = await apiService.post<ApiResponse<TranscriptSegment>>(
      `${this.baseUrl}/${sessionCode}/transcripts`,
      { text, confidence }
    );
    return this.convertTranscriptDates(response.data);
  }

  async getTranscripts(sessionCode: string): Promise<TranscriptSegment[]> {
    const response = await apiService.get<ApiResponse<TranscriptSegment[]>>(
      `${this.baseUrl}/${sessionCode}/transcripts`
    );
    return response.data.map(t => this.convertTranscriptDates(t));
  }

  // Add scripture reference to session
  async addScripture(sessionCode: string, scripture: {
    book: string;
    chapter: number;
    verse: number;
    version: string;
    text: string;
    confidence: number;
    transcriptSegmentId: string;
  }): Promise<ScriptureReference> {
    const response = await apiService.post<ApiResponse<ScriptureReference>>(
      `${this.baseUrl}/${sessionCode}/scriptures`,
      scripture
    );
    return response.data;
  }

  // Get all scripture references for a session
  async getScriptures(sessionCode: string): Promise<ScriptureReference[]> {
    const response = await apiService.get<ApiResponse<ScriptureReference[]>>(
      `${this.baseUrl}/${sessionCode}/scriptures`
    );
    return response.data;
  }

  private convertSessionDates(session: Session): Session {
    return {
      ...session,
      startedAt: new Date(session.startedAt),
      endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
      updatedAt: new Date(session.updatedAt),
      transcripts: (session.transcripts || []).map(t => this.convertTranscriptDates(t)),
      scriptureReferences: session.scriptureReferences || []
    };
  }

  private convertTranscriptDates(transcript: TranscriptSegment): TranscriptSegment {
    return {
      ...transcript,
      timestamp: new Date(transcript.timestamp)
    };
  }
}

export const sessionService = new SessionService();
