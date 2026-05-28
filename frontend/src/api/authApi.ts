import { httpClient } from './httpClient';
import { setAuthToken } from './authToken';
import { setSessionUser, type SessionUser } from './sessionUser';

export type AuthUser = SessionUser;

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export async function fetchMe(): Promise<SessionUser> {
  const { data } = await httpClient.get<SessionUser>('/auth/me');
  setSessionUser(data);
  return data;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  setAuthToken(data.access_token);
  setSessionUser(data.user);
  return data;
}

export async function registerRequest(payload: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/auth/register', payload);
  setAuthToken(data.access_token);
  setSessionUser(data.user);
  return data;
}
