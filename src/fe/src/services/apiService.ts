/**
 * Service for communicating with backend API
 */

import { API_CONSTANTS } from '../constants/apiConstants';

export interface EphemeralKeyResponse {
  success: boolean;
  data: {
    ephemeral_key: {
      value: string;
      expires_at: number;
      expires_at_utc: string;
    };
    session_id: string;
    model: string;
  };
  error: string | null;
}

export interface SanitizeJsonRequest {
  malformedJson: string;
  context: string;
}

export interface SanitizeJsonResponse {
  success: boolean;
  data: {
    sanitizedJson: string;
  } | null;
  error: string | null;
  message: string;
}

export const apiService = {
  async getEphemeralToken(): Promise<EphemeralKeyResponse> {
    const response = await fetch(
      `${API_CONSTANTS.BACKEND.BASE_URL}${API_CONSTANTS.BACKEND.ENDPOINTS.SESSION}`,
      {
        method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ephemeral token: ${response.statusText}`);
    }

    return response.json();
  },

  async sanitizeJson(request: SanitizeJsonRequest): Promise<SanitizeJsonResponse> {
    const response = await fetch(
      `${API_CONSTANTS.BACKEND.BASE_URL}${API_CONSTANTS.BACKEND.ENDPOINTS.SANITIZE_JSON}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: 'Failed to sanitize JSON',
      };
    }

    return response.json();
  },
};
