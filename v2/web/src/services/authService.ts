import { API_ENDPOINTS, STORAGE_KEYS } from '@/constants/apiConstants';
import { apiClient } from './apiClient';
import type { AuthResponse } from '@/types/api';

export const authService = {
  async claim(username: string): Promise<AuthResponse> {
    const result = await apiClient.post<AuthResponse>(API_ENDPOINTS.auth.claim, { username });
    try {
      localStorage.setItem(STORAGE_KEYS.authToken, result.token);
      localStorage.setItem(STORAGE_KEYS.username, result.username);
    } catch {
      /* ignore */
    }
    return result;
  },
  getStoredUsername(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.username);
    } catch {
      return null;
    }
  },
  getStoredToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.authToken);
    } catch {
      return null;
    }
  },
  signOut() {
    try {
      localStorage.removeItem(STORAGE_KEYS.authToken);
      localStorage.removeItem(STORAGE_KEYS.username);
    } catch {
      /* ignore */
    }
  },
};
