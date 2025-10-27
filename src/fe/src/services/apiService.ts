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

export const apiService = {
  /**
   * Fetch ephemeral token from backend for WebRTC connection
   * Token expires in 60 seconds
   */
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
};
