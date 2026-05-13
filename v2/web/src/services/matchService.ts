import { API_ENDPOINTS } from '@/constants/apiConstants';
import { apiClient } from './apiClient';
import type { MatchResponse } from '@/types/api';

export interface MatchInput {
  sessionCode: string;
  utterance: string;
  preferredVersion?: string;
  n?: number;
}

export const matchService = {
  match: (input: MatchInput) =>
    apiClient.post<MatchResponse>(API_ENDPOINTS.match, {
      sessionCode: input.sessionCode,
      utterance: input.utterance,
      preferredVersion: input.preferredVersion ?? 'NKJV',
      n: input.n ?? 3,
    }),
};
