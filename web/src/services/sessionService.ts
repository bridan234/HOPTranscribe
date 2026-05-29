import { API_ENDPOINTS } from '@/constants/apiConstants';
import { apiClient } from './apiClient';
import type {
  PaginatedResult,
  ScriptureMatchDto,
  SessionDto,
  TranscriptSegmentDto,
} from '@/types/api';

export interface CreateSessionInput {
  title: string;
  language?: string;
}

export interface AppendTranscriptInput {
  text: string;
  startedAt: string;
  endedAt: string;
  matches?: ScriptureMatchDto[];
}

export const sessionService = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<PaginatedResult<SessionDto>>(
      `${API_ENDPOINTS.sessions.list}?page=${page}&pageSize=${pageSize}`,
    ),
  get: (code: string) => apiClient.get<SessionDto>(API_ENDPOINTS.sessions.one(code)),
  create: (input: CreateSessionInput) =>
    apiClient.post<SessionDto>(API_ENDPOINTS.sessions.list, input),
  end: (code: string) => apiClient.patch<SessionDto>(API_ENDPOINTS.sessions.end(code)),
  remove: (code: string) => apiClient.delete<void>(API_ENDPOINTS.sessions.one(code)),
  listTranscripts: (code: string) =>
    apiClient.get<TranscriptSegmentDto[]>(API_ENDPOINTS.sessions.transcripts(code)),
  appendTranscript: (code: string, input: AppendTranscriptInput) =>
    apiClient.post<TranscriptSegmentDto>(API_ENDPOINTS.sessions.transcripts(code), input),
};
