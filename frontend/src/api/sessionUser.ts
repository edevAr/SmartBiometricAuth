const STORAGE_KEY = 'securehome_auth_user';

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  phone?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationAddress?: string | null;
};

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function mergeSessionUser(partial: Partial<SessionUser>): void {
  const cur = getSessionUser();
  if (!cur) return;
  setSessionUser({ ...cur, ...partial });
}
