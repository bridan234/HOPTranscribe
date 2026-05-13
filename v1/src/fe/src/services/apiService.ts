/**
 * Service for communicating with backend API
 * Provides generic HTTP methods and specific API endpoints
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

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONSTANTS.BACKEND.BASE_URL;
  }

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Generic DELETE request
   */
  async delete<T = void>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return this.handleResponse<T>(response);
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const error: ApiError = {
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        data: errorData,
      };

      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Get ephemeral token for OpenAI Realtime API
   */
  async getEphemeralToken(): Promise<EphemeralKeyResponse> {
    return this.post<EphemeralKeyResponse>(API_CONSTANTS.BACKEND.ENDPOINTS.SESSION);
  }

  /**
   * Sanitize malformed JSON
   */
  async sanitizeJson(request: SanitizeJsonRequest): Promise<SanitizeJsonResponse> {
    try {
      return await this.post<SanitizeJsonResponse>(
        API_CONSTANTS.BACKEND.ENDPOINTS.SANITIZE_JSON,
        request
      );
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        data: null,
        error: apiError.message,
        message: 'Failed to sanitize JSON',
      };
    }
  }
}

export const apiService = new ApiService();
