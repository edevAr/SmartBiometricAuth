const STORAGE_KEY = 'securehome_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
